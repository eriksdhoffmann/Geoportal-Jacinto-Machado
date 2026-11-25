import requests, json, xml.etree.ElementTree as ET

# 1. Inspect key layers from SIGSC, IBGE, SGB WMS GetCapabilities
def list_wms_layers(name, url, keywords):
    try:
        r = requests.get(url, timeout=25)
        root = ET.fromstring(r.content)
        ns = {'wms': 'http://www.opengis.net/wms'}
        layers = root.findall('.//wms:Layer/wms:Name', ns)
        if not layers:
            layers = root.findall('.//Layer/Name')
        names = [l.text for l in layers if l.text]
        matched = [n for n in names if any(k in n.lower() for k in keywords)]
        print(f'{name}: total={len(names)}, matched({len(matched)}): {matched[:25]}')
    except Exception as e:
        print(f'{name} ERR: {e}')

list_wms_layers('SIGSC', 'https://sigsc.sc.gov.br/sigserver/SIGSC/wms?service=WMS&version=1.3.0&request=GetCapabilities',
                ['ortofoto', 'mds', 'mdt', 'hidro', 'bacia', 'decliv', 'curva', 'sombreado', 'limite', 'rodovia', 'sc'])
list_wms_layers('SGB', 'https://geoservicos.sgb.gov.br/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities',
                ['geolog', 'lito', 'suscet', 'risco', 'hidrogeol', 'sc', 'brasil', 'setor'])
list_wms_layers('IBGE', 'https://geoservicos.ibge.gov.br/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities',
                ['pedolog', 'solo', 'vegeta', 'geolog', 'uso', 'cobertura', 'censo', 'setor', 'bc250', 'hidro', 'unidade'])

# 2. Query Overpass API for Jacinto Machado (real OSM data!)
# Bounding box of Jacinto Machado SC: approx south=-29.13, west=-49.99, north=-28.86, east=-49.64
# Let's read exact bbox from limite_municipal_ibge.geojson
with open('data_raw/limite_municipal_ibge.geojson', encoding='utf-8') as f:
    gj = json.load(f)
coords = []
def walk(c):
    if isinstance(c[0], (int, float)): coords.append(c)
    else:
        for x in c: walk(x)
for feat in gj.get('features', []):
    walk(feat['geometry']['coordinates'])
lons = [c[0] for c in coords]
lats = [c[1] for c in coords]
bbox = (min(lats)-0.01, min(lons)-0.01, max(lats)+0.01, max(lons)+0.01)
print('Exact IBGE bbox (S,W,N,E):', bbox)

s, w, n, e = bbox
overpass_query = f"""
[out:json][timeout:45];
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
out skel qt;
"""
try:
    r = requests.post('https://overpass-api.de/api/interpreter', data={'data': overpass_query}, timeout=60)
    print('Overpass HTTP:', r.status_code, 'len:', len(r.content))
    if r.status_code == 200:
        with open('data_raw/osm_jacinto_machado.json', 'wb') as f:
            f.write(r.content)
except Exception as ex:
    print('Overpass ERR:', ex)
