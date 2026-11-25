/**
 * Geoportal Municipal de Jacinto Machado — Controlador da Página Dedicada de Downloads com Buscador Instantâneo
 * Lista todas as camadas do catálogo + mapas base + documentos oficiais da Prefeitura (PDF),
 * permitindo filtro por texto e tipo de origem, consulta aos 21 campos de metadados e download em GeoJSON/CSV.
 */
(() => {
  const { BASEMAPS, LAYER_GROUPS, getLayerById } = window.GeoCatalog;
  const Meta = window.GeoMetadata;

  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Documentos Oficiais SGB/CPRM (RIGeo Jacinto Machado) e IBGE
  const MUNICIPAL_DOCS = [
    {
      id: 'doc_rigeo_carta_pdf',
      name: 'Carta de Suscetibilidade a Movimentos Gravitacionais de Massa e Inundações (PDF 19,8 MB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Prancha cartográfica oficial 1:50.000 produzida pelo IPT e SGB/CPRM (2015) para o município de Jacinto Machado – SC.',
      format: 'PDF Oficial (RIGeo SGB/CPRM)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/2c1448f9-141c-4083-aa95-bf92559d593c/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_bc_zip',
      name: 'Base Cartográfica Jacinto Machado — Shapefiles Originais (ZIP 15 MB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Pacote original com curvas de nível (20 m), hidrografia, rodovias, área urbanizada e limites municipais (SIRGAS 2000 / UTM 22S).',
      format: 'ZIP / Shapefile (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/f071e948-f8c5-449b-857b-01e3bcf98629/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_sig_zip',
      name: 'SIG Suscetibilidade Completo — Vetores, Geologia, Pedologia e Fotos de Campo (ZIP 1,21 GB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Projeto SIG integral de suscetibilidade a inundações, deslizamentos, enxurradas, corridas de massa e registros fotográficos de campo.',
      format: 'ZIP / Shapefile (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/5434e439-7854-4412-9106-bf7117e5572d/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_mde_zip',
      name: 'Produtos MDE — MDT, Hipsometria, Declividade e Relevo Sombreado (ZIP 1,13 GB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Modelos digitais de elevação e terreno (GeoTIFF / ArcGrid) derivados do aerolevantamento oficial de Santa Catarina.',
      format: 'ZIP / GeoTIFF (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/e7e05db0-fcd6-47d7-b80f-2d10b5e7cfd6/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_orto_zip',
      name: 'Ortofotos de Jacinto Machado — Mosaico ECW (ZIP 308 MB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Mosaico aerofotogramétrico ortorretificado de Jacinto Machado (ECW) disponível no repositório institucional RIGeo.',
      format: 'ZIP / ECW (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/1c11c678-e73f-452d-8d8b-c1a03e2afcc1/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_ibge_indicadores',
      name: 'Indicadores Socioeconômicos Oficiais IBGE SIDRA (Censo 2022, PIB, PAM, PPM)',
      category: 'Indicadores Socioeconômicos (IBGE)',
      sourceClass: 'Oficial',
      whatIsThis: 'Arquivo JSON estruturado com os dados oficiais de população, área, densidade, PIB municipal (2021–2023), produção agrícola e pecuária.',
      format: 'JSON Oficial (IBGE SIDRA)',
      localFile: 'data/ibge_indicadores_jacinto_machado.json',
      orgao: 'IBGE — SIDRA',
    },
  ];

  // Unify all items into searchable records
  const ALL_ITEMS = [];
  for (const g of LAYER_GROUPS) {
    for (const l of g.layers) {
      const m = Meta.getEntry(l.id, { ...l, groupName: g.name });
      ALL_ITEMS.push({
        kind: 'layer',
        id: l.id,
        groupId: g.id,
        groupName: g.name,
        name: l.name,
        cfg: l,
        metaEntry: m,
        sourceClass: m.sourceClass,
        whatIsThis: m.whatIsThis,
        format: m.metadata.formato,
        orgao: m.metadata.orgao_responsavel,
        redistributable: m.redistributable && l.type !== 'wms',
        searchHaystack: norm(`${l.name} ${g.name} ${m.whatIsThis} ${m.metadata.orgao_responsavel} ${m.metadata.instituicao_fornecedora} ${m.metadata.formato} ${m.sourceClass}`),
      });
    }
  }
  for (const bm of BASEMAPS) {
    const m = Meta.getEntry(bm.id, { ...bm, groupName: 'Mapas Base & Ortoimagens' });
    ALL_ITEMS.push({
      kind: 'basemap',
      id: bm.id,
      groupId: '__basemaps__',
      groupName: 'Mapas Base & Ortoimagens',
      name: bm.name,
      cfg: bm,
      metaEntry: m,
      sourceClass: m.sourceClass,
      whatIsThis: m.whatIsThis,
      format: m.metadata.formato,
      orgao: m.metadata.orgao_responsavel,
      redistributable: false,
      searchHaystack: norm(`${bm.name} ${bm.category} ${m.whatIsThis} ${m.metadata.orgao_responsavel} ${bm.year}`),
    });
  }
  for (const d of MUNICIPAL_DOCS) {
    ALL_ITEMS.push({
      kind: 'doc',
      id: d.id,
      groupId: '__docs__',
      groupName: d.category,
      name: d.name,
      cfg: d,
      metaEntry: Meta.makeMeta({
        sourceClass: d.sourceClass,
        whatIsThis: d.whatIsThis,
        nome_camada: d.name,
        categoria: d.category,
        orgao_responsavel: d.orgao,
        instituicao_fornecedora: 'Portal Atende.Net — Prefeitura de Jacinto Machado',
        url_fonte_original: 'https://jacinto_machado.atende.net/cidadao/pagina/servicos',
        url_download_ou_servico: d.externalUrl,
        formato: d.format,
        tipo_geometria: 'Documento Cartográfico / Legal (PDF)',
        status_validacao: 'DISPONÍVEL, MAS NÃO INTEGRADA',
      }),
      sourceClass: d.sourceClass,
      whatIsThis: d.whatIsThis,
      format: d.format,
      orgao: d.orgao,
      redistributable: false,
      searchHaystack: norm(`${d.name} ${d.category} ${d.whatIsThis} ${d.orgao} pdf`),
    });
  }

  let selectedCat = 'ALL';
  let selectedSrc = 'ALL';
  let queryText = '';

  const searchInput = document.getElementById('dlSearchInput');
  const urlQ = new URLSearchParams(window.location.search).get('q');
  if (urlQ) {
    queryText = urlQ;
    searchInput.value = urlQ;
  }

  function getFilteredItems() {
    const q = norm(queryText.trim());
    return ALL_ITEMS.filter((it) => {
      if (selectedCat !== 'ALL' && it.groupId !== selectedCat) return false;
      if (selectedSrc !== 'ALL' && it.sourceClass !== selectedSrc) return false;
      if (q && !it.searchHaystack.includes(q)) return false;
      return true;
    });
  }

  function renderSidebar() {
    const list = document.getElementById('dlCategoryList');
    const q = norm(queryText.trim());
    const baseFiltered = ALL_ITEMS.filter(
      (it) => (selectedSrc === 'ALL' || it.sourceClass === selectedSrc) && (!q || it.searchHaystack.includes(q))
    );
    const counts = {};
    for (const it of baseFiltered) counts[it.groupId] = (counts[it.groupId] || 0) + 1;

    const cats = [
      { id: 'ALL', label: 'Todas as Categorias', count: baseFiltered.length },
      ...LAYER_GROUPS.map((g) => ({ id: g.id, label: g.name, count: counts[g.id] || 0 })),
      { id: '__basemaps__', label: 'Mapas Base & Ortoimagens', count: counts['__basemaps__'] || 0 },
      { id: '__docs__', label: 'Documentos Oficiais Prefeitura (PDF)', count: counts['__docs__'] || 0 },
    ];

    list.innerHTML = cats
      .map(
        (c) => `
        <button class="dl-cat-btn ${selectedCat === c.id ? 'active' : ''}" data-cat-id="${esc(c.id)}">
          <span>${esc(c.label)}</span>
          <span class="gp-badge-count">${c.count}</span>
        </button>`
      )
      .join('');
  }

  function renderResults() {
    const items = getFilteredItems();
    const box = document.getElementById('dlResults');
    const summary = document.getElementById('dlResultSummary');
    summary.textContent = `Exibindo ${items.length} de ${ALL_ITEMS.length} itens`;

    if (!items.length) {
      box.innerHTML =
        '<div class="dl-card"><div class="dl-card-info"><div class="dl-card-title">Nenhum resultado encontrado</div><div class="dl-card-what">Tente buscar por outro termo ou clique em "Todas as origens" / "Todas as Categorias".</div></div></div>';
      return;
    }

    box.innerHTML = items
      .map((it) => {
        const badge = Meta.getSourceBadgeMeta(it.sourceClass);
        const actions = [];
        if (it.kind === 'layer') {
          actions.push(`<a class="gp-btn primary" href="index.html?layer=${encodeURIComponent(it.id)}" data-open-map-layer="${esc(it.id)}">Ver no Mapa ↗</a>`);
        } else if (it.kind === 'basemap') {
          actions.push(`<a class="gp-btn primary" href="index.html?basemap=${encodeURIComponent(it.id)}" data-open-map-basemap="${esc(it.id)}">Abrir Base ↗</a>`);
        }
        actions.push(`<button class="gp-btn" data-dl-meta="${esc(it.id)}">ⓘ Metadados</button>`);
        if (it.redistributable && it.cfg.localFile) {
          actions.push(`<a class="gp-btn" href="${esc(it.cfg.localFile)}" download>GeoJSON ↓</a>`);
          actions.push(`<button class="gp-btn" data-dl-csv="${esc(it.id)}">CSV ↓</button>`);
        } else if (it.kind !== 'doc') {
          actions.push(`<span class="gp-src-pill src-cientifica" title="Serviço online não redistribuível em pacote local">Somente visualização</span>`);
        }
        const extUrl = it.cfg.officialUrl || it.cfg.externalUrl || (it.kind === 'doc' ? it.cfg.externalUrl : '');
        if (extUrl) {
          actions.push(`<a class="gp-btn" href="${esc(extUrl)}" target="_blank" rel="noopener">${it.kind === 'doc' ? 'Abrir PDF ↗' : 'Oficial ↗'}</a>`);
        }

        return `
          <div class="dl-card">
            <div class="dl-card-info">
              <div class="dl-card-title">
                <span>${esc(it.name)}</span>
                <span class="gp-src-pill ${badge.cls}">${esc(badge.label)}</span>
              </div>
              <div class="dl-card-what"><b>O que é isto?</b> ${esc(it.whatIsThis)}</div>
              <div class="dl-card-meta">
                <span><b>Categoria:</b> ${esc(it.groupName)}</span>
                <span><b>Órgão / Origem:</b> ${esc(it.orgao)}</span>
                <span><b>Formato:</b> ${esc(it.format)}</span>
              </div>
            </div>
            <div class="dl-card-actions">${actions.join('')}</div>
          </div>`;
      })
      .join('');
  }

  function extractCentroidCoords(geom) {
    if (!geom) return ['', ''];
    if (geom.type === 'Point') return [geom.coordinates[0], geom.coordinates[1]];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const walk = (c) => {
      if (!Array.isArray(c)) return;
      if (typeof c[0] === 'number') {
        if (c[0] < minX) minX = c[0];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[1] > maxY) maxY = c[1];
      } else c.forEach(walk);
    };
    walk(geom.coordinates);
    if (!Number.isFinite(minX)) return ['', ''];
    return [((minX + maxX) / 2).toFixed(6), ((minY + maxY) / 2).toFixed(6)];
  }

  async function downloadCsvForLayer(layerId) {
    const it = ALL_ITEMS.find((x) => x.id === layerId);
    if (!it || !it.redistributable || !it.cfg.localFile) return;

    let gj = null;
    if (layerId === 'limite_municipal_ibge' && window.ARAQUARI_LIMIT_GEOJSON) {
      gj = window.ARAQUARI_LIMIT_GEOJSON;
    } else if (it.cfg.bundleKey && window.GEOJACINTO_BUNDLE?.[it.cfg.bundleKey]) {
      gj = window.GEOJACINTO_BUNDLE[it.cfg.bundleKey];
    } else {
      try {
        const r = await fetch(it.cfg.localFile);
        if (r.ok) gj = await r.json();
      } catch {
        const gh = `https://eriksdhoffmann.github.io/Geoportal-Jacinto Machado/${it.cfg.localFile}`;
        const r2 = await fetch(gh);
        if (r2.ok) gj = await r2.json();
      }
    }
    if (!gj?.features?.length) {
      alert('Não foi possível carregar os dados para gerar o CSV neste ambiente.');
      return;
    }

    const keys = [];
    const seen = new Set();
    for (const f of gj.features.slice(0, 50)) {
      for (const k of Object.keys(f.properties || {})) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    const headers = [...keys, 'longitude_centro', 'latitude_centro'];
    const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [headers.map(csvCell).join(';')];
    for (const f of gj.features) {
      const props = f.properties || {};
      const [lon, lat] = extractCentroidCoords(f.geometry);
      const vals = keys.map((k) => csvCell(props[k]));
      vals.push(csvCell(lon), csvCell(lat));
      rows.push(vals.join(';'));
    }
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jacinto_machado_${layerId}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openDlMetadataModal(itemId) {
    const it = ALL_ITEMS.find((x) => x.id === itemId);
    if (!it) return;
    const badge = Meta.getSourceBadgeMeta(it.sourceClass);
    const meta = it.metaEntry.metadata;
    document.getElementById('dlModalTitle').textContent = `Metadados — ${meta.nome_camada}`;
    const rowsHtml = Meta.FIELD_LABELS.map(([k, lbl]) => {
      const val = meta[k] || 'Não informado pela fonte';
      const isUrl = typeof val === 'string' && /^https?:\/\//i.test(val);
      return `<tr><th>${esc(lbl)}</th><td>${isUrl ? `<a href="${esc(val)}" target="_blank" rel="noopener">${esc(val)} ↗</a>` : esc(val)}</td></tr>`;
    }).join('');
    document.getElementById('dlModalBody').innerHTML = `
      <div class="gp-meta-hero">
        <span class="gp-src-pill ${badge.cls}">${esc(badge.label)}</span>
        <div style="margin-top:6px;font-size:13.5px"><b>O que é isto?</b> ${esc(it.whatIsThis)}</div>
      </div>
      <table class="gp-meta-table">${rowsHtml}</table>
    `;
    document.getElementById('dlModalBackdrop').classList.add('open');
  }

  searchInput.addEventListener('input', () => {
    queryText = searchInput.value;
    renderSidebar();
    renderResults();
  });
  document.getElementById('dlSearchClear').addEventListener('click', () => {
    searchInput.value = '';
    queryText = '';
    renderSidebar();
    renderResults();
    searchInput.focus();
  });
  document.getElementById('dlCategoryList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat-id]');
    if (!b) return;
    selectedCat = b.dataset.catId;
    renderSidebar();
    renderResults();
  });
  document.getElementById('dlSourceFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-src]');
    if (!b) return;
    selectedSrc = b.dataset.src;
    document.querySelectorAll('#dlSourceFilters .dl-chip').forEach((c) => c.classList.toggle('active', c.dataset.src === selectedSrc));
    renderSidebar();
    renderResults();
  });
  function getAvailableMapOpener() {
    try {
      if (window.opener && !window.opener.closed && window.opener.GeoPortalMapNav) {
        return window.opener;
      }
    } catch {
      // Cross-origin ou opener indisponível
    }
    return null;
  }

  function handleReturnToMapClick(e, { layerId = '', basemapId = '' } = {}) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const opener = getAvailableMapOpener();
    if (!opener) {
      // Sem aba original disponível: navega na aba atual pelo href do link
      return;
    }
    e.preventDefault();
    try {
      if (layerId) opener.GeoPortalMapNav.activateLayer(layerId);
      else if (basemapId) opener.GeoPortalMapNav.activateBasemap(basemapId);
      else opener.GeoPortalMapNav.focusMap();
    } catch {
      const link = e.target.closest('a[href]');
      if (link) window.location.href = link.href;
      return;
    }
    try {
      opener.focus();
    } catch {
      // ignore
    }
    try {
      window.close();
    } catch {
      // ignore
    }
  }

  const dispatchReturnToMap = (e, opts) => {
    if (typeof window.__geoHandleReturnToMapClick === 'function') {
      window.__geoHandleReturnToMapClick(e, opts);
      return;
    }
    handleReturnToMapClick(e, opts);
  };

  if (typeof window.__geoHandleReturnToMapClick !== 'function') {
    document.querySelectorAll('[data-return-to-map]').forEach((el) => {
      el.addEventListener('click', (e) => handleReturnToMapClick(e));
    });
  }

  document.getElementById('dlResults').addEventListener('click', (e) => {
    const mapLayerLink = e.target.closest('[data-open-map-layer]');
    if (mapLayerLink) {
      dispatchReturnToMap(e, { layerId: mapLayerLink.dataset.openMapLayer });
      return;
    }
    const mapBmLink = e.target.closest('[data-open-map-basemap]');
    if (mapBmLink) {
      dispatchReturnToMap(e, { basemapId: mapBmLink.dataset.openMapBasemap });
      return;
    }
    const mb = e.target.closest('[data-dl-meta]');
    if (mb) {
      openDlMetadataModal(mb.dataset.dlMeta);
      return;
    }
    const cb = e.target.closest('[data-dl-csv]');
    if (cb) {
      downloadCsvForLayer(cb.dataset.dlCsv);
    }
  });
  document.getElementById('dlModalClose').addEventListener('click', () => {
    document.getElementById('dlModalBackdrop').classList.remove('open');
  });
  document.getElementById('dlModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'dlModalBackdrop') e.target.classList.remove('open');
  });

  renderSidebar();
  renderResults();
})();
