/**
 * Geoportal Municipal de Jacinto Machado — Ferramentas Interativas do Mapa (Padrão Geoportal Florianópolis)
 * Renderização vetorial SVG exclusiva em paneToolsOverlay (zIndex 650), garantindo
 * que medições, desenhos e seleções apareçam sempre nítidos sobre todas as camadas.
 */
window.GeoTools = (() => {
  const {
    JACINTO_BOUNDS,
    BASEMAPS,
    getLayerById,
  } = window.GeoCatalog;
  const {
    formatCoords,
    parseCoordinateQuery,
    distanceMeters,
    polygonAreaSqMeters,
    formatDistance,
    formatArea,
    getScaleDenominator,
  } = window.GeoCoords;
  const { escapeHtml } = window.GeoLayerEngine;

  function createTools(map, engine, ui) {
    let activeMode = 'pan';

    // Renderer SVG dedicado no topo absoluto (zIndex 650)
    const toolsSvg = L.svg({ pane: 'paneToolsOverlay', padding: 0.5 });

    const highlightGroup = L.layerGroup().addTo(map);
    const measureGroup = L.layerGroup().addTo(map);
    const drawGroup = L.layerGroup().addTo(map);

    // Histórico de navegação (Undo / Redo)
    const viewHistory = [];
    let historyIdx = -1;
    let suppressHistory = false;

    function recordView() {
      if (suppressHistory) return;
      const entry = { center: map.getCenter(), zoom: map.getZoom() };
      if (historyIdx < viewHistory.length - 1) viewHistory.splice(historyIdx + 1);
      const last = viewHistory[viewHistory.length - 1];
      if (
        last &&
        Math.abs(last.center.lat - entry.center.lat) < 1e-6 &&
        Math.abs(last.center.lng - entry.center.lng) < 1e-6 &&
        last.zoom === entry.zoom
      ) {
        return;
      }
      viewHistory.push(entry);
      if (viewHistory.length > 40) viewHistory.shift();
      historyIdx = viewHistory.length - 1;
      ui.updateHistoryButtons?.(historyIdx > 0, historyIdx < viewHistory.length - 1);
    }

    map.on('moveend', recordView);
    recordView();

    function undoView() {
      if (historyIdx <= 0) return;
      historyIdx--;
      suppressHistory = true;
      const v = viewHistory[historyIdx];
      map.setView(v.center, v.zoom);
      setTimeout(() => {
        suppressHistory = false;
        ui.updateHistoryButtons?.(historyIdx > 0, historyIdx < viewHistory.length - 1);
      }, 300);
    }

    function redoView() {
      if (historyIdx >= viewHistory.length - 1) return;
      historyIdx++;
      suppressHistory = true;
      const v = viewHistory[historyIdx];
      map.setView(v.center, v.zoom);
      setTimeout(() => {
        suppressHistory = false;
        ui.updateHistoryButtons?.(historyIdx > 0, historyIdx < viewHistory.length - 1);
      }, 300);
    }

    function resetHome() {
      const drawerClosed = document.getElementById('workspace')?.classList.contains('drawer-closed');
      const rightPad = drawerClosed || window.innerWidth <= 760 ? 32 : 390;
      map.fitBounds(JACINTO_BOUNDS, {
        paddingTopLeft: [56, 22],
        paddingBottomRight: [rightPad, 40],
      });
    }

    function locateUser() {
      if (!navigator.geolocation) {
        ui.showToast?.('Geolocalização não suportada neste navegador.', 'error');
        return;
      }
      ui.showToast?.('Obtendo sua localização GPS...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          highlightGroup.clearLayers();
          L.circle([latitude, longitude], {
            radius: Math.min(accuracy, 150),
            color: '#033c8e',
            fillColor: '#38bdf8',
            fillOpacity: 0.22,
            weight: 1.5,
            pane: 'paneToolsOverlay',
            renderer: toolsSvg,
          }).addTo(highlightGroup);
          L.circleMarker([latitude, longitude], {
            radius: 7,
            color: '#ffffff',
            weight: 2.5,
            fillColor: '#033c8e',
            fillOpacity: 1,
            pane: 'paneToolsOverlay',
            renderer: toolsSvg,
          })
            .bindPopup(
              `<b>Sua Localização</b><br>Lat: ${latitude.toFixed(6)}<br>Lon: ${longitude.toFixed(6)}<br>Precisão: ±${Math.round(accuracy)} m`
            )
            .addTo(highlightGroup)
            .openPopup();
          map.setView([latitude, longitude], 16);
        },
        (err) => ui.showToast?.(`Não foi possível obter localização: ${err.message}`, 'error'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // ---- Gerenciamento de Modos Interativos ----
    function setMode(mode) {
      cleanupTransientHandlers();
      activeMode = mode;

      const container = map.getContainer();
      container.classList.remove('cursor-crosshair', 'cursor-identify', 'cursor-zoombox');

      if (mode === 'boxZoom') {
        container.classList.add('cursor-zoombox');
        startBoxZoom();
      } else if (mode === 'identify' || mode === 'select') {
        container.classList.add('cursor-identify');
      } else if (mode.startsWith('measure') || mode.startsWith('draw')) {
        container.classList.add('cursor-crosshair');
      }

      if (mode.startsWith('measure') || mode.startsWith('draw')) {
        map.doubleClickZoom.disable();
      } else {
        map.doubleClickZoom.enable();
      }

      ui.onModeChange?.(mode);
    }

    function getMode() {
      return activeMode;
    }

    function shouldInterceptClick() {
      return activeMode !== 'pan';
    }

    // ---- Zoom por Retângulo ----
    let boxStart = null;
    let boxRect = null;

    function startBoxZoom() {
      map.dragging.disable();
      map.on('mousedown', onBoxDown);
      map.on('mousemove', onBoxMove);
      map.on('mouseup', onBoxUp);
    }

    function stopBoxZoom() {
      map.dragging.enable();
      map.off('mousedown', onBoxDown);
      map.off('mousemove', onBoxMove);
      map.off('mouseup', onBoxUp);
      if (boxRect) {
        map.removeLayer(boxRect);
        boxRect = null;
      }
      boxStart = null;
    }

    function onBoxDown(e) {
      if (e.originalEvent.button !== 0) return;
      boxStart = e.latlng;
      boxRect = L.rectangle([boxStart, boxStart], {
        color: '#033c8e',
        weight: 2,
        dashArray: '5 4',
        fillColor: '#38bdf8',
        fillOpacity: 0.2,
        pane: 'paneToolsOverlay',
        renderer: toolsSvg,
      }).addTo(map);
    }

    function onBoxMove(e) {
      if (!boxStart || !boxRect) return;
      boxRect.setBounds(L.latLngBounds(boxStart, e.latlng));
    }

    function onBoxUp(e) {
      if (!boxStart || !boxRect) return;
      const bounds = L.latLngBounds(boxStart, e.latlng);
      map.removeLayer(boxRect);
      boxRect = null;
      boxStart = null;
      if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 15) {
        map.fitBounds(bounds);
      }
      setMode('pan');
    }

    function cleanupTransientHandlers() {
      stopBoxZoom();
      cancelCurrentMeasureSegment();
      cancelCurrentDrawSegment();
    }

    // ---- Medição Geodésica (Distância e Área) com Halo Branco de Alto Contraste ----
    let measurePoints = [];
    let measureActiveHalo = null;
    let measureActiveShape = null;
    let measureLiveTip = null;

    function cancelCurrentMeasureSegment() {
      if (measureActiveHalo) { measureGroup.removeLayer(measureActiveHalo); measureActiveHalo = null; }
      if (measureActiveShape) { measureGroup.removeLayer(measureActiveShape); measureActiveShape = null; }
      if (measureLiveTip) { measureGroup.removeLayer(measureLiveTip); measureLiveTip = null; }
      measurePoints = [];
    }

    function clearMeasurements() {
      cancelCurrentMeasureSegment();
      measureGroup.clearLayers();
      ui.updateMeasureOutput?.('Clique no mapa para marcar o primeiro ponto.');
    }

    function updateMeasureRender(hoverLatLng = null) {
      if (measureActiveHalo) { measureGroup.removeLayer(measureActiveHalo); measureActiveHalo = null; }
      if (measureActiveShape) { measureGroup.removeLayer(measureActiveShape); measureActiveShape = null; }
      if (measureLiveTip) { measureGroup.removeLayer(measureLiveTip); measureLiveTip = null; }

      const pts = hoverLatLng ? [...measurePoints, hoverLatLng] : [...measurePoints];
      if (!pts.length) return;

      if (activeMode === 'measureDist') {
        measureActiveHalo = L.polyline(pts, {
          color: '#ffffff',
          weight: 6,
          opacity: 0.92,
          interactive: false,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(measureGroup);

        measureActiveShape = L.polyline(pts, {
          color: '#e11d48',
          weight: 3.2,
          dashArray: '8 5',
          interactive: false,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(measureGroup);

        let total = 0;
        for (let i = 1; i < pts.length; i++) total += distanceMeters(pts[i - 1], pts[i]);
        const seg = pts.length >= 2 ? distanceMeters(pts[pts.length - 2], pts[pts.length - 1]) : 0;

        if (hoverLatLng && pts.length >= 2) {
          measureLiveTip = L.marker(hoverLatLng, {
            interactive: false,
            pane: 'paneToolsOverlay',
            icon: L.divIcon({
              className: 'geo-measure-badge live',
              html: `<span>${escapeHtml(formatDistance(total))}</span>`,
              iconSize: null,
            }),
          }).addTo(measureGroup);
        }

        ui.updateMeasureOutput?.(
          `<b>Distância total:</b> ${formatDistance(total)}<br>` +
            `<small>Último segmento: ${formatDistance(seg)} • ${measurePoints.length} vértice(s) (duplo clique finaliza)</small>`
        );
      } else if (activeMode === 'measureArea') {
        if (pts.length >= 3) {
          measureActiveHalo = L.polygon(pts, {
            color: '#ffffff',
            weight: 5.5,
            fill: false,
            opacity: 0.85,
            interactive: false,
            pane: 'paneToolsOverlay',
            renderer: toolsSvg,
          }).addTo(measureGroup);

          measureActiveShape = L.polygon(pts, {
            color: '#033c8e',
            weight: 2.8,
            fillColor: '#38bdf8',
            fillOpacity: 0.25,
            interactive: false,
            pane: 'paneToolsOverlay',
            renderer: toolsSvg,
          }).addTo(measureGroup);

          const area = polygonAreaSqMeters(pts);
          let perim = 0;
          for (let i = 0; i < pts.length; i++) perim += distanceMeters(pts[i], pts[(i + 1) % pts.length]);

          if (hoverLatLng) {
            measureLiveTip = L.marker(hoverLatLng, {
              interactive: false,
              pane: 'paneToolsOverlay',
              icon: L.divIcon({
                className: 'geo-measure-badge live',
                html: `<span>${escapeHtml(formatArea(area))}</span>`,
                iconSize: null,
              }),
            }).addTo(measureGroup);
          }

          ui.updateMeasureOutput?.(
            `<b>Área:</b> ${formatArea(area)}<br>` +
              `<small>Perímetro: ${formatDistance(perim)} • ${measurePoints.length} vértices (duplo clique finaliza)</small>`
          );
        } else {
          measureActiveHalo = L.polyline(pts, {
            color: '#ffffff',
            weight: 5.5,
            opacity: 0.9,
            interactive: false,
            pane: 'paneToolsOverlay',
            renderer: toolsSvg,
          }).addTo(measureGroup);

          measureActiveShape = L.polyline(pts, {
            color: '#033c8e',
            weight: 3,
            dashArray: '6 4',
            interactive: false,
            pane: 'paneToolsOverlay',
            renderer: toolsSvg,
          }).addTo(measureGroup);

          const d = pts.length === 2 ? distanceMeters(pts[0], pts[1]) : 0;
          ui.updateMeasureOutput?.(
            `<b>Área:</b> marque ao menos 3 pontos<br><small>Lado inicial: ${formatDistance(d)}</small>`
          );
        }
      }
    }

    function finishMeasurement() {
      if (measurePoints.length < (activeMode === 'measureArea' ? 3 : 2)) return;
      updateMeasureRender(null);
      const last = measurePoints[measurePoints.length - 1];
      let labelText = '';
      if (activeMode === 'measureDist') {
        let total = 0;
        for (let i = 1; i < measurePoints.length; i++) total += distanceMeters(measurePoints[i - 1], measurePoints[i]);
        labelText = formatDistance(total);
      } else {
        labelText = formatArea(polygonAreaSqMeters(measurePoints));
      }
      L.marker(last, {
        interactive: false,
        pane: 'paneToolsOverlay',
        icon: L.divIcon({
          className: 'geo-measure-badge',
          html: `<span>${escapeHtml(labelText)}</span>`,
          iconSize: null,
        }),
      }).addTo(measureGroup);

      measureActiveHalo = null;
      measureActiveShape = null;
      measureLiveTip = null;
      measurePoints = [];
    }

    // ---- Desenho e Anotação no Mapa ----
    const drawnFeatures = [];
    let drawPoints = [];
    let drawPreview = null;
    let drawColor = '#e11d48';

    function setDrawColor(hex) {
      drawColor = hex;
    }

    function cancelCurrentDrawSegment() {
      if (drawPreview) {
        map.removeLayer(drawPreview);
        drawPreview = null;
      }
      drawPoints = [];
    }

    function clearDrawings() {
      cancelCurrentDrawSegment();
      drawGroup.clearLayers();
      drawnFeatures.length = 0;
      ui.updateDrawCount?.(0);
    }

    function finishDrawing(labelInput = '') {
      if (activeMode === 'drawLine' && drawPoints.length >= 2) {
        const line = L.polyline(drawPoints, {
          color: drawColor,
          weight: 3.5,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(drawGroup);
        const label = labelInput || `Linha ${drawnFeatures.length + 1}`;
        line.bindPopup(`<b>${escapeHtml(label)}</b>`);
        drawnFeatures.push({
          type: 'Feature',
          properties: { nome: label, cor: drawColor, tipo: 'Linha' },
          geometry: { type: 'LineString', coordinates: drawPoints.map((p) => [p.lng, p.lat]) },
        });
      } else if (activeMode === 'drawPoly' && drawPoints.length >= 3) {
        const poly = L.polygon(drawPoints, {
          color: drawColor,
          weight: 2.5,
          fillColor: drawColor,
          fillOpacity: 0.25,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(drawGroup);
        const label = labelInput || `Área ${drawnFeatures.length + 1}`;
        const area = formatArea(polygonAreaSqMeters(drawPoints));
        poly.bindPopup(`<b>${escapeHtml(label)}</b><br>Área: ${area}`);
        const ring = [...drawPoints.map((p) => [p.lng, p.lat]), [drawPoints[0].lng, drawPoints[0].lat]];
        drawnFeatures.push({
          type: 'Feature',
          properties: { nome: label, cor: drawColor, tipo: 'Polígono', area },
          geometry: { type: 'Polygon', coordinates: [ring] },
        });
      }
      cancelCurrentDrawSegment();
      ui.updateDrawCount?.(drawnFeatures.length);
    }

    function exportDrawingsGeoJSON() {
      if (!drawnFeatures.length) {
        ui.showToast?.('Desenhe ao menos um ponto, linha ou polígono para exportar.', 'info');
        return;
      }
      const fc = { type: 'FeatureCollection', features: drawnFeatures };
      const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'geoportal_jacinto_machado_desenhos.geojson';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      ui.showToast?.(`Exportado ${drawnFeatures.length} desenho(s) em GeoJSON!`, 'success');
    }

    // ---- Handlers de clique / movimento do mapa ----
    map.on('click', async (e) => {
      if (activeMode === 'identify' || activeMode === 'select') {
        runIdentify(e.latlng);
        return;
      }

      if (activeMode === 'measureDist' || activeMode === 'measureArea') {
        measurePoints.push(e.latlng);
        L.circleMarker(e.latlng, {
          radius: 5,
          color: '#ffffff',
          weight: 2,
          fillColor: activeMode === 'measureDist' ? '#e11d48' : '#033c8e',
          fillOpacity: 1,
          interactive: false,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(measureGroup);
        updateMeasureRender(null);
        return;
      }

      if (activeMode === 'drawPoint') {
        const label = ui.getDrawLabel?.() || `Ponto ${drawnFeatures.length + 1}`;
        const m = L.circleMarker(e.latlng, {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: drawColor,
          fillOpacity: 1,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(drawGroup);
        m.bindPopup(`<b>${escapeHtml(label)}</b><br><small>${formatCoords(e.latlng.lat, e.latlng.lng, 'wgs84')}</small>`).openPopup();
        drawnFeatures.push({
          type: 'Feature',
          properties: { nome: label, cor: drawColor, tipo: 'Ponto' },
          geometry: { type: 'Point', coordinates: [e.latlng.lng, e.latlng.lat] },
        });
        ui.updateDrawCount?.(drawnFeatures.length);
        return;
      }

      if (activeMode === 'drawLine' || activeMode === 'drawPoly') {
        drawPoints.push(e.latlng);
        L.circleMarker(e.latlng, {
          radius: 4.5,
          color: '#ffffff',
          weight: 1.8,
          fillColor: drawColor,
          fillOpacity: 1,
          interactive: false,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        }).addTo(drawGroup);
        if (drawPreview) map.removeLayer(drawPreview);
        drawPreview =
          activeMode === 'drawPoly' && drawPoints.length >= 3
            ? L.polygon(drawPoints, { color: drawColor, weight: 2.5, dashArray: '5 4', fillOpacity: 0.18, interactive: false, pane: 'paneToolsOverlay', renderer: toolsSvg }).addTo(map)
            : L.polyline(drawPoints, { color: drawColor, weight: 2.8, dashArray: '5 4', interactive: false, pane: 'paneToolsOverlay', renderer: toolsSvg }).addTo(map);
      }
    });

    map.on('mousemove', (e) => {
      if ((activeMode === 'measureDist' || activeMode === 'measureArea') && measurePoints.length > 0) {
        updateMeasureRender(e.latlng);
      } else if ((activeMode === 'drawLine' || activeMode === 'drawPoly') && drawPoints.length > 0) {
        if (drawPreview) map.removeLayer(drawPreview);
        const pts = [...drawPoints, e.latlng];
        drawPreview =
          activeMode === 'drawPoly' && pts.length >= 3
            ? L.polygon(pts, { color: drawColor, weight: 2.5, dashArray: '5 4', fillOpacity: 0.16, interactive: false, pane: 'paneToolsOverlay', renderer: toolsSvg }).addTo(map)
            : L.polyline(pts, { color: drawColor, weight: 2.8, dashArray: '5 4', interactive: false, pane: 'paneToolsOverlay', renderer: toolsSvg }).addTo(map);
      }
    });

    map.on('dblclick', (e) => {
      if (activeMode === 'measureDist' || activeMode === 'measureArea') {
        L.DomEvent.stop(e);
        if (measurePoints.length > 2) measurePoints.pop();
        finishMeasurement();
      } else if (activeMode === 'drawLine' || activeMode === 'drawPoly') {
        L.DomEvent.stop(e);
        if (drawPoints.length > 2) drawPoints.pop();
        finishDrawing(ui.getDrawLabel?.() || '');
      }
    });

    // ---- Identificação Multi-Camada + Raio-X Territorial ----
    async function runIdentify(latlng) {
      highlightGroup.clearLayers();
      L.circleMarker(latlng, {
        radius: 8,
        color: '#ffffff',
        weight: 2.5,
        fillColor: '#f59e0b',
        fillOpacity: 0.95,
        pane: 'paneToolsOverlay',
        renderer: toolsSvg,
      }).addTo(highlightGroup);

      ui.openIdentifyPanel?.({ loading: true, latlng });
      const results = await engine.identifyAtPoint(latlng);
      ui.openIdentifyPanel?.({ loading: false, latlng, results });
    }

    // ---- Busca Unificada em Todas as Bases de Jacinto Machado ----
    let viarioFeaturesCache = null;

    async function ensureViarioSearchIndex() {
      if (viarioFeaturesCache) return viarioFeaturesCache;
      try {
        const found = getLayerById('sistema_viario_osm');
        if (found) {
          const gj = await engine.resolveLayerGeoJson(found.layer);
          viarioFeaturesCache = gj?.features || [];
          return viarioFeaturesCache;
        }
      } catch {
        // ignore
      }
      return [];
    }

    function norm(s) {
      return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    async function unifiedSearch(rawQuery) {
      const q = String(rawQuery || '').trim();
      if (q.length < 2) return [];
      const results = [];
      const bundle = window.GEOJACINTO_BUNDLE || {};

      // 1. Coordenada WGS84 ou UTM 22S
      const coordHit = parseCoordinateQuery(q);
      if (coordHit) {
        results.push({
          type: 'Coordenada',
          badge: 'GPS',
          title: coordHit.label,
          subtitle: `UTM 22S: ${formatCoords(coordHit.lat, coordHit.lon, 'utm')}`,
          latlng: L.latLng(coordHit.lat, coordHit.lon),
          zoom: 17,
        });
      }

      const qNorm = norm(q);

      // 2. Localidades, Comunidades Rurais e Sede (SGB/IBGE + OSM)
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

      // 6. Rodovias Oficiais (DNIT SNV) + OSM e Sistema Viário Municipal
      if (q.length >= 2 && !coordHit) {
        const seenRoad = new Set();
        for (const f of bundle.dnit_snv_rodovias?.features || []) {
          const p = f.properties || {};
          const label = `${p.codigo_br || 'BR'} (${p.codigo_snv || ''}) — ${p.local_inicio || ''} ↔ ${p.local_fim || ''}`;
          if (!norm(label).includes(qNorm)) continue;
          const k = norm(p.codigo_snv || label);
          if (seenRoad.has(k)) continue;
          seenRoad.add(k);
          results.push({
            type: 'Rodovia DNIT',
            badge: 'DNIT',
            title: `${p.codigo_br || 'BR'} — ${p.codigo_snv || ''}`,
            subtitle: `${p.local_inicio || ''} ↔ ${p.local_fim || ''} (km ${p.km_inicio}–${p.km_fim})`,
            geojson: f,
            activateLayer: 'dnit_snv_rodovias',
          });
          if (seenRoad.size >= 4) break;
        }
        for (const f of bundle.rodovias_jacinto?.features || []) {
          const p = f.properties || {};
          const label = p.ref && p.nome && p.nome !== p.ref ? `${p.ref} — ${p.nome}` : p.nome || p.ref || '';
          if (!label || !norm(label).includes(qNorm)) continue;
          const k = norm(label);
          if (seenRoad.has(k)) continue;
          seenRoad.add(k);
          results.push({
            type: 'Rodovia',
            badge: 'Rodovia',
            title: label,
            subtitle: `${p.jurisdicao || 'Rodovia'} • ${p.hierarquia || ''}`,
            geojson: f,
            activateLayer: 'rodovias_jacinto',
          });
          if (seenRoad.size >= 4) break;
        }

        if (q.length >= 3 && results.length < 14) {
          const vias = await ensureViarioSearchIndex();
          for (const f of vias) {
            const p = f.properties || {};
            const nome = p.nome || '';
            if (!nome || !norm(nome).includes(qNorm)) continue;
            const k = norm(nome);
            if (seenRoad.has(k)) continue;
            seenRoad.add(k);
            results.push({
              type: 'Logradouro',
              badge: 'Via',
              title: nome,
              subtitle: `${p.hierarquia || 'Sistema Viário'} — Jacinto Machado/SC`,
              geojson: f,
            });
            if (results.length >= 14) break;
          }
        }
      }

      return results.slice(0, 14);
    }

    function focusSearchResult(item) {
      highlightGroup.clearLayers();
      if (item.activateLayer) engine.enableLayer(item.activateLayer);

      if (item.geojson) {
        const hl = L.geoJSON(item.geojson, {
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
          style: { color: '#f59e0b', weight: 4, fillColor: '#fbbf24', fillOpacity: 0.28 },
          pointToLayer: (f, ll) =>
            L.circleMarker(ll, {
              radius: 9,
              color: '#ffffff',
              weight: 2.5,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              pane: 'paneToolsOverlay',
              renderer: toolsSvg,
            }),
        }).addTo(highlightGroup);

        const bounds = hl.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
          L.popup({ className: 'geo-custom-popup' })
            .setLatLng(bounds.getCenter())
            .setContent(
              `<div class="geo-popup"><div class="geo-popup-header">${escapeHtml(item.type)}: ${escapeHtml(item.title)}</div>` +
                `<div class="geo-popup-body"><p style="margin:0;font-size:12px">${escapeHtml(item.subtitle || '')}</p></div></div>`
            )
            .openOn(map);
        }
      } else if (item.latlng) {
        L.circleMarker(item.latlng, {
          radius: 8,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#e11d48',
          fillOpacity: 1,
          pane: 'paneToolsOverlay',
          renderer: toolsSvg,
        })
          .bindPopup(`<b>${escapeHtml(item.title)}</b><br><small>${escapeHtml(item.subtitle || '')}</small>`)
          .addTo(highlightGroup)
          .openPopup();
        map.setView(item.latlng, item.zoom || 17);
      }
    }

    // ---- Comparador Temporal (Cortina / Swipe Satélite Atual ↔ Ortofoto SC 2012) ----
    let swipeActive = false;
    let swipeLeftId = 'satelite_global';
    let swipeRightId = 'orto_sigsc_2012';
    let swipeRightLayer = null;
    let swipePosition = 0.5;

    function updateSwipeClip() {
      if (!swipeActive || !swipeRightLayer) return;
      const paneEl = map.getPane('paneSwipeRight');
      if (!paneEl) return;
      const size = map.getSize();
      const nw = map.containerPointToLayerPoint([0, 0]);
      const se = map.containerPointToLayerPoint(size);
      const clipX = nw.x + size.x * swipePosition;
      paneEl.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${clipX}px)`;
    }

    function enableSwipe(leftId = 'satelite_global', rightId = 'orto_sigsc_2012') {
      disableSwipe();
      swipeLeftId = leftId;
      swipeRightId = rightId;
      swipeActive = true;

      engine.setBasemapActive(leftId, true, true);
      const rightCfg = BASEMAPS.find((b) => b.id === rightId);
      if (rightCfg) {
        swipeRightLayer = engine.ensureBasemapLayer(rightCfg, 'paneSwipeRight');
        swipeRightLayer.addTo(map);
      }
      map.on('move zoom resize', updateSwipeClip);
      setTimeout(updateSwipeClip, 60);
      ui.onSwipeStateChange?.(true, swipeLeftId, swipeRightId, swipePosition);
    }

    function setSwipePosition(ratio) {
      swipePosition = Math.max(0.04, Math.min(0.96, ratio));
      updateSwipeClip();
    }

    function disableSwipe() {
      swipeActive = false;
      map.off('move zoom resize', updateSwipeClip);
      const paneEl = map.getPane('paneSwipeRight');
      if (paneEl) paneEl.style.clip = '';
      if (swipeRightLayer) {
        if (map.hasLayer(swipeRightLayer)) map.removeLayer(swipeRightLayer);
        swipeRightLayer = null;
      }
      ui.onSwipeStateChange?.(false, swipeLeftId, swipeRightId, swipePosition);
    }

    function buildPrintSummary() {
      const center = map.getCenter();
      const scale = getScaleDenominator(center.lat, map.getZoom());
      return {
        date: new Date().toLocaleString('pt-BR'),
        scale: `1 : ${scale.toLocaleString('pt-BR')}`,
        utm: formatCoords(center.lat, center.lng, 'utm'),
        wgs: formatCoords(center.lat, center.lng, 'wgs84'),
        legends: engine.getActiveLegends(),
      };
    }

    return {
      setMode,
      getMode,
      shouldInterceptClick,
      undoView,
      redoView,
      resetHome,
      locateUser,
      clearMeasurements,
      finishMeasurement,
      setDrawColor,
      clearDrawings,
      finishDrawing,
      exportDrawingsGeoJSON,
      runIdentify,
      unifiedSearch,
      focusSearchResult,
      enableSwipe,
      setSwipePosition,
      disableSwipe,
      buildPrintSummary,
      clearHighlight: () => highlightGroup.clearLayers(),
    };
  }

  return { createTools };
})();
