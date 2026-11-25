import os, json, requests

os.makedirs('data_raw', exist_ok=True)

# 1. Probe WMS endpoints
endpoints = [
    ('SIGSC_HTTP', 'http://sigsc.sc.gov.br/sigserver/SIGSC/wms?service=WMS&request=GetCapabilities'),
    ('SIGSC_HTTPS', 'https://sigsc.sc.gov.br/sigserver/SIGSC/wms?service=WMS&request=GetCapabilities'),
    ('INDE_ICMBIO', 'https://geoservicos.inde.gov.br/geoserver/ICMBio/ows?service=WMS&version=1.3.0&request=GetCapabilities'),
    ('IBGE_WMS', 'https://geoservicos.ibge.gov.br/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities'),
    ('SGB_WMS', 'https://geoservicos.sgb.gov.br/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities'),
    ('ANA_WMS', 'https://metadados.snirh.gov.br/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities'),
    ('EPAGRI_WMS', 'https://ciram.epagri.sc.gov.br/geoserver/wms?service=WMS&request=GetCapabilities'),
    ('IMA_SC', 'https://geoprocessamento.ima.sc.gov.br/geoserver/wms?service=WMS&request=GetCapabilities'),
    ('MAPBIOMAS_WMTS', 'https://tiles.mapbiomas.org/api/v1/layers'),
]

print('=== WMS/EXTERNAL PROBE ===')
for name, url in endpoints:
    try:
        r = requests.get(url, timeout=12, stream=True)
        chunk = next(r.iter_content(300), b'')
        cors = r.headers.get('Access-Control-Allow-Origin')
        ct = r.headers.get('Content-Type')
        print(f'{name}: HTTP {r.status_code} | CORS={cors} | CT={ct} | head={chunk[:70]!r}')
    except Exception as e:
        print(f'{name}: ERR {str(e)[:100]}')

# 2. Fetch IBGE Malha Municipal (Jacinto Machado 4208708) + Distritos + Setores (if available)
print('\n=== IBGE MALHAS ===')
for name, url in [
    ('limite_municipal_ibge', 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/4208708?formato=application/vnd.geo+json&qualidade=maxima'),
    ('distritos_ibge', 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/4208708?formato=application/vnd.geo+json&intrarregiao=distrito&qualidade=maxima'),
    ('setores_ibge', 'https://servicodados.ibge.gov.br/api/v4/malhas/municipios/4208708?formato=application/vnd.geo+json&intrarregiao=setor'),
]:
    try:
        r = requests.get(url, timeout=20)
        print(f'{name}: HTTP {r.status_code} len={len(r.content)}')
        if r.status_code == 200 and len(r.content) > 50:
            with open(f'data_raw/{name}.geojson', 'wb') as f:
                f.write(r.content)
    except Exception as e:
        print(f'{name}: ERR {e}')
