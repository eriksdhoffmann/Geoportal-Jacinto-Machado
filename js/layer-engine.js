/**
 * Geoportal Municipal de Jacinto Machado — Motor de Camadas GIS Multi-Fonte (IBGE, FBDS, SIGSC, IMA-SC, SGB/CPRM, CNES, OSM).
 *   - 44 camadas vetoriais 100% funcionais tanto online (GitHub Pages HTTPS) quanto local (file://)
 *   - Suporte nativo a WMS HTTPS oficial do SIGSC (Ortofoto SC 2012 39 cm, MDT-2012, MDS-2012)
 *   - Recorte oficial pelo Limite IBGE 4208708 (430,704 km²) com máscara vetorial nítida
 *   - Empilhamento determinístico (1 pane + renderer Canvas exclusivo por camada)
 *   - Reprojeção cliente SIRGAS 2000 UTM 22S (EPSG:31982) -> WGS84 (EPSG:4326) para importação SIG
 *   - Raio-X Territorial ponto-em-polígono exato multi-camada
 */
window.GeoLayerEngine = (() => {
  const {
    BASEMAPS,
    TRANSPARENT_TILE,
    JACINTO_BOUNDS,
    JACINTO_URBAN_CENTER,
    getLayerById,
  } = window.GeoCatalog;

  const GITHUB_PAGES_BASE = 'https://eriksdhoffmann.github.io/Geoportal-Jacinto-Machado';

  const HIDDEN_FIELDS = new Set([
    'objectid', 'fid', 'globalid', 'shape__area', 'shape__length',
    'shape_leng', 'shape_area', 'id', 'id1', 'cd_fcim', 'fit_tp',
  ]);

  const FIELD_LABELS = {
    CD_MUN: 'Código IBGE',
    Classe: 'Classe de Suscetibilidade / Relevo',
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
    NM_MUN: 'Município',
    SIGLA_UF: 'UF',
    AREA_KM2: 'Área Oficial (km²)',
    NM_REGIAO: 'Região Metropolitana',
    FONTE: 'Fonte',
    fonte: 'Fonte',
    nome: 'Nome',
    area_km2: 'Área (km²)',
    area_ha: 'Área (ha)',
    AREA_HA: 'Área (ha)',
    ar_poli_km: 'Área do Polígono (km²)',
    cd_setor: 'Código do Setor (IBGE)',
    situacao: 'Situação Censitária',
    distrito: 'Distrito',
    bairro: 'Bairro',
    nucleo_urbano: 'Núcleo Urbano',
    aglomerado: 'Aglomerado',
    setores_urbanos: 'Setores Urbanos',
    CLASSE_USO: 'Classe de Uso da Terra',
    MUNICIPIO: 'Município',
    UF: 'UF',
    HIDRO: 'Feição Hidrográfica',
    APP_M: 'Faixa de APP (m)',
    COMP_KM: 'Comprimento (km)',
    NATUREZA: 'Natureza',
    SETOR: 'Setor',
    RIO: 'Curso d’Água Associado',
    bhi_nm: 'Bacia Hidrográfica',
    bhi_nm_comite: 'Comitê de Bacia',
    bhi_ar_km2: 'Área Total da Bacia (km²)',
    cobacia: 'Código Ottobacia (ANA)',
    cocursodag: 'Código Curso d’Água',
    nuordemcda: 'Ordem Fluvial',
    nunivotto: 'Nível Ottocodificação',
    regiao_fito: 'Região Fitogeográfica',
    fit_ar_ha: 'Área Estadual (ha)',
    terrai_nome: 'Terra Indígena',
    etnia_nome: 'Etnia',
    fase_ti: 'Fase Demarcatória',
    modalidade_ti: 'Modalidade',
    superficie_perimetro_ha: 'Superfície (ha)',
    municipio_nome: 'Municípios Abrangidos',
    cr: 'Coordenação Regional (FUNAI)',
    nome_empreendimento: 'Empreendimento',
    atividade: 'Atividade Licenciada',
    tipo: 'Tipo',
    tipo_licenca: 'Tipo de Licença',
    porte_empreendimento: 'Porte',
    potencial_geral_atividade: 'Potencial Poluidor',
    etapa_atual: 'Etapa Atual',
    licenca_status: 'Status da Licença',
    processo: 'Nº Processo IMA',
    endereco_logradouro: 'Logradouro',
    endereco_bairro: 'Bairro',
    aia_numero: 'Nº Auto Infração',
    aia_serie: 'Série',
    aia_data: 'Data da Autuação',
    aia_ano: 'Ano',
    aia_categoria: 'Categoria da Infração',
    aia_bairro: 'Bairro / Localidade',
    aia_status: 'Situação',
    orgao: 'Órgão Fiscalizador',
    embargo_numero: 'Nº Embargo',
    processo_numero: 'Nº Processo',
    infracao_data: 'Data da Infração',
    infracao_categoria: 'Categoria',
    infracao_descricao: 'Descrição',
    esta_vigente: 'Embargo Vigente',
    num_setor: 'Código do Setor (CPRM)',
    local: 'Localidade / Endereço',
    tipolo_g1: 'Processo / Tipologia',
    cobrade_01: 'Código COBRADE',
    grau_risco: 'Grau de Risco',
    grau_vulne: 'Vulnerabilidade',
    num_edif: 'Edificações em Risco',
    num_domi: 'Domicílios Estimados',
    num_pess: 'Pessoas Estimadas',
    descricao: 'Diagnóstico Técnico',
    sug_interv: 'Intervenção Sugerida',
    data_setor: 'Data do Mapeamento',
    orgao_exec: 'Órgão Executor',
    nm_unidade: 'Unidade',
    letra_simb: 'Sigla Geológica',
    nm_lito1: 'Litologia Principal',
    nm_lito2: 'Litologia Secundária',
    nm_tempo_g: 'Era / Período Geológico',
    nm_provincia: 'Província Estrutural',
    nm_dominio: 'Domínio Morfoestrutural',
    nm_regiao: 'Região Geomorfológica',
    categoria: 'Categoria de Relevo',
    natureza: 'Natureza Morfológica',
    forma: 'Modelado / Forma',
    legenda: 'Classificação Oficial',
    legenda_1: 'Região Fitoecológica',
    legenda_2: 'Subgrupo',
    nm_uveg: 'Formação Vegetal',
    nm_uantr: 'Uso Antrópico',
    clas_domi: 'Classe Dominante',
    ordem: 'Ordem do Solo',
    subordem: 'Subordem',
    grande_gru: 'Grande Grupo',
    textura: 'Textura',
    relevo: 'Relevo Local',
    cod_simbol: 'Símbolo Pedológico',
    nome_unida: 'Unidade Hidrogeológica',
    dom: 'Domínio Hidrogeológico',
    subdom: 'Subdomínio',
    sigla_unid: 'Sigla',
    idt_ponto: 'Código SIAGAS',
    str_local_ponto: 'Local / Propriedade',
    str_natureza_ponto: 'Natureza do Ponto',
    str_tipo_situacao: 'Situação do Poço',
    str_uso_agua: 'Uso da Água',
    str_aquifero: 'Aquífero Captado',
    num_profundidade: 'Profundidade (m)',
    num_vazao_especifica: 'Vazão Específica (m³/h/m)',
    data_perfuracao: 'Data de Perfuração',
    cota: 'Cota Altimétrica (m)',
    cota_label: 'Cota',
    tipocurvan: 'Tipo de Isolinha',
    ref: 'Sigla / Rodovia',
    jurisdicao: 'Jurisdição',
    hierarquia: 'Hierarquia Viária',
    vel_max: 'Velocidade Máxima',
    pavimento: 'Pavimentação',
    operador: 'Operador / Concessionária',
    bitola: 'Bitola',
    uso: 'Uso',
    rodovia: 'Rodovia / Via',
    abrigo: 'Abrigo de Passageiros',
    cnes: 'Código CNES',
    razao_social: 'Razão Social / Entidade',
    endereco: 'Endereço',
    telefone: 'Telefone',
    atende_sus: 'Atende SUS',
    categoria: 'Categoria',
    classe: 'Classe',
    setor: 'Setor Industrial',
    esporte: 'Modalidade / Uso',
    // IBGE CNEFE 2022 & Logradouros
    l: 'Logradouro',
    n: 'Número Predial',
    b: 'Localidade / Bairro',
    c: 'CEP',
    e: 'Espécie CNEFE',
    q: 'Quadra (IBGE)',
    f: 'Face (IBGE)',
    s: 'Código do Setor',
    localidade: 'Localidade / Bairro',
    cep: 'CEP',
    qtd_enderecos: 'Qtd. Endereços Cadastrados',
    faixa_numerica: 'Faixa Numérica Predial',
    logradouro: 'Logradouro',
    numero: 'Número Predial',
    cod_especie: 'Código Espécie CNEFE',
    // INCRA / SIGEF
    nome_area: 'Denominação da Área / Imóvel',
    parcela_codigo: 'Código da Parcela (SIGEF)',
    codigo_imovel: 'Código do Imóvel (SNCR)',
    status: 'Status INCRA',
    situacao_informada: 'Situação Registral',
    registro_matricula: 'Matrícula RI',
    registro_cns: 'Cartório (CNS)',
    area_hectares: 'Área Certificada (ha)',
    data_aprovacao: 'Data de Aprovação',
    // Edificações OSM
    uso_osm: 'Tipo (OSM)',
    pavimentos: 'Pavimentos (OSM)',
    // DNIT SNV/OAE & IBGE BC25-SC (Fase 3)
    codigo_br: 'Rodovia Federal (BR)',
    codigo_snv: 'Código SNV (DNIT)',
    tipo_trecho: 'Tipo de Trecho SNV',
    local_inicio: 'Início do Trecho',
    local_fim: 'Fim do Trecho',
    km_inicio: 'km Inicial',
    km_fim: 'km Final',
    superficie: 'Superfície / Pavimento',
    versao_snv: 'Versão SNV Vigente',
    extensao_km: 'Extensão (km)',
    codigo_oae: 'Código OAE (DNIT)',
    codigo_sgo: 'Código SGO',
    classe_mapa: 'Identificação / Jurisdição',
    tipovia: 'Tipo de Via (IBGE)',
    revestimento: 'Revestimento',
    nrpistas: 'Nº de Pistas',
    nrfaixas: 'Nº de Faixas',
    situacaofisica: 'Situação Física',
    material: 'Material Construtivo',
    modal: 'Modal de Uso',
    // Plano Diretor LC nº 281/2019 (Anexos 02, 03, 05, 09, 12)
    macrozona: 'Macrozona (LC 281/2019)',
    zona: 'Sigla do Zoneamento',
    nome_zona: 'Denominação da Zona',
    categoria_macro: 'Enquadramento Territorial',
    taxa_ocupacao: 'Taxa de Ocupação (TO)',
    cal_basico: 'CAL Básico',
    cal_maximo: 'CAL Máximo',
    gabarito_pavimentos: 'Gabarito Máximo (pav.)',
    lote_area_minima: 'Área Mínima do Lote',
    lote_testada_minima: 'Testada Mínima',
    taxa_permeabilidade: 'Taxa de Permeabilidade',
    recuo_frontal: 'Recuo Frontal Mínimo',
    usos_admitidos: 'Usos Admitidos (Anexo 05)',
    legislacao: 'Base Legal',
    aviso_origem: 'Aviso de Procedência',
    iou_ajuste_limite: 'Índice IoU de Ajuste ao Limite',
    // Meio Ambiente, Declividade & MMA/SGB (Fase 5)
    faixa_app: 'Faixa Legal de APP',
    origem_lote: 'Articulação / Lote SIGSC',
    classe_codigo: 'Código da Classe',
    classe_declividade: 'Classe de Declividade',
    classe_curta: 'Declividade (%)',
    nome_comum: 'Nome Popular (Espécie)',
    nome_cientifico: 'Nome Científico',
    produto: 'Produto Florestal (SINFAT)',
    volume: 'Volume Estimado',
    fce_codigo: 'Código FCE / Processo',
    processo: 'Tipo de Fenômeno',
    municipio_mapeado: 'Município de Origem da Carta',
    bioma_recorte: 'Recorte Bioma / Zona',
    codigo_area: 'Código MMA',
    importancia: 'Importância Biológica',
    prioridade_acao: 'Prioridade de Ação',
    acao_principal: 'Ação Preconizada (MMA)',
    // Infraestrutura, Energia, Dutos e CNES (Fase 6)
    esfera: 'Esfera Jurídica',
    natureza_juridica: 'Natureza Jurídica (CNES)',
    gestao: 'Gestão SUS',
    data_atualizacao: 'Última Atualização (CNES)',
    tensao: 'Tensão Nominal',
    extensao_total: 'Extensão Total da Linha',
    extensao_km: 'Extensão (km)',
    oid_aneel: 'Código OID (ANEEL)',
    agente: 'Agente / Concessionária',
    capacidade_aneel: 'Capacidade Registrada (ANEEL)',
    concessionaria: 'Concessionária de Energia',
    unidades_consumidoras: 'Unidades Consumidoras (ANEEL)',
    area_km2_ibge: 'Área Oficial IBGE (km²)',
    material_transp: 'Material Transportado',
    nrdutos: 'Número de Dutos',
    situacao_fisica: 'Situação Física',
    especie: 'Espécie / Tipo',
    operacional: 'Em Operação',
    geometria_origem: 'Tipo de Registro (IBGE BC25)',
    observacao: 'Observação Técnica',
    // Socioeconômico Censo 2022 & IPHAN (Fase 7)
    populacao_2022: 'População (Censo 2022)',
    domicilios_2022: 'Total de Domicílios (2022)',
    domicilios_ocupados_2022: 'Domicílios Ocupados (2022)',
    domicilios_ocasionais_2022: 'Domicílios de Uso Ocasional',
    domicilios_vagos_2022: 'Domicílios Vagos (2022)',
    media_moradores: 'Média de Moradores / Domicílio',
    densidade_hab_km2: 'Densidade Demográfica (hab/km²)',
    classe_densidade: 'Faixa de Densidade Demográfica',
    taxa_alfabetizacao_pct: 'Alfabetização (15+ anos)',
    agua_rede_geral_pct: 'Água — Rede Geral (%)',
    esgoto_adequado_pct: 'Esgoto Adequado — Rede/Fossa (%)',
    coleta_lixo_pct: 'Coleta de Lixo Domiciliar (%)',
    classe_agua: 'Cobertura de Rede Geral de Água',
    bairro_ibge: 'Bairro (Censo IBGE 2022)',
    fcu_ibge: 'Favela / Comunidade Urbana (IBGE)',
    cd_fcu: 'Código FCU (IBGE)',
    setores_censitarios: 'Qtd. Setores Censitários',
    cnsa: 'Código CNSA / IPHAN',
    natureza: 'Natureza do Bem',
    classificacao: 'Período / Classificação',
    data_cadastro: 'Data de Cadastro (IPHAN)',
    sintese: 'Síntese Descritiva',
  };

  function prettyFieldName(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    const lk = String(key || '').toLowerCase();
    if (FIELD_LABELS[lk]) return FIELD_LABELS[lk];
    return String(key)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatFieldValue(key, val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
    if (Array.isArray(val)) return val.join(', ');
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) return null;
      return Number.isInteger(val) ? val.toLocaleString('pt-BR') : val.toFixed(2).replace('.', ',');
    }
    const str = String(val).trim();
    if (!str || str === 'null' || str === 'Null' || str === 'undefined' || str === 'None') return null;
    return str;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function fetchWithTimeout(url, opts = {}, timeoutMs = 15000) {
    const ctrl = new AbortController();
    const extSignal = opts.signal;
    if (extSignal?.aborted) ctrl.abort(extSignal.reason);
    const onAbort = () => ctrl.abort(extSignal?.reason);
    if (extSignal) extSignal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(new DOMException('Tempo limite excedido', 'TimeoutError')), timeoutMs);
    try {
      return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
      if (extSignal) extSignal.removeEventListener('abort', onAbort);
    }
  }

  // ---- Reprojeção UTM 22S -> WGS84 para arquivos importados ----
  function extractFirstCoord(geom) {
    if (!geom) return null;
    if (geom.type === 'GeometryCollection') {
      for (const g of geom.geometries || []) {
        const c = extractFirstCoord(g);
        if (c) return c;
      }
      return null;
    }
    let cur = geom.coordinates;
    while (Array.isArray(cur) && Array.isArray(cur[0])) cur = cur[0];
    if (Array.isArray(cur) && cur.length >= 2 && Number.isFinite(cur[0]) && Number.isFinite(cur[1])) {
      return cur;
    }
    return null;
  }

  function convertCoordsRecursive(coords) {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [x, y] = coords;
      if ((Math.abs(x) > 180 || Math.abs(y) > 90) && window.GeoCoords?.utm22SToLatLon) {
        const ll = window.GeoCoords.utm22SToLatLon(x, y);
        return [Number(ll.lon.toFixed(6)), Number(ll.lat.toFixed(6))];
      }
      return coords.length > 2 ? [x, y] : coords;
    }
    return coords.map(convertCoordsRecursive);
  }

  function convertGeometryToWgs84(geom) {
    if (!geom) return geom;
    if (geom.type === 'GeometryCollection') {
      return {
        type: 'GeometryCollection',
        geometries: (geom.geometries || []).map(convertGeometryToWgs84),
      };
    }
    return { ...geom, coordinates: convertCoordsRecursive(geom.coordinates) };
  }

  function normalizeGeoJsonToWgs84(raw) {
    if (!raw) return { type: 'FeatureCollection', features: [] };
    const fc = Array.isArray(raw) ? { type: 'FeatureCollection', features: raw } : raw;
    const feats = fc.features || [];
    if (!feats.length) return { type: 'FeatureCollection', features: [] };

    let needsReproj = false;
    const crsName = String(fc.crs?.properties?.name || '');
    if (/31982|32722|29192/.test(crsName)) {
      needsReproj = true;
    } else {
      for (let i = 0; i < Math.min(20, feats.length); i++) {
        const sample = extractFirstCoord(feats[i]?.geometry);
        if (sample && (Math.abs(sample[0]) > 180 || Math.abs(sample[1]) > 90)) {
          needsReproj = true;
          break;
        }
      }
    }
    if (!needsReproj) return { type: 'FeatureCollection', features: feats };
    return {
      type: 'FeatureCollection',
      features: feats.map((f) => ({ ...f, geometry: convertGeometryToWgs84(f.geometry) })),
    };
  }

  // ---- Geometria exata (ponto em polígono / distância a segmento) para Raio-X ----
  function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersect =
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInPolygonCoords(lon, lat, rings) {
    if (!rings?.length || !pointInRing(lon, lat, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lon, lat, rings[i])) return false;
    }
    return true;
  }

  function distPointToSegmentSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return (px - cx) * (px - cx) + (py - cy) * (py - cy);
  }

  function pointNearLine(lon, lat, lineCoords, tolSq) {
    for (let i = 0; i < lineCoords.length - 1; i++) {
      const a = lineCoords[i];
      const b = lineCoords[i + 1];
      if (distPointToSegmentSq(lon, lat, a[0], a[1], b[0], b[1]) <= tolSq) return true;
    }
    return false;
  }

  function geomContainsLatLng(geom, latlng, tolDeg) {
    if (!geom) return false;
    const lon = latlng.lng;
    const lat = latlng.lat;
    const tolSq = tolDeg * tolDeg;
    switch (geom.type) {
      case 'Polygon':
        return pointInPolygonCoords(lon, lat, geom.coordinates);
      case 'MultiPolygon':
        return (geom.coordinates || []).some((poly) => pointInPolygonCoords(lon, lat, poly));
      case 'Point': {
        const [px, py] = geom.coordinates || [];
        return (px - lon) * (px - lon) + (py - lat) * (py - lat) <= tolSq * 4;
      }
      case 'MultiPoint':
        return (geom.coordinates || []).some(
          ([px, py]) => (px - lon) * (px - lon) + (py - lat) * (py - lat) <= tolSq * 4
        );
      case 'LineString':
        return pointNearLine(lon, lat, geom.coordinates || [], tolSq);
      case 'MultiLineString':
        return (geom.coordinates || []).some((line) => pointNearLine(lon, lat, line, tolSq));
      case 'GeometryCollection':
        return (geom.geometries || []).some((g) => geomContainsLatLng(g, latlng, tolDeg));
      default:
        return false;
    }
  }

  // ---- Carregador dinâmico do bundle extra (apenas quando em file://) ----
  let extraBundlePromise = null;
  function ensureExtraBundleLoaded() {
    if (window.GEOJACINTO_BUNDLE?.fbds_uso_solo) return Promise.resolve();
    if (extraBundlePromise) return extraBundlePromise;
    extraBundlePromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'js/jacinto-bundle-extra.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar js/jacinto-bundle-extra.js'));
      document.head.appendChild(s);
    });
    return extraBundlePromise;
  }

  // Subclasse TileLayer para Bing VirtualEarth QuadKey
  const BingTileLayer = L.TileLayer.extend({
    getTileUrl(coords) {
      let quadKey = '';
      for (let i = coords.z; i > 0; i--) {
        let digit = 0;
        const mask = 1 << (i - 1);
        if ((coords.x & mask) !== 0) digit += 1;
        if ((coords.y & mask) !== 0) digit += 2;
        quadKey += digit;
      }
      const s = this._getSubdomain(coords);
      return L.Util.template(this._url, { s, q: quadKey });
    },
  });

  function attachTileRetry(tileLayer, maxRetries = 2) {
    tileLayer.on('tileerror', (ev) => {
      const img = ev.tile;
      if (!img) return;
      const attempt = Number(img.dataset.retryCount || 0);
      if (attempt >= maxRetries) return;
      img.dataset.retryCount = String(attempt + 1);
      const rawSrc = tileLayer.getTileUrl(ev.coords);
      if (!rawSrc || rawSrc.startsWith('data:')) return;
      const sep = rawSrc.includes('?') ? '&' : '?';
      setTimeout(() => {
        if (!img.isConnected) return;
        img.src = `${rawSrc}${sep}_r=${attempt + 1}`;
      }, 350 * (attempt + 1));
    });
    return tileLayer;
  }

  function createEngine(map, callbacks = {}) {
    const basemapLayers = new Map();
    const activeBasemaps = new Set();
    const activeLayers = new Map();
    const layerOrder = []; // bottom -> top
    const dataCache = new Map(); // id -> geojson
    const userLayers = [];

    // Panes dedicados para empilhamento determinístico
    map.createPane('paneBasemapUnderlay').style.zIndex = 195;
    map.createPane('paneBasemapGlobal').style.zIndex = 200;
    map.createPane('paneBasemapMunicipal').style.zIndex = 210;
    map.createPane('paneBasemapLabels').style.zIndex = 218;
    map.createPane('paneSwipeRight').style.zIndex = 222;
    map.createPane('paneMunicipalMask').style.zIndex = 230;
    map.getPane('paneMunicipalMask').style.pointerEvents = 'none';
    map.createPane('paneToolsOverlay').style.zIndex = 650;

    // Underlay contínuo de Satélite HD (Esri World Imagery) sob ortofotos WMS
    const municipalSatUnderlay = attachTileRetry(
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          minZoom: 5,
          maxNativeZoom: 19,
          maxZoom: 21,
          pane: 'paneBasemapUnderlay',
          keepBuffer: 4,
          attribution: '',
        }
      ),
      2
    );

    // ---- Máscara Oficial do Limite de Jacinto Machado (IBGE 4208708) ----
    let municipalClipEnabled = true;
    let municipalMaskLayer = null;

    function buildMunicipalMask() {
      const gj = window.JACINTO_LIMIT_GEOJSON;
      if (!gj?.features?.[0]?.geometry) return null;
      const geom = gj.features[0].geometry;
      const worldRing = [
        [-85, -180],
        [-85, 180],
        [85, 180],
        [85, -180],
        [-85, -180],
      ];
      const holes = [];
      const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
      for (const poly of polys) {
        if (poly[0]) {
          holes.push(poly[0].map(([lon, lat]) => [lat, lon]));
        }
      }
      const maskSvg = L.svg({ pane: 'paneMunicipalMask', padding: 1.0 });
      const group = L.layerGroup();
      L.polygon([worldRing, ...holes], {
        pane: 'paneMunicipalMask',
        renderer: maskSvg,
        stroke: false,
        fillColor: '#ffffff',
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);

      for (const ring of holes) {
        L.polyline(ring, {
          pane: 'paneMunicipalMask',
          renderer: maskSvg,
          color: '#033c8e',
          weight: 1.7,
          opacity: 0.78,
          interactive: false,
        }).addTo(group);
      }
      return group;
    }

    function syncMunicipalMask() {
      if (!municipalMaskLayer) municipalMaskLayer = buildMunicipalMask();
      if (!municipalMaskLayer) return;

      const hasUnderlayBm = [...activeBasemaps].some((id) => {
        const b = BASEMAPS.find((x) => x.id === id);
        return b?.hasSatelliteUnderlay;
      });
      if (hasUnderlayBm) {
        if (!map.hasLayer(municipalSatUnderlay)) municipalSatUnderlay.addTo(map);
      } else {
        if (map.hasLayer(municipalSatUnderlay)) map.removeLayer(municipalSatUnderlay);
      }

      if (municipalClipEnabled && activeBasemaps.size > 0) {
        if (!map.hasLayer(municipalMaskLayer)) municipalMaskLayer.addTo(map);
      } else {
        if (map.hasLayer(municipalMaskLayer)) map.removeLayer(municipalMaskLayer);
      }
    }

    function setMunicipalClip(enabled) {
      municipalClipEnabled = Boolean(enabled);
      syncMunicipalMask();
      callbacks.onStateChange?.();
    }

    function isMunicipalClipEnabled() {
      return municipalClipEnabled;
    }

    // ---- Construção de Mapas Base (Tile, Bing QuadKey, Híbrido e WMS SIGSC HTTPS) ----
    function buildTileOpts(bmCfg, customPane) {
      const pane = customPane || (bmCfg.isMunicipalClip ? 'paneBasemapMunicipal' : 'paneBasemapGlobal');
      const opts = {
        minZoom: bmCfg.minZoom || 5,
        maxZoom: bmCfg.maxZoom || 21,
        maxNativeZoom: bmCfg.maxNativeZoom || 19,
        attribution: bmCfg.attribution || '',
        pane,
        opacity: 1,
        keepBuffer: 4,
        updateWhenIdle: false,
      };
      if (bmCfg.bounds) opts.bounds = bmCfg.bounds;
      if (bmCfg.subdomains) opts.subdomains = bmCfg.subdomains;
      if (bmCfg.errorTileUrl) opts.errorTileUrl = bmCfg.errorTileUrl;
      return opts;
    }

    function buildSingleBasemapLayer(bmCfg, customPane = null) {
      if (bmCfg.type === 'bing') {
        return attachTileRetry(new BingTileLayer(bmCfg.url, buildTileOpts(bmCfg, customPane)), 2);
      }
      if (bmCfg.type === 'wms') {
        const pane = customPane || (bmCfg.isMunicipalClip ? 'paneBasemapMunicipal' : 'paneBasemapGlobal');
        return attachTileRetry(
          L.tileLayer.wms(bmCfg.url, {
            layers: bmCfg.wmsLayers,
            format: bmCfg.wmsFormat || 'image/png',
            transparent: Boolean(bmCfg.wmsTransparent),
            version: '1.1.1',
            styles: '',
            pane,
            minZoom: bmCfg.minZoom || 10,
            maxZoom: bmCfg.maxZoom || 21,
            bounds: bmCfg.bounds || JACINTO_BOUNDS,
            attribution: bmCfg.attribution || '',
            tileSize: 256,
            keepBuffer: 3,
          }),
          2
        );
      }
      if (bmCfg.overlayUrls?.length) {
        const opts = buildTileOpts(bmCfg, customPane);
        const grp = L.layerGroup();
        attachTileRetry(L.tileLayer(bmCfg.url, opts), 2).addTo(grp);
        for (const ovUrl of bmCfg.overlayUrls) {
          attachTileRetry(
            L.tileLayer(ovUrl, {
              ...opts,
              pane: customPane || 'paneBasemapLabels',
              attribution: '',
            }),
            1
          ).addTo(grp);
        }
        return grp;
      }
      return attachTileRetry(L.tileLayer(bmCfg.url, buildTileOpts(bmCfg, customPane)), 2);
    }

    function ensureBasemapLayer(bmCfg, customPane = null) {
      if (!customPane && basemapLayers.has(bmCfg.id)) return basemapLayers.get(bmCfg.id);
      const layer = buildSingleBasemapLayer(bmCfg, customPane);
      if (!customPane) basemapLayers.set(bmCfg.id, layer);
      return layer;
    }

    function setBasemapActive(bmId, enabled, exclusive = true) {
      const bmCfg = BASEMAPS.find((b) => b.id === bmId);
      if (!bmCfg) return;
      if (exclusive && enabled) {
        for (const activeId of [...activeBasemaps]) {
          if (activeId !== bmId) {
            const l = basemapLayers.get(activeId);
            if (l && map.hasLayer(l)) map.removeLayer(l);
            activeBasemaps.delete(activeId);
          }
        }
      }
      const layer = ensureBasemapLayer(bmCfg);
      if (enabled) {
        if (!map.hasLayer(layer)) layer.addTo(map);
        activeBasemaps.add(bmId);
      } else {
        if (map.hasLayer(layer)) map.removeLayer(layer);
        activeBasemaps.delete(bmId);
      }
      syncMunicipalMask();
      callbacks.onBasemapChange?.(bmCfg, enabled);
      callbacks.onStateChange?.();
    }

    function isBasemapActive(bmId) {
      return activeBasemaps.has(bmId);
    }

    // ---- Empilhamento Determinístico por Pane Exclusivo ----
    function getOrCreateLayerPane(layerId) {
      const paneName = `paneLayer_${layerId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      let pane = map.getPane(paneName);
      if (!pane) pane = map.createPane(paneName);
      return { paneName, pane };
    }

    function syncLayerZIndexes() {
      for (let i = 0; i < layerOrder.length; i++) {
        const id = layerOrder[i];
        const st = activeLayers.get(id);
        if (!st) continue;
        const z = 410 + i * 4;
        const { pane } = getOrCreateLayerPane(id);
        pane.style.zIndex = String(z);
        st.zIndex = z;
      }
    }

    function moveLayerOrder(layerId, direction) {
      const idx = layerOrder.indexOf(layerId);
      if (idx === -1) return;
      if (direction === 'up' && idx < layerOrder.length - 1) {
        [layerOrder[idx], layerOrder[idx + 1]] = [layerOrder[idx + 1], layerOrder[idx]];
      } else if (direction === 'down' && idx > 0) {
        [layerOrder[idx], layerOrder[idx - 1]] = [layerOrder[idx - 1], layerOrder[idx]];
      } else if (direction === 'top' && idx < layerOrder.length - 1) {
        layerOrder.splice(idx, 1);
        layerOrder.push(layerId);
      } else if (direction === 'bottom' && idx > 0) {
        layerOrder.splice(idx, 1);
        layerOrder.unshift(layerId);
      }
      syncLayerZIndexes();
      callbacks.onStateChange?.();
    }

    function getOrderedActiveLayers() {
      return [...layerOrder]
        .reverse()
        .map((id) => activeLayers.get(id))
        .filter(Boolean);
    }

    // ---- Estilização e Popups Didáticos ----
    function computeFeatureStyle(cfg, feature, opacityOverride) {
      const op = opacityOverride ?? cfg.opacity ?? 0.65;
      const props = feature?.properties || {};
      const colorMap = cfg.colorMap || null;
      const actualType = feature?.geometry?.type || '';
      const isLine = actualType ? actualType.includes('Line') : cfg.geomType === 'line';

      if (isLine) {
        let color = cfg.style?.color || '#0284c7';
        if (cfg.colorField && colorMap) {
          const val = props[cfg.colorField];
          color = colorMap[val] || color;
        }
        return {
          color,
          weight: cfg.style?.weight || 2.3,
          dashArray: cfg.style?.dashArray || null,
          opacity: Math.min(1, op),
        };
      }

      let fillColor = cfg.style?.fillColor || '#3b82f6';
      let color = cfg.style?.color || '#1e293b';
      let fillOpacity = cfg.outlineMode ? (cfg.style?.fillOpacity ?? 0.03) : op;

      if (cfg.colorField && colorMap) {
        const raw = props[cfg.colorField];
        const mapped = colorMap[raw];
        if (mapped) {
          fillColor = mapped;
          color = '#1e293b';
        }
      }

      return {
        color,
        weight: cfg.style?.weight ?? 1.2,
        dashArray: cfg.style?.dashArray || null,
        opacity: Math.min(1, op + 0.28),
        fillColor,
        fillOpacity: cfg.outlineMode ? Math.min(0.25, fillOpacity) : Math.min(0.9, fillOpacity),
      };
    }

    function findOverlappingPoints(geojson, clickedFeature, tolDeg = 0.00018) {
      if (!geojson?.features?.length || !clickedFeature?.geometry) return [clickedFeature];
      const gt = clickedFeature.geometry.type;
      if (gt !== 'Point') return [clickedFeature];
      const [cx, cy] = clickedFeature.geometry.coordinates || [];
      if (cx === undefined || cy === undefined) return [clickedFeature];
      const tolSq = tolDeg * tolDeg;
      const matches = [clickedFeature];
      for (const f of geojson.features) {
        if (f === clickedFeature || f.geometry?.type !== 'Point') continue;
        const [fx, fy] = f.geometry.coordinates || [];
        if ((fx - cx) * (fx - cx) + (fy - cy) * (fy - cy) <= tolSq) {
          matches.push(f);
          if (matches.length >= 12) break;
        }
      }
      return matches;
    }

    function buildFeaturePopupHtml(cfg, feature, pagerState = null) {
      const props = feature?.properties || {};
      const titleVal = cfg.titleField ? formatFieldValue(cfg.titleField, props[cfg.titleField]) : null;
      const heading = titleVal ? `${escapeHtml(cfg.name)} — ${escapeHtml(titleVal)}` : escapeHtml(cfg.name);

      const metaEntry = window.GeoMetadata?.getEntry(cfg.id, cfg);
      const badge = window.GeoMetadata?.getSourceBadgeMeta(metaEntry?.sourceClass || 'Oficial') || {
        label: 'Oficial',
        cls: 'src-oficial',
      };
      const classRaw = cfg.colorField ? props[cfg.colorField] : null;
      const classMeaning = classRaw && window.GeoMetadata ? window.GeoMetadata.getClassHelp(cfg.id, classRaw) : '';

      const rows = [];
      const shown = new Set();
      if (cfg.titleField) shown.add(cfg.titleField.toLowerCase());

      for (const f of cfg.subtitleFields || []) {
        const val = formatFieldValue(f, props[f]);
        if (val) {
          rows.push(`<tr><th>${escapeHtml(prettyFieldName(f))}</th><td>${escapeHtml(val)}</td></tr>`);
          shown.add(f.toLowerCase());
        }
      }
      for (const [k, v] of Object.entries(props)) {
        if (rows.length >= 12) break;
        const lk = k.toLowerCase();
        if (HIDDEN_FIELDS.has(lk) || shown.has(lk)) continue;
        const val = formatFieldValue(k, v);
        if (val) {
          rows.push(`<tr><th>${escapeHtml(prettyFieldName(k))}</th><td>${escapeHtml(val)}</td></tr>`);
          shown.add(lk);
        }
      }

      const warnBox =
        metaEntry?.sourceClass === 'Digitalização não oficial'
          ? `<div class="geo-popup-warn">⚠️ <b>Atenção:</b> Digitalização não oficial a partir de mapa oficial em PDF. Consulte a Prefeitura para validação legal exata.</div>`
          : metaEntry?.sourceClass === 'Colaborativa'
          ? `<div class="geo-popup-warn">ℹ️ <b>Fonte Colaborativa (OSM):</b> Referência comunitária não oficial.</div>`
          : '';

      const didactBox = metaEntry?.whatIsThis
        ? `<div class="geo-popup-what">
             <div><b>O que é isto?</b> ${escapeHtml(metaEntry.whatIsThis)}</div>
             ${classMeaning ? `<div class="geo-popup-class-meaning"><b>${escapeHtml(String(classRaw))}:</b> ${escapeHtml(classMeaning)}</div>` : ''}
           </div>`
        : '';

      const pagerHtml =
        pagerState && pagerState.items.length > 1
          ? `<div class="geo-popup-pager">
               <button type="button" class="gp-opt-btn gp-popup-pager-btn" data-pager-dir="-1">◀ Anterior</button>
               <span>Registro <b>${pagerState.index + 1}</b> de <b>${pagerState.items.length}</b> neste local</span>
               <button type="button" class="gp-opt-btn gp-popup-pager-btn" data-pager-dir="1">Próximo ▶</button>
             </div>`
          : '';

      return `
        <div class="geo-popup">
          <div class="geo-popup-header">
            <div class="geo-popup-title-txt">${heading}</div>
            <span class="gp-src-pill ${badge.cls}">${escapeHtml(badge.label)}</span>
          </div>
          <div class="geo-popup-body">
            ${pagerHtml}
            ${warnBox}
            ${didactBox}
            ${rows.length ? `<table class="geo-popup-table">${rows.join('')}</table>` : '<p class="geo-popup-empty">Sem atributos tabulares adicionais.</p>'}
            <div class="geo-popup-footer">
              <span class="geo-popup-src-txt">Fonte: ${escapeHtml(metaEntry?.metadata?.orgao_responsavel || 'Não informado pela fonte')}</span>
              <button type="button" class="gp-opt-btn" data-open-meta="${escapeHtml(cfg.id)}">ⓘ Metadados</button>
            </div>
          </div>
        </div>`;
    }

    function buildGeoJsonLayer(cfg, geojson, opacity, paneName, fullGeoJson = null) {
      const layerRenderer = L.canvas({ pane: paneName, padding: 0.45 });
      const searchPool = fullGeoJson || geojson;

      return L.geoJSON(geojson, {
        pane: paneName,
        renderer: layerRenderer,
        style: (feature) => computeFeatureStyle(cfg, feature, opacity),
        pointToLayer: (feature, latlng) => {
          const ps = cfg.pointStyle || {
            radius: 6,
            color: '#ffffff',
            weight: 1.8,
            fillColor: '#033c8e',
            fillOpacity: 0.94,
          };
          let fillCol = ps.fillColor || '#033c8e';
          if (cfg.colorField && cfg.colorMap) {
            const v = feature?.properties?.[cfg.colorField];
            if (cfg.colorMap[v]) fillCol = cfg.colorMap[v];
          }
          return L.circleMarker(latlng, {
            ...ps,
            fillColor: fillCol,
            pane: paneName,
            renderer: layerRenderer,
            fillOpacity: Math.min(1, (ps.fillOpacity ?? 0.94) * (opacity ?? 1)),
            opacity: Math.min(1, opacity ?? 1),
          });
        },
        onEachFeature: (feature, layer) => {
          const labelVal = cfg.titleField ? feature.properties?.[cfg.titleField] : null;
          if (labelVal) {
            const lbl = String(labelVal).trim();
            if (lbl) {
              layer.bindTooltip(escapeHtml(lbl), {
                sticky: true,
                direction: 'top',
                className: 'geo-hover-tooltip',
                opacity: 0.94,
              });
            }
          }
          layer.on('click', (ev) => {
            if (callbacks.shouldInterceptClick?.()) return;
            L.DomEvent.stopPropagation(ev);
            const colocated = findOverlappingPoints(searchPool, feature);
            const pagerState = { cfg, items: colocated, index: 0, latlng: ev.latlng };
            window.__GEO_ACTIVE_POPUP_PAGER = pagerState;
            L.popup({ maxWidth: 380, className: 'geo-custom-popup' })
              .setLatLng(ev.latlng)
              .setContent(buildFeaturePopupHtml(cfg, colocated[0], pagerState))
              .openOn(map);
          });
        },
      });
    }

    function buildLabelsGroup(cfg, geojson) {
      if (!cfg.labelField || !geojson?.features?.length) return null;
      const group = L.layerGroup();
      const placed = new Set();

      for (const feat of geojson.features) {
        const text = feat.properties?.[cfg.labelField];
        if (!text) continue;
        const key = String(text).trim();
        if (!key || placed.has(key)) continue;
        placed.add(key);
        try {
          const tmp = L.geoJSON(feat);
          const bounds = tmp.getBounds();
          if (!bounds.isValid()) continue;
          const isBairro = cfg.id === 'bairros_jacinto_machado' || cfg.id === 'distritos_jacinto_machado';
          L.marker(bounds.getCenter(), {
            interactive: false,
            icon: L.divIcon({
              className: `geo-map-label ${isBairro ? 'geo-label-bairro' : 'geo-label-zona'}`,
              html: `<span>${escapeHtml(key)}</span>`,
              iconSize: null,
            }),
          }).addTo(group);
        } catch {
          // ignore
        }
      }
      return group;
    }

    // ---- Resolução de Dados (Bundle Instantâneo + Fetch On-Demand + Fallback file://) ----
    async function resolveLayerGeoJson(cfg, signal = null) {
      if (dataCache.has(cfg.id)) return dataCache.get(cfg.id);

      const bKey = cfg.bundleKey || cfg.id;

      if (cfg.id === 'limite_municipal_ibge' && window.JACINTO_LIMIT_GEOJSON) {
        dataCache.set(cfg.id, window.JACINTO_LIMIT_GEOJSON);
        return window.JACINTO_LIMIT_GEOJSON;
      }

      if (bKey && window.GEOJACINTO_BUNDLE?.[bKey]) {
        const gj = normalizeGeoJsonToWgs84(window.GEOJACINTO_BUNDLE[bKey]);
        dataCache.set(cfg.id, gj);
        return gj;
      }

      const isFileProto = window.location.protocol === 'file:';

      if (isFileProto && bKey) {
        try {
          await ensureExtraBundleLoaded();
          if (window.GEOJACINTO_BUNDLE?.[bKey]) {
            const gj = normalizeGeoJsonToWgs84(window.GEOJACINTO_BUNDLE[bKey]);
            dataCache.set(cfg.id, gj);
            return gj;
          }
        } catch {
          // cai para URL GitHub Pages abaixo
        }
      }

      if (cfg.localFile) {
        const candidates = isFileProto
          ? [`${GITHUB_PAGES_BASE}/${cfg.localFile}`]
          : [cfg.localFile, `${GITHUB_PAGES_BASE}/${cfg.localFile}`];

        let lastErr = null;
        for (const u of candidates) {
          if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
          try {
            const resp = await fetchWithTimeout(u, { signal }, 15000);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const raw = await resp.json();
            const gj = normalizeGeoJsonToWgs84(raw);
            dataCache.set(cfg.id, gj);
            return gj;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            lastErr = err;
          }
        }
        // Fallback para bundle extra local se o fetch falhar (ex: servidor local encerrado)
        if (bKey) {
          try {
            await ensureExtraBundleLoaded();
            if (window.GEOJACINTO_BUNDLE?.[bKey]) {
              const gj = normalizeGeoJsonToWgs84(window.GEOJACINTO_BUNDLE[bKey]);
              dataCache.set(cfg.id, gj);
              return gj;
            }
          } catch {
            // mantém lastErr
          }
        }
        throw lastErr || new Error('Arquivo GeoJSON indisponível');
      }

      throw new Error('Camada sem fonte de dados configurada');
    }

    function clearStateMapObjects(state) {
      if (state.leafletLayer && map.hasLayer(state.leafletLayer)) map.removeLayer(state.leafletLayer);
      if (state.labelGroup && map.hasLayer(state.labelGroup)) map.removeLayer(state.labelGroup);
      state.leafletLayer = null;
      state.labelGroup = null;
    }

    function geomIntersectsBounds(geom, b) {
      if (!geom) return false;
      const west = b.getWest();
      const south = b.getSouth();
      const east = b.getEast();
      const north = b.getNorth();
      const coordsIn = (c) => {
        if (!Array.isArray(c)) return false;
        if (typeof c[0] === 'number') {
          return c[0] >= west && c[0] <= east && c[1] >= south && c[1] <= north;
        }
        return c.some(coordsIn);
      };
      if (geom.type === 'GeometryCollection') {
        return (geom.geometries || []).some((g) => geomIntersectsBounds(g, b));
      }
      return coordsIn(geom.coordinates);
    }

    function filterGeoJsonByBounds(geojson, bounds, cap = 3500) {
      const padded = bounds.pad(0.18);
      const out = [];
      for (const f of geojson?.features || []) {
        if (geomIntersectsBounds(f.geometry, padded)) {
          out.push(f);
          if (out.length >= cap) break;
        }
      }
      return { type: 'FeatureCollection', features: out };
    }

    function renderVectorState(state) {
      const { cfg, paneName } = state;
      const fullGj = state.geojson;
      clearStateMapObjects(state);

      if (cfg.minZoom && map.getZoom() < cfg.minZoom) {
        state.belowMinZoom = true;
        state.renderedCount = 0;
        syncLayerZIndexes();
        callbacks.onStateChange?.();
        return;
      }

      state.belowMinZoom = false;
      const displayGj = cfg.viewportFilter ? filterGeoJsonByBounds(fullGj, map.getBounds(), 3500) : fullGj;
      const gl = buildGeoJsonLayer(cfg, displayGj, state.opacity, paneName, fullGj);
      gl.addTo(map);

      let lg = null;
      if (cfg.labelField) {
        lg = buildLabelsGroup(cfg, displayGj);
        if (lg && map.getZoom() >= 12) lg.addTo(map);
      }

      state.leafletLayer = gl;
      state.labelGroup = lg;
      state.renderedCount = displayGj?.features?.length || 0;
      syncLayerZIndexes();
      callbacks.onStateChange?.();
    }

    function attachLayerData(state, geojson) {
      state.geojson = geojson;
      state.count = geojson?.features?.length || 0;
      state.loading = false;
      state.error = null;
      renderVectorState(state);
    }

    if (!window.__GEO_PAGER_BOUND) {
      window.__GEO_PAGER_BOUND = true;
      document.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.gp-popup-pager-btn');
        if (!btn) return;
        const st = window.__GEO_ACTIVE_POPUP_PAGER;
        if (!st || !st.items?.length) return;
        const dir = Number(btn.dataset.pagerDir || 1);
        st.index = (st.index + dir + st.items.length) % st.items.length;
        const content = buildFeaturePopupHtml(st.cfg, st.items[st.index], st);
        const popupEl = btn.closest('.leaflet-popup-content');
        if (popupEl) popupEl.innerHTML = content;
      });
    }

    async function enableLayer(layerId) {
      if (activeLayers.has(layerId)) return;

      const userL = userLayers.find((u) => u.id === layerId);
      if (userL) {
        const { paneName } = getOrCreateLayerPane(layerId);
        layerOrder.push(layerId);
        const st = {
          cfg: userL,
          paneName,
          leafletLayer: null,
          labelGroup: null,
          geojson: userL.geojson,
          opacity: userL.opacity,
          loading: false,
          error: null,
          count: userL.geojson.features.length,
        };
        activeLayers.set(layerId, st);
        const gl = buildGeoJsonLayer(userL, userL.geojson, userL.opacity, paneName);
        gl.addTo(map);
        st.leafletLayer = gl;
        syncLayerZIndexes();
        callbacks.onStateChange?.();
        return;
      }

      const found = getLayerById(layerId);
      if (!found) return;
      const { layer: cfg } = found;
      const { paneName } = getOrCreateLayerPane(layerId);

      layerOrder.push(layerId);
      const controller = new AbortController();
      const state = {
        cfg,
        paneName,
        leafletLayer: null,
        labelGroup: null,
        geojson: null,
        opacity: cfg.opacity ?? 0.7,
        loading: cfg.type !== 'wms',
        error: null,
        count: 0,
        controller,
      };
      activeLayers.set(layerId, state);
      syncLayerZIndexes();
      callbacks.onStateChange?.();

      if (cfg.type === 'wms') {
        try {
          const wms = attachTileRetry(
            L.tileLayer.wms(cfg.url, {
              layers: cfg.wmsLayers,
              format: cfg.wmsFormat || 'image/png',
              transparent: cfg.wmsTransparent !== false,
              version: cfg.wmsVersion || '1.1.1',
              styles: cfg.wmsStyles || '',
              pane: paneName,
              opacity: state.opacity,
              minZoom: cfg.minZoom || 10,
              maxZoom: cfg.maxZoom || 21,
              bounds: cfg.bounds || JACINTO_BOUNDS,
              attribution: cfg.attribution || '',
              tileSize: 256,
            }),
            2
          );
          wms.addTo(map);
          state.leafletLayer = wms;
          state.loading = false;
          syncLayerZIndexes();
          callbacks.onStateChange?.();
        } catch (err) {
          state.loading = false;
          state.error = err.message || 'Falha no serviço WMS';
          callbacks.onStateChange?.();
        }
        return;
      }

      try {
        const gj = await resolveLayerGeoJson(cfg, controller.signal);
        if (controller.signal.aborted || !activeLayers.has(layerId)) return;
        attachLayerData(state, gj);
      } catch (err) {
        if (err.name === 'AbortError' || controller.signal.aborted) return;
        clearStateMapObjects(state);
        state.loading = false;
        state.error = err.message || 'Falha ao carregar camada';
        callbacks.onStateChange?.();
        callbacks.onToast?.(`Erro ao carregar "${cfg.name}": ${state.error}`, 'error');
      }
    }

    function disableLayer(layerId) {
      const state = activeLayers.get(layerId);
      if (!state) return;
      if (state.controller) state.controller.abort();
      clearStateMapObjects(state);
      activeLayers.delete(layerId);
      const idx = layerOrder.indexOf(layerId);
      if (idx !== -1) layerOrder.splice(idx, 1);
      syncLayerZIndexes();
      callbacks.onStateChange?.();
    }

    function toggleLayer(layerId, forceState = null) {
      const currentlyOn = activeLayers.has(layerId);
      const next = forceState !== null ? forceState : !currentlyOn;
      if (next) return enableLayer(layerId);
      disableLayer(layerId);
      return Promise.resolve();
    }

    function setLayerOpacity(layerId, opacity) {
      const state = activeLayers.get(layerId);
      if (!state) return;
      state.opacity = opacity;
      if (state.cfg.type === 'wms' && state.leafletLayer?.setOpacity) {
        state.leafletLayer.setOpacity(opacity);
        return;
      }
      if (state.leafletLayer?.eachLayer) {
        state.leafletLayer.eachLayer((sub) => {
          if (sub instanceof L.CircleMarker) {
            sub.setStyle({ fillOpacity: Math.min(1, opacity), opacity: Math.min(1, opacity) });
          } else if (sub.setStyle) {
            sub.setStyle(computeFeatureStyle(state.cfg, sub.feature, opacity));
          }
        });
      }
    }

    function zoomToLayer(layerId) {
      const state = activeLayers.get(layerId);
      if (state?.cfg?.minZoom && map.getZoom() < state.cfg.minZoom) {
        map.setView(JACINTO_URBAN_CENTER, Math.max(state.cfg.minZoom, map.getZoom()));
        return true;
      }
      if (state?.leafletLayer?.getBounds) {
        const b = state.leafletLayer.getBounds();
        if (b && b.isValid()) {
          map.fitBounds(b, { padding: [36, 36], maxZoom: 17 });
          return true;
        }
      }
      map.fitBounds(JACINTO_BOUNDS, { padding: [20, 20] });
      return false;
    }

    function clearAllLayers() {
      for (const id of [...activeLayers.keys()]) disableLayer(id);
    }

    map.on('moveend zoomend', () => {
      const z = map.getZoom();
      for (const [, state] of activeLayers) {
        if (state.cfg.type === 'wms') continue;
        if (state.geojson && (state.cfg.viewportFilter || state.cfg.minZoom)) {
          renderVectorState(state);
        } else if (state.labelGroup) {
          const shouldShow = z >= 12;
          if (shouldShow && !map.hasLayer(state.labelGroup)) state.labelGroup.addTo(map);
          if (!shouldShow && map.hasLayer(state.labelGroup)) map.removeLayer(state.labelGroup);
        }
      }
    });

    // ---- Raio-X Territorial Multi-Camada ----
    function findLocalHits(geojson, latlng, tolDeg = 0.0003) {
      const hits = [];
      for (const f of geojson?.features || []) {
        try {
          if (geomContainsLatLng(f.geometry, latlng, tolDeg)) {
            hits.push(f);
            if (hits.length >= 5) break;
          }
        } catch {
          // ignore
        }
      }
      return hits;
    }

    async function identifyAtPoint(latlng) {
      const results = [];
      const tolDeg = 0.0003 * Math.pow(2, Math.max(0, 15 - map.getZoom()));

      const coreContextIds = [
        'setores_censitarios_ibge',
        'suscet_inundacao_sgb',
        'suscet_movimento_massa_sgb',
        'sgb_setores_risco',
        'bacias_hidrograficas_ima',
        'geologia_sgb',
        'pedologia_sgb',
        'relevo_sgb',
        'unidades_conservacao_mma',
      ];
      const targetIds = new Set([...activeLayers.keys(), ...coreContextIds]);

      for (const id of targetIds) {
        const state = activeLayers.get(id);
        const found = state ? { layer: state.cfg } : getLayerById(id);
        if (!found) continue;
        const cfg = found.layer;
        if (cfg.id === 'limite_municipal_ibge') continue;
        const isCoreExtra = !activeLayers.has(id);

        let gj = state?.geojson || dataCache.get(id);
        const bKey = cfg.bundleKey || cfg.id;
        if (!gj && bKey && window.GEOJACINTO_BUNDLE?.[bKey]) {
          gj = window.GEOJACINTO_BUNDLE[bKey];
        }
        if (!gj) continue;

        const hits = findLocalHits(gj, latlng, tolDeg);
        if (hits.length) {
          results.push({ layerId: id, layerName: cfg.name, cfg, features: hits, isCoreExtra });
        }
      }

      const priority = {
        setores_censitarios_ibge: 1,
        sgb_setores_risco: 2,
        suscet_inundacao_sgb: 3,
        suscet_movimento_massa_sgb: 4,
        fbds_uso_solo: 5,
        fbds_app: 6,
        unidades_conservacao_mma: 7,
        bacias_hidrograficas_ima: 8,
        geologia_sgb: 9,
        pedologia_sgb: 10,
        relevo_sgb: 11,
      };
      results.sort((a, b) => (priority[a.layerId] || 50) - (priority[b.layerId] || 50));
      return results;
    }

    function exportLayerGeoJSON(layerId) {
      const state = activeLayers.get(layerId);
      const metaEntry = window.GeoMetadata?.getEntry(layerId, state?.cfg);
      if (state?.cfg?.type === 'wms' || metaEntry?.redistributable === false) {
        callbacks.onToast?.('Esta camada permite apenas visualização online (licença não redistribuível).', 'info');
        return;
      }
      if (!state?.geojson?.features?.length) {
        callbacks.onToast?.('Ative a camada e aguarde o carregamento antes de exportar.', 'info');
        return;
      }
      const blob = new Blob([JSON.stringify(state.geojson, null, 2)], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `geoportal_jacinto_machado_${layerId}.geojson`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      callbacks.onToast?.(`Exportado: geoportal_jacinto_machado_${layerId}.geojson (${state.geojson.features.length} feições)`, 'success');
    }

    async function importUserFile(file) {
      const name = file.name;
      const ext = name.split('.').pop().toLowerCase();
      let geojson = null;

      if (ext === 'geojson' || ext === 'json') {
        geojson = JSON.parse(await file.text());
      } else if (ext === 'kml') {
        geojson = parseSimpleKML(await file.text());
      } else if (ext === 'zip') {
        if (typeof window.shp !== 'function') {
          throw new Error('Biblioteca de leitura Shapefile (.zip) ainda carregando. Tente novamente em instantes.');
        }
        const parsed = await window.shp(await file.arrayBuffer());
        geojson = Array.isArray(parsed)
          ? { type: 'FeatureCollection', features: parsed.flatMap((g) => g.features || []) }
          : parsed;
      } else {
        throw new Error('Formato não suportado. Use .geojson, .json, .kml ou Shapefile .zip');
      }

      geojson = normalizeGeoJsonToWgs84(geojson);
      if (!geojson?.features?.length) {
        throw new Error('O arquivo não contém feições geográficas válidas.');
      }

      const firstType = geojson.features[0]?.geometry?.type || 'Polygon';
      const geomType = firstType.includes('Point') ? 'point' : firstType.includes('Line') ? 'line' : 'polygon';
      const colors = ['#e11d48', '#7c3aed', '#0d9488', '#ea580c', '#2563eb'];
      const color = colors[userLayers.length % colors.length];

      const id = `user_${Date.now()}`;
      const userCfg = {
        id,
        name: name.replace(/\.(geojson|json|kml|zip)$/i, ''),
        geomType,
        isUserLayer: true,
        opacity: 0.72,
        geojson,
        style: { color, weight: 2.2, fillColor: color, fillOpacity: 0.35 },
        pointStyle: { radius: 6, color: '#ffffff', weight: 1.8, fillColor: color, fillOpacity: 0.95 },
        description: `Camada importada localmente (${file.name} — ${geojson.features.length} feições).`,
      };

      userLayers.push(userCfg);
      await enableLayer(id);
      zoomToLayer(id);
      callbacks.onUserLayersChanged?.();
      callbacks.onToast?.(`Camada "${userCfg.name}" importada (${geojson.features.length} feições)!`, 'success');
      return userCfg;
    }

    function parseSimpleKML(xmlText) {
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const placemarks = [...doc.querySelectorAll('Placemark')];
      const features = [];
      const parseCoords = (str) =>
        str
          .trim()
          .split(/\s+/)
          .map((p) => p.split(',').map(Number))
          .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
          .map((c) => [c[0], c[1]]);
      for (const pm of placemarks) {
        const name = pm.querySelector('name')?.textContent?.trim() || 'Feição KML';
        const desc = pm.querySelector('description')?.textContent?.trim() || '';
        const pt = pm.querySelector('Point coordinates');
        const ls = pm.querySelector('LineString coordinates');
        const pg = pm.querySelector('Polygon outerBoundaryIs LinearRing coordinates');
        let geometry = null;
        if (pt) {
          const c = parseCoords(pt.textContent)[0];
          if (c) geometry = { type: 'Point', coordinates: c };
        } else if (ls) {
          const c = parseCoords(ls.textContent);
          if (c.length >= 2) geometry = { type: 'LineString', coordinates: c };
        } else if (pg) {
          const c = parseCoords(pg.textContent);
          if (c.length >= 3) geometry = { type: 'Polygon', coordinates: [c] };
        }
        if (geometry) features.push({ type: 'Feature', properties: { nome: name, descricao: desc }, geometry });
      }
      return { type: 'FeatureCollection', features };
    }

    function getActiveLegends() {
      return getOrderedActiveLayers().map((state) => {
        const { cfg } = state;
        const metaEntry = window.GeoMetadata?.getEntry(cfg.id, cfg);
        const badge = window.GeoMetadata?.getSourceBadgeMeta(metaEntry?.sourceClass || 'Oficial') || {
          label: 'Oficial',
          cls: 'src-oficial',
        };
        const entry = {
          id: cfg.id,
          name: cfg.name,
          geomType: cfg.geomType,
          sourceClass: metaEntry?.sourceClass || 'Oficial',
          badge,
          whatIsThis: metaEntry?.whatIsThis || cfg.description || '',
          swatches: [],
        };

        if (cfg.colorMap) {
          for (const [label, color] of Object.entries(cfg.colorMap)) {
            entry.swatches.push({
              label,
              color,
              meaning: window.GeoMetadata?.getClassHelp(cfg.id, label) || '',
            });
          }
        } else if (cfg.legendItems) {
          for (const it of cfg.legendItems) {
            entry.swatches.push({
              label: it.label,
              color: it.color,
              outline: it.outline,
              dashed: it.dashed,
              meaning: it.meaning || window.GeoMetadata?.getClassHelp(cfg.id, it.label) || '',
            });
          }
        } else {
          const color =
            cfg.geomType === 'point'
              ? cfg.pointStyle?.fillColor || '#033c8e'
              : cfg.geomType === 'line'
              ? cfg.style?.color || '#0284c7'
              : cfg.outlineMode
              ? cfg.style?.color || '#0ea5e9'
              : cfg.style?.fillColor || '#3b82f6';
          entry.swatches.push({
            label: cfg.name,
            color,
            outline: cfg.outlineMode,
            dashed: Boolean(cfg.style?.dashArray),
            meaning: '',
          });
        }
        return entry;
      });
    }

    return {
      activeLayers,
      activeBasemaps,
      userLayers,
      dataCache,
      layerOrder,
      ensureBasemapLayer,
      setBasemapActive,
      isBasemapActive,
      setMunicipalClip,
      isMunicipalClipEnabled,
      enableLayer,
      disableLayer,
      toggleLayer,
      setLayerOpacity,
      moveLayerOrder,
      getOrderedActiveLayers,
      zoomToLayer,
      clearAllLayers,
      identifyAtPoint,
      exportLayerGeoJSON,
      importUserFile,
      getActiveLegends,
      resolveLayerGeoJson,
      reloadLayer: (id) => {
        disableLayer(id);
        return enableLayer(id);
      },
      prettyFieldName,
      formatFieldValue,
      escapeHtml,
    };
  }

  return {
    createEngine,
    prettyFieldName,
    formatFieldValue,
    escapeHtml,
    normalizeGeoJsonToWgs84,
    geomContainsLatLng,
    fetchWithTimeout,
  };
})();
