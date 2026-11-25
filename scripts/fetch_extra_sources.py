import os, json, requests

os.makedirs('data_raw/fbds', exist_ok=True)
os.makedirs('data_raw/extra', exist_ok=True)

HEADERS = {'User-Agent': 'GeoportalJacintoMachado/1.0 (Prefeitura/Academic GIS)', 'Accept': 'application/json'}

# 1. Probe FBDS for JACINTO_MACHADO
print('=== 1. FBDS JACINTO_MACHADO ===')
for sub in ['APP', 'USO', 'HIDROGRAFIA']:
    url = f'https://geo.fbds.org.br/SC/JACINTO_MACHADO/{sub}/'
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=20)
        print(f'  FBDS {sub}: HTTP {r.status_code} len={len(r.text)}')
        if r.status_code == 200:
            import re
            files = re.findall(r'href="([^"]+\.(?:shp|dbf|shx|prj|zip))"', r.text, re.I)
            print(f'    files: {files[:12]}')
    except Exception as e:
        print(f'  FBDS {sub} ERR: {e}')

# 2. DataSUS CNES for Jacinto Machado (cod 420870)
print('\n=== 2. CNES DATASUS (420870) ===')
try:
    r = requests.get('https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?codigo_municipio=420870&status=1&limit=100&offset=0', headers=HEADERS, timeout=25)
    print('  CNES HTTP:', r.status_code, 'len:', len(r.content))
    if r.status_code == 200:
        with open('data_raw/extra/cnes_jacinto_machado.json', 'wb') as f:
            f.write(r.content)
        d = r.json()
        print('  CNES count:', len(d.get('estabelecimentos', [])))
except Exception as e:
    print('  CNES ERR:', e)

# 3. SGB WFS for Jacinto Machado bbox (Setores de Risco & Poços SIAGAS)
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
bbox_xy = f'{minx},{miny},{maxx},{maxy},EPSG:4326'

print('\n=== 3. SGB WFS (Setores de Risco & SIAGAS) ===')
for name, layer in [
    ('sgb_risco_geologico', 'gestao-territorial:risco_geologico'),
    ('sgb_pocos_siagas', 'hidrogeologia:siagas'),
    ('sgb_hidrogeologia', 'hidrogeologia:dominios_hidrogeologicos_2_5m'),
]:
    url = f'https://geoservicos.sgb.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName={layer}&outputFormat=application/json&bbox={bbox_xy}'
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        print(f'  {name}: HTTP {r.status_code} len={len(r.content)}')
        if r.status_code == 200 and r.content.startswith(b'{'):
            with open(f'data_raw/extra/{name}.geojson', 'wb') as f:
                f.write(r.content)
            print('    features:', len(r.json().get('features', [])))
    except Exception as e:
        print(f'  {name} ERR: {e}')

# 4. Overpass OSM with proper headers & mirror fallback
print('\n=== 4. OVERPASS OSM ===')
s, w, n, e = miny-0.01, minx-0.01, maxy+0.01, maxx+0.01
q = f"""[out:json][timeout:45];
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
  way["building"]({s},{w},{n},{e});
  relation["boundary"="protected_area"]({s},{w},{n},{e});
  way["boundary"="protected_area"]({s},{w},{n},{e});
);
out body center;
>;
out skel qt;"""

for mirror in ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
    try:
        r = requests.post(mirror, data={'data': q}, headers={'User-Agent': 'GeoportalJacintoMachado/1.0', 'Accept': '*/*'}, timeout=60)
        print(f'  Overpass ({mirror}): HTTP {r.status_code} len={len(r.content)}')
        if r.status_code == 200 and len(r.content) > 500:
            with open('data_raw/extra/osm_jacinto_machado.json', 'wb') as f:
                f.write(r.content)
            break
    except Exception as ex:
        print(f'  Overpass ({mirror}) ERR: {ex}')
