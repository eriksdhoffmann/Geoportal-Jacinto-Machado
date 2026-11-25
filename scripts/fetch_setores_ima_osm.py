import json, requests, xml.etree.ElementTree as ET

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

s = requests.Session()
s.headers.update({'User-Agent': 'GeoportalJacintoMachado/1.0'})

# 1. IBGE Setores Censitarios 2022 via bbox
for tn in ['APONDS:aponds22_SetorCensit2022v2Definitivo', 'CGMAT:pbqg22_26_SetoresCensitarios_SetoresCensitarios']:
    url = f'https://geoservicos.ibge.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName={tn}&outputFormat=application/json&bbox={bbox_xy}'
    try:
        r = s.get(url, timeout=30)
        if r.status_code == 200 and r.content.lstrip().startswith(b'{'):
            feats = r.json().get('features', [])
            print(f'IBGE {tn}: {len(feats)} features', flush=True)
            if feats:
                open('data_raw/extra/ibge_setores_2022.geojson', 'wb').write(r.content)
                break
        else:
            print(f'IBGE {tn}: HTTP {r.status_code} {r.text[:120]}', flush=True)
    except Exception as e:
        print(f'IBGE {tn} ERR: {e}', flush=True)

# 2. IMA-SC GetCapabilities -> find UC & Bacias layers
try:
    r = s.get('https://geo.ima.sc.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetCapabilities', timeout=20)
    if r.status_code == 200:
        root = ET.fromstring(r.content)
        names = [e.text for e in root.iter() if e.tag.endswith('Name') and e.text]
        uc_names = [n for n in names if any(k in n.lower() for k in ['uc', 'conserva', 'bacia', 'decliv', 'parque', 'fito'])]
        print('IMA-SC WFS matched:', uc_names[:20], flush=True)
        for cand in uc_names:
            if any(k in cand.lower() for k in ['conserva', 'uc_', 'bacia']):
                u = f'https://geo.ima.sc.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName={cand}&outputFormat=application/json&bbox={bbox_xy}'
                rr = s.get(u, timeout=20)
                if rr.status_code == 200 and rr.content.lstrip().startswith(b'{'):
                    fc = len(rr.json().get('features', []))
                    print(f'  IMA {cand}: {fc} features', flush=True)
                    if fc > 0:
                        safe = cand.replace(':', '_')
                        open(f'data_raw/extra/ima_{safe}.geojson', 'wb').write(rr.content)
except Exception as e:
    print('IMA-SC ERR:', e, flush=True)

# 3. OSM Buildings (fast query)
q_b = f"""[out:json][timeout:35];
way["building"]({miny},{minx},{maxy},{maxx});
out body center;"""
try:
    r = s.post('https://overpass-api.de/api/interpreter', data={'data': q_b}, timeout=45)
    print(f'OSM buildings: HTTP {r.status_code} len={len(r.content)}', flush=True)
    if r.status_code == 200 and len(r.content) > 200:
        open('data_raw/extra/osm_buildings.json', 'wb').write(r.content)
except Exception as e:
    print('OSM buildings ERR:', e, flush=True)
