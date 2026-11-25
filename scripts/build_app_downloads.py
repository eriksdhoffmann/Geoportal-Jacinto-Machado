import re

# ==================== 1. ADAPT js/app.js ====================
app = open(r'C:\Users\Win11\Downloads\Geoportal Araquari\js\app.js', encoding='utf-8').read()

repls = [
    ('Geoportal Araquari', 'Geoportal Municipal de Jacinto Machado'),
    ('ARAQUARI_CENTER', 'JACINTO_CENTER'),
    ('ARAQUARI_URBAN_CENTER', 'JACINTO_URBAN_CENTER'),
    ('ARAQUARI_BOUNDS', 'JACINTO_BOUNDS'),
    ('ATENDE_MAPA_PDF', 'RIGEO_PDF_URL'),
    ('IBGE 4201307 (386,872 km²)', 'IBGE 4208708 (430,704 km²)'),
    ('IBGE 4201307 — 386,872 km²', 'IBGE 4208708 — 430,704 km²'),
    ('IBGE 4201307', 'IBGE 4208708'),
    ('386,872 km²', '430,704 km²'),
    ("engine.enableLayer('bairros_araquari');", "engine.enableLayer('localidades_jacinto');\n  engine.enableLayer('sgb_setores_risco');"),
    ("'recortar limite araquari ibge'", "'recortar limite jacinto machado ibge'"),
    ('Recortar mapa ao limite oficial de Araquari (IBGE)', 'Recortar mapa ao limite oficial de Jacinto Machado (IBGE)'),
    ('https://araquari.atende.net/', 'https://rigeo.sgb.gov.br/items/c43f811a-d579-4e78-aa19-cb4e54394f08'),
    ('Atende.Net ↗', 'RIGeo SGB ↗'),
    ('Bairro e Distrito (IBGE 2022)', 'Setor Censitário (IBGE 2022)'),
    ('Joinville, São Francisco do Sul, Barra do Sul, Barra Velha, Guaramirim', 'Timbé do Sul, Turvo, Ermo, Sombrio, Santa Rosa do Sul, Praia Grande e Cambará do Sul/RS'),
    ('Araquari — SC', 'Jacinto Machado — SC'),
    ('de Araquari', 'de Jacinto Machado'),
    ('em Araquari', 'em Jacinto Machado'),
    ('Araquari', 'Jacinto Machado'),
]
for a, b in repls:
    app = app.replace(a, b)

# Add PENDING_MUNICIPAL_LAYERS to destructuring
app = app.replace(
    '    THEMATIC_PRESETS,\n  } = window.GeoCatalog;',
    '    THEMATIC_PRESETS,\n    RIGEO_ITEM_URL,\n    PENDING_MUNICIPAL_LAYERS,\n  } = window.GeoCatalog;'
)

# Inject Painel Socioeconômico + updated Fontes & RIGeo modal inside openNavSection
socio_code = """    } else if (navId === 'socio') {
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

      // PIB historical series
      const pibYears = Object.keys(eco.serie_historica || {}).sort();
      const latestYr = eco.ano_referencia || pibYears[pibYears.length - 1] || '2023';
      const latestObj = (eco.serie_historica || {})[latestYr] || {};
      const vabItems = [
        { label: 'Serviços (exc. Adm. Pública)', val: latestObj['Valor adicionado bruto dos Serviços, a preços correntes - exceto Administração, defesa, educação e saúde públicas e seguridade social'] || 0, color: '#0284c7' },
        { label: 'Agropecuária', val: latestObj['Valor adicionado bruto da Agropecuária, a preços correntes'] || 0, color: '#16a34a' },
        { label: 'Indústria', val: latestObj['Valor adicionado bruto da Indústria, a preços correntes'] || 0, color: '#f59e0b' },
        { label: 'Administração Pública', val: latestObj['Valor adicionado bruto da Administração, defesa, educação e saúde públicas e seguridade social, a preços correntes'] || 0, color: '#7c3aed' },
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
            <div style="font-weight:800;font-size:13.5px;color:#0f172a;margin-bottom:8px">Valor Adicionado Bruto por Setor — PIB ${escapeHtml(latestYr)} (IBGE)</div>
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
    } else if (navId === 'docs') {"""

app = app.replace("    } else if (navId === 'docs') {", socio_code, 1)

# Replace the 'docs' modal content cleanly with Jacinto Machado's RIGeo, Pending Municipal Layers, IBGE, FBDS, SIGSC
docs_start = app.find("modalTitle.textContent = 'Emissão de Documentos e Portais Oficiais")
docs_end = app.find("    } else if (navId === 'help') {")
if docs_start != -1 and docs_end != -1:
    new_docs = """modalTitle.textContent = 'Fontes Oficiais, RIGeo SGB/CPRM e Situação das Bases — Jacinto Machado';
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
"""
    app = app[:docs_start] + new_docs + app[docs_end:]

open('js/app.js', 'w', encoding='utf-8').write(app)
print('Wrote js/app.js', len(app))

# ==================== 2. ADAPT js/downloads-page.js ====================
dl = open(r'C:\Users\Win11\Downloads\Geoportal Araquari\js\downloads-page.js', encoding='utf-8').read()
dl_repls = [
    ('Geoportal Araquari', 'Geoportal Municipal de Jacinto Machado'),
    ('ATENDE_MAPA_PDF', 'RIGEO_PDF_URL'),
    ('GEOARAQUARI_BUNDLE', 'GEOJACINTO_BUNDLE'),
    ('geoportal_araquari_', 'geoportal_jacinto_machado_'),
    ('araquari-bundle-extra.js', 'jacinto-bundle-extra.js'),
    ('Araquari', 'Jacinto Machado'),
]
for a, b in dl_repls:
    dl = dl.replace(a, b)

# Replace MUNICIPAL_DOCS block with Jacinto Machado official RIGeo & IBGE docs
m_start = dl.find('const MUNICIPAL_DOCS = [')
m_end = dl.find('  ];\n\n  // Monta lista unificada')
if m_start != -1 and m_end != -1:
    new_docs_arr = """const MUNICIPAL_DOCS = [
    {
      id: 'doc_rigeo_carta_pdf',
      name: 'Carta de Suscetibilidade a Movimentos Gravitacionais de Massa e Inundações (PDF 19,8 MB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Prancha cartográfica oficial 1:50.000 produzida pelo IPT e SGB/CPRM (2015) para Jacinto Machado – SC.',
      format: 'PDF Oficial (RIGeo SGB/CPRM)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/2c1448f9-141c-4083-aa95-bf92559d593c/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_bc_zip',
      name: 'Base Cartográfica Jacinto Machado — Shapefiles Originais (ZIP 15 MB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Pacote original com curvas de nível, hidrografia, rodovias, área urbanizada e limites (SIRGAS 2000 / UTM 22S).',
      format: 'ZIP / Shapefile (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/f071e948-f8c5-449b-857b-01e3bcf98629/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_sig_zip',
      name: 'SIG Suscetibilidade Completo — Vetores, Geologia, Pedologia e Fotos de Campo (ZIP 1,21 GB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Arquivo completo do projeto SIG de suscetibilidade a inundações, deslizamentos, enxurradas, corridas e pontos de campo.',
      format: 'ZIP / Shapefile (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/5434e439-7854-4412-9106-bf7117e5572d/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_mde_zip',
      name: 'Produtos MDE — MDT, Hipsometria, Declividade e Relevo Sombreado (ZIP 1,13 GB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Modelos digitais de elevação e terreno (GeoTIFF / ArcGrid) derivados do aerolevantamento oficial SC.',
      format: 'ZIP / GeoTIFF (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/e7e05db0-fcd6-47d7-b80f-2d10b5e7cfd6/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_rigeo_orto_zip',
      name: 'Ortofotos de Jacinto Machado — Mosaico ECW (ZIP 308 MB)',
      category: 'Documentos Oficiais SGB/CPRM (RIGeo)',
      sourceClass: 'Oficial',
      whatIsThis: 'Mosaico aerofotogramétrico ortorretificado de Jacinto Machado (ECW) no acervo RIGeo.',
      format: 'ZIP / ECW (RIGeo)',
      externalUrl: 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/1c11c678-e73f-452d-8d8b-c1a03e2afcc1/content',
      orgao: 'SGB / CPRM & IPT',
    },
    {
      id: 'doc_ibge_indicadores',
      name: 'Indicadores Socioeconômicos Oficiais IBGE SIDRA (Censo 2022, PIB, PAM, PPM)',
      category: 'Indicadores Socioeconômicos (IBGE)',
      sourceClass: 'Oficial',
      whatIsThis: 'Arquivo JSON estruturado com os dados oficiais de população, área, densidade, PIB municipal, lavouras e pecuária.',
      format: 'JSON Oficial (IBGE SIDRA)',
      localFile: 'data/ibge_indicadores_jacinto_machado.json',
      orgao: 'IBGE — SIDRA',
    },
"""
    dl = dl[:m_start] + new_docs_arr + dl[m_end:]

open('js/downloads-page.js', 'w', encoding='utf-8').write(dl)
print('Wrote js/downloads-page.js', len(dl))
