import os, json, requests, geopandas as gpd

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

# Fetch remaining 3 IMA-SC layers
s = requests.Session()
for safe, tn in [('ima_mma_ucs', 'externos:mma_ucs'), ('ima_declividade', 'ima:declividade'), ('ima_fitogeografico', 'ima:ft_fitogeografico')]:
    try:
        r = s.get(f'https://geo.ima.sc.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName={tn}&outputFormat=application/json&bbox={bbox_xy}', timeout=25)
        if r.status_code == 200 and r.content.lstrip().startswith(b'{'):
            open(f'data_raw/extra/{safe}.geojson', 'wb').write(r.content)
            print(f'Fetched {safe}: {len(r.json().get("features", []))} feats', flush=True)
    except Exception as e:
        print(f'ERR {safe}: {e}', flush=True)

# Inspect schemas of SGB/CPRM + FBDS + IBGE
targets = [
    'data_raw/suscet/12.Suscetibilidade/SuscetibilidadeInundacao.shp',
    'data_raw/suscet/12.Suscetibilidade/SuscetibilidadeMovimentoDeMassa.shp',
    'data_raw/suscet/12.Suscetibilidade/SuscetibilidadeCorridas.shp',
    'data_raw/suscet/12.Suscetibilidade/SuscetibilidadeEnxurradas.shp',
    'data_raw/suscet/12.Suscetibilidade/SuscetibilidadeBacias.shp',
    'data_raw/suscet/06.Geologia/Geologia.shp',
    'data_raw/suscet/07.Pedologia/Pedologia.shp',
    'data_raw/suscet/04.PadrõesDeRelevo/Relevo.shp',
    'data_raw/suscet/05.Feições/feicoes.shp',
    'data_raw/suscet/05.Feições/feicoes_pontuais.shp',
    'data_raw/bc/Limites/AreaUrbanizadaEdificada.shp',
    'data_raw/bc/Limites/Localidades.shp',
    'data_raw/bc/Altimetria/CurvaDeNivel.shp',
    'data_raw/extra/ibge_setores_2022.geojson',
    'data_raw/extra/sgb_risco_geologico.geojson',
    'data_raw/extra/ima_mma_ucs.geojson',
    'data_raw/extra/ima_declividade.geojson',
    'data_raw/extra/ima_fitogeografico.geojson',
]
for p in targets:
    if not os.path.exists(p):
        print('MISSING:', p)
        continue
    try:
        gdf = gpd.read_file(p)
        cols = [c for c in gdf.columns if c != 'geometry']
        sample = {}
        for c in cols[:6]:
            vals = gdf[c].dropna().unique()[:4].tolist()
            sample[c] = [str(v)[:45] for v in vals]
        print(f'\n{os.path.basename(p)} | n={len(gdf)} | crs={gdf.crs} | geom={gdf.geom_type.unique().tolist()}')
        print('  cols:', cols[:12])
        print('  sample:', sample)
    except Exception as e:
        print(f'ERR {p}: {e}')
