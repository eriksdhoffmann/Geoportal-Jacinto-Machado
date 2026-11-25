/**
 * Geoportal Municipal de Jacinto Machado — Controlador Principal da Interface (Padrão Geoportal Florianópolis)
 * Inclui controle determinístico de sobreposição (aba Ordem ▲/▼), recorte oficial do limite
 * de Jacinto Machado (IBGE 4208708 — 430,704 km²), Ortofoto Oficial SC 2012 (SIGSC WMS) × Satélite HD,
 * Cortina Comparativa, Medição em SVG topo e Raio-X Territorial completo.
 */
(() => {
  const {
    JACINTO_CENTER,
    JACINTO_URBAN_CENTER,
    JACINTO_BOUNDS,
    FBDS_BASE,
    RIGEO_PDF_URL,
    BASEMAPS,
    LAYER_GROUPS,
    OFFICIAL_DOWNLOADS,
    THEMATIC_PRESETS,
    RIGEO_ITEM_URL,
    PENDING_MUNICIPAL_LAYERS,
  } = window.GeoCatalog;
  const {
    formatCoords,
    getScaleDenominator,
    getZoomForScale,
  } = window.GeoCoords;
  const { prettyFieldName, formatFieldValue, escapeHtml } = window.GeoLayerEngine;

  let crsMode = 'utm';
  let drawerTab = 'layers'; // 'layers' | 'order' | 'legend'
  let openOptionsLayerId = null;
  let activeFloatingPanel = null;
  let searchFilterText = '';
  const expandedGroups = new Set(LAYER_GROUPS.filter((g) => g.expanded).map((g) => g.id));

  const map = L.map('map', {
    center: JACINTO_CENTER,
    zoom: 12,
    minZoom: 10,
    maxZoom: 21,
    zoomControl: false,
    doubleClickZoom: true,
    preferCanvas: true,
  });

  const initRightPad = window.innerWidth <= 760 ? 32 : 390;
  map.fitBounds(JACINTO_BOUNDS, {
    paddingTopLeft: [56, 22],
    paddingBottomRight: [initRightPad, 40],
  });

  // ---- Toast ----
  function showToast(msg, type = 'info', action = null) {
    const wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `gp-toast ${type}`;
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'gp-toast-action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick();
        el.remove();
      });
      el.appendChild(btn);
    }

    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 260);
    }, action ? 6000 : 3600);
  }

  function syncMapBackground() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    const ids = [...engine.activeBasemaps];
    const useLight =
      ids.length === 0 ||
      ids.every((id) => ['osm', 'carto_light', 'mdt_sigsc_2012', 'mds_sigsc_2012'].includes(id));
    mapEl.classList.toggle('map-light-bg', useLight);
  }

  let tools = null;
  const engine = window.GeoLayerEngine.createEngine(map, {
    onStateChange: () => {
      renderLayerDrawer();
      if (activeFloatingPanel === 'basemaps') renderBasemapsPanel();
    },
    onBasemapChange: () => {
      syncMapBackground();
    },
    onUserLayersChanged: () => {
      expandedGroups.add('user_imported');
      renderLayerDrawer();
    },
    onToast: showToast,
    shouldInterceptClick: () => (tools ? tools.shouldInterceptClick() : false),
  });

  tools = window.GeoTools.createTools(map, engine, {
    showToast,
    onModeChange: handleModeBanner,
    updateHistoryButtons: (canUndo, canRedo) => {
      const bU = document.getElementById('btnUndo');
      const bR = document.getElementById('btnRedo');
      if (bU) bU.disabled = !canUndo;
      if (bR) bR.disabled = !canRedo;
    },
    updateMeasureOutput: (html) => {
      const el = document.getElementById('measureOutput');
      if (el) el.innerHTML = html;
    },
    updateDrawCount: (cnt) => {
      const el = document.getElementById('drawCountBadge');
      if (el) el.textContent = `${cnt} feição(ões) desenhada(s)`;
    },
    getDrawLabel: () => document.getElementById('drawLabelInput')?.value?.trim() || '',
    openIdentifyPanel: renderIdentifyPanel,
    onSwipeStateChange: renderSwipeOverlay,
  });

  // Inicialização padrão: Satélite HD (recortado ao limite oficial IBGE 4208708) + Limite + Bairros Oficiais
  engine.setBasemapActive('satelite_global', true, true);
  syncMapBackground();
  engine.enableLayer('limite_municipal_ibge');
  engine.enableLayer('localidades_jacinto');
  engine.enableLayer('sgb_setores_risco');

  // Deep-linking via ?layer=id1,id2 (ex: vindo de downloads.html)
  (() => {
    const params = new URLSearchParams(window.location.search);
    const reqLayers = (params.get('layer') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const reqBasemap = (params.get('basemap') || '').trim();
    if (reqBasemap) engine.setBasemapActive(reqBasemap, true, true);
    if (reqLayers.length) {
      reqLayers.forEach((lid, i) => {
        const found = window.GeoCatalog.getLayerById(lid);
        if (found) expandedGroups.add(found.group.id);
        engine.enableLayer(lid).then(() => {
          if (i === 0) engine.zoomToLayer(lid);
        });
      });
    }
  })();

  // ==================== CONTROLE DE CAMADAS ====================
  function getLayerSwatchStyle(cfg) {
    if (cfg.geomType === 'point') {
      const col = cfg.colorMap ? Object.values(cfg.colorMap)[0] : cfg.pointStyle?.fillColor || '#033c8e';
      return { cls: 'gp-swatch is-point', bg: col };
    }
    if (cfg.geomType === 'line') {
      const col = cfg.colorMap ? Object.values(cfg.colorMap)[0] : cfg.style?.color || '#0284c7';
      return { cls: 'gp-swatch is-line', bg: col };
    }
    if (cfg.colorMap) {
      const cols = Object.values(cfg.colorMap);
      return {
        cls: 'gp-swatch',
        bg: `linear-gradient(135deg, ${cols[0]} 0%, ${cols[Math.min(1, cols.length - 1)]} 50%, ${cols[Math.min(3, cols.length - 1)]} 100%)`,
      };
    }
    if (cfg.outlineMode) {
      const col = cfg.style?.color === '#ffffff' ? '#0ea5e9' : cfg.style?.color;
      return { cls: 'gp-swatch', bg: 'transparent', border: `2px solid ${col}` };
    }
    return { cls: 'gp-swatch', bg: cfg.style?.fillColor || '#3b82f6' };
  }

  function buildSwatchHtml(geomType, color, outline = false, dashed = false) {
    const cls = geomType === 'point' ? 'gp-swatch is-point' : geomType === 'line' ? 'gp-swatch is-line' : 'gp-swatch';
    const style = outline
      ? `background:transparent;border:2px ${dashed ? 'dashed' : 'solid'} ${color === '#ffffff' ? '#0ea5e9' : color}`
      : `background:${color}`;
    return `<span class="${cls}" style="${style}"></span>`;
  }

  function buildInlineLegendHtml(cfg) {
    const entries = [];
    if (cfg.colorMap) {
      for (const [label, color] of Object.entries(cfg.colorMap)) {
        const meaning = window.GeoMetadata?.getClassHelp?.(cfg.id, label) || '';
        entries.push({ label, color, meaning, outline: false, dashed: Boolean(cfg.style?.dashArray) });
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
      entries.push({
        label: cfg.name,
        color,
        meaning: cfg.description || window.GeoMetadata?.getEntry?.(cfg.id, cfg)?.whatIsThis || '',
        outline: Boolean(cfg.outlineMode),
        dashed: Boolean(cfg.style?.dashArray),
      });
    }

    const rows = entries
      .map(
        (it) => `
          <div class="gp-inline-legend-row">
            ${buildSwatchHtml(cfg.geomType, it.color, it.outline, it.dashed)}
            <div class="gp-inline-legend-text">
              <span class="gp-inline-legend-lbl">${escapeHtml(it.label)}</span>
              ${it.meaning ? `<span class="gp-inline-legend-desc">${escapeHtml(it.meaning)}</span>` : ''}
            </div>
          </div>`
      )
      .join('');

    return `
      <div class="gp-inline-legend">
        <div class="gp-inline-legend-title">
          <span>Legenda (${entries.length} ${entries.length > 1 ? 'classes' : 'classe'})</span>
        </div>
        ${rows}
      </div>
    `;
  }

  function renderFloatingMapLegend() {
    const box = document.getElementById('mapLegendBox');
    const body = document.getElementById('mapLegendBody');
    const title = document.getElementById('mapLegendTitle');
    if (!box || !body) return;
    const legends = engine.getActiveLegends();
    if (!legends.length) {
      box.classList.remove('visible');
      body.innerHTML = '';
      return;
    }
    box.classList.add('visible');
    if (title) title.textContent = `Legenda Ativa (${legends.length})`;
    body.innerHTML = legends
      .map((leg) => {
        const items = leg.swatches
          .map(
            (s) => `
              <div class="gp-inline-legend-row">
                ${buildSwatchHtml(leg.geomType, s.color, s.outline, s.dashed)}
                <div class="gp-inline-legend-text">
                  <span class="gp-inline-legend-lbl">${escapeHtml(s.label)}</span>
                  ${s.meaning ? `<span class="gp-inline-legend-desc">${escapeHtml(s.meaning)}</span>` : ''}
                </div>
              </div>`
          )
          .join('');
        return `
          <div class="gp-map-legend-group">
            <div class="gp-map-legend-gname">${escapeHtml(leg.name)}</div>
            ${items}
          </div>`;
      })
      .join('');
  }

  document.getElementById('mapLegendToggle')?.addEventListener('click', () => {
    const box = document.getElementById('mapLegendBox');
    const chev = document.getElementById('mapLegendChevron');
    if (!box) return;
    const collapsed = box.classList.toggle('collapsed');
    if (chev) chev.textContent = collapsed ? '▸' : '▾';
  });

  function renderLayerDrawer() {
    renderFloatingMapLegend();
    const body = document.getElementById('drawerBody');
    const countEl = document.getElementById('activeLayerCount');
    const orderCountEl = document.getElementById('orderLayerCount');
    if (!body) return;

    const totalActive = engine.activeLayers.size;
    if (countEl) countEl.textContent = `Camadas (${totalActive})`;
    if (orderCountEl) orderCountEl.textContent = `Ordem (${totalActive})`;

    document.getElementById('tabLayers')?.classList.toggle('active', drawerTab === 'layers');
    document.getElementById('tabOrder')?.classList.toggle('active', drawerTab === 'order');
    document.getElementById('tabLegend')?.classList.toggle('active', drawerTab === 'legend');

    if (drawerTab === 'order') {
      renderOrderTab(body);
      return;
    }
    if (drawerTab === 'legend') {
      renderLegendTab(body);
      return;
    }

    const q = searchFilterText.trim().toLowerCase();
    const parts = [];

    // 1. Atalhos rápidos de Mapas Base (Satélite HD + Orto SC 2012 SIGSC + Satélite Híbrido)
    const quickBasemaps = BASEMAPS.filter((b) =>
      ['satelite_global', 'orto_sigsc_2012', 'satelite_hibrido'].includes(b.id)
    );
    for (const bm of quickBasemaps) {
      if (q && !bm.name.toLowerCase().includes(q)) continue;
      const checked = engine.isBasemapActive(bm.id);
      parts.push(`
        <div class="gp-layer-row is-basemap">
          <input type="checkbox" class="gp-checkbox" data-basemap-toggle="${bm.id}" ${checked ? 'checked' : ''} />
          <span class="gp-layer-label" data-basemap-label="${bm.id}">${escapeHtml(bm.name)}</span>
          <button class="gp-row-btn" title="Todos os Mapas Base, Relevo MDT & Cortina Comparativa" data-open-panel="basemaps">•••</button>
        </div>
      `);
    }

    // Toggle do Recorte Oficial IBGE (4201307)
    if (!q || 'recortar limite jacinto machado ibge'.includes(q)) {
      parts.push(`
        <div class="gp-layer-row is-clip-toggle">
          <input type="checkbox" class="gp-checkbox" id="chkClipMunicipal" data-clip-toggle="1" ${engine.isMunicipalClipEnabled() ? 'checked' : ''} />
          <span class="gp-layer-label" data-clip-label="1">Recortar mapa ao limite oficial de Jacinto Machado (IBGE)</span>
        </div>
      `);
    }

    // 2. Grupos temáticos
    const groupsToRender = [...LAYER_GROUPS];
    if (engine.userLayers.length) {
      groupsToRender.unshift({
        id: 'user_imported',
        name: 'Camadas Importadas pelo Usuário',
        description: 'Arquivos GeoJSON, KML e Shapefile (.zip) carregados localmente.',
        layers: engine.userLayers,
      });
    }

    for (const group of groupsToRender) {
      const groupMatches = !q || group.name.toLowerCase().includes(q);
      const matchingLayers = group.layers.filter(
        (l) => groupMatches || l.name.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q)
      );
      if (!matchingLayers.length) continue;

      const isExpanded = q ? true : expandedGroups.has(group.id);
      const activeInGroup = group.layers.filter((l) => engine.activeLayers.has(l.id)).length;
      const groupChecked = activeInGroup > 0;

      parts.push(`<div class="gp-group ${isExpanded ? 'expanded' : ''}" data-group-id="${group.id}">`);
      parts.push(`
        <div class="gp-layer-row is-group" data-group-toggle="${group.id}">
          <input type="checkbox" class="gp-checkbox" data-group-check="${group.id}" ${groupChecked ? 'checked' : ''} title="Ativar/Desativar camada principal do grupo" />
          <span class="gp-layer-label">- ${escapeHtml(group.name)}</span>
          <div class="gp-layer-meta-inline">
            ${activeInGroup > 0 ? `<span class="gp-badge-count">${activeInGroup}</span>` : ''}
            <button class="gp-row-btn" data-group-expand="${group.id}" title="Expandir/Recolher">
              <svg class="gp-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        </div>
      `);

      parts.push('<div class="gp-group-children">');
      for (const l of matchingLayers) {
        const st = engine.activeLayers.get(l.id);
        const isOn = Boolean(st);
        const sw = getLayerSwatchStyle(l);
        const optOpen = openOptionsLayerId === l.id;
        const metaEntry = window.GeoMetadata?.getEntry(l.id, l);
        const srcBadge = window.GeoMetadata?.getSourceBadgeMeta(metaEntry?.sourceClass || 'Oficial') || { label: 'Oficial', cls: 'src-oficial' };

        let badgeHtml = '';
        if (st?.loading) {
          badgeHtml = '<span class="gp-spinner" title="Carregando feições..."></span>';
        } else if (st?.error) {
          badgeHtml = `<button class="gp-badge-error" data-layer-retry="${l.id}" title="${escapeHtml(st.error)}">Erro ↻</button>`;
        } else if (isOn && st.belowMinZoom) {
          badgeHtml = `<button class="gp-badge-zoom" data-opt-zoom="${l.id}" title="Aproxime até o zoom ${l.minZoom} para visualizar">Zoom ≥ ${l.minZoom}</button>`;
        } else if (isOn && st.count > 0) {
          badgeHtml = `<span class="gp-badge-count" title="${st.count} feições">${st.count}</span>`;
        } else if (isOn && l.type === 'wms') {
          badgeHtml = `<span class="gp-badge-count" title="Serviço WMS ao vivo">WMS</span>`;
        }

        const shortSrc = srcBadge.label === 'Digitalização de Lei' ? 'Digit.' : srcBadge.label === 'Colaborativa' ? 'OSM' : srcBadge.label === 'Científica' ? 'Cient.' : 'Oficial';

        parts.push(`
          <div class="gp-layer-row is-child">
            <input type="checkbox" class="gp-checkbox" data-layer-toggle="${l.id}" ${isOn ? 'checked' : ''} />
            <span class="${sw.cls}" style="background:${sw.bg};${sw.border ? `border:${sw.border}` : ''}"></span>
            <span class="gp-layer-label" data-layer-label="${l.id}">${escapeHtml(l.name)}</span>
            <div class="gp-layer-meta-inline">
              <span class="gp-src-pill ${srcBadge.cls}" title="${escapeHtml(srcBadge.title || '')}">${escapeHtml(shortSrc)}</span>
              ${badgeHtml}
              <button class="gp-row-btn" data-open-meta="${l.id}" title="Ficha de Metadados (21 campos) & O que é isto?">ⓘ</button>
              <button class="gp-row-btn" data-layer-opts="${l.id}" title="Opções da camada (ordem, opacidade, zoom, legenda, exportar)">•••</button>
            </div>
          </div>
        `);

        // Legenda inline automática sempre que a camada estiver ativa
        if (isOn && !st?.loading && !st?.error) {
          parts.push(buildInlineLegendHtml(l));
        }

        if (optOpen) {
          const curOpacity = Math.round((st?.opacity ?? l.opacity ?? 0.7) * 100);
          const canExport = metaEntry?.redistributable !== false && l.type !== 'wms' && !l.isUserLayer;
          const whatTxt = metaEntry?.whatIsThis || l.description || '';
          parts.push(`
            <div class="gp-layer-options">
              <div class="gp-opacity-row">
                <span>Opacidade:</span>
                <input type="range" min="10" max="100" value="${curOpacity}" data-layer-opacity="${l.id}" />
                <span style="min-width:32px;text-align:right;font-weight:700">${curOpacity}%</span>
              </div>
              <div class="gp-opt-actions">
                ${isOn ? `<button class="gp-opt-btn" data-move-layer="${l.id}" data-move-dir="top">↑ Frente</button>` : ''}
                ${isOn ? `<button class="gp-opt-btn" data-move-layer="${l.id}" data-move-dir="bottom">↓ Trás</button>` : ''}
                <button class="gp-opt-btn" data-opt-zoom="${l.id}">Aproximar</button>
                <button class="gp-opt-btn" data-open-meta="${l.id}">ⓘ Metadados (21 campos)</button>
                ${canExport ? `<button class="gp-opt-btn" data-opt-export="${l.id}">GeoJSON ↓</button>` : ''}
                ${
                  l.officialUrl
                    ? `<a class="gp-opt-btn" href="${l.officialUrl}" target="_blank" rel="noopener">Fonte ↗</a>`
                    : ''
                }
              </div>
              ${whatTxt ? `<div class="gp-opt-desc"><b>O que é isto?</b> ${escapeHtml(whatTxt)}</div>` : ''}
            </div>
          `);
        }
      }
      parts.push('</div></div>');
    }

    if (!parts.length) {
      parts.push('<div class="gp-search-empty">Nenhuma camada encontrada para o filtro informado.</div>');
    }

    body.innerHTML = parts.join('');
  }

  // ---- Aba "Ordem" ----
  function renderOrderTab(container) {
    const ordered = engine.getOrderedActiveLayers();
    if (!ordered.length) {
      container.innerHTML =
        '<div class="gp-order-panel"><div class="gp-search-empty">Ative camadas na aba "Camadas" para organizar qual aparece por cima da outra.</div></div>';
      return;
    }

    const cards = ordered
      .map((st, idx) => {
        const sw = getLayerSwatchStyle(st.cfg);
        const curOp = Math.round((st.opacity ?? 0.7) * 100);
        const isFirst = idx === 0;
        const isLast = idx === ordered.length - 1;
        return `
          <div class="gp-order-card">
            <div class="gp-order-top">
              <span class="gp-order-rank">${idx + 1}º</span>
              <span class="${sw.cls}" style="background:${sw.bg};${sw.border ? `border:${sw.border}` : ''}"></span>
              <span class="gp-order-name">${escapeHtml(st.cfg.name)}</span>
              <button class="gp-row-btn" data-move-layer="${st.cfg.id}" data-move-dir="up" ${isFirst ? 'disabled' : ''} title="Subir camada (colocar por cima)">▲</button>
              <button class="gp-row-btn" data-move-layer="${st.cfg.id}" data-move-dir="down" ${isLast ? 'disabled' : ''} title="Descer camada (colocar por baixo)">▼</button>
              <button class="gp-row-btn" data-layer-remove="${st.cfg.id}" title="Desligar camada" style="color:#b91c1c">×</button>
            </div>
            <div class="gp-opacity-row" style="font-size:11.5px;color:#55606e">
              <span>Transparência:</span>
              <input type="range" min="10" max="100" value="${curOp}" data-layer-opacity="${st.cfg.id}" />
              <span style="min-width:30px;text-align:right;font-weight:700">${curOp}%</span>
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="gp-order-panel">
        <div class="gp-order-hint">
          As camadas no topo desta lista aparecem <b>por cima</b> das demais no mapa. Use <b>▲</b> e <b>▼</b> para reorganizar a sobreposição e ajuste a transparência.
        </div>
        ${cards}
      </div>
    `;
  }

  function renderLegendTab(container) {
    const legends = engine.getActiveLegends();
    if (!legends.length) {
      container.innerHTML =
        '<div class="gp-legend-panel"><div class="gp-search-empty">Nenhuma camada vetorial ativa no momento. Ative uma camada na aba "Camadas" para ver sua legenda e explicação didática.</div></div>';
      return;
    }

    const html = legends
      .map((leg) => {
        const hasMeanings = leg.swatches.some((s) => s.meaning);
        const itemsHtml = leg.swatches
          .map((s) => {
            const cls =
              leg.geomType === 'point'
                ? 'gp-swatch is-point'
                : leg.geomType === 'line'
                ? 'gp-swatch is-line'
                : 'gp-swatch';
            const style = s.outline
              ? `background:transparent;border:2px ${s.dashed ? 'dashed' : 'solid'} ${s.color === '#ffffff' ? '#0ea5e9' : s.color}`
              : `background:${s.color}`;
            return `
              <div class="gp-legend-item ${hasMeanings ? 'has-meaning' : ''}">
                <div class="gp-legend-row-head">
                  <span class="${cls}" style="${style}"></span>
                  <span class="gp-legend-lbl">${escapeHtml(s.label)}</span>
                </div>
                ${s.meaning ? `<div class="gp-legend-meaning">${escapeHtml(s.meaning)}</div>` : ''}
              </div>`;
          })
          .join('');
        return `
          <div class="gp-legend-card">
            <div class="gp-legend-head">
              <div class="gp-legend-title">${escapeHtml(leg.name)}</div>
              <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
                <span class="gp-src-pill ${leg.badge?.cls || 'src-oficial'}">${escapeHtml(leg.badge?.label || 'Oficial')}</span>
                <button class="gp-row-btn" data-open-meta="${escapeHtml(leg.id)}" title="Ver Metadados (21 campos)">ⓘ</button>
              </div>
            </div>
            ${leg.whatIsThis ? `<div class="gp-legend-what"><b>O que é isto?</b> ${escapeHtml(leg.whatIsThis)}</div>` : ''}
            <div class="gp-legend-grid ${hasMeanings ? 'is-detailed' : ''}">${itemsHtml}</div>
          </div>
        `;
      })
      .join('');
    container.innerHTML = `<div class="gp-legend-panel">${html}</div>`;
  }

  // Event delegation no Controle de Camadas
  document.getElementById('drawerBody')?.addEventListener('click', (e) => {
    const retryLayerBtn = e.target.closest('[data-layer-retry]');
    if (retryLayerBtn) {
      engine.reloadLayer?.(retryLayerBtn.dataset.layerRetry);
      return;
    }
    const clipChk = e.target.closest('[data-clip-toggle]');
    if (clipChk) {
      engine.setMunicipalClip(clipChk.checked);
      return;
    }
    const clipLbl = e.target.closest('[data-clip-label]');
    if (clipLbl) {
      engine.setMunicipalClip(!engine.isMunicipalClipEnabled());
      return;
    }
    const bmCheck = e.target.closest('[data-basemap-toggle]');
    if (bmCheck) {
      const id = bmCheck.dataset.basemapToggle;
      tools.disableSwipe();
      engine.setBasemapActive(id, bmCheck.checked, bmCheck.checked);
      return;
    }
    const bmLbl = e.target.closest('[data-basemap-label]');
    if (bmLbl) {
      const id = bmLbl.dataset.basemapLabel;
      const next = !engine.isBasemapActive(id);
      tools.disableSwipe();
      engine.setBasemapActive(id, next, next);
      return;
    }
    const openPan = e.target.closest('[data-open-panel]');
    if (openPan) {
      toggleFloatingPanel(openPan.dataset.openPanel);
      return;
    }
    const moveBtn = e.target.closest('[data-move-layer]');
    if (moveBtn) {
      engine.moveLayerOrder(moveBtn.dataset.moveLayer, moveBtn.dataset.moveDir);
      return;
    }
    const remBtn = e.target.closest('[data-layer-remove]');
    if (remBtn) {
      engine.disableLayer(remBtn.dataset.layerRemove);
      return;
    }
    const grpCheck = e.target.closest('[data-group-check]');
    if (grpCheck) {
      e.stopPropagation();
      const gid = grpCheck.dataset.groupCheck;
      const g = LAYER_GROUPS.find((x) => x.id === gid) || (gid === 'user_imported' ? { layers: engine.userLayers } : null);
      if (!g) return;
      if (grpCheck.checked) {
        expandedGroups.add(gid);
        if (g.layers[0]) engine.enableLayer(g.layers[0].id);
      } else {
        for (const l of g.layers) engine.disableLayer(l.id);
      }
      renderLayerDrawer();
      return;
    }
    const grpToggle = e.target.closest('[data-group-toggle]');
    if (grpToggle) {
      const gid = grpToggle.dataset.groupToggle;
      if (expandedGroups.has(gid)) expandedGroups.delete(gid);
      else expandedGroups.add(gid);
      renderLayerDrawer();
      return;
    }
    const layerCheck = e.target.closest('[data-layer-toggle]');
    if (layerCheck) {
      engine.toggleLayer(layerCheck.dataset.layerToggle, layerCheck.checked);
      return;
    }
    const layerLbl = e.target.closest('[data-layer-label]');
    if (layerLbl) {
      engine.toggleLayer(layerLbl.dataset.layerLabel);
      return;
    }
    const optsBtn = e.target.closest('[data-layer-opts]');
    if (optsBtn) {
      const id = optsBtn.dataset.layerOpts;
      openOptionsLayerId = openOptionsLayerId === id ? null : id;
      renderLayerDrawer();
      return;
    }
    const optZoom = e.target.closest('[data-opt-zoom]');
    if (optZoom) {
      const id = optZoom.dataset.optZoom;
      if (!engine.activeLayers.has(id)) {
        engine.enableLayer(id).then(() => engine.zoomToLayer(id));
      } else {
        engine.zoomToLayer(id);
      }
      return;
    }
    const optExp = e.target.closest('[data-opt-export]');
    if (optExp) {
      engine.exportLayerGeoJSON(optExp.dataset.optExport);
      return;
    }
  });

  document.getElementById('drawerBody')?.addEventListener('input', (e) => {
    const rng = e.target.closest('[data-layer-opacity]');
    if (!rng) return;
    const id = rng.dataset.layerOpacity;
    engine.setLayerOpacity(id, Number(rng.value) / 100);
    const labelSpan = rng.nextElementSibling;
    if (labelSpan) labelSpan.textContent = `${rng.value}%`;
  });

  document.getElementById('layerSearchInput')?.addEventListener('input', (e) => {
    searchFilterText = e.target.value;
    if (drawerTab !== 'layers') drawerTab = 'layers';
    renderLayerDrawer();
  });

  document.getElementById('tabLayers')?.addEventListener('click', () => { drawerTab = 'layers'; renderLayerDrawer(); });
  document.getElementById('tabOrder')?.addEventListener('click', () => { drawerTab = 'order'; renderLayerDrawer(); });
  document.getElementById('tabLegend')?.addEventListener('click', () => { drawerTab = 'legend'; renderLayerDrawer(); });

  document.getElementById('btnClearLayers')?.addEventListener('click', () => {
    engine.clearAllLayers();
    showToast('Todas as camadas vetoriais foram desativadas.', 'info');
  });

  const workspaceEl = document.getElementById('workspace');
  function setDrawerOpen(open) {
    workspaceEl?.classList.toggle('drawer-closed', !open);
    document.getElementById('btnToolLayers')?.classList.toggle('active', open);
    setTimeout(() => map.invalidateSize(), 260);
  }

  document.getElementById('btnDrawerClose')?.addEventListener('click', () => setDrawerOpen(false));
  document.getElementById('btnDrawerMin')?.addEventListener('click', () => setDrawerOpen(false));
  document.getElementById('btnToolLayers')?.addEventListener('click', () => {
    setDrawerOpen(workspaceEl?.classList.contains('drawer-closed'));
  });

  // ==================== BARRA DE STATUS ====================
  const coordsTextEl = document.getElementById('statusCoordsText');
  const crsSelectEl = document.getElementById('statusCrsSelect');
  const scaleLineEl = document.getElementById('statusScaleLine');
  const scaleSelectEl = document.getElementById('statusScaleSelect');
  let lastMouseLatLng = map.getCenter();

  function updateCoordsDisplay(latlng) {
    if (coordsTextEl) coordsTextEl.textContent = formatCoords(latlng.lat, latlng.lng, crsMode);
  }

  function updateScaleDisplay() {
    const center = map.getCenter();
    const z = map.getZoom();
    const denom = getScaleDenominator(center.lat, z);

    if (scaleSelectEl) {
      let customOpt = scaleSelectEl.querySelector('option[data-dynamic="1"]');
      if (!customOpt) {
        customOpt = document.createElement('option');
        customOpt.dataset.dynamic = '1';
        scaleSelectEl.prepend(customOpt);
      }
      customOpt.value = String(denom);
      customOpt.textContent = `1 : ${denom.toLocaleString('pt-BR')}`;
      scaleSelectEl.value = String(denom);
    }

    if (scaleLineEl) {
      const mPerPx = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, z);
      const targetMeters = mPerPx * 85;
      const steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
      let chosen = steps[0];
      for (const s of steps) if (s <= targetMeters * 1.35) chosen = s;
      const px = Math.max(46, Math.min(130, Math.round(chosen / mPerPx)));
      scaleLineEl.style.width = `${px}px`;
      scaleLineEl.textContent = chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
    }
  }

  map.on('mousemove', (e) => { lastMouseLatLng = e.latlng; updateCoordsDisplay(e.latlng); });
  map.on('zoomend moveend', updateScaleDisplay);
  crsSelectEl?.addEventListener('change', (e) => { crsMode = e.target.value; updateCoordsDisplay(lastMouseLatLng); });
  scaleSelectEl?.addEventListener('change', (e) => {
    const targetScale = Number(e.target.value);
    if (targetScale > 0) map.setZoom(Math.round(getZoomForScale(map.getCenter().lat, targetScale)));
  });
  updateCoordsDisplay(lastMouseLatLng);
  updateScaleDisplay();

  // ==================== BUSCA UNIFICADA ====================
  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');
  const searchResultsEl = document.getElementById('searchResults');
  let searchTimer = null;

  document.getElementById('btnSearchToggle')?.addEventListener('click', () => {
    const isExp = searchBar.classList.toggle('expanded');
    if (isExp) searchInput.focus();
    else searchResultsEl.classList.remove('open');
  });

  document.getElementById('btnSearchClear')?.addEventListener('click', () => {
    searchInput.value = '';
    searchBar.classList.remove('has-text');
    searchResultsEl.classList.remove('open');
    tools.clearHighlight();
    searchInput.focus();
  });

  searchInput?.addEventListener('input', () => {
    const val = searchInput.value;
    searchBar.classList.toggle('has-text', val.length > 0);
    clearTimeout(searchTimer);
    if (val.trim().length < 2) {
      searchResultsEl.classList.remove('open');
      return;
    }
    searchResultsEl.innerHTML = '<div class="gp-search-empty">Pesquisando no Geoportal Municipal de Jacinto Machado...</div>';
    searchResultsEl.classList.add('open');
    searchTimer = setTimeout(async () => {
      const hits = await tools.unifiedSearch(val);
      if (!hits.length) {
        searchResultsEl.innerHTML =
          '<div class="gp-search-empty">Nenhum resultado. Tente Bairro (ex: Itinga, Porto Grande, Centro, Rainha), Rodovia (BR-280, BR-101), Rua, Escola, Saúde ou Coordenada.</div>';
        return;
      }
      searchResultsEl.innerHTML = hits
        .map(
          (h, idx) => `
          <div class="gp-search-item" data-search-idx="${idx}">
            <span class="gp-search-badge">${escapeHtml(h.badge)}</span>
            <div>
              <div class="gp-search-item-title">${escapeHtml(h.title)}</div>
              <div class="gp-search-item-sub">${escapeHtml(h.subtitle || '')}</div>
            </div>
          </div>`
        )
        .join('');
      searchResultsEl._hits = hits;
    }, 240);
  });

  searchResultsEl?.addEventListener('click', (e) => {
    const itemEl = e.target.closest('[data-search-idx]');
    if (!itemEl) return;
    const hit = searchResultsEl._hits?.[Number(itemEl.dataset.searchIdx)];
    if (hit) {
      tools.focusSearchResult(hit);
      searchResultsEl.classList.remove('open');
    }
  });

  // ==================== BARRA DE NAVEGAÇÃO ESQUERDA ====================
  document.getElementById('btnCrsInfo')?.addEventListener('click', () => {
    crsMode = crsMode === 'utm' ? 'wgs84' : crsMode === 'wgs84' ? 'dms' : 'utm';
    if (crsSelectEl) crsSelectEl.value = crsMode;
    updateCoordsDisplay(lastMouseLatLng);
    const names = { utm: 'SIRGAS 2000 / UTM 22S (EPSG:31982)', wgs84: 'WGS84 / Graus Decimais', dms: 'Graus, Minutos e Segundos (DMS)' };
    showToast(`Sistema de coordenadas: ${names[crsMode]}`, 'info');
  });
  document.getElementById('btnBoxZoom')?.addEventListener('click', () => {
    tools.setMode(tools.getMode() === 'boxZoom' ? 'pan' : 'boxZoom');
  });
  document.getElementById('btnZoomIn')?.addEventListener('click', () => map.zoomIn());
  document.getElementById('btnZoomOut')?.addEventListener('click', () => map.zoomOut());
  document.getElementById('btnPan')?.addEventListener('click', () => tools.setMode('pan'));
  document.getElementById('btnHome')?.addEventListener('click', () => tools.resetHome());
  document.getElementById('btnUndo')?.addEventListener('click', () => tools.undoView());
  document.getElementById('btnRedo')?.addEventListener('click', () => tools.redoView());
  document.getElementById('btnFullscreen')?.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  });
  document.getElementById('btnLocate')?.addEventListener('click', () => tools.locateUser());

  // ==================== PAINÉIS FLUTUANTES ====================
  const fpEl = document.getElementById('floatingPanel');
  const fpTitle = document.getElementById('fpTitle');
  const fpBody = document.getElementById('fpBody');

  function closeFloatingPanel() {
    activeFloatingPanel = null;
    fpEl?.classList.remove('open');
    document.querySelectorAll('.gp-right-toolbar .gp-tool-btn[data-panel]').forEach((b) => b.classList.remove('active'));
    handleModeBanner(tools.getMode());
  }

  document.getElementById('fpClose')?.addEventListener('click', () => {
    closeFloatingPanel();
    if (tools.getMode() !== 'pan') tools.setMode('pan');
  });

  function toggleFloatingPanel(panelId) {
    if (activeFloatingPanel === panelId) {
      closeFloatingPanel();
      if (tools.getMode() !== 'pan') tools.setMode('pan');
      return;
    }
    activeFloatingPanel = panelId;
    fpEl?.classList.add('open');
    document.querySelectorAll('.gp-right-toolbar .gp-tool-btn[data-panel]').forEach((b) => {
      b.classList.toggle('active', b.dataset.panel === panelId);
    });

    if (panelId === 'basemaps') renderBasemapsPanel();
    else if (panelId === 'measure') {
      if (!tools.getMode().startsWith('measure')) tools.setMode('measureDist');
      renderMeasurePanel();
    } else if (panelId === 'draw') renderDrawPanel();
    else if (panelId === 'identify') {
      tools.setMode('identify');
      renderIdentifyPanel({ idle: true });
    } else if (panelId === 'select') {
      tools.setMode('select');
      renderIdentifyPanel({ idle: true, diagnosticMode: true });
    } else if (panelId === 'import') renderImportPanel();
    else if (panelId === 'print') renderPrintPanel();

    handleModeBanner(tools.getMode());
  }

  document.querySelectorAll('.gp-right-toolbar .gp-tool-btn[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => toggleFloatingPanel(btn.dataset.panel));
  });

  function handleModeBanner(mode) {
    const banner = document.getElementById('modeBanner');
    const txt = document.getElementById('modeBannerText');
    document.getElementById('btnBoxZoom')?.classList.toggle('active', mode === 'boxZoom');
    document.getElementById('btnPan')?.classList.toggle('active', mode === 'pan');

    const panelAlreadyShowsInfo =
      (activeFloatingPanel === 'measure' && mode.startsWith('measure')) ||
      (activeFloatingPanel === 'draw' && mode.startsWith('draw')) ||
      ((activeFloatingPanel === 'identify' || activeFloatingPanel === 'select') && (mode === 'identify' || mode === 'select'));

    const labels = {
      boxZoom: 'Zoom por Retângulo: arraste sobre a área desejada',
      identify: 'Identificar Feições: clique em qualquer ponto de Jacinto Machado',
      select: 'Diagnóstico Territorial: clique em qualquer local do município',
      measureDist: 'Medindo Distância: clique nos vértices (duplo clique finaliza)',
      measureArea: 'Medindo Área: marque 3+ pontos (duplo clique finaliza)',
      drawPoint: 'Desenho (Ponto): clique no mapa para marcar',
      drawLine: 'Desenho (Linha): clique nos vértices (duplo clique finaliza)',
      drawPoly: 'Desenho (Polígono): marque 3+ pontos (duplo clique finaliza)',
    };

    if (labels[mode] && !panelAlreadyShowsInfo) {
      txt.textContent = labels[mode];
      banner.classList.add('open');
    } else {
      banner.classList.remove('open');
    }
  }

  document.getElementById('btnModeCancel')?.addEventListener('click', () => tools.setMode('pan'));

  // ---- Painel 1: Mapas Base, Relevo SIGSC & Cortina Comparativa ----
  let swipeUiState = { active: false, left: 'satelite_global', right: 'orto_sigsc_2012' };

  function renderBasemapsPanel() {
    fpTitle.textContent = 'Mapas Base, Orto SC 2012 e Relevo MDT';
    const cards = BASEMAPS.map((bm) => {
      const active = engine.isBasemapActive(bm.id);
      return `
        <div class="gp-basemap-card ${active ? 'active' : ''}" data-bm-select="${bm.id}">
          <span class="gp-basemap-year">${escapeHtml(bm.year)}</span>
          <div class="gp-basemap-name">${escapeHtml(bm.shortName)}</div>
          <div style="font-size:10.5px;color:#64748b;margin-top:2px">${escapeHtml(bm.category)}</div>
        </div>
      `;
    }).join('');

    const bmOptions = (sel) =>
      BASEMAPS.map((b) => `<option value="${b.id}" ${b.id === sel ? 'selected' : ''}>${escapeHtml(b.shortName)} (${b.year})</option>`).join('');

    fpBody.innerHTML = `
      <label style="display:flex;align-items:center;gap:8px;padding:7px 9px;background:#eef5ff;border:1px solid #c7dbf7;border-radius:6px;margin-bottom:10px;cursor:pointer;font-weight:700;color:var(--brand-navy);font-size:12px">
        <input type="checkbox" id="fpClipMunicipal" class="gp-checkbox" ${engine.isMunicipalClipEnabled() ? 'checked' : ''} />
        Recortar imagem ao limite oficial de Jacinto Machado (IBGE)
      </label>
      <div class="gp-basemap-grid">${cards}</div>
      <div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:4px">
        <div style="font-weight:800;margin-bottom:6px;color:#1e293b">Cortina Comparativa (Antes × Depois)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#555">Esquerda</label>
            <select id="swipeLeftSel" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px">${bmOptions(swipeUiState.left)}</select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#555">Direita</label>
            <select id="swipeRightSel" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px">${bmOptions(swipeUiState.right)}</select>
          </div>
        </div>
        <div class="gp-btn-row" style="margin:0">
          <button class="gp-btn primary" id="btnStartSwipe">${swipeUiState.active ? 'Atualizar Cortina' : 'Ativar Cortina Comparativa'}</button>
          ${swipeUiState.active ? '<button class="gp-btn danger" id="btnStopSwipe">Desativar</button>' : ''}
        </div>
      </div>
    `;

    document.getElementById('fpClipMunicipal')?.addEventListener('change', (e) => {
      engine.setMunicipalClip(e.target.checked);
    });

    fpBody.querySelectorAll('[data-bm-select]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.bmSelect;
        if (swipeUiState.active) tools.disableSwipe();
        const next = !engine.isBasemapActive(id);
        engine.setBasemapActive(id, next, next);
        renderBasemapsPanel();
      });
    });

    document.getElementById('btnStartSwipe')?.addEventListener('click', () => {
      const l = document.getElementById('swipeLeftSel').value;
      const r = document.getElementById('swipeRightSel').value;
      tools.enableSwipe(l, r);
      closeFloatingPanel();
      showToast('Cortina Comparativa ativa! Arraste a barra ⇄ no centro do mapa para comparar.', 'success');
    });
    document.getElementById('btnStopSwipe')?.addEventListener('click', () => {
      tools.disableSwipe();
      renderBasemapsPanel();
    });
  }

  // Cortina arrastável (Swipe)
  const swipeDiv = document.getElementById('swipeDivider');
  const swipeTagL = document.getElementById('swipeTagLeft');
  const swipeTagR = document.getElementById('swipeTagRight');

  function renderSwipeOverlay(active, leftId, rightId, pos) {
    swipeUiState = { active, left: leftId, right: rightId };
    if (!swipeDiv) return;
    swipeDiv.classList.toggle('active', active);
    if (active) {
      swipeDiv.style.left = `${pos * 100}%`;
      const lBm = BASEMAPS.find((b) => b.id === leftId);
      const rBm = BASEMAPS.find((b) => b.id === rightId);
      if (swipeTagL) swipeTagL.textContent = lBm ? lBm.shortName : leftId;
      if (swipeTagR) swipeTagR.textContent = rBm ? rBm.shortName : rightId;
    }
  }

  let draggingSwipe = false;
  swipeDiv?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    draggingSwipe = true;
    map.dragging.disable();
  });
  window.addEventListener('mousemove', (e) => {
    if (!draggingSwipe) return;
    const rect = document.getElementById('map').getBoundingClientRect();
    const clamped = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    swipeDiv.style.left = `${clamped * 100}%`;
    tools.setSwipePosition(clamped);
  });
  window.addEventListener('mouseup', () => {
    if (draggingSwipe) {
      draggingSwipe = false;
      map.dragging.enable();
    }
  });

  // ---- Painel 2: Medição ----
  function renderMeasurePanel() {
    fpTitle.textContent = 'Medir Distância e Área';
    fpBody.innerHTML = `
      <div class="gp-btn-row">
        <button class="gp-btn ${tools.getMode() === 'measureDist' ? 'active' : ''}" id="btnMeasureDist">📏 Distância</button>
        <button class="gp-btn ${tools.getMode() === 'measureArea' ? 'active' : ''}" id="btnMeasureArea">📐 Área</button>
        <button class="gp-btn danger" id="btnMeasureClear">Limpar</button>
      </div>
      <div id="measureOutput" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:10px;line-height:1.5">
        Clique no mapa para marcar os vértices. Dê <b>duplo clique</b> ou clique em <b>Finalizar</b> para concluir.
      </div>
      <div style="margin-top:8px;display:flex;justify-content:flex-end">
        <button class="gp-btn primary" id="btnMeasureFinish">Finalizar Traçado</button>
      </div>
    `;
    document.getElementById('btnMeasureDist')?.addEventListener('click', () => { tools.setMode('measureDist'); renderMeasurePanel(); });
    document.getElementById('btnMeasureArea')?.addEventListener('click', () => { tools.setMode('measureArea'); renderMeasurePanel(); });
    document.getElementById('btnMeasureClear')?.addEventListener('click', () => tools.clearMeasurements());
    document.getElementById('btnMeasureFinish')?.addEventListener('click', () => tools.finishMeasurement());
  }

  // ---- Painel 3: Desenho ----
  function renderDrawPanel() {
    fpTitle.textContent = 'Desenhar e Anotar no Mapa';
    fpBody.innerHTML = `
      <div class="gp-btn-row">
        <button class="gp-btn ${tools.getMode() === 'drawPoint' ? 'active' : ''}" id="btnDrawPt">● Ponto</button>
        <button class="gp-btn ${tools.getMode() === 'drawLine' ? 'active' : ''}" id="btnDrawLn">╱ Linha</button>
        <button class="gp-btn ${tools.getMode() === 'drawPoly' ? 'active' : ''}" id="btnDrawPg">⬠ Polígono</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <input id="drawLabelInput" type="text" placeholder="Rótulo da anotação (opcional)" style="flex:1;padding:6px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:12.5px" />
        <input id="drawColorInput" type="color" value="#e11d48" title="Cor do desenho" style="width:34px;height:30px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer" />
      </div>
      <div class="gp-btn-row">
        <button class="gp-btn" id="btnDrawFinish">Concluir</button>
        <button class="gp-btn primary" id="btnDrawExport">Exportar GeoJSON</button>
        <button class="gp-btn danger" id="btnDrawClear">Limpar</button>
      </div>
      <div id="drawCountBadge" style="font-size:12px;color:#55606e">Escolha uma geometria acima e clique no mapa.</div>
    `;
    document.getElementById('btnDrawPt')?.addEventListener('click', () => { tools.setMode('drawPoint'); renderDrawPanel(); });
    document.getElementById('btnDrawLn')?.addEventListener('click', () => { tools.setMode('drawLine'); renderDrawPanel(); });
    document.getElementById('btnDrawPg')?.addEventListener('click', () => { tools.setMode('drawPoly'); renderDrawPanel(); });
    document.getElementById('drawColorInput')?.addEventListener('input', (e) => tools.setDrawColor(e.target.value));
    document.getElementById('btnDrawFinish')?.addEventListener('click', () => tools.finishDrawing(document.getElementById('drawLabelInput')?.value?.trim() || ''));
    document.getElementById('btnDrawExport')?.addEventListener('click', () => tools.exportDrawingsGeoJSON());
    document.getElementById('btnDrawClear')?.addEventListener('click', () => tools.clearDrawings());
  }

  // ---- Painel 4: Identificação / Raio-X Territorial ----
  function renderIdentifyPanel({ idle = false, loading = false, latlng = null, results = [], diagnosticMode = false } = {}) {
    activeFloatingPanel = diagnosticMode ? 'select' : 'identify';
    fpEl?.classList.add('open');
    fpTitle.textContent = diagnosticMode ? 'Diagnóstico Territorial Rápido' : 'Identificação de Feições (Raio-X)';

    if (idle) {
      fpBody.innerHTML = `
        <p style="margin:0;color:#475569;line-height:1.5">
          Clique em qualquer local de <b>Jacinto Machado</b> para consultar simultaneamente:
          <b>Setor Censitário (IBGE 2022)</b>, <b>Setor Censitário</b>, <b>Setor de Risco (CPRM)</b>,
          <b>Bacia Hidrográfica (IMA-SC)</b>, <b>Geologia &amp; Solos</b>, além de todas as camadas ativas (FBDS, Licenciamento, etc.).
        </p>
      `;
      return;
    }

    const utmStr = formatCoords(latlng.lat, latlng.lng, 'utm');
    const wgsStr = formatCoords(latlng.lat, latlng.lng, 'wgs84');
    const dmsStr = formatCoords(latlng.lat, latlng.lng, 'dms');

    const coordBox = `
      <div class="gp-id-coords">
        <div><b>UTM 22S (SIRGAS 2000):</b> ${escapeHtml(utmStr)}</div>
        <div><b>WGS84 (Lat/Lon):</b> ${escapeHtml(wgsStr)}</div>
        <div><b>DMS:</b> ${escapeHtml(dmsStr)}</div>
      </div>
      <div class="gp-btn-row">
        <button class="gp-btn" id="btnCopyPointCoords">Copiar</button>
        <a class="gp-btn" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latlng.lat},${latlng.lng}" target="_blank" rel="noopener">Street View ↗</a>
        <a class="gp-btn primary" href="https://rigeo.sgb.gov.br/items/c43f811a-d579-4e78-aa19-cb4e54394f08" target="_blank" rel="noopener">RIGeo SGB ↗</a>
      </div>
    `;

    if (loading) {
      fpBody.innerHTML = `${coordBox}<div style="display:flex;align-items:center;gap:8px;padding:12px 0"><span class="gp-spinner"></span><span>Consultando camadas territoriais de Jacinto Machado...</span></div>`;
      return;
    }

    let sectionsHtml = '';
    if (!results.length) {
      sectionsHtml = '<div class="gp-search-empty">Nenhuma feição encontrada neste ponto (verifique se clicou dentro do território de Jacinto Machado).</div>';
    } else {
      sectionsHtml = results
        .map((r) => {
          const rows = [];
          const props = r.features[0]?.properties || {};
          for (const [k, v] of Object.entries(props)) {
            if (rows.length >= 8) break;
            if (['objectid', 'fid', 'globalid', 'id', 'id1', 'cd_fcim', 'fit_tp'].includes(k.toLowerCase())) continue;
            const fv = formatFieldValue(k, v);
            if (fv) rows.push(`<tr><th>${escapeHtml(prettyFieldName(k))}</th><td>${escapeHtml(fv)}</td></tr>`);
          }
          return `
            <div class="gp-id-section">
              <div class="gp-id-section-head">
                <span>${escapeHtml(r.layerName)}</span>
                <span class="gp-id-tag">${r.isCoreExtra ? 'Contexto Base' : `${r.features.length} feição(ões)`}</span>
              </div>
              <table class="gp-id-table">${rows.join('') || '<tr><td>Sem atributos disponíveis.</td></tr>'}</table>
            </div>
          `;
        })
        .join('');
    }

    fpBody.innerHTML = coordBox + sectionsHtml;
    document.getElementById('btnCopyPointCoords')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(`UTM 22S: ${utmStr} | WGS84: ${wgsStr}`);
      showToast('Coordenadas copiadas!', 'success');
    });
  }

  // ---- Painel 5: Importar / Exportar ----
  function renderImportPanel() {
    fpTitle.textContent = 'Importar / Exportar Arquivos SIG';
    fpBody.innerHTML = `
      <p style="margin:0 0 10px;color:#475569;line-height:1.45">
        Carregue arquivos <b>Shapefile (.zip)</b> (ex: CAR, FBDS, levantamentos topográficos), <b>GeoJSON</b> ou <b>KML</b> para sobrepor ao mapa de Jacinto Machado:
      </p>
      <div class="gp-dropzone" id="importDropzone">
        <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:4px">Arraste o arquivo aqui ou clique para selecionar</div>
        <div style="font-size:11.5px;color:#64748b">Formatos aceitos: .zip (Shapefile), .geojson, .json, .kml</div>
        <input type="file" id="importFileInput" accept=".zip,.geojson,.json,.kml" style="display:none" />
      </div>
      <div style="border-top:1px solid #e2e8f0;padding-top:10px">
        <div style="font-weight:800;margin-bottom:6px">Exportar Camadas Ativas</div>
        <div id="importActiveExports"></div>
      </div>
    `;

    const dz = document.getElementById('importDropzone');
    const fi = document.getElementById('importFileInput');
    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      if (e.dataTransfer.files?.[0]) handleImportFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener('change', () => {
      if (fi.files?.[0]) handleImportFile(fi.files[0]);
    });

    const expBox = document.getElementById('importActiveExports');
    const ordered = engine.getOrderedActiveLayers();
    if (!ordered.length) {
      expBox.innerHTML = '<div style="font-size:12px;color:#64748b">Ative camadas no Controle de Camadas para exportá-las.</div>';
    } else {
      expBox.innerHTML = ordered
        .map(
          (st) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f1f5f9">
            <span style="font-size:12px;font-weight:600">${escapeHtml(st.cfg.name)}</span>
            <button class="gp-opt-btn" data-quick-exp="${st.cfg.id}">GeoJSON</button>
          </div>`
        )
        .join('');
      expBox.querySelectorAll('[data-quick-exp]').forEach((b) => {
        b.addEventListener('click', () => engine.exportLayerGeoJSON(b.dataset.quickExp));
      });
    }
  }

  async function handleImportFile(file) {
    try {
      showToast(`Processando "${file.name}"...`, 'info');
      await engine.importUserFile(file);
    } catch (err) {
      showToast(`Erro na importação: ${err.message}`, 'error');
    }
  }

  // ---- Painel 6: Impressão ----
  function renderPrintPanel() {
    fpTitle.textContent = 'Imprimir / Salvar Mapa em PDF';
    const info = tools.buildPrintSummary();
    fpBody.innerHTML = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:10px;font-size:12px;line-height:1.55">
        <div><b>Município:</b> Jacinto Machado — SC (IBGE 4208708)</div>
        <div><b>Sistema de Referência:</b> SIRGAS 2000 / UTM 22S</div>
        <div><b>Escala Atual:</b> ${escapeHtml(info.scale)}</div>
        <div><b>Centro (UTM 22S):</b> ${escapeHtml(info.utm)}</div>
        <div><b>Data/Hora:</b> ${escapeHtml(info.date)}</div>
        <div><b>Camadas Ativas:</b> ${info.legends.length}</div>
      </div>
      <p style="margin:0 0 10px;font-size:12px;color:#55606e">
        Na janela de impressão, escolha <b>"Salvar como PDF"</b> em orientação <b>Paisagem</b> com <b>Gráficos de fundo</b> ativados.
      </p>
      <div class="gp-btn-row">
        <button class="gp-btn primary" id="btnTriggerPrint">🖨️ Imprimir / Gerar PDF</button>
      </div>
    `;
    document.getElementById('btnTriggerPrint')?.addEventListener('click', () => {
      closeFloatingPanel();
      setTimeout(() => window.print(), 180);
    });
  }

  // ==================== NAVEGAÇÃO SUPERIOR ====================
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  function setNavActive(navId) {
    document.querySelectorAll('.gp-nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.nav === navId));
    document.getElementById('mainNav')?.classList.remove('mobile-open');
  }

  function closeModal() {
    modalBackdrop?.classList.remove('open');
    setNavActive('map');
  }

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

  function openNavSection(navId) {
    setNavActive(navId);
    if (navId === 'map') {
      modalBackdrop?.classList.remove('open');
      return;
    }

    modalBackdrop?.classList.add('open');

    if (navId === 'home') {
      modalTitle.textContent = 'Geoportal Municipal de Jacinto Machado — Visão Geral e Mapas Temáticos Integrados';
      const totalLayers = window.GeoCatalog.getAllLayers().length;
      modalBody.innerHTML = `
        <div class="gp-hero-banner">
          <h3>Todos os dados geoespaciais de Jacinto Machado em um único mapa interativo</h3>
          <p>
            Interface unificada no padrão do Geoportal de Florianópolis, reunindo bases oficiais de
            <b>IBGE (Censo 2022 e BDIA)</b>, <b>FBDS (Uso do Solo, APP, Hidrografia e Nascentes)</b>,
            <b>SIGSC (Ortofoto SC 2012 39 cm e MDT/MDS)</b>, <b>IMA-SC</b>, <b>SGB/CPRM (Riscos e SIAGAS)</b>,
            <b>FUNAI</b>, <b>DataSUS/CNES</b> e <b>OpenStreetMap</b> recortadas pelo limite oficial
            <b>IBGE 4208708 (430,704 km²)</b>.
          </p>
          <div class="gp-stats-strip">
            <span class="gp-stat-chip">${totalLayers} camadas vetoriais verificadas</span>
            <span class="gp-stat-chip">${BASEMAPS.length} mapas base (Satélite HD &amp; SIGSC)</span>
            <span class="gp-stat-chip">IBGE 4208708 • 430,704 km²</span>
            <span class="gp-stat-chip">SIRGAS 2000 / UTM 22S</span>
          </div>
        </div>
        <h4 style="margin:0 0 10px;font-size:15px;font-weight:800;color:#1e293b">Escolha um conjunto temático pronto para abrir no mapa:</h4>
        <div class="gp-preset-grid">
          ${THEMATIC_PRESETS.map(
            (p) => `
            <div class="gp-preset-card" style="border-top:3px solid ${p.color}">
              <div>
                <div class="gp-preset-title">${escapeHtml(p.title)}</div>
                <div class="gp-preset-desc">${escapeHtml(p.desc)}</div>
              </div>
              <button class="gp-btn primary" data-apply-preset="${p.id}">Abrir no Mapa</button>
            </div>`
          ).join('')}
        </div>
      `;
      modalBody.querySelectorAll('[data-apply-preset]').forEach((btn) => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.applyPreset));
      });
    } else if (navId === 'downloads') {
      modalTitle.textContent = 'Central de Downloads — Bases Oficiais de Jacinto Machado (SC)';
      modalBody.innerHTML = `
        <p style="margin:0 0 14px;color:#475569;line-height:1.5">
          Todos os conjuntos geoespaciais de <b>Jacinto Machado (IBGE 4208708)</b> reunidos em um único repositório com
          visualização imediata no mapa, download em <b>GeoJSON (WGS84)</b> e acesso direto às fontes originais
          (<a href="${FBDS_BASE}/" target="_blank" rel="noopener" style="color:var(--brand-navy);font-weight:700">FBDS</a>,
          <a href="https://rigeo.sgb.gov.br/items/c43f811a-d579-4e78-aa19-cb4e54394f08cidadao/pagina/mapa" target="_blank" rel="noopener" style="color:var(--brand-navy);font-weight:700">Prefeitura/Atende.Net</a>,
          IBGE, SIGSC, IMA-SC e SGB/CPRM):
        </p>
        ${OFFICIAL_DOWNLOADS.map(
          (cat) => `
          <div class="gp-dl-cat">
            <div class="gp-dl-cat-head">
              <span>${escapeHtml(cat.title)}</span>
              <span style="font-size:11.5px;color:#64748b;font-weight:700">${cat.items.length} bases</span>
            </div>
            <div class="gp-dl-list">
              ${cat.items
                .map(
                  (it) => `
                <div class="gp-dl-row">
                  <div>
                    <div class="gp-dl-name">${escapeHtml(it.label)}</div>
                    <div class="gp-dl-fmt">${escapeHtml(it.format)}</div>
                  </div>
                  <div class="gp-dl-actions">
                    ${
                      it.layerId || it.basemapId
                        ? `<button class="gp-btn primary" data-dl-view-layer="${it.layerId || ''}" data-dl-view-bm="${it.basemapId || ''}">Ver no Mapa</button>`
                        : ''
                    }
                    ${
                      it.localFile
                        ? `<a class="gp-btn" href="${it.localFile}" download>GeoJSON ↓</a>`
                        : ''
                    }
                    ${
                      it.externalUrl
                        ? `<a class="gp-btn" href="${it.externalUrl}" target="_blank" rel="noopener">Oficial ↗</a>`
                        : ''
                    }
                  </div>
                </div>`
                )
                .join('')}
            </div>
          </div>`
        ).join('')}
      `;

      modalBody.querySelectorAll('[data-dl-view-layer], [data-dl-view-bm]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const lid = btn.dataset.dlViewLayer;
          const bmid = btn.dataset.dlViewBm;
          closeModal();
          setDrawerOpen(true);
          if (bmid) {
            engine.setBasemapActive(bmid, true, true);
            showToast('Base aérea / relevo oficial ativada no mapa!', 'success');
          }
          if (lid) {
            const found = window.GeoCatalog.getLayerById(lid);
            if (found) expandedGroups.add(found.group.id);
            engine.enableLayer(lid).then(() => engine.zoomToLayer(lid));
            showToast(`Camada "${found?.layer?.name || lid}" ativada no mapa!`, 'success');
          }
        });
      });
    } else if (navId === 'socio') {
      modalTitle.textContent = 'Painel Socioeconômico — Jacinto Machado (SC)';
      const ind = window.JACINTO_INDICADORES || {};
      const dem = ind.demografia_censo_2022 || {};
      const eco = ind.economia_pib || {};
      const pam = ind.agropecuaria_pam || {};
      const ppm = ind.pecuaria_ppm || {};
      const uso = ind.uso_solo_fbds || {};
      const eq = ind.equipamentos_publicos || {};

      const fmtN = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
      const fmtBRL = (n) => 'R$ ' + fmtN(n, 2);

      // PIB historical series & latest year with non-zero sectoral VAB
      const pibYears = Object.keys(eco.serie_historica || {}).sort();
      const latestYr = eco.ano_referencia || pibYears[pibYears.length - 1] || '2023';
      const vabYr = [...pibYears].reverse().find((y) => {
        const o = (eco.serie_historica || {})[y] || {};
        return (o['Valor adicionado bruto a preços correntes da agropecuária'] || 0) > 0;
      }) || '2021';
      const vabObj = (eco.serie_historica || {})[vabYr] || {};
      const vabItems = [
        { label: 'Serviços (exc. Adm. Pública)', val: vabObj['Valor adicionado bruto a preços correntes dos serviços, exclusive administração, defesa, educação e saúde públicas e seguridade social'] || 0, color: '#0284c7' },
        { label: 'Agropecuária', val: vabObj['Valor adicionado bruto a preços correntes da agropecuária'] || 0, color: '#16a34a' },
        { label: 'Indústria', val: vabObj['Valor adicionado bruto a preços correntes da indústria'] || 0, color: '#f59e0b' },
        { label: 'Administração Pública', val: vabObj['Valor adicionado bruto a preços correntes da administração, defesa, educação e saúde públicas e seguridade social'] || 0, color: '#7c3aed' },
      ];
      const maxVab = Math.max(...vabItems.map((x) => x.val), 1);

      // PAM combined top crops
      const allCrops = [
        ...(pam.lavouras_temporarias || []).map((c) => ({ ...c, tipo: 'Temporária' })),
        ...(pam.lavouras_permanentes || []).map((c) => ({ ...c, tipo: 'Permanente' })),
      ].sort((a, b) => b.valor_mil_reais - a.valor_mil_reais).slice(0, 8);
      const maxCropVal = Math.max(...allCrops.map((x) => x.valor_mil_reais), 1);

      // FBDS Land Use
      const usoEntries = Object.entries(uso.classes_ha || {}).sort((a, b) => b[1] - a[1]);
      const usoTotalHa = usoEntries.reduce((s, [, v]) => s + v, 0) || 1;
      const usoColorMap = {
        'área antropizada': '#eab308',
        'formação florestal': '#15803d',
        silvicultura: '#0f766e',
        'água': '#0284c7',
        'formação não florestal': '#84cc16',
        'área edificada': '#dc2626',
      };

      modalBody.innerHTML = `
        <div class="gp-hero-banner" style="margin-bottom:14px">
          <h3>Indicadores Oficiais do Município de Jacinto Machado — SC (IBGE 4208708)</h3>
          <p style="margin:4px 0 0">Dados consolidados das pesquisas oficiais do <b>IBGE (Censo 2022, PIB Municipal ${escapeHtml(latestYr)}, PAM e PPM)</b>, <b>FBDS (Uso do Solo 5 m)</b>, <b>DataSUS/CNES</b> e <b>SGB/CPRM</b>.</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;margin-bottom:16px">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #033c8e;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;font-weight:700;color:#64748b">POPULAÇÃO (CENSO 2022)</div>
            <div style="font-size:21px;font-weight:900;color:#0f172a">${fmtN(dem.populacao_total)} hab.</div>
            <div style="font-size:11px;color:#475569">${fmtN(dem.domicilios_ocupados)} domicílios (${fmtN(dem.media_moradores_domicilio, 2)} mor./dom.)</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #059669;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;font-weight:700;color:#64748b">ÁREA E DENSIDADE (2022)</div>
            <div style="font-size:21px;font-weight:900;color:#0f172a">${fmtN(dem.area_km2, 1)} km²</div>
            <div style="font-size:11px;color:#475569">${fmtN(dem.densidade_hab_km2, 2)} hab./km²</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #d97706;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;font-weight:700;color:#64748b">PIB MUNICIPAL (${escapeHtml(latestYr)})</div>
            <div style="font-size:21px;font-weight:900;color:#0f172a">R$ ${fmtN((eco.pib_total_mil_reais || 0) / 1000, 1)} mi</div>
            <div style="font-size:11px;color:#475569">IBGE Contas Regionais</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #7c3aed;border-radius:8px;padding:10px 12px">
            <div style="font-size:11px;font-weight:700;color:#64748b">PIB PER CAPITA (${escapeHtml(latestYr)})</div>
            <div style="font-size:21px;font-weight:900;color:#0f172a">${fmtBRL(eco.pib_per_capita_reais)}</div>
            <div style="font-size:11px;color:#475569">Base pop. Censo 2022</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:16px">
          <!-- Distribuição Urbana vs Rural -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:8px">Distribuição Urbana × Rural (Censo IBGE 2022)</div>
            <div style="display:flex;height:24px;border-radius:6px;overflow:hidden;margin-bottom:8px">
              <div style="width:${dem.populacao_urbana_pct || 58.95}%;background:#f59e0b;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${fmtN(dem.populacao_urbana_pct, 1)}% Urbana</div>
              <div style="width:${dem.populacao_rural_pct || 41.05}%;background:#16a34a;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${fmtN(dem.populacao_rural_pct, 1)}% Rural</div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#334155">
              <span><b>Urbana:</b> ${fmtN(dem.populacao_urbana)} hab.</span>
              <span><b>Rural:</b> ${fmtN(dem.populacao_rural)} hab.</span>
            </div>
            <div style="margin-top:8px"><button class="gp-btn" data-socio-layer="setores_censitarios_ibge">Ver Setores Censitários no Mapa</button></div>
          </div>

          <!-- Composição do VAB (PIB Setorial) -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:8px">Valor Adicionado Bruto por Setor — PIB ${escapeHtml(vabYr)} (IBGE)</div>
            ${vabItems.map((it) => `
              <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px">
                  <span style="color:#334155;font-weight:700">${escapeHtml(it.label)}</span>
                  <span style="color:#0f172a;font-weight:800">R$ ${fmtN(it.val / 1000, 1)} mi</span>
                </div>
                <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${Math.max(4, (it.val / maxVab) * 100)}%;background:${it.color}"></div>
                </div>
              </div>
            `).join('')}
            <div style="font-size:11px;color:#64748b;margin-top:6px">Série PIB Total: ${pibYears.map((y) => `${y}: R$ ${fmtN((eco.serie_historica[y]?.['Produto Interno Bruto a preços correntes'] || 0) / 1000, 1)} mi`).join(' • ')}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:16px">
          <!-- Produção Agrícola PAM -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:8px">Produção Agrícola Municipal — Principais Culturas (IBGE PAM ${escapeHtml(pam.ano_temporarias || '2024')})</div>
            ${allCrops.map((c) => `
              <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px">
                  <span style="color:#334155;font-weight:700">${escapeHtml(c.produto)} <span style="color:#64748b;font-weight:600">(${fmtN(c.area_ha)} ha • ${fmtN(c.producao_t)} t)</span></span>
                  <span style="color:#0f172a;font-weight:800">R$ ${fmtN(c.valor_mil_reais / 1000, 2)} mi</span>
                </div>
                <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${Math.max(3, (c.valor_mil_reais / maxCropVal) * 100)}%;background:${c.tipo === 'Permanente' ? '#16a34a' : '#eab308'}"></div>
                </div>
              </div>
            `).join('')}
            <div style="font-size:11px;color:#64748b;margin-top:6px">Pecuária (PPM ${escapeHtml(ppm.ano || '')}): ${(ppm.rebanhos || []).slice(0, 4).map((r) => `${r.rebanho}: ${fmtN(r.efetivo)}`).join(' • ')}</div>
          </div>

          <!-- Uso do Solo FBDS + Equipamentos -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px">
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:8px">Uso e Cobertura do Solo 5m (FBDS SC_4208708)</div>
            ${usoEntries.map(([cls, ha]) => {
              const pct = (ha / usoTotalHa) * 100;
              return `
                <div style="margin-bottom:6px">
                  <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:2px">
                    <span style="color:#334155;font-weight:700;text-transform:capitalize">${escapeHtml(cls)}</span>
                    <span style="color:#0f172a;font-weight:800">${fmtN(ha, 1)} ha (${fmtN(pct, 1)}%)</span>
                  </div>
                  <div style="height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${Math.max(2, pct)}%;background:${usoColorMap[cls] || '#64748b'}"></div>
                  </div>
                </div>`;
            }).join('')}
            <div style="border-top:1px solid #e2e8f0;margin-top:10px;padding-top:8px;font-size:12px;color:#334155">
              <b>Equipamentos e Risco Mapeados:</b> ${eq.unidades_saude_cnes || 20} Saúde (CNES) • ${eq.escolas_osm || 7} Escolas • ${eq.equipamentos_comunitarios_osm || 31} Comunitários • ${eq.pontes_osm || 70} Pontes • <b>${eq.setores_risco_sgb || 47} Setores de Risco (SGB/CPRM)</b>
            </div>
            <div class="gp-btn-row" style="margin-top:8px">
              <button class="gp-btn primary" data-socio-layer="fbds_uso_solo">Ver Uso do Solo</button>
              <button class="gp-btn" data-socio-layer="unidades_saude_cnes">Ver Saúde (CNES)</button>
              <a class="gp-btn" href="data/ibge_indicadores_jacinto_machado.json" download>Baixar JSON ↓</a>
            </div>
          </div>
        </div>
      `;
      modalBody.querySelectorAll('[data-socio-layer]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const lid = btn.dataset.socioLayer;
          closeModal();
          setDrawerOpen(true);
          const found = window.GeoCatalog.getLayerById(lid);
          if (found) expandedGroups.add(found.group.id);
          engine.enableLayer(lid).then(() => engine.zoomToLayer(lid));
        });
      });
    } else if (navId === 'docs') {
      modalTitle.textContent = 'Fontes Oficiais, RIGeo SGB/CPRM e Situação das Bases — Jacinto Machado';
      modalBody.innerHTML = `
        <p style="margin:0 0 14px;color:#475569;line-height:1.5">
          O Geoportal Municipal de Jacinto Machado integra exclusivamente <b>dados reais e verificados</b> de instituições oficiais e científicas,
          mantendo transparência total sobre camadas ainda pendentes junto à Prefeitura Municipal.
        </p>
        <div class="gp-preset-grid" style="margin-bottom:16px">
          <div class="gp-preset-card" style="border-top:3px solid #dc2626">
            <div>
              <div class="gp-preset-title">Carta de Suscetibilidade SGB/CPRM &amp; IPT (RIGeo 2015)</div>
              <div class="gp-preset-desc">Levantamento oficial 1:50.000 de movimentos gravitacionais de massa, inundações, enxurradas, corridas, geologia, solos, relevo, MDE e ortofotos.</div>
            </div>
            <div class="gp-btn-row">
              <a class="gp-btn primary" href="${RIGEO_ITEM_URL}" target="_blank" rel="noopener">Item RIGeo ↗</a>
              <a class="gp-btn" href="${RIGEO_PDF_URL}" target="_blank" rel="noopener">Carta PDF ↗</a>
            </div>
          </div>
          <div class="gp-preset-card" style="border-top:3px solid #059669">
            <div>
              <div class="gp-preset-title">FBDS — Uso do Solo, APP e Hidrografia (1:5.000)</div>
              <div class="gp-preset-desc">Base ambiental completa SC_4208708 integrada localmente (Uso 5m, 2.813 APPs, 7.026 rios e 3.154 nascentes).</div>
            </div>
            <a class="gp-btn primary" href="${FBDS_BASE}/" target="_blank" rel="noopener">Abrir FBDS ↗</a>
          </div>
          <div class="gp-preset-card" style="border-top:3px solid #0284c7">
            <div>
              <div class="gp-preset-title">SIGSC — Ortofotos SC 2012 (39 cm) e MDT/MDS</div>
              <div class="gp-preset-desc">Serviços WMS HTTPS do Aerolevantamento Oficial de Santa Catarina integrados ao vivo na lista de mapas-base e cortina comparativa.</div>
            </div>
            <a class="gp-btn primary" href="https://sigsc.sc.gov.br/" target="_blank" rel="noopener">Acessar SIGSC ↗</a>
          </div>
          <div class="gp-preset-card" style="border-top:3px solid #d97706">
            <div>
              <div class="gp-preset-title">MapBiomas &amp; CAR / SICAR (Consulta Externa)</div>
              <div class="gp-preset-desc">Séries históricas anuais de cobertura do solo (MapBiomas) e consulta pública de imóveis rurais (SICAR SC-4208708).</div>
            </div>
            <div class="gp-btn-row">
              <a class="gp-btn" href="https://plataforma.brasil.mapbiomas.org/" target="_blank" rel="noopener">MapBiomas ↗</a>
              <a class="gp-btn" href="https://consulta.car.gov.br/" target="_blank" rel="noopener">SICAR ↗</a>
            </div>
          </div>
        </div>
        <h4 style="margin:0 0 8px;font-size:14px;font-weight:800;color:#991b1b">Camadas Pendentes de Obtenção Oficial (Transparência Cartográfica)</h4>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#7c2d12;line-height:1.55">
          ${(PENDING_MUNICIPAL_LAYERS || []).map((p) => `<div style="margin-bottom:4px">• <b>${escapeHtml(p.name)}</b> (${escapeHtml(p.group)}): ${escapeHtml(p.status)}.</div>`).join('')}
        </div>
      `;
    } else if (navId === 'help') {
      modalTitle.textContent = 'Ajuda e Guia Rápido — Geoportal Municipal de Jacinto Machado';
      modalBody.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;line-height:1.55">
          <div>
            <h4 style="margin:0 0 6px;color:var(--brand-navy)">1. Empilhamento e Ordem das Camadas</h4>
            <p style="margin:0;color:#475569">Cada camada ativada possui plano exclusivo e aparece <b>por cima</b> da anterior. Abra a aba <b>Ordem</b> no painel direito para subir (▲), descer (▼) ou ajustar a transparência de cada camada.</p>
          </div>
          <div>
            <h4 style="margin:0 0 6px;color:var(--brand-navy)">2. Recorte Oficial IBGE 4208708</h4>
            <p style="margin:0;color:#475569">O mapa é recortado exatamente pelo limite oficial de Jacinto Machado (<b>430,704 km²</b>). Desmarque <b>Recortar mapa ao limite oficial</b> se quiser visualizar os municípios vizinhos (Timbé do Sul, Turvo, Ermo, Sombrio, Santa Rosa do Sul, Praia Grande e Cambará do Sul/RS).</p>
          </div>
          <div>
            <h4 style="margin:0 0 6px;color:var(--brand-navy)">3. Cortina Comparativa (Atual × SC 2012)</h4>
            <p style="margin:0;color:#475569">Clique no ícone xadrez na barra direita e ative a <b>Cortina Comparativa</b> para arrastar e comparar o Satélite Atual contra a <b>Ortoimagem Aérea Oficial SC 2012 (39 cm — SIGSC)</b> ou contra o <b>MDT Relevo Sombreado</b>.</p>
          </div>
          <div>
            <h4 style="margin:0 0 6px;color:var(--brand-navy)">4. Medição, Desenho e Importação SIG</h4>
            <p style="margin:0;color:#475569">Meça distâncias e áreas geodésicas com linha de alto contraste sempre no topo do mapa, desenhe anotações exportáveis em GeoJSON ou importe seus próprios arquivos <b>Shapefile (.zip), GeoJSON ou KML</b>.</p>
          </div>
        </div>
      `;
    }
  }

  function applyPreset(presetId) {
    const p = THEMATIC_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    closeModal();
    engine.clearAllLayers();
    tools.disableSwipe();
    engine.setBasemapActive(p.basemap, true, true);
    for (const lid of p.layers) {
      const found = window.GeoCatalog.getLayerById(lid);
      if (found) expandedGroups.add(found.group.id);
      engine.enableLayer(lid);
    }
    map.setView(p.center, p.zoom);
    setDrawerOpen(true);
    renderLayerDrawer();
    showToast(`Mapa temático carregado: ${p.title}`, 'success');
  }

  function openMetadataModal(layerId) {
    const found = window.GeoCatalog.getLayerById(layerId);
    const bm = !found ? BASEMAPS.find((b) => b.id === layerId) : null;
    const cfg = found?.layer || bm;
    if (!cfg || !window.GeoMetadata) return;

    const entry = window.GeoMetadata.getEntry(layerId, { ...cfg, groupName: found?.group?.name });
    const badge = window.GeoMetadata.getSourceBadgeMeta(entry.sourceClass);
    const meta = entry.metadata;

    modalTitle.textContent = `Ficha Técnica e Metadados — ${meta.nome_camada}`;
    const rowsHtml = window.GeoMetadata.FIELD_LABELS.map(([k, lbl]) => {
      const val = meta[k] || 'Não informado pela fonte';
      const isUrl = typeof val === 'string' && /^https?:\/\//i.test(val);
      const cell = isUrl
        ? `<a href="${escapeHtml(val)}" target="_blank" rel="noopener" style="color:var(--brand-navy);word-break:break-all">${escapeHtml(val)} ↗</a>`
        : escapeHtml(val);
      return `<tr><th>${escapeHtml(lbl)}</th><td>${cell}</td></tr>`;
    }).join('');

    const classHelpEntries = Object.entries(entry.classHelp || {});
    const classesHtml = classHelpEntries.length
      ? `<div style="margin-top:14px">
           <h4 style="margin:0 0 8px;color:var(--brand-navy);font-size:13.5px">Significado das Classes na Legenda</h4>
           <div class="gp-meta-classes">
             ${classHelpEntries.map(([k, v]) => `<div><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</div>`).join('')}
           </div>
         </div>`
      : '';

    const canExport = entry.redistributable !== false && cfg.localFile && cfg.type !== 'wms';
    modalBody.innerHTML = `
      <div class="gp-meta-hero">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
          <span class="gp-src-pill ${badge.cls}">${escapeHtml(badge.label)}</span>
          <span style="font-size:12px;color:#475569">${escapeHtml(badge.title || '')}</span>
        </div>
        <div style="font-size:13.5px;color:#0f172a;line-height:1.45"><b>O que é isto?</b> ${escapeHtml(entry.whatIsThis)}</div>
      </div>
      <div class="gp-btn-row" style="margin-bottom:12px">
        ${canExport ? `<a class="gp-btn primary" href="${escapeHtml(cfg.localFile)}" download>Baixar GeoJSON ↓</a>` : '<span class="gp-src-pill src-cientifica">Apenas visualização / serviço</span>'}
        <a class="gp-btn" href="downloads.html?q=${encodeURIComponent(meta.nome_camada)}" target="_blank" rel="opener">Abrir na Central de Downloads ↗</a>
        ${cfg.localFile ? `<button class="gp-btn" id="btnMetaActivateOnMap">Ativar no Mapa</button>` : ''}
      </div>
      <table class="gp-meta-table">${rowsHtml}</table>
      ${classesHtml}
    `;

    modalBackdrop?.classList.add('open');
    document.getElementById('btnMetaActivateOnMap')?.addEventListener('click', () => {
      closeModal();
      if (found) {
        expandedGroups.add(found.group.id);
        engine.enableLayer(layerId).then(() => engine.zoomToLayer(layerId));
      } else if (bm) {
        engine.setBasemapActive(bm.id, true, true);
      }
    });
  }

  document.addEventListener('click', (e) => {
    const metaBtn = e.target.closest('[data-open-meta]');
    if (metaBtn) {
      e.preventDefault();
      e.stopPropagation();
      openMetadataModal(metaBtn.dataset.openMeta);
    }
  });

  document.querySelectorAll('.gp-nav-btn[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => openNavSection(btn.dataset.nav));
  });

  document.getElementById('btnMobileMenu')?.addEventListener('click', () => {
    document.getElementById('mainNav')?.classList.toggle('mobile-open');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalBackdrop?.classList.contains('open')) closeModal();
      else if (tools.getMode() !== 'pan') tools.setMode('pan');
      else if (activeFloatingPanel) closeFloatingPanel();
    }
  });

  window.GeoPortalMapNav = {
    focusMap() {
      closeModal();
      try {
        window.focus();
      } catch {
        // ignore
      }
    },
    activateLayer(layerId) {
      closeModal();
      setDrawerOpen(true);
      if (drawerTab !== 'layers') drawerTab = 'layers';
      const found = window.GeoCatalog.getLayerById(layerId);
      if (found) {
        expandedGroups.add(found.group.id);
        const q = searchFilterText.trim().toLowerCase();
        if (
          q &&
          !found.group.name.toLowerCase().includes(q) &&
          !found.layer.name.toLowerCase().includes(q) &&
          !(found.layer.description || '').toLowerCase().includes(q)
        ) {
          searchFilterText = '';
          const layerSearchEl = document.getElementById('layerSearchInput');
          if (layerSearchEl) layerSearchEl.value = '';
        }
      }
      renderLayerDrawer();
      const promise = engine.enableLayer(layerId).then(() => {
        engine.zoomToLayer(layerId);
        renderLayerDrawer();
      });
      if (found) showToast(`Camada "${found.layer.name}" ativada no mapa!`, 'success');
      try {
        window.focus();
      } catch {
        // ignore
      }
      return promise;
    },
    activateBasemap(basemapId) {
      closeModal();
      setDrawerOpen(true);
      if (drawerTab !== 'layers') drawerTab = 'layers';
      tools.disableSwipe();
      engine.setBasemapActive(basemapId, true, true);
      renderLayerDrawer();
      showToast('Base aérea / relevo oficial ativada no mapa!', 'success');
      try {
        window.focus();
      } catch {
        // ignore
      }
    },
  };

  renderLayerDrawer();
})();
