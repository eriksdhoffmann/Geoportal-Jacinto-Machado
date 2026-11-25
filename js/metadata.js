/**
 * Geoportal Municipal de Jacinto Machado (SC — IBGE 4208708)
 * Registro Central de Metadados (21 campos), Classificação de Origem e Ajuda Didática.
 */
window.GeoMetadata = (() => {
  const CONSULTA_BASE = '25/11/2026';
  const RIGEO_URL = 'https://rigeo.sgb.gov.br/items/c43f811a-d579-4e78-aa19-cb4e54394f08';

  function makeMeta(o) {
    return {
      sourceClass: o.sourceClass || 'Oficial',
      whatIsThis: o.whatIsThis || 'Camada geoespacial oficial integrada ao Geoportal de Jacinto Machado.',
      classHelp: o.classHelp || {},
      redistributable: o.redistributable !== undefined ? Boolean(o.redistributable) : true,
      metadata: {
        nome_camada: o.nome_camada || 'Não informado pela fonte',
        descricao: o.whatIsThis || o.descricao || 'Não informado pela fonte',
        categoria: o.categoria || 'Geoinformação Municipal',
        orgao_responsavel: o.orgao_responsavel || 'Não informado pela fonte',
        instituicao_fornecedora: o.instituicao_fornecedora || o.orgao_responsavel || 'Não informado pela fonte',
        url_fonte_original: o.url_fonte_original || 'Não informado pela fonte',
        url_download_ou_servico: o.url_download_ou_servico || o.url_fonte_original || 'Não informado pela fonte',
        formato: o.formato || 'Shapefile / WFS → GeoJSON',
        tipo_geometria: o.tipo_geometria || 'Polígono',
        sistema_referencia_coordenadas: o.sistema_referencia_coordenadas || 'Origem: SIRGAS 2000 / UTM 22S (EPSG:31982) | Web: WGS 84 (EPSG:4326)',
        escala_cartografica: o.escala_cartografica || '1:50.000',
        resolucao_espacial: o.resolucao_espacial || 'Não aplicável (dado vetorial)',
        data_producao: o.data_producao || '2015–2024',
        data_atualizacao: o.data_atualizacao || '2024',
        data_consulta: o.data_consulta || CONSULTA_BASE,
        abrangencia_territorial: o.abrangencia_territorial || 'Município de Jacinto Machado — SC (IBGE 4208708)',
        licenca_uso: o.licenca_uso || 'Dados Abertos Governamentais',
        restricoes_acesso: o.restricoes_acesso || 'Público (sem restrições de consulta)',
        metodo_obtencao: o.metodo_obtencao || 'Extração oficial, reprojeção para SIRGAS 2000/WGS84, recorte municipal e validação topológica.',
        observacoes_qualidade: o.observacoes_qualidade || 'Validado geograficamente dentro do limite oficial IBGE 4208708.',
        status_validacao: o.status_validacao || 'DISPONÍVEL E VERIFICADO',
      },
    };
  }

  const REGISTRY = {
    limite_municipal_ibge: makeMeta({
      nome_camada: 'Limite Municipal Oficial (IBGE 4208708)',
      whatIsThis: 'Perímetro político-administrativo oficial do município de Jacinto Machado (SC), com área de 430,704 km², fazendo divisa com Timbé do Sul, Turvo, Ermo, Sombrio, Santa Rosa do Sul, Praia Grande (SC) e Cambará do Sul (RS).',
      categoria: 'A. Base Cartográfica',
      orgao_responsavel: 'IBGE — Instituto Brasileiro de Geografia e Estatística',
      url_fonte_original: 'https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/',
      url_download_ou_servico: 'https://servicodados.ibge.gov.br/api/v3/malhas/municipios/4208708?formato=application/vnd.geo+json&qualidade=maxima',
      formato: 'GeoJSON (API IBGE Malhas v3)',
      escala_cartografica: '1:250.000',
      sistema_referencia_coordenadas: 'Origem: SIRGAS 2000 (EPSG:4674) | Web: WGS 84 (EPSG:4326)',
      data_producao: '2022',
      data_atualizacao: '2024',
    }),
    localidades_jacinto: makeMeta({
      sourceClass: 'Colaborativa',
      nome_camada: 'Sede Municipal e Localidades (37)',
      whatIsThis: 'Sede municipal, Pinheirinho Alto, Pinheirinho Baixo (SGB/CPRM) e 34 localidades/comunidades rurais como Serra da Pedra, Água Branca, Costão da Pedra, Tigre Preto, Engenho Velho e Gávea (OpenStreetMap).',
      categoria: 'A. Base Cartográfica',
      orgao_responsavel: 'SGB/CPRM + Comunidade OpenStreetMap',
      url_fonte_original: RIGEO_URL,
      tipo_geometria: 'Ponto',
      escala_cartografica: '1:25.000 / 1:50.000',
      licenca_uso: 'Dados Abertos SGB + ODbL (OSM)',
    }),
    area_urbanizada_ipt: makeMeta({
      nome_camada: 'Áreas Urbanizadas e Edificadas (IPT/SGB — 85)',
      whatIsThis: '85 polígonos de áreas urbanizadas e núcleos edificados traçados pelo IPT (2014) sobre ortofotos oficiais de Santa Catarina para a Carta de Suscetibilidade.',
      categoria: 'A. Base Cartográfica',
      orgao_responsavel: 'SGB/CPRM — Instituto de Pesquisas Tecnológicas (IPT)',
      url_fonte_original: RIGEO_URL,
      escala_cartografica: '1:10.000 / 1:50.000',
      data_producao: '2014',
      data_atualizacao: '2015',
    }),
    rodovias_jacinto: makeMeta({
      sourceClass: 'Colaborativa',
      nome_camada: 'Rodovias Estaduais e Acessos Principais (94)',
      whatIsThis: 'Trechos das rodovias estaduais SC-108 e SC-285 e acessos principais do município.',
      categoria: 'A. Base Cartográfica',
      orgao_responsavel: 'OpenStreetMap (referência viária colaborativa)',
      url_fonte_original: 'https://www.openstreetmap.org/',
      tipo_geometria: 'Linha',
      licenca_uso: 'ODbL (OpenStreetMap)',
    }),
    sistema_viario_osm: makeMeta({
      sourceClass: 'Colaborativa',
      nome_camada: 'Logradouros e Estradas Municipais (487)',
      whatIsThis: 'Malha de ruas urbanas, estradas municipais e caminhos vicinais rurais de Jacinto Machado.',
      categoria: 'A. Base Cartográfica',
      orgao_responsavel: 'OpenStreetMap (colaborativo)',
      url_fonte_original: 'https://www.openstreetmap.org/',
      tipo_geometria: 'Linha',
      licenca_uso: 'ODbL (OpenStreetMap)',
    }),
    sgb_setores_risco: makeMeta({
      nome_camada: 'Setores de Risco Geológico Mapeados (SGB/CPRM — 47)',
      whatIsThis: '47 setores de risco geológico e hidrológico (grau Alto e Muito Alto) mapeados em campo pelo Serviço Geológico do Brasil (SGB/CPRM) com diagnóstico técnico, número estimado de edificações/pessoas e sugestões de intervenção.',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM — Serviço Geológico do Brasil',
      url_fonte_original: 'https://geoservicos.sgb.gov.br/',
      escala_cartografica: '1:2.000 a 1:10.000 (campo)',
      data_producao: '2017–2022',
      data_atualizacao: '2022',
      classHelp: {
        'Muito alto': 'Setor com indícios expressivos de instabilidade ou histórico recorrente severo; requer atenção prioritária da Defesa Civil.',
        Alto: 'Setor com alta probabilidade de ocorrência de processo destrutivo em chuvas intensas.',
      },
    }),
    suscet_inundacao_sgb: makeMeta({
      nome_camada: 'Suscetibilidade a Inundações (SGB/CPRM-IPT — 667)',
      whatIsThis: 'Carta oficial de suscetibilidade a inundações, alagamentos e assoreamento de Jacinto Machado (667 polígonos classificados em Alta, Média e Baixa suscetibilidade).',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (Carta de Suscetibilidade 2015)',
      url_fonte_original: RIGEO_URL,
      escala_cartografica: '1:50.000',
      data_producao: '2015',
      classHelp: {
        Alta: 'Planícies fluviais e fundos de vale com elevada propensão natural a inundações e alagamentos.',
        'Média': 'Terraços e áreas intermediárias atingíveis em cheias mais intensas.',
        Baixa: 'Terrenos com baixa propensão natural a inundações.',
      },
    }),
    suscet_movimento_massa_sgb: makeMeta({
      nome_camada: 'Suscetibilidade a Movimentos de Massa (SGB/CPRM-IPT — 587)',
      whatIsThis: 'Carta oficial de suscetibilidade a deslizamentos, queda de rocha e rastejo nas encostas e escarpas da Serra Geral em Jacinto Machado (587 polígonos).',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (Carta de Suscetibilidade 2015)',
      url_fonte_original: RIGEO_URL,
      escala_cartografica: '1:50.000',
      data_producao: '2015',
    }),
    suscet_corridas_sgb: makeMeta({
      nome_camada: 'Suscetibilidade a Corridas de Massa (SGB/CPRM-IPT — 88)',
      whatIsThis: '88 polígonos de vales encaixados e canais torrenciais suscetíveis a corridas de massa/detritos (debris flow) na escarpa da Serra Geral.',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (RIGeo 2015)',
      url_fonte_original: RIGEO_URL,
      data_producao: '2015',
    }),
    suscet_enxurradas_sgb: makeMeta({
      nome_camada: 'Suscetibilidade a Enxurradas (SGB/CPRM-IPT — 132)',
      whatIsThis: '132 trechos de drenagem e fundos de vale com alta energia hidráulica suscetíveis a enxurradas súbitas.',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (RIGeo 2015)',
      url_fonte_original: RIGEO_URL,
      data_producao: '2015',
    }),
    suscet_bacias_sgb: makeMeta({
      nome_camada: 'Bacias de Suscetibilidade Hidrológica (SGB/IPT — 11)',
      whatIsThis: 'Classificação das 11 principais sub-bacias de Jacinto Machado quanto ao potencial de resposta hidrológica a eventos extremos.',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (RIGeo 2015)',
      url_fonte_original: RIGEO_URL,
      data_producao: '2015',
    }),
    feicoes_instabilidade_sgb: makeMeta({
      nome_camada: 'Feições de Instabilidade — Paredões e Blocos (116)',
      whatIsThis: 'Mapeamento de paredões rochosos, campos de blocos suscetíveis a quedas/rolamentos, depósitos de tálus/colúvio e alagados.',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (RIGeo 2015)',
      url_fonte_original: RIGEO_URL,
      data_producao: '2015',
    }),
    feicoes_pontuais_sgb: makeMeta({
      nome_camada: 'Pontos Críticos — Cicatrizes e Ravinas (100)',
      whatIsThis: '100 ocorrências pontuais de cicatrizes de deslizamento recente e ravinas/processos erosivos identificados na fotointerpretação do IPT/CPRM.',
      categoria: 'D. Defesa Civil e Riscos',
      orgao_responsavel: 'SGB / CPRM & IPT (RIGeo 2015)',
      url_fonte_original: RIGEO_URL,
      tipo_geometria: 'Ponto',
      data_producao: '2015',
    }),
    fbds_uso_solo: makeMeta({
      sourceClass: 'Científica',
      nome_camada: 'Uso e Cobertura do Solo 5m (FBDS SC_4208708)',
      whatIsThis: 'Mapeamento de cobertura da terra em resolução de 5 metros (escala 1:5.000): 49,0% Área Antropizada/Agrícola (21.125 ha), 44,9% Formação Florestal (19.344 ha), 4,1% Silvicultura (1.783 ha), 0,8% Água e 0,5% Área Edificada.',
      categoria: 'C. Meio Ambiente',
      orgao_responsavel: 'FBDS — Fundação Brasileira para o Desenvolvimento Sustentável',
      url_fonte_original: 'https://geo.fbds.org.br/SC/JACINTO_MACHADO/USO/',
      escala_cartografica: '1:5.000',
      resolucao_espacial: '5 metros (RapidEye)',
      licenca_uso: 'Acesso Público / Planejamento Ambiental (FBDS)',
    }),
    fbds_app: makeMeta({
      sourceClass: 'Científica',
      nome_camada: 'Áreas de Preservação Permanente — APP (FBDS)',
      whatIsThis: '2.813 polígonos de faixas marginais de proteção de rios, nascentes (raio de 50 m) e massas d’água conforme o Código Florestal (Lei 12.651/2012).',
      categoria: 'C. Meio Ambiente',
      orgao_responsavel: 'FBDS — Fundação Brasileira para o Desenvolvimento Sustentável',
      url_fonte_original: 'https://geo.fbds.org.br/SC/JACINTO_MACHADO/APP/',
      escala_cartografica: '1:5.000',
      resolucao_espacial: '5 metros',
      licenca_uso: 'Acesso Público / Planejamento Ambiental (FBDS)',
    }),
    unidades_conservacao_mma: makeMeta({
      nome_camada: 'Unidades de Conservação — Parque Nacional da Serra Geral',
      whatIsThis: 'Limites oficiais da porção do Parque Nacional da Serra Geral (CNUC 0000.00.0153 — gestão ICMBio) inserida no setor oeste/serrano de Jacinto Machado.',
      categoria: 'C. Meio Ambiente',
      orgao_responsavel: 'MMA / ICMBio (via GeoServer IMA-SC)',
      url_fonte_original: 'https://geo.ima.sc.gov.br/',
      escala_cartografica: '1:50.000',
    }),
    fitogeografico_ima: makeMeta({
      nome_camada: 'Regiões Fitogeográficas / Vegetação (IMA-SC)',
      whatIsThis: 'Domínios vegetacionais originais de Jacinto Machado: Floresta Nebular de Crista, Floresta Tropical Meridional e Planície Quaternária Sul.',
      categoria: 'C. Meio Ambiente',
      orgao_responsavel: 'IMA-SC — Instituto do Meio Ambiente de Santa Catarina',
      url_fonte_original: 'https://geo.ima.sc.gov.br/',
    }),
    unidades_saude_cnes: makeMeta({
      nome_camada: 'Unidades de Saúde Ativas (DataSUS / CNES — 20)',
      whatIsThis: '20 estabelecimentos de saúde ativos em Jacinto Machado (código 420870) extraídos da API Oficial de Dados Abertos do Ministério da Saúde / CNES.',
      categoria: 'E. Infraestrutura e Equipamentos',
      orgao_responsavel: 'Ministério da Saúde / DataSUS (CNES)',
      url_fonte_original: 'https://apidadosabertos.saude.gov.br/',
      tipo_geometria: 'Ponto',
      data_atualizacao: '2026 (API ao vivo)',
    }),
    setores_censitarios_ibge: makeMeta({
      nome_camada: 'Setores Censitários — Censo 2022 (IBGE — 36)',
      whatIsThis: '36 setores censitários oficiais do Censo Demográfico 2022 para Jacinto Machado (População: 10.624 hab. — 58,95% urbana e 41,05% rural; 3.951 domicílios ocupados).',
      categoria: 'F. Informações Socioeconômicas',
      orgao_responsavel: 'IBGE — Instituto Brasileiro de Geografia e Estatística',
      url_fonte_original: 'https://geoservicos.ibge.gov.br/',
      sistema_referencia_coordenadas: 'Origem: SIRGAS 2000 (EPSG:4674) | Web: WGS 84 (EPSG:4326)',
      data_producao: '2022',
    }),
  };

  const FIELD_LABELS = [
    ['nome_camada', 'Nome da Camada'],
    ['descricao', 'Descrição'],
    ['categoria', 'Grupo Temático'],
    ['orgao_responsavel', 'Órgão Responsável'],
    ['instituicao_fornecedora', 'Instituição Fornecedora'],
    ['url_fonte_original', 'URL da Fonte Original'],
    ['url_download_ou_servico', 'URL de Download / Serviço'],
    ['formato', 'Formato'],
    ['tipo_geometria', 'Tipo de Geometria'],
    ['sistema_referencia_coordenadas', 'Sistema de Referência (SRC)'],
    ['escala_cartografica', 'Escala Cartográfica'],
    ['resolucao_espacial', 'Resolução Espacial'],
    ['data_producao', 'Data de Produção'],
    ['data_atualizacao', 'Última Atualização'],
    ['data_consulta', 'Data de Consulta'],
    ['abrangencia_territorial', 'Abrangência Territorial'],
    ['licenca_uso', 'Licença de Uso'],
    ['restricoes_acesso', 'Restrições de Acesso'],
    ['metodo_obtencao', 'Método de Obtenção'],
    ['observacoes_qualidade', 'Qualidade / Validação'],
    ['status_validacao', 'Status'],
  ];

  function getSourceBadgeMeta(sourceClass) {
    if (sourceClass === 'Científica') return { cls: 'src-cientifica', label: 'Científica', title: 'Base técnica/científica de alta resolução (ex: FBDS)' };
    if (sourceClass === 'Colaborativa') return { cls: 'src-colaborativa', label: 'Colaborativa (OSM)', title: 'Mapeamento colaborativo aberto OpenStreetMap (ODbL)' };
    return { cls: 'src-oficial', label: 'Oficial', title: 'Dado oficial produzido por órgão público (IBGE, SGB/CPRM, IMA-SC, SIGSC, DataSUS)' };
  }

  function getEntry(layerId, fallbackCfg = {}) {
    if (REGISTRY[layerId]) return REGISTRY[layerId];
    const isOsm = layerId.includes('osm') || layerId.includes('rodovias') || layerId.includes('trilhas');
    const isFbds = layerId.startsWith('fbds_');
    const isIma = layerId.includes('ima');
    const isSigsc = layerId.includes('sigsc');
    const isSgb = layerId.includes('sgb') || layerId.includes('suscet') || layerId.includes('geologia') || layerId.includes('pedologia') || layerId.includes('relevo') || layerId.includes('curvas') || layerId.includes('lineamentos') || layerId.includes('isoietas') || layerId.includes('areas_umidas');
    const org = isOsm ? 'OpenStreetMap (colaborativo)'
      : isFbds ? 'FBDS — Fundação Brasileira para o Desenvolvimento Sustentável'
      : isIma ? 'IMA-SC — Instituto do Meio Ambiente de Santa Catarina'
      : isSigsc ? 'Governo de SC — SDS / SIGSC'
      : isSgb ? 'SGB / CPRM — Serviço Geológico do Brasil (RIGeo / GeoSGB)'
      : 'Fonte Institucional';
    const url = isOsm ? 'https://www.openstreetmap.org/'
      : isFbds ? 'https://geo.fbds.org.br/SC/JACINTO_MACHADO/'
      : isIma ? 'https://geo.ima.sc.gov.br/'
      : isSigsc ? 'https://sigsc.sc.gov.br/'
      : RIGEO_URL;
    return makeMeta({
      sourceClass: isOsm ? 'Colaborativa' : (isFbds ? 'Científica' : 'Oficial'),
      nome_camada: fallbackCfg.name || layerId,
      whatIsThis: fallbackCfg.description || fallbackCfg.name || layerId,
      categoria: fallbackCfg.groupName || fallbackCfg.group || 'Geoinformação Municipal',
      orgao_responsavel: org,
      url_fonte_original: url,
      formato: fallbackCfg.type === 'wms' ? 'Serviço WMS HTTPS' : (fallbackCfg.type === 'xyz' || fallbackCfg.type === 'hybrid' ? 'Tiles XYZ' : 'GeoJSON (SIRGAS 2000 / WGS84)'),
      tipo_geometria: fallbackCfg.geomType === 'point' ? 'Ponto' : (fallbackCfg.geomType === 'line' ? 'Linha' : (fallbackCfg.type === 'wms' || fallbackCfg.type === 'xyz' ? 'Raster / Imagem' : 'Polígono')),
      escala_cartografica: isFbds ? '1:5.000' : (isSgb ? '1:50.000' : '1:25.000 / Variável'),
      redistributable: fallbackCfg.type !== 'wms' && fallbackCfg.type !== 'xyz' && fallbackCfg.type !== 'hybrid',
    });
  }

  return {
    REGISTRY,
    FIELD_LABELS,
    makeMeta,
    getEntry,
    getSourceBadgeMeta,
  };
})();
