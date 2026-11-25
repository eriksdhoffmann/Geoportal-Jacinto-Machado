import re

# 1. Adapt js/layer-engine.js
src = open(r'C:\Users\Win11\Downloads\Geoportal Araquari\js\layer-engine.js', encoding='utf-8').read()
repls = [
    ('Geoportal Araquari', 'Geoportal Municipal de Jacinto Machado'),
    ('Araquari (SC — IBGE 4201307)', 'Jacinto Machado (SC — IBGE 4208708)'),
    ('IBGE 4201307 (386,872 km²)', 'IBGE 4208708 (430,704 km²)'),
    ('IBGE 4201307', 'IBGE 4208708'),
    ('ARAQUARI_BOUNDS', 'JACINTO_BOUNDS'),
    ('ARAQUARI_URBAN_CENTER', 'JACINTO_URBAN_CENTER'),
    ('Geoportal-Araquari', 'Geoportal-Jacinto-Machado'),
    ('GEOARAQUARI_BUNDLE', 'GEOJACINTO_BUNDLE'),
    ('ARAQUARI_LIMIT_GEOJSON', 'JACINTO_LIMIT_GEOJSON'),
    ('araquari-bundle-extra.js', 'jacinto-bundle-extra.js'),
    ('extensao_araquari_km', 'extensao_km'),
    ('Extensão em Araquari (km)', 'Extensão (km)'),
    ('de Araquari', 'de Jacinto Machado'),
    ('em Araquari', 'em Jacinto Machado'),
    ('Araquari', 'Jacinto Machado'),
]
for a, b in repls:
    src = src.replace(a, b)

# Add Jacinto Machado SGB/CPRM + IMA + CNES + OSM field labels
extra_labels = """    Classe: 'Classe de Suscetibilidade / Relevo',
    CLASSE: 'Classe',
    Processo: 'Processo Geológico / Hidrológico',
    Municipio: 'Município',
    MUNICIPIO: 'Município',
    unidade: 'Unidade Geológica',
    sigla: 'Sigla Geológica',
    GEOLOGIA: 'Formação / Litologia',
    DOMINIO: 'Domínio Geológico',
    HIERARQUIA: 'Hierarquia',
    SIMB: 'Símbolo Pedológico',
    COMP_1: 'Classe de Solo (SGB)',
    TEXTURA1: 'Textura do Solo',
    RELEVO1: 'Relevo Local',
    DRENAGEM1: 'Drenagem',
    VEGETACAO1: 'Vegetação Original',
    classe_decliv: 'Classe de Declividade',
    nome_uc: 'Unidade de Conservação',
    cd_cnuc: 'Código CNUC',
    cria_ano: 'Ano de Criação',
    cria_ato: 'Ato Legal de Criação',
    co_gestor: 'Órgão Gestor',
    pl_manejo: 'Plano de Manejo',
    esfera: 'Esfera Administrativa',
    telefone: 'Telefone',
    altitude_m: 'Altitude (m)',
    superficie: 'Superfície',
    nm_sit: 'Situação Censitária Detalhada',
    BACIA: 'Sub-bacia (SGB)',
    Area: 'Área (km²)',
"""
src = src.replace("    CD_MUN: 'Código IBGE',\n", "    CD_MUN: 'Código IBGE',\n" + extra_labels)

# Update core context layers queried in Raio-X Territorial (identifyAtPoint)
src = re.sub(
    r"const coreIds = \[[^\]]+\];",
    "const coreIds = ['setores_censitarios_ibge', 'suscet_inundacao_sgb', 'suscet_movimento_massa_sgb', 'sgb_setores_risco', 'bacias_hidrograficas_ima', 'geologia_sgb', 'pedologia_sgb', 'relevo_sgb', 'unidades_conservacao_mma'];",
    src
)

open('js/layer-engine.js', 'w', encoding='utf-8').write(src)
print('Wrote js/layer-engine.js', len(src))

# 2. Adapt js/tools.js
tsrc = open(r'C:\Users\Win11\Downloads\Geoportal Araquari\js\tools.js', encoding='utf-8').read()
trepls = [
    ('Geoportal Araquari', 'Geoportal Municipal de Jacinto Machado'),
    ('ARAQUARI_BOUNDS', 'JACINTO_BOUNDS'),
    ('GEOARAQUARI_BUNDLE', 'GEOJACINTO_BUNDLE'),
    ('geoportal_araquari_desenhos.geojson', 'geoportal_jacinto_machado_desenhos.geojson'),
    ('sistema_viario_araquari', 'sistema_viario_osm'),
    ('rodovias_araquari', 'rodovias_jacinto'),
    ('Araquari/SC', 'Jacinto Machado/SC'),
    ('de Araquari', 'de Jacinto Machado'),
    ('em Araquari', 'em Jacinto Machado'),
    ('Araquari', 'Jacinto Machado'),
]
for a, b in trepls:
    tsrc = tsrc.replace(a, b)

# Replace the POI search block inside unifiedSearch cleanly
old_search_start = tsrc.find('// 2. Bairros Oficiais (IBGE 2022)')
old_search_end = tsrc.find('// 6. Rodovias')
if old_search_start != -1 and old_search_end != -1:
    new_block = """// 2. Localidades, Comunidades Rurais e Sede (SGB/IBGE + OSM)
      for (const f of bundle.localidades_jacinto?.features || []) {
        const nome = f.properties?.nome || '';
        if (norm(nome).includes(qNorm) && !results.some((r) => norm(r.title) === norm(nome))) {
          results.push({
            type: 'Localidade',
            badge: 'Local',
            title: nome,
            subtitle: `${f.properties?.tipo || 'Localidade'} — Jacinto Machado/SC`,
            geojson: f,
            activateLayer: 'localidades_jacinto',
          });
        }
      }

      // 3. Unidades de Conservação & Setores de Risco SGB/CPRM
      for (const f of bundle.unidades_conservacao_mma?.features || []) {
        const nome = f.properties?.nome_uc || '';
        if (norm(nome).includes(qNorm) || 'parque nacional serra geral aparados'.includes(qNorm)) {
          results.push({
            type: 'Unidade de Conservação',
            badge: 'UC',
            title: nome || 'Unidade de Conservação',
            subtitle: `${f.properties?.co_gestor || 'ICMBio / MMA'} • CNUC ${f.properties?.cd_cnuc || ''}`,
            geojson: f,
            activateLayer: 'unidades_conservacao_mma',
          });
        }
      }
      for (const f of bundle.sgb_setores_risco?.features || []) {
        const loc = f.properties?.local || '';
        if (norm(loc).includes(qNorm) || norm(f.properties?.num_setor || '').includes(qNorm)) {
          results.push({
            type: 'Setor de Risco (SGB/CPRM)',
            badge: 'Risco',
            title: loc || f.properties?.num_setor || 'Setor de Risco',
            subtitle: `Risco ${f.properties?.grau_risco || 'Alto'} • ${f.properties?.tipolo_g1 || 'Geológico/Hidrológico'}`,
            geojson: f,
            activateLayer: 'sgb_setores_risco',
          });
        }
      }

      // 4. Saúde (CNES), Escolas, Equipamentos Públicos, Pontes, Turismo & Poços SIAGAS
      const poiSources = [
        { key: 'unidades_saude_cnes', type: 'Unidade de Saúde (CNES)', badge: 'Saúde', layer: 'unidades_saude_cnes', sub: (p) => `${p.esfera || ''} • ${p.endereco || ''}` },
        { key: 'escolas_osm', type: 'Educação', badge: 'Escola', layer: 'escolas_osm', sub: (p) => `${p.tipo || 'Escola'} — Jacinto Machado/SC` },
        { key: 'equipamentos_publicos_osm', type: 'Equipamento Público', badge: 'Público', layer: 'equipamentos_publicos_osm', sub: (p) => p.tipo || 'Jacinto Machado/SC' },
        { key: 'turismo_atrativos_osm', type: 'Turismo / Atrativo Natural', badge: 'Turismo', layer: 'turismo_atrativos_osm', sub: (p) => `${p.categoria || 'Atrativo'}${p.altitude_m ? ' • ' + p.altitude_m + ' m' : ''}` },
        { key: 'pontes_osm', type: 'Ponte / Travessia', badge: 'Ponte', layer: 'pontes_osm', sub: (p) => p.rodovia || 'Travessia Viária' },
        { key: 'sgb_pocos_siagas', type: 'Poço Tubular (SIAGAS/SGB)', badge: 'SIAGAS', layer: 'sgb_pocos_siagas', sub: (p) => `${p.str_local_ponto || ''} • ${p.str_uso_agua || ''}` },
      ];
      for (const src of poiSources) {
        for (const f of bundle[src.key]?.features || []) {
          const p = f.properties || {};
          const hay = norm(`${p.nome || ''} ${p.str_local_ponto || ''} ${p.endereco || ''} ${p.bairro || ''} ${p.tipo || ''} ${p.categoria || ''}`);
          if (hay.includes(qNorm)) {
            results.push({
              type: src.type,
              badge: src.badge,
              title: p.nome || p.str_local_ponto || src.type,
              subtitle: src.sub(p),
              geojson: f,
              activateLayer: src.layer,
            });
            if (results.length >= 16) break;
          }
        }
      }

      """
    tsrc = tsrc[:old_search_start] + new_block + tsrc[old_search_end:]

open('js/tools.js', 'w', encoding='utf-8').write(tsrc)
print('Wrote js/tools.js', len(tsrc))
