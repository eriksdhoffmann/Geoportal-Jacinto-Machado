import os, re, json, requests

os.makedirs('data_raw/fbds', exist_ok=True)
os.makedirs('data_raw/extra', exist_ok=True)

session = requests.Session()
session.headers.update({'User-Agent': 'GeoportalJacintoMachado/1.0'})

# 1. Download FBDS Jacinto Machado (APP, USO, HIDROGRAFIA)
print('=== 1. FBDS JACINTO_MACHADO ===', flush=True)
for sub in ['APP', 'USO', 'HIDROGRAFIA']:
    url = f'https://geo.fbds.org.br/SC/JACINTO_MACHADO/{sub}/'
    try:
        r = session.get(url, timeout=20)
        print(f'FBDS {sub}: HTTP {r.status_code}', flush=True)
        if r.status_code == 200:
            files = sorted(set(re.findall(r'href="([^"]+\.(?:shp|dbf|shx|prj|cpg))"', r.text, re.I)))
            sub_dir = f'data_raw/fbds/{sub}'
            os.makedirs(sub_dir, exist_ok=True)
            for fn in files:
                if '/' in fn or fn.startswith('http'): continue
                out = os.path.join(sub_dir, fn)
                if os.path.exists(out) and os.path.getsize(out) > 0: continue
                fr = session.get(url + fn, timeout=60)
                if fr.status_code == 200:
                    open(out, 'wb').write(fr.content)
                    print(f'  FBDS {sub}/{fn}: {len(fr.content):,} B', flush=True)
    except Exception as e:
        print(f'FBDS {sub} ERR: {e}', flush=True)

# 2. Fast Overpass OSM (without heavy buildings first, then buildings)
with open('data_raw/limite_municipal_ibge.geojson', encoding='utf-8') as f:
    gj = json.load(f)
coords = []
def walk(c):
    if isinstance(c[0], (int, float)): coords.append(c)
    else:
        for x in c: walk(x)
for feat in gj['features']: walk(feat['geometry']['coordinates'])
minx, maxx = min(c[0] for c in coords), max(c[0] for c in coords)
miny, maxy = min(c[1] for c in coords), max(c[1] for c in coords)
s, w, n, e = miny-0.005, minx-0.005, maxy+0.005, maxx+0.005

print('\n=== 2. OVERPASS OSM (core features) ===', flush=True)
q_core = f"""[out:json][timeout:45];
(
  node["place"]({s},{w},{n},{e});
  way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|track|path)$"]({s},{w},{n},{e});
  way["bridge"="yes"]({s},{w},{n},{e});
  node["amenity"~"^(school|kindergarten|college|hospital|clinic|doctors|pharmacy|townhall|police|fire_station|post_office|community_centre|library|place_of_worship|fuel|bank|bus_station)$"]({s},{w},{n},{e});
  way["amenity"~"^(school|kindergarten|college|hospital|clinic|doctors|pharmacy|townhall|police|fire_station|post_office|community_centre|library|place_of_worship)$"]({s},{w},{n},{e});
  node["tourism"]({s},{w},{n},{e});
  way["tourism"]({s},{w},{n},{e});
  node["waterway"="waterfall"]({s},{w},{n},{e});
  node["natural"~"^(peak|spring|cave_entrance|cliff)$"]({s},{w},{n},{e});
  way["leisure"~"^(park|pitch|sports_centre|nature_reserve)$"]({s},{w},{n},{e});
  relation["boundary"="protected_area"]({s},{w},{n},{e});
  way["boundary"="protected_area"]({s},{w},{n},{e});
);
out body center;
>;
out skel qt;"""

for mirror in ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
    try:
        r = session.post(mirror, data={'data': q_core}, timeout=60)
        print(f'OSM core ({mirror}): HTTP {r.status_code} len={len(r.content)}', flush=True)
        if r.status_code == 200 and len(r.content) > 500:
            open('data_raw/extra/osm_core.json', 'wb').write(r.content)
            break
    except Exception as ex:
        print(f'OSM core ERR: {ex}', flush=True)

# 3. IBGE Setores Censitarios 2022 + SIGSC Ottobacias + IMA-SC UCs via WFS
bbox_xy = f'{minx},{miny},{maxx},{maxy},EPSG:4326'
wfs_targets = [
    ('ibge_setores_2022', f'https://geoservicos.ibge.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=APONDS:aponds22_SetorCensit2022v2Definitivo&outputFormat=application/json&CQL_FILTER=CD_MUN=%274208708%27'),
    ('sigsc_ottobacias', f'https://sigsc.sc.gov.br/sigserver/SIGSC/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=SIGSC:ANA_ottobacia&outputFormat=application/json&bbox={bbox_xy}'),
    ('ima_ucs', f'https://geo.ima.sc.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=IMA:unidades_conservacao&outputFormat=application/json&bbox={bbox_xy}'),
]
print('\n=== 3. WFS EXTRA ===', flush=True)
for name, url in wfs_targets:
    try:
        r = session.get(url, timeout=30)
        print(f'WFS {name}: HTTP {r.status_code} len={len(r.content)}', flush=True)
        if r.status_code == 200 and r.content.lstrip().startswith(b'{'):
            open(f'data_raw/extra/{name}.geojson', 'wb').write(r.content)
            print(f'  features: {len(r.json().get("features", []))}', flush=True)
    except Exception as e:
        print(f'WFS {name} ERR: {e}', flush=True)
