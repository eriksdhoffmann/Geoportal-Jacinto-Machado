/**
 * Geoportal Municipal de Jacinto Machado (SC — IBGE 4208708)
 * Catálogo Oficial Unificado de 40 Camadas Vetoriais, 8 Mapas Base, Combos Temáticos e Downloads.
 * Referência Geodésica: SIRGAS 2000 (EPSG:4674 / UTM 22S EPSG:31982) | Exibição Web: WGS84 (EPSG:4326).
 */
window.GeoCatalog = (() => {
  const FBDS_BASE = 'https://geo.fbds.org.br/SC/JACINTO_MACHADO';
  const SIGSC_WMS = 'https://sigsc.sc.gov.br/sigserver/ows';
  const RIGEO_ITEM_URL = 'https://rigeo.sgb.gov.br/items/c43f811a-d579-4e78-aa19-cb4e54394f08';
  const RIGEO_PDF_URL = 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/2c1448f9-141c-4083-aa95-bf92559d593c/content';
  const TRANSPARENT_TILE =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  // Extensão oficial exata da Malha Municipal IBGE 4208708 (430,704 km²)
  const JACINTO_CENTER = [-29.0007, -49.8516];
  const JACINTO_URBAN_CENTER = [-28.9995, -49.7635]; // Sede Municipal de Jacinto Machado
  const JACINTO_BOUNDS = [
    [-29.1218, -50.0044],
    [-28.8796, -49.6989],
  ];

  // Paletas oficiais verificadas sobre os atributos reais de Jacinto Machado
  const SUSCET_COLORS = {
    Alta: '#dc2626',
    'Média': '#f59e0b',
    Baixa: '#22c55e',
  };

  const RISCO_GRAU_COLORS = {
    'Muito alto': '#991b1b',
    Alto: '#dc2626',
    'Médio': '#f59e0b',
    Baixo: '#22c55e',
  };

  const FBDS_USO_COLORS = {
    'formação florestal': '#15803d',
    'formação não florestal': '#84cc16',
    silvicultura: '#0f766e',
    'área antropizada': '#eab308',
    'área edificada': '#dc2626',
    'água': '#0284c7',
  };

  const FBDS_APP_COLORS = {
    "curso d'água (0 - 10m)": '#10b981',
    "curso d'água (10 - 50m)": '#059669',
    "curso d'água (50 - 200m)": '#047857',
    "massa d'água": '#0284c7',
    nascente: '#22c55e',
  };

  const GEOLOGIA_COLORS = {
    Gramado: '#b91c1c',
    Caxias: '#dc2626',
    Botucatu: '#f59e0b',
    'Rio do Rasto': '#d97706',
    'Depósitos colúvio-aluvionares': '#fef08a',
    'Depósitos flúvio-lagunares': '#38bdf8',
    'Depósitos de barreira pleistocênica 3 - Depósitos de planície lagunar': '#fde047',
  };

  const PEDOLOGIA_COLORS = {
    'Solos Litolicos': '#78716c',
    Cambissolo: '#d97706',
    'Glei Pouco Humico': '#38bdf8',
    'Podzolico Vermelho-Amarelo': '#f97316',
    'Podzolico Vermelho-Escuro': '#dc2626',
    'Não Classificado': '#94a3b8',
  };

  const RELEVO_COLORS = {
    Escarpas: '#7f1d1d',
    Serras: '#b45309',
    'Morros altos': '#d97706',
    'Morros baixos': '#f59e0b',
    Morrotes: '#facc15',
    Colinas: '#bef264',
    'Planícies e terraços fluviais': '#38bdf8',
  };

  const FEICOES_COLORS = {
    'Paredão rochoso': '#7f1d1d',
    'Campos de blocos': '#ea580c',
    'Depósitos de acumulação': '#d97706',
    Alagado: '#0284c7',
  };

  const FEICOES_PT_COLORS = {
    Cicatriz: '#dc2626',
    Ravina: '#f59e0b',
  };

  const DECLIV_COLORS = {
    '0–5% (Plano)': '#bef264',
    '5–12% (Suave)': '#4ade80',
    '12–25% (Ondulado)': '#facc15',
    '25–45% (Forte)': '#f97316',
    '>45% (Escarpado)': '#dc2626',
  };

  const FITO_COLORS = {
    'Floresta Nebular de Crista / Serra Geral': '#065f46',
    'Floresta Tropical Meridional / Encostas': '#15803d',
    'Floresta Tropical da Planície Quaternária Sul': '#22c55e',
    'Vegetação de Influência Fluvio-Marinha': '#0d9488',
  };

  const BACIAS_COLORS = {
    ARARANGUA: '#0284c7',
    MAMPITUBA: '#0d9488',
  };

  const SETOR_SIT_COLORS = {
    Urbana: '#f59e0b',
    Rural: '#22c55e',
  };

  const RODOVIA_COLORS = {
    'Estadual (SIE-SC)': '#dc2626',
    'Federal (DNIT)': '#991b1b',
    'Rodovia / Acesso Principal': '#ea580c',
  };

  const VIARIO_COLORS = {
    'Via Local / Urbana': '#38bdf8',
    'Estrada Municipal / Vicinal': '#f59e0b',
    'Estrada Rural / Agrícola': '#a3e635',
  };

  const SAUDE_COLORS = {
    'Pública Municipal': '#dc2626',
    'Sem Fins Lucrativos': '#7c3aed',
    'Privada / Conveniada': '#0284c7',
  };

  // ==================== MAPAS BASE (8) ====================
  const BASEMAPS = [
    {
      id: 'satelite_global',
      name: 'Satélite HD Atual (Esri World Imagery)',
      group: 'Imagens Aéreas e Satélite',
      type: 'xyz',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, Maxar, Earthstar Geographics',
      maxNativeZoom: 19,
      maxZoom: 21,
      isMunicipalRaster: false,
      defaultOpacity: 1,
      badge: 'Satélite HD',
    },
    {
      id: 'satelite_hibrido',
      name: 'Satélite HD + Rótulos e Rodovias',
      group: 'Imagens Aéreas e Satélite',
      type: 'hybrid',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      labelsUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri World Imagery & Reference',
      maxNativeZoom: 19,
      maxZoom: 21,
      isMunicipalRaster: false,
      defaultOpacity: 1,
      badge: 'Híbrido',
    },
    {
      id: 'orto_sigsc_2012',
      name: 'Ortofoto Oficial SC 2012 — 39 cm (SIGSC WMS)',
      group: 'Levantamento Aerofotogramétrico Oficial (SIGSC)',
      type: 'wms',
      url: SIGSC_WMS,
      layers: 'SIGSC:Ortofoto_SC_2010_2012',
      format: 'image/jpeg',
      transparent: false,
      version: '1.1.1',
      attribution: 'Governo de SC — SDS / SIGSC (39 cm)',
      maxNativeZoom: 19,
      maxZoom: 21,
      isMunicipalRaster: true,
      defaultOpacity: 1,
      badge: 'SIGSC 39cm',
    },
    {
      id: 'mdt_sigsc_2012',
      name: 'MDT — Modelo Digital de Terreno / Relevo Sombreado (SIGSC)',
      group: 'Levantamento Aerofotogramétrico Oficial (SIGSC)',
      type: 'wms',
      url: SIGSC_WMS,
      layers: 'SIGSC:MDT-2012',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      attribution: 'Governo de SC — SDS / SIGSC (MDT 2012)',
      maxNativeZoom: 18,
      maxZoom: 20,
      isMunicipalRaster: true,
      defaultOpacity: 0.92,
      badge: 'MDT SC',
    },
    {
      id: 'mds_sigsc_2012',
      name: 'MDS — Modelo Digital de Superfície / Hipsometria (SIGSC)',
      group: 'Levantamento Aerofotogramétrico Oficial (SIGSC)',
      type: 'wms',
      url: SIGSC_WMS,
      layers: 'SIGSC:MDS-2012',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      attribution: 'Governo de SC — SDS / SIGSC (MDS 2012)',
      maxNativeZoom: 18,
      maxZoom: 20,
      isMunicipalRaster: true,
      defaultOpacity: 0.92,
      badge: 'MDS SC',
    },
    {
      id: 'osm',
      name: 'OpenStreetMap Padrão',
      group: 'Mapas Cartográficos',
      type: 'xyz',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: 21,
      isMunicipalRaster: false,
      defaultOpacity: 1,
      badge: 'OSM',
    },
    {
      id: 'carto_light',
      name: 'Mapa Claro Minimalista (Carto Positron)',
      group: 'Mapas Cartográficos',
      type: 'xyz',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '© OpenStreetMap, © CARTO',
      maxNativeZoom: 19,
      maxZoom: 21,
      isMunicipalRaster: false,
      defaultOpacity: 1,
      badge: 'Claro',
    },
    {
      id: 'opentopomap',
      name: 'Mapa Topográfico / Curvas (OpenTopoMap)',
      group: 'Mapas Cartográficos',
      type: 'xyz',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap (SRTM / OSM)',
      maxNativeZoom: 16,
      maxZoom: 19,
      isMunicipalRaster: false,
      defaultOpacity: 1,
      badge: 'Topo',
    },
  ];

  // ==================== 8 GRUPOS TEMÁTICOS (40 CAMADAS REAIS) ====================
  const LAYER_GROUPS = [
    {
      id: 'base_cartografica',
      name: 'A. Base Cartográfica',
      expanded: true,
      layers: [
        {
          id: 'limite_municipal_ibge',
          name: 'Limite Municipal Oficial (IBGE 4208708)',
          localFile: 'data/limite_municipal_ibge.geojson',
          geomType: 'polygon',
          outlineMode: true,
          defaultOpacity: 1,
          style: { color: '#f59e0b', weight: 3, dashArray: '8 4', fillOpacity: 0 },
          description: 'Perímetro oficial de Jacinto Machado (430,704 km² — SIRGAS 2000).',
        },
        {
          id: 'localidades_jacinto',
          name: 'Sede Municipal e Localidades (37)',
          localFile: 'data/localidades_jacinto.geojson',
          geomType: 'point',
          defaultOpacity: 1,
          pointStyle: { radius: 6, fillColor: '#033c8e', color: '#ffffff', weight: 2, fillOpacity: 0.95 },
          labelField: 'nome',
          description: 'Sede municipal, vilas e comunidades rurais (SGB/CPRM + OpenStreetMap).',
        },
        {
          id: 'area_urbanizada_ipt',
          name: 'Áreas Urbanizadas e Edificadas (IPT/SGB — 85)',
          localFile: 'data/area_urbanizada_ipt.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.55,
          style: { color: '#dc2626', weight: 1.4, fillColor: '#ef4444', fillOpacity: 0.4 },
          description: 'Manchas urbanizadas e núcleos edificados traçados sobre ortofotos (IPT/SGB 2014).',
        },
        {
          id: 'rodovias_jacinto',
          name: 'Rodovias Estaduais e Acessos Principais (94)',
          localFile: 'data/rodovias_jacinto.geojson',
          geomType: 'line',
          defaultOpacity: 0.95,
          colorField: 'jurisdicao',
          colorMap: RODOVIA_COLORS,
          style: { color: '#dc2626', weight: 3 },
          description: 'SC-108, SC-285 e rodovias de ligação regional (OpenStreetMap).',
        },
        {
          id: 'sistema_viario_osm',
          name: 'Logradouros e Estradas Municipais (487)',
          localFile: 'data/sistema_viario_osm.geojson',
          geomType: 'line',
          defaultOpacity: 0.85,
          colorField: 'hierarquia',
          colorMap: VIARIO_COLORS,
          style: { color: '#f59e0b', weight: 1.8 },
          description: 'Ruas urbanas, estradas municipais e vicinais rurais (OpenStreetMap).',
        },
      ],
    },
    {
      id: 'defesa_civil',
      name: 'D. Defesa Civil e Riscos (SGB/CPRM)',
      expanded: true,
      layers: [
        {
          id: 'sgb_setores_risco',
          name: 'Setores de Risco Geológico Mapeados (SGB — 47)',
          localFile: 'data/sgb_setores_risco.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.72,
          colorField: 'grau_risco',
          colorMap: RISCO_GRAU_COLORS,
          style: { color: '#7f1d1d', weight: 2, fillOpacity: 0.65 },
          description: 'Setorização oficial de áreas de risco alto e muito alto (SGB/CPRM — SC_JACINTO_SR).',
        },
        {
          id: 'suscet_inundacao_sgb',
          name: 'Suscetibilidade a Inundações (SGB/IPT — 667)',
          localFile: 'data/suscet_inundacao_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.6,
          colorField: 'Classe',
          colorMap: SUSCET_COLORS,
          style: { color: '#1e3a8a', weight: 0.7, fillOpacity: 0.55 },
          description: 'Carta de Suscetibilidade a Inundações, Alagamentos e Assoreamento (1:50.000 — RIGeo SGB/IPT).',
        },
        {
          id: 'suscet_movimento_massa_sgb',
          name: 'Suscetibilidade a Movimentos de Massa (SGB/IPT — 587)',
          localFile: 'data/suscet_movimento_massa_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.58,
          colorField: 'Classe',
          colorMap: SUSCET_COLORS,
          style: { color: '#7c2d12', weight: 0.6, fillOpacity: 0.52 },
          description: 'Carta de Suscetibilidade a Deslizamentos, Queda de Rocha e Rastejo (1:50.000 — RIGeo SGB/IPT).',
        },
        {
          id: 'suscet_corridas_sgb',
          name: 'Suscetibilidade a Corridas de Massa (SGB/IPT — 88)',
          localFile: 'data/suscet_corridas_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.68,
          style: { color: '#9333ea', weight: 1.2, fillColor: '#a855f7', fillOpacity: 0.48 },
          description: 'Bacias e canais suscetíveis a corridas de massa / detritos (RIGeo SGB/IPT 2015).',
        },
        {
          id: 'suscet_enxurradas_sgb',
          name: 'Suscetibilidade a Enxurradas (SGB/IPT — 132)',
          localFile: 'data/suscet_enxurradas_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.65,
          style: { color: '#0369a1', weight: 1.2, fillColor: '#0ea5e9', fillOpacity: 0.45 },
          description: 'Trechos de drenagem e vales suscetíveis a enxurradas (RIGeo SGB/IPT 2015).',
        },
        {
          id: 'suscet_bacias_sgb',
          name: 'Bacias de Suscetibilidade Hidrológica (SGB — 11)',
          localFile: 'data/suscet_bacias_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.45,
          colorField: 'CLASSE',
          colorMap: SUSCET_COLORS,
          style: { color: '#334155', weight: 1.4, fillOpacity: 0.35 },
          description: 'Classificação das sub-bacias hidrográficas por suscetibilidade (SGB/IPT).',
        },
        {
          id: 'feicoes_instabilidade_sgb',
          name: 'Feições de Instabilidade — Paredões e Blocos (116)',
          localFile: 'data/feicoes_instabilidade_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.72,
          colorField: 'CLASSE',
          colorMap: FEICOES_COLORS,
          style: { color: '#450a0a', weight: 1.1, fillOpacity: 0.58 },
          description: 'Paredões rochosos, campos de blocos, depósitos de tálus/colúvio e alagados (SGB/IPT).',
        },
        {
          id: 'feicoes_pontuais_sgb',
          name: 'Pontos Críticos — Cicatrizes e Ravinas (SGB — 100)',
          localFile: 'data/feicoes_pontuais_sgb.geojson',
          geomType: 'point',
          defaultOpacity: 0.95,
          colorField: 'CLASSE',
          colorMap: FEICOES_PT_COLORS,
          pointStyle: { radius: 5, fillColor: '#dc2626', color: '#ffffff', weight: 1.5, fillOpacity: 0.95 },
          description: 'Cicatrizes de escorregamento e ravinas identificadas por fotointerpretação (SGB/IPT).',
        },
      ],
    },
    {
      id: 'geografia_fisica',
      name: 'B. Geografia Física (Relevo, Hidrografia e Geologia)',
      expanded: false,
      layers: [
        {
          id: 'fbds_rios_simples',
          name: "Hidrografia — Cursos d'Água (FBDS — 7.026)",
          localFile: 'data/fbds_rios_simples.geojson',
          geomType: 'line',
          defaultOpacity: 0.85,
          style: { color: '#0284c7', weight: 1.2 },
          description: 'Rede de drenagem em alta resolução 1:5.000 (FBDS SC_4208708).',
        },
        {
          id: 'fbds_rios_duplos',
          name: 'Rios Principais — Margem Dupla (FBDS — 24)',
          localFile: 'data/fbds_rios_duplos.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.8,
          style: { color: '#0369a1', weight: 1, fillColor: '#38bdf8', fillOpacity: 0.65 },
          description: 'Leitos principais de rios largos como Rio da Pedra e Rio Pinheirinho (FBDS 1:5.000).',
        },
        {
          id: 'fbds_massas_dagua',
          name: "Massas d'Água e Açudes (FBDS — 67)",
          localFile: 'data/fbds_massas_dagua.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.8,
          style: { color: '#0369a1', weight: 1, fillColor: '#0ea5e9', fillOpacity: 0.65 },
          description: 'Lagos, açudes e reservatórios superficiais (FBDS 1:5.000).',
        },
        {
          id: 'fbds_nascentes',
          name: 'Nascentes Mapeadas (FBDS — 3.154)',
          localFile: 'data/fbds_nascentes.geojson',
          geomType: 'point',
          defaultOpacity: 0.9,
          pointStyle: { radius: 3.2, fillColor: '#06b6d4', color: '#0e7490', weight: 0.8, fillOpacity: 0.85 },
          description: '3.154 olhos d’água e nascentes identificados em escala 1:5.000 (FBDS).',
        },
        {
          id: 'areas_umidas_sgb',
          name: 'Áreas Úmidas e Várzeas (SGB — 337)',
          localFile: 'data/areas_umidas_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.6,
          style: { color: '#0d9488', weight: 1, fillColor: '#2dd4bf', fillOpacity: 0.45 },
          description: 'Planícies úmidas e áreas alagadiças da Base Cartográfica SGB/CPRM.',
        },
        {
          id: 'bacias_hidrograficas_ima',
          name: 'Bacias Hidrográficas (Araranguá e Mampituba — IMA)',
          localFile: 'data/bacias_hidrograficas_ima.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.35,
          colorField: 'bhi_nm',
          colorMap: BACIAS_COLORS,
          style: { color: '#0369a1', weight: 2.2, fillOpacity: 0.22 },
          description: 'Divisão entre as Bacias Hidrográficas do Rio Araranguá e Rio Mampituba (IMA-SC).',
        },
        {
          id: 'sigsc_ottobacias',
          name: 'Ottobacias Hidrográficas (ANA / SIGSC — 1.119)',
          localFile: 'data/sigsc_ottobacias.geojson',
          geomType: 'polygon',
          outlineMode: true,
          defaultOpacity: 0.75,
          style: { color: '#0284c7', weight: 1, fillOpacity: 0.04 },
          description: 'Microbacias ottocodificadas da ANA/SIGSC recortadas para Jacinto Machado.',
        },
        {
          id: 'curvas_nivel_sgb',
          name: 'Curvas de Nível — Equidistância 20m (SGB — 953)',
          localFile: 'data/curvas_nivel_sgb.geojson',
          geomType: 'line',
          defaultOpacity: 0.75,
          style: { color: '#b45309', weight: 1 },
          description: 'Altimetria vetorial extraída do MDT oficial SC (Base Cartográfica SGB/CPRM).',
        },
        {
          id: 'declividade_ima',
          name: 'Declividade do Terreno (IMA-SC / SIGSC — 2.111)',
          localFile: 'data/declividade_ima.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.58,
          colorField: 'classe_decliv',
          colorMap: DECLIV_COLORS,
          style: { color: '#475569', weight: 0.3, fillOpacity: 0.52 },
          description: 'Classes de inclinação das encostas (0–5% Plano até >45% Escarpado da Serra Geral).',
        },
        {
          id: 'relevo_sgb',
          name: 'Padrões de Relevo / Geomorfologia (SGB — 84)',
          localFile: 'data/relevo_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.55,
          colorField: 'Classe',
          colorMap: RELEVO_COLORS,
          style: { color: '#78350f', weight: 0.8, fillOpacity: 0.48 },
          description: 'Escarpas, Serras, Morros Altos/Baixos, Morrotes, Colinas e Planícies Fluviais (SGB/IPT).',
        },
        {
          id: 'geologia_sgb',
          name: 'Geologia Municipal 1:50.000 (SGB/CPRM — 26)',
          localFile: 'data/geologia_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.55,
          colorField: 'unidade',
          colorMap: GEOLOGIA_COLORS,
          style: { color: '#334155', weight: 1, fillOpacity: 0.48 },
          description: 'Formações Serra Geral (Gramado/Caxias), Botucatu, Rio do Rasto e Depósitos Quaternários.',
        },
        {
          id: 'lineamentos_sgb',
          name: 'Lineamentos Estruturais (SGB/CPRM — 1.942)',
          localFile: 'data/lineamentos_sgb.geojson',
          geomType: 'line',
          defaultOpacity: 0.75,
          style: { color: '#7f1d1d', weight: 1.1, dashArray: '4 3' },
          description: 'Estruturas tectônicas, fraturas e lineamentos morfoestruturais da escarpa (SGB/IPT).',
        },
        {
          id: 'pedologia_sgb',
          name: 'Pedologia / Tipos de Solo (SGB/CPRM — 15)',
          localFile: 'data/pedologia_sgb.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.55,
          colorField: 'ordem',
          colorMap: PEDOLOGIA_COLORS,
          style: { color: '#475569', weight: 1, fillOpacity: 0.48 },
          description: 'Solos Litólicos, Cambissolos, Gleissolos e Podzólicos/Argissolos (SGB/CPRM).',
        },
        {
          id: 'sgb_hidrogeologia',
          name: 'Domínios Hidrogeológicos (SGB/CPRM — 7)',
          localFile: 'data/sgb_hidrogeologia.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.48,
          style: { color: '#1d4ed8', weight: 1.2, fillColor: '#3b82f6', fillOpacity: 0.35 },
          description: 'Unidades aquíferas e domínios hidrogeológicos (SGB/CPRM).',
        },
        {
          id: 'sgb_pocos_siagas',
          name: 'Poços Tubulares Cadastrados (SIAGAS / SGB — 17)',
          localFile: 'data/sgb_pocos_siagas.geojson',
          geomType: 'point',
          defaultOpacity: 1,
          pointStyle: { radius: 5.5, fillColor: '#2563eb', color: '#ffffff', weight: 1.8, fillOpacity: 0.95 },
          description: '17 poços cadastrados no Sistema de Informações de Águas Subterrâneas (SGB/CPRM).',
        },
        {
          id: 'isoietas_sgb',
          name: 'Isoietas — Pluviometria Média Anual (SGB — 3)',
          localFile: 'data/isoietas_sgb.geojson',
          geomType: 'line',
          defaultOpacity: 0.9,
          style: { color: '#0284c7', weight: 2.4, dashArray: '6 4' },
          description: 'Isoietas de precipitação média anual 1977–2006 (Atlas Pluviométrico SGB/CPRM).',
        },
      ],
    },
    {
      id: 'meio_ambiente',
      name: 'C. Meio Ambiente',
      expanded: false,
      layers: [
        {
          id: 'fbds_uso_solo',
          name: 'Uso e Cobertura do Solo 5m (FBDS — 3.594)',
          localFile: 'data/fbds_uso_solo.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.62,
          colorField: 'CLASSE_USO',
          colorMap: FBDS_USO_COLORS,
          style: { color: '#1e293b', weight: 0.4, fillOpacity: 0.58 },
          description: 'Mapeamento 1:5.000: Floresta (44,9%), Área Antropizada/Agrícola (49,0%), Silvicultura (4,1%).',
        },
        {
          id: 'fbds_app',
          name: 'Áreas de Preservação Permanente — APP (FBDS — 2.813)',
          localFile: 'data/fbds_app.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.68,
          colorField: 'HIDRO',
          colorMap: FBDS_APP_COLORS,
          style: { color: '#047857', weight: 0.6, fillOpacity: 0.55 },
          description: 'Faixas de APP de cursos d’água, nascentes e massas d’água segundo o Código Florestal (FBDS).',
        },
        {
          id: 'unidades_conservacao_mma',
          name: 'Unidades de Conservação — Parque Nac. Serra Geral (MMA)',
          localFile: 'data/unidades_conservacao_mma.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.55,
          style: { color: '#14532d', weight: 2.5, fillColor: '#16a34a', fillOpacity: 0.35 },
          description: 'Porção municipal do Parque Nacional da Serra Geral (CNUC 0000.00.0153 — ICMBio/MMA).',
        },
        {
          id: 'fitogeografico_ima',
          name: 'Regiões Fitogeográficas / Vegetação (IMA-SC — 3)',
          localFile: 'data/fitogeografico_ima.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.45,
          colorField: 'regiao_fito',
          colorMap: FITO_COLORS,
          style: { color: '#14532d', weight: 1.2, fillOpacity: 0.38 },
          description: 'Floresta Nebular de Crista, Floresta Tropical Meridional e Planície Quaternária (IMA-SC).',
        },
      ],
    },
    {
      id: 'infraestrutura',
      name: 'E. Infraestrutura e Equipamentos Públicos',
      expanded: false,
      layers: [
        {
          id: 'unidades_saude_cnes',
          name: 'Unidades de Saúde Ativas (DataSUS / CNES — 20)',
          localFile: 'data/unidades_saude_cnes.geojson',
          geomType: 'point',
          defaultOpacity: 1,
          colorField: 'esfera',
          colorMap: SAUDE_COLORS,
          pointStyle: { radius: 6.5, fillColor: '#dc2626', color: '#ffffff', weight: 2, fillOpacity: 0.95 },
          description: '20 estabelecimentos de saúde ativos em Jacinto Machado (Hospital, UBSs, Clínicas — CNES 420870).',
        },
        {
          id: 'escolas_osm',
          name: 'Escolas e Unidades Educacionais (OSM — 7)',
          localFile: 'data/escolas_osm.geojson',
          geomType: 'point',
          defaultOpacity: 1,
          pointStyle: { radius: 6.5, fillColor: '#2563eb', color: '#ffffff', weight: 2, fillOpacity: 0.95 },
          description: 'Escolas municipais, estaduais e centros de educação mapeados no OpenStreetMap.',
        },
        {
          id: 'equipamentos_publicos_osm',
          name: 'Equipamentos Públicos e Comunitários (OSM — 31)',
          localFile: 'data/equipamentos_publicos_osm.geojson',
          geomType: 'point',
          defaultOpacity: 1,
          pointStyle: { radius: 5.5, fillColor: '#7c3aed', color: '#ffffff', weight: 1.8, fillOpacity: 0.92 },
          description: 'Prefeitura, segurança, correios, centros comunitários e templos (OpenStreetMap).',
        },
        {
          id: 'pontes_osm',
          name: 'Pontes e Travessias Viárias (OSM — 70)',
          localFile: 'data/pontes_osm.geojson',
          geomType: 'point',
          defaultOpacity: 0.95,
          pointStyle: { radius: 4.5, fillColor: '#b45309', color: '#ffffff', weight: 1.5, fillOpacity: 0.92 },
          description: '70 pontes e obras de arte especiais sobre cursos d’água mapeadas no OpenStreetMap.',
        },
      ],
    },
    {
      id: 'socioeconomico',
      name: 'F. Informações Socioeconômicas (IBGE)',
      expanded: false,
      layers: [
        {
          id: 'setores_censitarios_ibge',
          name: 'Setores Censitários — Censo 2022 (IBGE — 36)',
          localFile: 'data/setores_censitarios_ibge.geojson',
          geomType: 'polygon',
          defaultOpacity: 0.48,
          colorField: 'situacao',
          colorMap: SETOR_SIT_COLORS,
          style: { color: '#334155', weight: 1.3, fillOpacity: 0.32 },
          description: '36 setores censitários oficiais do Censo 2022 (situação Urbana 58,95% vs Rural 41,05%).',
        },
      ],
    },
    {
      id: 'turismo_localidades',
      name: 'H. Turismo, Cânions e Trilhas',
      expanded: false,
      layers: [
        {
          id: 'turismo_atrativos_osm',
          name: 'Atrativos Turísticos, Cachoeiras e Picos (OSM — 40)',
          localFile: 'data/turismo_atrativos_osm.geojson',
          geomType: 'point',
          defaultOpacity: 1,
          pointStyle: { radius: 6, fillColor: '#059669', color: '#ffffff', weight: 2, fillOpacity: 0.95 },
          description: 'Cachoeiras, mirantes da Serra Geral, cânions, picos e hospedagens rurais (OpenStreetMap).',
        },
        {
          id: 'trilhas_osm',
          name: 'Trilhas e Caminhos Naturais (OSM — 54)',
          localFile: 'data/trilhas_osm.geojson',
          geomType: 'line',
          defaultOpacity: 0.9,
          style: { color: '#16a34a', weight: 2.2, dashArray: '5 4' },
          description: 'Trilhas ecológicas e caminhos de ecoturismo na encosta dos cânions (OpenStreetMap).',
        },
      ],
    },
  ];

  // Camadas oficialmente pendentes junto à Prefeitura Municipal (Regra 7 — transparência total)
  const PENDING_MUNICIPAL_LAYERS = [
    { group: 'G. Planejamento Territorial', name: 'Zoneamento Urbano e Rural (Plano Diretor Municipal)', status: 'Pendente de obtenção junto à Prefeitura de Jacinto Machado' },
    { group: 'G. Planejamento Territorial', name: 'Perímetro Urbano Legal (Lei Municipal)', status: 'Pendente de obtenção oficial (disponível mancha edificada IPT/SGB como referência)' },
    { group: 'G. Planejamento Territorial', name: 'Cadastro Territorial / Lotes, Quadras e Parcelamento do Solo', status: 'Pendente de integração com o Cadastro Imobiliário Municipal' },
    { group: 'A. Base Cartográfica', name: 'Bairros Oficiais Municipais e Edificações Cadastrais', status: 'Pendente de obtenção junto à Prefeitura (disponíveis localidades SGB/OSM e setores IBGE)' },
    { group: 'C. Meio Ambiente', name: 'Séries Históricas MapBiomas (WMS direto)', status: 'Serviço WMS público instável; disponível link oficial MapBiomas + FBDS 5m local' },
  ];

  // Downloads Oficiais Agrupados
  const OFFICIAL_DOWNLOADS = [
    {
      id: 'sgb-rigeo',
      title: 'Defesa Civil e Suscetibilidade — SGB/CPRM & IPT (RIGeo 2015 + Setorização)',
      items: [
        { label: 'Carta de Suscetibilidade Jacinto Machado (PDF Oficial 19,8 MB)', format: 'PDF Oficial SGB/CPRM (RIGeo)', externalUrl: RIGEO_PDF_URL },
        { label: 'Repositório Completo RIGeo SGB/CPRM (Vetores, MDE e Ortofotos)', format: 'Portal RIGeo (c43f811a-...)', externalUrl: RIGEO_ITEM_URL },
        { label: 'Setores de Risco Geológico Mapeados (47 setores)', format: 'GeoJSON (SIRGAS 2000 / WGS84)', localFile: 'data/sgb_setores_risco.geojson', layerId: 'sgb_setores_risco' },
        { label: 'Suscetibilidade a Inundações (667 polígonos)', format: 'GeoJSON', localFile: 'data/suscet_inundacao_sgb.geojson', layerId: 'suscet_inundacao_sgb' },
        { label: 'Suscetibilidade a Movimentos de Massa (587 polígonos)', format: 'GeoJSON', localFile: 'data/suscet_movimento_massa_sgb.geojson', layerId: 'suscet_movimento_massa_sgb' },
        { label: 'Suscetibilidade a Enxurradas (132) e Corridas de Massa (88)', format: 'GeoJSON', localFile: 'data/suscet_enxurradas_sgb.geojson', layerId: 'suscet_enxurradas_sgb' },
      ],
    },
    {
      id: 'fbds-ambiente',
      title: 'Meio Ambiente, Hidrografia e Unidades de Conservação (FBDS 1:5.000 & IMA-SC)',
      items: [
        { label: 'Uso e Cobertura do Solo 5m — FBDS SC_4208708 (3.594 polígonos)', format: 'GeoJSON', localFile: 'data/fbds_uso_solo.geojson', layerId: 'fbds_uso_solo', externalUrl: `${FBDS_BASE}/USO/` },
        { label: 'Áreas de Preservação Permanente — APP (2.813 polígonos)', format: 'GeoJSON', localFile: 'data/fbds_app.geojson', layerId: 'fbds_app', externalUrl: `${FBDS_BASE}/APP/` },
        { label: 'Hidrografia — Rios Simples (7.026) e Nascentes (3.154)', format: 'GeoJSON', localFile: 'data/fbds_nascentes.geojson', layerId: 'fbds_nascentes', externalUrl: `${FBDS_BASE}/HIDROGRAFIA/` },
        { label: 'Parque Nacional da Serra Geral — Unidade de Conservação (MMA/ICMBio)', format: 'GeoJSON', localFile: 'data/unidades_conservacao_mma.geojson', layerId: 'unidades_conservacao_mma' },
      ],
    },
    {
      id: 'base-fisica-ibge',
      title: 'Base Cartográfica, Geologia, Solos, Relevo e Censo IBGE 2022',
      items: [
        { label: 'Limite Municipal Oficial IBGE 4208708 (430,704 km²)', format: 'GeoJSON', localFile: 'data/limite_municipal_ibge.geojson', layerId: 'limite_municipal_ibge' },
        { label: 'Setores Censitários Censo 2022 (36 setores)', format: 'GeoJSON', localFile: 'data/setores_censitarios_ibge.geojson', layerId: 'setores_censitarios_ibge' },
        { label: 'Indicadores Socioeconômicos Oficiais IBGE SIDRA (Censo, PIB, PAM, PPM)', format: 'JSON Estruturado', localFile: 'data/ibge_indicadores_jacinto_machado.json' },
        { label: 'Geologia 1:50k (26) e Pedologia / Solos (15) — SGB/CPRM', format: 'GeoJSON', localFile: 'data/geologia_sgb.geojson', layerId: 'geologia_sgb' },
        { label: 'Ortofoto Oficial SC 2012 (39 cm) e MDT/MDS — SIGSC WMS', format: 'WMS HTTPS (sigsc.sc.gov.br)', basemapId: 'orto_sigsc_2012', externalUrl: 'https://sigsc.sc.gov.br/' },
      ],
    },
    {
      id: 'infra-turismo',
      title: 'Infraestrutura, Saúde (CNES), Sistema Viário e Turismo',
      items: [
        { label: 'Unidades de Saúde Ativas — DataSUS / CNES (20 estabelecimentos)', format: 'GeoJSON', localFile: 'data/unidades_saude_cnes.geojson', layerId: 'unidades_saude_cnes' },
        { label: 'Rodovias (94), Sistema Viário (487) e Pontes (70)', format: 'GeoJSON', localFile: 'data/rodovias_jacinto.geojson', layerId: 'rodovias_jacinto' },
        { label: 'Atrativos Turísticos, Cachoeiras e Picos (40) + Trilhas (54)', format: 'GeoJSON', localFile: 'data/turismo_atrativos_osm.geojson', layerId: 'turismo_atrativos_osm' },
      ],
    },
  ];

  // Conjuntos Temáticos Prontos ("Combos")
  const THEMATIC_PRESETS = [
    {
      id: 'defesa_civil_suscet',
      title: 'Defesa Civil — Suscetibilidade e Riscos (SGB/CPRM)',
      desc: '47 setores oficiais de risco alto/muito alto + Suscetibilidade a Inundações e Movimentos de Massa (RIGeo 2015).',
      basemap: 'satelite_hibrido',
      layers: ['limite_municipal_ibge', 'suscet_inundacao_sgb', 'suscet_movimento_massa_sgb', 'sgb_setores_risco', 'localidades_jacinto'],
      center: [-28.998, -49.795],
      zoom: 12,
      color: '#dc2626',
    },
    {
      id: 'ambiental_fbds',
      title: 'Meio Ambiente, Uso do Solo, APP e Parque Nacional',
      desc: 'Cobertura da Terra 5m (FBDS), Áreas de Preservação Permanente e Parque Nacional da Serra Geral (ICMBio/MMA).',
      basemap: 'satelite_global',
      layers: ['limite_municipal_ibge', 'fbds_uso_solo', 'fbds_app', 'unidades_conservacao_mma'],
      center: [-28.995, -49.855],
      zoom: 11,
      color: '#059669',
    },
    {
      id: 'hidrografia_aguas',
      title: 'Hidrografia, Bacias, Nascentes e Poços SIAGAS',
      desc: 'Bacias Araranguá e Mampituba, 7.026 cursos d’água, 3.154 nascentes (FBDS) e 17 poços tubulares SIAGAS.',
      basemap: 'orto_sigsc_2012',
      layers: ['limite_municipal_ibge', 'bacias_hidrograficas_ima', 'fbds_rios_duplos', 'fbds_rios_simples', 'fbds_nascentes', 'sgb_pocos_siagas'],
      center: [-29.002, -49.83],
      zoom: 12,
      color: '#0284c7',
    },
    {
      id: 'geologia_relevo',
      title: 'Geologia, Solos, Curvas de Nível e MDT (SIGSC)',
      desc: 'Relevo Sombreado Oficial SC (MDT-2012) + Mapa Geológico 1:50k (Serra Geral, Botucatu), Curvas 20m e Lineamentos.',
      basemap: 'mdt_sigsc_2012',
      layers: ['limite_municipal_ibge', 'geologia_sgb', 'curvas_nivel_sgb', 'lineamentos_sgb'],
      center: [-28.99, -49.86],
      zoom: 12,
      color: '#b45309',
    },
    {
      id: 'infra_servicos',
      title: 'Infraestrutura, Saúde (CNES), Escolas e Viário',
      desc: '20 Unidades de Saúde (DataSUS/CNES), Escolas, Equipamentos Comunitários, Rodovias SC-108/SC-285 e 70 Pontes.',
      basemap: 'satelite_hibrido',
      layers: ['limite_municipal_ibge', 'area_urbanizada_ipt', 'rodovias_jacinto', 'unidades_saude_cnes', 'escolas_osm', 'equipamentos_publicos_osm', 'pontes_osm'],
      center: [-28.999, -49.768],
      zoom: 13,
      color: '#7c3aed',
    },
    {
      id: 'turismo_canions',
      title: 'Turismo, Cânions da Serra Geral e Trilhas',
      desc: 'Parque Nacional da Serra Geral, 40 atrativos naturais/cachoeiras/picos, 54 trilhas ecológicas e localidades rurais.',
      basemap: 'opentopomap',
      layers: ['limite_municipal_ibge', 'unidades_conservacao_mma', 'trilhas_osm', 'turismo_atrativos_osm', 'localidades_jacinto'],
      center: [-28.995, -49.90],
      zoom: 12,
      color: '#0d9488',
    },
    {
      id: 'socioeconomico_censo',
      title: 'Censo IBGE 2022 — Setores Urbanos e Rurais',
      desc: '36 setores censitários oficiais do Censo 2022 (10.624 hab. • 58,95% urbana / 41,05% rural) + Mancha Urbana IPT.',
      basemap: 'carto_light',
      layers: ['limite_municipal_ibge', 'setores_censitarios_ibge', 'area_urbanizada_ipt', 'localidades_jacinto'],
      center: [-29.00, -49.84],
      zoom: 12,
      color: '#033c8e',
    },
  ];

  function getLayerById(id) {
    for (const g of LAYER_GROUPS) {
      const found = g.layers.find((l) => l.id === id);
      if (found) return { layer: found, group: g };
    }
    return null;
  }

  function getAllLayers() {
    const out = [];
    for (const g of LAYER_GROUPS) {
      for (const l of g.layers) out.push({ ...l, groupId: g.id, groupName: g.name });
    }
    return out;
  }

  return {
    FBDS_BASE,
    SIGSC_WMS,
    RIGEO_ITEM_URL,
    RIGEO_PDF_URL,
    TRANSPARENT_TILE,
    JACINTO_CENTER,
    JACINTO_URBAN_CENTER,
    JACINTO_BOUNDS,
    BASEMAPS,
    LAYER_GROUPS,
    PENDING_MUNICIPAL_LAYERS,
    OFFICIAL_DOWNLOADS,
    THEMATIC_PRESETS,
    getLayerById,
    getAllLayers,
  };
})();
