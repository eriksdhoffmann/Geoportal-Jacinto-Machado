import os, json, math, warnings
os.environ['OGR_GEOJSON_MAX_OBJ_SIZE'] = '0'
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point, LineString, Polygon, MultiPolygon, mapping
from shapely.ops import unary_union

warnings.filterwarnings('ignore')

os.makedirs('data', exist_ok=True)
os.makedirs('js', exist_ok=True)

# 1. Load official IBGE Municipal Boundary (4208708)
print('=== 1. LIMITE MUNICIPAL IBGE 4208708 ===', flush=True)
lim_gdf = gpd.read_file('data_raw/limite_municipal_ibge.geojson')
if lim_gdf.crs is None:
    lim_gdf = lim_gdf.set_crs('EPSG:4326')
else:
    lim_gdf = lim_gdf.to_crs('EPSG:4326')
lim_gdf['CD_MUN'] = '4208708'
lim_gdf['NM_MUN'] = 'Jacinto Machado'
lim_gdf['SIGLA_UF'] = 'SC'
lim_gdf['AREA_KM2'] = 430.704
lim_gdf['NM_REGIAO'] = 'Extremo Sul Catarinense (AMESC)'
lim_gdf['FONTE'] = 'IBGE — Malha Municipal Oficial (SIRGAS 2000)'
lim_geom = unary_union(lim_gdf.geometry.buffer(0))
lim_bounds = lim_geom.bounds  # minx, miny, maxx, maxy
print('Bounds:', lim_bounds, flush=True)

def round_coords(obj, prec=5):
    if isinstance(obj, float):
        return round(obj, prec)
    if isinstance(obj, list):
        return [round_coords(x, prec) for x in obj]
    if isinstance(obj, dict):
        return {k: round_coords(v, prec) for k, v in obj.items()}
    return obj

def save_geojson(gdf, layer_id, simplify_tol=0.0, prec=5, clip=True, keep_cols=None):
    if gdf is None or len(gdf) == 0:
        print(f'  SKIP {layer_id}: empty', flush=True)
        return None
    if gdf.crs is None:
        gdf = gdf.set_crs('EPSG:4326')
    else:
        gdf = gdf.to_crs('EPSG:4326')
    gdf = gdf[gdf.geometry.notnull() & ~gdf.geometry.is_empty].copy()
    if clip:
        try:
            # Make valid first
            gdf['geometry'] = gdf.geometry.buffer(0) if gdf.geom_type.isin(['Polygon', 'MultiPolygon']).any() else gdf.geometry
            gdf = gpd.clip(gdf, lim_geom)
        except Exception:
            gdf = gdf[gdf.geometry.intersects(lim_geom)].copy()
    gdf = gdf[gdf.geometry.notnull() & ~gdf.geometry.is_empty].copy()
    if len(gdf) == 0:
        print(f'  SKIP {layer_id}: empty after clip', flush=True)
        return None
    if simplify_tol > 0:
        gdf['geometry'] = gdf.geometry.simplify(simplify_tol, preserve_topology=True)
        gdf = gdf[gdf.geometry.notnull() & ~gdf.geometry.is_empty].copy()
    if keep_cols:
        cols = [c for c in keep_cols if c in gdf.columns] + ['geometry']
        gdf = gdf[cols]
    # Clean non-serializable values
    for c in gdf.columns:
        if c == 'geometry': continue
        gdf[c] = gdf[c].apply(lambda v: None if pd.isna(v) else (str(v).strip() if not isinstance(v, (int, float, bool)) else v))
    gj = json.loads(gdf.to_json())
    gj['features'] = [
        {'type': 'Feature', 'properties': f['properties'], 'geometry': round_coords(f['geometry'], prec)}
        for f in gj['features'] if f.get('geometry')
    ]
    out_path = f'data/{layer_id}.geojson'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(gj, f, ensure_ascii=False, separators=(',', ':'))
    sz = os.path.getsize(out_path)
    print(f'  OK {layer_id}: {len(gj["features"])} feats | {sz/1024:.1f} KB', flush=True)
    return gj

saved_layers = {}

# Save Limite Municipal
saved_layers['limite_municipal_ibge'] = save_geojson(lim_gdf, 'limite_municipal_ibge', clip=False, prec=5)

# 2. SGB / CPRM — RIGeo Suscetibilidade & Base Cartográfica
print('\n=== 2. SGB/CPRM RIGEO JACINTO MACHADO ===', flush=True)

def read_shp(path):
    for enc in ['utf-8', 'latin1', 'cp1252']:
        try:
            return gpd.read_file(path, encoding=enc)
        except Exception:
            pass
    return gpd.read_file(path)

# Suscetibilidade a Inundação
g = read_shp('data_raw/suscet/12.Suscetibilidade/SuscetibilidadeInundacao.shp')
g['Classe'] = g['Classe'].replace({'Media': 'Média'})
saved_layers['suscet_inundacao_sgb'] = save_geojson(g, 'suscet_inundacao_sgb', simplify_tol=0.00008, keep_cols=['Classe', 'Processo', 'Municipio', 'UF'])

# Suscetibilidade a Movimentos de Massa
g = read_shp('data_raw/suscet/12.Suscetibilidade/SuscetibilidadeMovimentoDeMassa.shp')
g['Classe'] = g['Classe'].replace({'Media': 'Média'})
saved_layers['suscet_movimento_massa_sgb'] = save_geojson(g, 'suscet_movimento_massa_sgb', simplify_tol=0.00012, keep_cols=['Classe', 'Processo', 'Municipio', 'UF'])

# Suscetibilidade a Corridas de Massa
g = read_shp('data_raw/suscet/12.Suscetibilidade/SuscetibilidadeCorridas.shp')
g['Classe'] = 'Corrida de massa'
saved_layers['suscet_corridas_sgb'] = save_geojson(g, 'suscet_corridas_sgb', simplify_tol=0.00006, keep_cols=['Classe', 'Processo', 'Area', 'Municipio'])

# Suscetibilidade a Enxurradas
g = read_shp('data_raw/suscet/12.Suscetibilidade/SuscetibilidadeEnxurradas.shp')
g['Classe'] = 'Enxurrada'
saved_layers['suscet_enxurradas_sgb'] = save_geojson(g, 'suscet_enxurradas_sgb', simplify_tol=0.00006, keep_cols=['Classe', 'Processo', 'Area'])

# Suscetibilidade por Bacias
g = read_shp('data_raw/suscet/12.Suscetibilidade/SuscetibilidadeBacias.shp')
g['CLASSE'] = g['CLASSE'].replace({'Media': 'Média'})
saved_layers['suscet_bacias_sgb'] = save_geojson(g, 'suscet_bacias_sgb', simplify_tol=0.00008, keep_cols=['BACIA', 'CLASSE'])

# Geologia 1:50.000
g = read_shp('data_raw/suscet/06.Geologia/Geologia.shp')
g['unidade'] = g['NOME_UNIDA'].fillna(g['GEOLOGIA']).fillna(g['Unidade']).fillna(g['SIGLA_UNID']).fillna('Unidade Geológica')
g['sigla'] = g['SIGLA_UNID'].fillna(g['Letra_simb']).fillna(g['SIGLA_']).fillna('')
saved_layers['geologia_sgb'] = save_geojson(g, 'geologia_sgb', simplify_tol=0.00005, keep_cols=['unidade', 'sigla', 'GEOLOGIA', 'DOMINIO', 'HIERARQUIA'])

# Lineamentos Estruturais
g = read_shp('data_raw/suscet/06.Geologia/Lineamentos.shp')
saved_layers['lineamentos_sgb'] = save_geojson(g, 'lineamentos_sgb', simplify_tol=0.00005)

# Pedologia
g = read_shp('data_raw/suscet/07.Pedologia/Pedologia.shp')
g['ordem'] = g['COMP_1'].fillna('Não classificado').str.title()
saved_layers['pedologia_sgb'] = save_geojson(g, 'pedologia_sgb', simplify_tol=0.00005, keep_cols=['SIMB', 'ordem', 'COMP_1', 'TEXTURA1', 'RELEVO1', 'DRENAGEM1', 'VEGETACAO1'])

# Padrões de Relevo
g = read_shp('data_raw/suscet/04.PadrõesDeRelevo/Relevo.shp')
saved_layers['relevo_sgb'] = save_geojson(g, 'relevo_sgb', simplify_tol=0.00008, keep_cols=['Classe', 'Municipio', 'UF'])

# Feições de Instabilidade (Polígonos e Pontos)
g = read_shp('data_raw/suscet/05.Feições/feicoes.shp')
g['CLASSE'] = g['CLASSE'].str.capitalize()
saved_layers['feicoes_instabilidade_sgb'] = save_geojson(g, 'feicoes_instabilidade_sgb', simplify_tol=0.00005, keep_cols=['CLASSE', 'Municipio', 'UF'])

g = read_shp('data_raw/suscet/05.Feições/feicoes_pontuais.shp')
g['CLASSE'] = g['CLASSE'].str.capitalize()
saved_layers['feicoes_pontuais_sgb'] = save_geojson(g, 'feicoes_pontuais_sgb', keep_cols=['CLASSE', 'Municipio', 'UF'])

# Isoietas Pluviometria
g = read_shp('data_raw/suscet/08.Isoietas/Atlas Pluviometrico/Isoietas Anuais Medias/Isoietas_PMA_1977_2006.shp')
saved_layers['isoietas_sgb'] = save_geojson(g, 'isoietas_sgb', simplify_tol=0.00005)

# Base Cartográfica SGB/IPT
g = read_shp('data_raw/bc/Limites/AreaUrbanizadaEdificada.shp')
g['area_ha'] = (g['AREA_M2'].astype(float) / 10000.0).round(2)
saved_layers['area_urbanizada_ipt'] = save_geojson(g, 'area_urbanizada_ipt', simplify_tol=0.00003, keep_cols=['area_ha', 'FONTE', 'MUNICIPIO'])

g = read_shp('data_raw/bc/Altimetria/CurvaDeNivel.shp')
g['cota'] = g['CONTOUR'].astype(float).astype(int)
# Keep 20m curves (simplify slightly so file is ~500-700 KB)
saved_layers['curvas_nivel_sgb'] = save_geojson(g, 'curvas_nivel_sgb', simplify_tol=0.00012, keep_cols=['cota'])

g = read_shp('data_raw/bc/Hidrografia/AreaUmida.shp')
saved_layers['areas_umidas_sgb'] = save_geojson(g, 'areas_umidas_sgb', simplify_tol=0.00006)

# 3. FBDS SC_4208708 (1:5.000)
print('\n=== 3. FBDS SC_4208708 ===', flush=True)
fbds_uso_stats = {}
if os.path.exists('data_raw/fbds/USO/SC_4208708_USO.shp'):
    g = read_shp('data_raw/fbds/USO/SC_4208708_USO.shp')
    if 'CLASSE_USO' in g.columns and 'AREA_HA' in g.columns:
        fbds_uso_stats = g.groupby('CLASSE_USO')['AREA_HA'].sum().round(2).to_dict()
        print('  FBDS USO stats (ha):', fbds_uso_stats, flush=True)
    saved_layers['fbds_uso_solo'] = save_geojson(g, 'fbds_uso_solo', simplify_tol=0.00015, keep_cols=['CLASSE_USO', 'AREA_HA', 'MUNICIPIO'])

if os.path.exists('data_raw/fbds/APP/SC_4208708_APP.shp'):
    g = read_shp('data_raw/fbds/APP/SC_4208708_APP.shp')
    saved_layers['fbds_app'] = save_geojson(g, 'fbds_app', simplify_tol=0.00012, keep_cols=['HIDRO', 'APP_M', 'AREA_HA'])

if os.path.exists('data_raw/fbds/HIDROGRAFIA/SC_4208708_NASCENTES.shp'):
    g = read_shp('data_raw/fbds/HIDROGRAFIA/SC_4208708_NASCENTES.shp')
    saved_layers['fbds_nascentes'] = save_geojson(g, 'fbds_nascentes', keep_cols=['HIDRO', 'MUNICIPIO'])

if os.path.exists('data_raw/fbds/HIDROGRAFIA/SC_4208708_MASSAS_DAGUA.shp'):
    g = read_shp('data_raw/fbds/HIDROGRAFIA/SC_4208708_MASSAS_DAGUA.shp')
    saved_layers['fbds_massas_dagua'] = save_geojson(g, 'fbds_massas_dagua', simplify_tol=0.00005, keep_cols=['NATUREZA', 'AREA_HA'])

if os.path.exists('data_raw/fbds/HIDROGRAFIA/SC_4208708_RIOS_DUPLOS.shp'):
    g = read_shp('data_raw/fbds/HIDROGRAFIA/SC_4208708_RIOS_DUPLOS.shp')
    saved_layers['fbds_rios_duplos'] = save_geojson(g, 'fbds_rios_duplos', simplify_tol=0.00005, keep_cols=['HIDRO', 'AREA_HA'])

if os.path.exists('data_raw/fbds/HIDROGRAFIA/SC_4208708_RIOS_SIMPLES.shp'):
    g = read_shp('data_raw/fbds/HIDROGRAFIA/SC_4208708_RIOS_SIMPLES.shp')
    saved_layers['fbds_rios_simples'] = save_geojson(g, 'fbds_rios_simples', simplify_tol=0.0001, keep_cols=['HIDRO', 'COMP_KM'])

# 4. SGB WFS (Setores de Risco, SIAGAS, Hidrogeologia) + IBGE Setores + IMA-SC + SIGSC Ottobacias
print('\n=== 4. WFS (SGB, IBGE, IMA-SC, SIGSC) ===', flush=True)
if os.path.exists('data_raw/extra/sgb_risco_geologico.geojson'):
    g = gpd.read_file('data_raw/extra/sgb_risco_geologico.geojson')
    if 'municipio' in g.columns:
        g = g[g['municipio'].str.upper().str.contains('JACINTO', na=False)].copy()
    saved_layers['sgb_setores_risco'] = save_geojson(g, 'sgb_setores_risco', clip=False, keep_cols=['num_setor', 'local', 'tipolo_g1', 'tipolo_e1', 'cobrade_01', 'grau_risco', 'num_edif', 'num_domi', 'num_pess', 'descricao', 'sug_interv', 'data_setor', 'orgao_exec'])

if os.path.exists('data_raw/extra/sgb_pocos_siagas.geojson'):
    g = gpd.read_file('data_raw/extra/sgb_pocos_siagas.geojson')
    saved_layers['sgb_pocos_siagas'] = save_geojson(g, 'sgb_pocos_siagas', keep_cols=['idt_ponto', 'str_local_ponto', 'str_natureza_ponto', 'str_tipo_situacao', 'str_uso_agua', 'str_aquifero', 'num_profundidade', 'num_vazao_especifica', 'data_perfuracao'])

if os.path.exists('data_raw/extra/sgb_hidrogeologia.geojson'):
    g = gpd.read_file('data_raw/extra/sgb_hidrogeologia.geojson')
    saved_layers['sgb_hidrogeologia'] = save_geojson(g, 'sgb_hidrogeologia', simplify_tol=0.0001, keep_cols=['nome_unida', 'dom', 'subdom', 'sigla_unid'])

if os.path.exists('data_raw/extra/ibge_setores_2022.geojson'):
    g = gpd.read_file('data_raw/extra/ibge_setores_2022.geojson')
    if 'cd_mun' in g.columns:
        g = g[g['cd_mun'].astype(str) == '4208708'].copy()
    g['situacao'] = g['nm_sit'].apply(lambda x: 'Urbana' if 'urbana' in str(x).lower() or 'núcleo' in str(x).lower() else 'Rural')
    saved_layers['setores_censitarios_ibge'] = save_geojson(g, 'setores_censitarios_ibge', clip=False, simplify_tol=0.00005, keep_cols=['cd_setor', 'situacao', 'nm_sit', 'cd_dist'])

if os.path.exists('data_raw/extra/ima_ima_ft_bacia_hidrografica.geojson'):
    g = gpd.read_file('data_raw/extra/ima_ima_ft_bacia_hidrografica.geojson')
    saved_layers['bacias_hidrograficas_ima'] = save_geojson(g, 'bacias_hidrograficas_ima', simplify_tol=0.0001)

if os.path.exists('data_raw/extra/ima_mma_ucs.geojson'):
    g = gpd.read_file('data_raw/extra/ima_mma_ucs.geojson')
    saved_layers['unidades_conservacao_mma'] = save_geojson(g, 'unidades_conservacao_mma', simplify_tol=0.00005, keep_cols=['nome_uc', 'cd_cnuc', 'cria_ano', 'cria_ato', 'co_gestor', 'pl_manejo'])

if os.path.exists('data_raw/extra/ima_fitogeografico.geojson'):
    g = gpd.read_file('data_raw/extra/ima_fitogeografico.geojson')
    fit_map = {
        '10_FLORE_NEBULAR_CRISTA': 'Floresta Nebular de Crista / Serra Geral',
        '08_FLOREST_TROP_PLAN_QUASUL': 'Floresta Tropical da Planície Quaternária Sul',
        '07_FLOREST_TROP_MERIDIONAL': 'Floresta Tropical Meridional / Encostas',
        '00_VEG_LITORANEA': 'Vegetação de Influência Fluvio-Marinha',
    }
    g['regiao_fito'] = g['fit_tp'].map(lambda x: fit_map.get(x, str(x)))
    saved_layers['fitogeografico_ima'] = save_geojson(g, 'fitogeografico_ima', simplify_tol=0.0001, keep_cols=['regiao_fito', 'fit_ar_ha'])

if os.path.exists('data_raw/extra/ima_declividade.geojson'):
    g = gpd.read_file('data_raw/extra/ima_declividade.geojson')
    dec_map = {'0': '0–5% (Plano)', '5': '5–12% (Suave)', '12': '12–25% (Ondulado)', '25': '25–45% (Forte)', '45': '>45% (Escarpado)'}
    g['classe_decliv'] = g['dec_cl'].astype(str).map(lambda x: dec_map.get(x, x))
    saved_layers['declividade_ima'] = save_geojson(g, 'declividade_ima', simplify_tol=0.00018, keep_cols=['classe_decliv', 'dec_cl'])

if os.path.exists('data_raw/extra/sigsc_ottobacias.geojson'):
    g = gpd.read_file('data_raw/extra/sigsc_ottobacias.geojson')
    saved_layers['sigsc_ottobacias'] = save_geojson(g, 'sigsc_ottobacias', simplify_tol=0.00012, keep_cols=['cobacia', 'cocursodag', 'nuordemcda', 'nunivotto'])

# 5. DataSUS CNES (Unidades de Saúde)
print('\n=== 5. DATASUS CNES (420870) ===', flush=True)
cnes_count = 0
if os.path.exists('data_raw/extra/cnes_jacinto_machado.json'):
    raw = json.load(open('data_raw/extra/cnes_jacinto_machado.json', encoding='utf-8'))
    rows = []
    for e in raw.get('estabelecimentos', []):
        lat, lon = e.get('latitude_estabelecimento_decimo_grau'), e.get('longitude_estabelecimento_decimo_grau')
        if lat is None or lon is None: continue
        try:
            lat, lon = float(lat), float(lon)
        except Exception:
            continue
        if not (-30 < lat < -28 and -51 < lon < -49): continue
        nat = str(e.get('codigo_natureza_juridica') or '')
        esfera = 'Pública Municipal' if nat.startswith('103') or nat.startswith('124') else ('Sem Fins Lucrativos' if nat.startswith('3') else 'Privada / Conveniada')
        rows.append({
            'cnes': str(e.get('codigo_cnes', '')),
            'nome': e.get('nome_fantasia') or e.get('nome_razao_social') or 'Estabelecimento de Saúde',
            'razao_social': e.get('nome_razao_social') or '',
            'esfera': esfera,
            'endereco': f"{e.get('endereco_estabelecimento') or ''}, {e.get('numero_estabelecimento') or 'S/N'}".strip(', '),
            'bairro': e.get('bairro_estabelecimento') or '',
            'telefone': e.get('numero_telefone_estabelecimento') or '',
            'geometry': Point(lon, lat)
        })
    if rows:
        g = gpd.GeoDataFrame(rows, crs='EPSG:4326')
        cnes_count = len(g)
        saved_layers['unidades_saude_cnes'] = save_geojson(g, 'unidades_saude_cnes', clip=False)

# 6. OpenStreetMap (osm_core.json -> Rodovias, Sistema Viário, Localidades, Escolas, Equipamentos, Pontes, Turismo, Trilhas)
print('\n=== 6. OPENSTREETMAP JACINTO MACHADO ===', flush=True)
osm_counts = {}
if os.path.exists('data_raw/extra/osm_core.json'):
    osm = json.load(open('data_raw/extra/osm_core.json', encoding='utf-8'))
    nodes = {}
    for el in osm.get('elements', []):
        if el['type'] == 'node':
            nodes[el['id']] = (el['lon'], el['lat'])

    localidades, rodovias, viario, pontes, escolas, equip, turismo, trilhas = [], [], [], [], [], [], [], []
    for el in osm.get('elements', []):
        tags = el.get('tags') or {}
        if not tags: continue
        # Point geometry
        pt = None
        if el['type'] == 'node':
            pt = Point(el['lon'], el['lat'])
        elif 'center' in el:
            pt = Point(el['center']['lon'], el['center']['lat'])
        # Line geometry for ways
        line = None
        if el['type'] == 'way' and 'nodes' in el:
            pts = [nodes[nid] for nid in el['nodes'] if nid in nodes]
            if len(pts) >= 2:
                line = LineString(pts)

        # Localidades / Comunidades / Bairros
        if 'place' in tags and pt is not None and tags.get('name'):
            pl_map = {'town': 'Sede Municipal', 'village': 'Vila / Distrito', 'hamlet': 'Comunidade Rural', 'isolated_dwelling': 'Localidade Rural', 'suburb': 'Bairro', 'neighbourhood': 'Bairro / Loteamento', 'locality': 'Localidade'}
            localidades.append({
                'nome': tags['name'],
                'tipo': pl_map.get(tags['place'], tags['place'].title()),
                'fonte': 'OpenStreetMap',
                'geometry': pt
            })

        # Pontes
        if tags.get('bridge') == 'yes' and line is not None:
            pontes.append({
                'nome': tags.get('name') or 'Ponte / Travessia Viária',
                'rodovia': tags.get('ref') or tags.get('highway', ''),
                'geometry': line.centroid
            })

        # Rodovias & Sistema Viário & Trilhas
        hw = tags.get('highway')
        if hw and line is not None:
            if hw in ('trunk', 'primary', 'secondary', 'tertiary') or tags.get('ref', '').upper().startswith(('SC-', 'BR-')):
                jur = 'Estadual (SIE-SC)' if 'SC-' in str(tags.get('ref', '')).upper() else ('Federal (DNIT)' if 'BR-' in str(tags.get('ref', '')).upper() else 'Rodovia / Acesso Principal')
                rodovias.append({
                    'nome': tags.get('name') or tags.get('ref') or 'Rodovia',
                    'ref': tags.get('ref') or '',
                    'jurisdicao': jur,
                    'pavimento': tags.get('surface') or 'Não informado',
                    'geometry': line
                })
            elif hw in ('path', 'footway') or tags.get('sac_scale') or tags.get('trail_visibility'):
                trilhas.append({
                    'nome': tags.get('name') or 'Trilha / Caminho Natural',
                    'tipo': hw,
                    'superficie': tags.get('surface') or 'Natural',
                    'geometry': line
                })
            else:
                hier_map = {'residential': 'Via Local / Urbana', 'living_street': 'Via Local / Urbana', 'pedestrian': 'Via Local / Urbana', 'unclassified': 'Estrada Municipal / Vicinal', 'track': 'Estrada Rural / Agrícola'}
                viario.append({
                    'nome': tags.get('name') or ('Estrada Vicinal' if hw in ('unclassified', 'track') else 'Logradouro'),
                    'hierarquia': hier_map.get(hw, 'Via Municipal'),
                    'pavimento': tags.get('surface') or 'Não informado',
                    'geometry': line
                })

        # Escolas
        am = tags.get('amenity')
        if am in ('school', 'kindergarten', 'college') and pt is not None:
            escolas.append({
                'nome': tags.get('name') or 'Unidade Escolar',
                'tipo': 'Creche / Infantil' if am == 'kindergarten' else ('Ensino Superior' if am == 'college' else 'Escola'),
                'operador': tags.get('operator') or 'Rede Pública / Privada',
                'geometry': pt
            })
        elif am in ('townhall', 'police', 'fire_station', 'post_office', 'community_centre', 'library', 'place_of_worship', 'bus_station') and pt is not None:
            am_map = {'townhall': 'Prefeitura / Administração', 'police': 'Segurança Pública', 'fire_station': 'Corpo de Bombeiros', 'post_office': 'Correios', 'community_centre': 'Centro Comunitário', 'library': 'Biblioteca', 'place_of_worship': 'Templo / Igreja', 'bus_station': 'Terminal Rodoviário'}
            equip.append({
                'nome': tags.get('name') or am_map.get(am, am),
                'tipo': am_map.get(am, am),
                'geometry': pt
            })

        # Turismo, Cachoeiras, Picos, Atrativos Naturais
        if (tags.get('tourism') or tags.get('waterway') == 'waterfall' or tags.get('natural') in ('peak', 'cave_entrance', 'cliff')) and pt is not None:
            cat = 'Cachoeira' if tags.get('waterway') == 'waterfall' else (
                  'Pico / Mirante Natural' if tags.get('natural') in ('peak', 'cliff') else (
                  'Caverna / Gruta' if tags.get('natural') == 'cave_entrance' else (
                  tags.get('tourism', 'Atrativo').replace('_', ' ').title())))
            turismo.append({
                'nome': tags.get('name') or cat,
                'categoria': cat,
                'altitude_m': tags.get('ele') or '',
                'geometry': pt
            })

    # Merge official SGB Sede + Localidades into localidades
    for shp_p, tipo_lbl in [('data_raw/bc/Limites/SedeMunicipal.shp', 'Sede Municipal (SGB/IBGE)'), ('data_raw/bc/Limites/Localidades.shp', 'Localidade Oficial (SGB/IBGE)')]:
        if os.path.exists(shp_p):
            sg = read_shp(shp_p).to_crs('EPSG:4326')
            for _, row in sg.iterrows():
                nm = row.get('nm_nome') or row.get('NOME') or 'Jacinto Machado'
                localidades.append({'nome': str(nm), 'tipo': tipo_lbl, 'fonte': 'SGB/CPRM — Base Cartográfica', 'geometry': row.geometry})

    for lid, rows, simp in [
        ('localidades_jacinto', localidades, 0),
        ('rodovias_jacinto', rodovias, 0.00004),
        ('sistema_viario_osm', viario, 0.00006),
        ('pontes_osm', pontes, 0),
        ('escolas_osm', escolas, 0),
        ('equipamentos_publicos_osm', equip, 0),
        ('turismo_atrativos_osm', turismo, 0),
        ('trilhas_osm', trilhas, 0.00005),
    ]:
        if rows:
            gdf = gpd.GeoDataFrame(rows, crs='EPSG:4326')
            res = save_geojson(gdf, lid, simplify_tol=simp)
            if res:
                saved_layers[lid] = res
                osm_counts[lid] = len(res['features'])

# 7. Parse IBGE SIDRA Official Socioeconomic Indicators -> data/ibge_indicadores_jacinto_machado.json
print('\n=== 7. IBGE SIDRA SOCIOECONOMIC INDICATORS ===', flush=True)
sidra = json.load(open('data_raw/ibge_sidra.json', encoding='utf-8'))

def parse_rows(rows):
    return rows[1:] if len(rows) > 1 else []

# Population & Area & Density
c22 = {r['D2C']: r['V'] for r in parse_rows(sidra.get('censo2022_pop', []))}
ur = {}
for r in parse_rows(sidra.get('censo2022_urb_rur', [])):
    if r['D2C'] == '93':
        ur[r['D4N']] = int(float(r['V']))
    elif r['D2C'] == '1000093':
        ur[r['D4N'] + '_pct'] = float(r['V'])
dom = {r['D2C']: r['V'] for r in parse_rows(sidra.get('censo2022_domicilios', []))}

# PIB series (2021, 2022, 2023)
pib_by_year = {}
for r in parse_rows(sidra.get('pib_5938', [])):
    yr = r['D3N']
    pib_by_year.setdefault(yr, {})[r['D2N']] = float(r['V']) if r['V'] not in ('-', '...', '') else 0.0

# PAM Lavouras Temporárias (1612) & Permanentes (1613)
def parse_pam(rows):
    by_prod = {}
    ano = ''
    for r in parse_rows(rows):
        prod = r.get('D4N', '')
        if not prod or prod == 'Total': continue
        ano = r.get('D3N', ano)
        val_s = r.get('V', '')
        if val_s in ('-', '...', '', 'X'): continue
        val = float(val_s)
        var = r.get('D2C', '')
        by_prod.setdefault(prod, {'produto': prod, 'area_ha': 0, 'producao_t': 0, 'valor_mil_reais': 0})
        if var == '214': by_prod[prod]['producao_t'] = val
        elif var == '215': by_prod[prod]['valor_mil_reais'] = val
        elif var == '216': by_prod[prod]['area_ha'] = val
    items = [v for v in by_prod.values() if v['valor_mil_reais'] > 0 or v['area_ha'] > 0]
    items.sort(key=lambda x: x['valor_mil_reais'], reverse=True)
    return ano, items

pam_temp_ano, pam_temp = parse_pam(sidra.get('pam_temp_1612', []))
pam_perm_ano, pam_perm = parse_pam(sidra.get('pam_perm_1613', []))

# PPM Pecuária (3939)
ppm_ano = ''
ppm_items = []
for r in parse_rows(sidra.get('ppm_3939', [])):
    ppm_ano = r.get('D3N', ppm_ano)
    v = r.get('V', '')
    if v in ('-', '...', '', 'X'): continue
    ppm_items.append({'rebanho': r.get('D4N', ''), 'efetivo': int(float(v))})
ppm_items.sort(key=lambda x: x['efetivo'], reverse=True)

pop_total = int(float(c22.get('93', 10624)))
area_km2 = float(c22.get('6318', 430.704))
densidade = float(c22.get('614', 24.67))
latest_pib_yr = sorted(pib_by_year.keys())[-1] if pib_by_year else '2023'
latest_pib_mil = pib_by_year.get(latest_pib_yr, {}).get('Produto Interno Bruto a preços correntes', 0)
pib_per_capita = round((latest_pib_mil * 1000) / pop_total, 2) if pop_total else 0

indicadores = {
    'municipio': 'Jacinto Machado',
    'uf': 'SC',
    'codigo_ibge': '4208708',
    'regiao_imediata': 'Araranguá (AMESC)',
    'demografia_censo_2022': {
        'ano': 2022,
        'fonte': 'IBGE — Censo Demográfico 2022 (SIDRA Tabelas 4714, 9923, 4712)',
        'populacao_total': pop_total,
        'area_km2': area_km2,
        'densidade_hab_km2': densidade,
        'populacao_urbana': ur.get('Urbana', 6263),
        'populacao_urbana_pct': ur.get('Urbana_pct', 58.95),
        'populacao_rural': ur.get('Rural', 4361),
        'populacao_rural_pct': ur.get('Rural_pct', 41.05),
        'domicilios_ocupados': int(float(dom.get('381', 3951))),
        'media_moradores_domicilio': float(dom.get('5930', 2.69)),
    },
    'economia_pib': {
        'ano_referencia': latest_pib_yr,
        'fonte': 'IBGE — Produto Interno Bruto dos Municípios (SIDRA Tabela 5938)',
        'pib_total_mil_reais': latest_pib_mil,
        'pib_per_capita_reais': pib_per_capita,
        'serie_historica': pib_by_year,
    },
    'agropecuaria_pam': {
        'ano_temporarias': pam_temp_ano,
        'ano_permanentes': pam_perm_ano,
        'fonte': 'IBGE — Produção Agrícola Municipal (SIDRA Tabelas 1612 e 1613)',
        'lavouras_temporarias': pam_temp[:10],
        'lavouras_permanentes': pam_perm[:10],
    },
    'pecuaria_ppm': {
        'ano': ppm_ano,
        'fonte': 'IBGE — Pesquisa da Pecuária Municipal (SIDRA Tabela 3939)',
        'rebanhos': ppm_items[:8],
    },
    'uso_solo_fbds': {
        'fonte': 'FBDS — Mapeamento em Alta Resolução 5m (SC_4208708)',
        'classes_ha': fbds_uso_stats,
    },
    'equipamentos_publicos': {
        'unidades_saude_cnes': cnes_count,
        'escolas_osm': osm_counts.get('escolas_osm', 0),
        'equipamentos_comunitarios_osm': osm_counts.get('equipamentos_publicos_osm', 0),
        'pontes_osm': osm_counts.get('pontes_osm', 0),
        'setores_risco_sgb': len(saved_layers.get('sgb_setores_risco', {}).get('features', [])),
        'atrativos_turisticos_osm': osm_counts.get('turismo_atrativos_osm', 0),
    }
}

with open('data/ibge_indicadores_jacinto_machado.json', 'w', encoding='utf-8') as f:
    json.dump(indicadores, f, ensure_ascii=False, indent=2)
print('Saved data/ibge_indicadores_jacinto_machado.json', flush=True)

# 8. Build Offline JS Bundles (limite-jacinto.js, jacinto-bundle.js, jacinto-bundle-extra.js)
print('\n=== 8. BUILDING JS BUNDLES ===', flush=True)
with open('js/limite-jacinto.js', 'w', encoding='utf-8') as f:
    f.write('window.JACINTO_LIMIT_GEOJSON = ')
    json.dump(saved_layers['limite_municipal_ibge'], f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

with open('js/indicadores-jacinto.js', 'w', encoding='utf-8') as f:
    f.write('window.JACINTO_INDICADORES = ')
    json.dump(indicadores, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

# Split layers into core bundle (<~2.5MB) and extra bundle (heavier layers loaded on demand)
heavy_ids = {'fbds_uso_solo', 'fbds_app', 'fbds_rios_simples', 'curvas_nivel_sgb', 'declividade_ima', 'suscet_movimento_massa_sgb', 'suscet_inundacao_sgb', 'sigsc_ottobacias'}
core_bundle = {}
extra_bundle = {}
for lid, gj in saved_layers.items():
    if gj is None: continue
    if lid in heavy_ids:
        extra_bundle[lid] = gj
    else:
        core_bundle[lid] = gj

with open('js/jacinto-bundle.js', 'w', encoding='utf-8') as f:
    f.write('window.GEOJACINTO_BUNDLE = ')
    json.dump(core_bundle, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')

with open('js/jacinto-bundle-extra.js', 'w', encoding='utf-8') as f:
    f.write('window.GEOJACINTO_BUNDLE = Object.assign(window.GEOJACINTO_BUNDLE || {}, ')
    json.dump(extra_bundle, f, ensure_ascii=False, separators=(',', ':'))
    f.write(');\n')

print(f'Core bundle: {len(core_bundle)} layers ({os.path.getsize("js/jacinto-bundle.js")/1024/1024:.2f} MB)', flush=True)
print(f'Extra bundle: {len(extra_bundle)} layers ({os.path.getsize("js/jacinto-bundle-extra.js")/1024/1024:.2f} MB)', flush=True)
print('ALL GEODATA PROCESSED SUCCESSFULLY!', flush=True)
