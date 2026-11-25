# Geoportal Municipal de Jacinto Machado — SC

Plataforma web de geoinformação territorial, ambiental, física, socioeconômica e de Defesa Civil do Município de **Jacinto Machado – Santa Catarina (IBGE 4208708)**, desenvolvida com base na arquitetura do **Geoportal de Araquari** e referências dos Geoportais de Florianópolis e Itajaí.

- **Acesso Online (GitHub Pages):** `https://eriksdhoffmann.github.io/Geoportal-Jacinto-Machado/`
- **Central de Downloads & Metadados:** `https://eriksdhoffmann.github.io/Geoportal-Jacinto-Machado/downloads.html`
- **Execução Local (Offline):** abra `index.html` diretamente no navegador ou execute `ABRIR_GEOPORTAL_JACINTO_MACHADO.bat`.

---

## Principais Recursos

- **40 camadas vetoriais reais e verificadas** organizadas em grupos temáticos (Base Cartográfica, Geografia Física, Meio Ambiente, Defesa Civil e Riscos SGB/CPRM, Infraestrutura e Serviços, Informações Socioeconômicas IBGE, Turismo e Trilhas).
- **8 mapas-base** com alternância instantânea e **Cortina Comparativa (Swipe)**: Satélite HD Atual, Satélite Híbrido, **Ortofoto Oficial SC 2012 (39 cm — SIGSC WMS)**, **MDT Relevo Sombreado (SIGSC)**, **MDS Hipsometria (SIGSC)**, OpenStreetMap, Carto Claro e OpenTopoMap.
- **Carta de Suscetibilidade SGB/CPRM & IPT (RIGeo 2015 — 1:50.000)** totalmente integrada: Inundações (667 polígonos), Movimentos de Massa (587), Enxurradas (132), Corridas de Massa (88), Bacias (11), Feições de Instabilidade (116 polígonos + 100 pontos de cicatrizes/ravinas), Geologia 1:50k, Lineamentos, Pedologia, Relevo, Curvas de Nível (20 m) e Isoietas.
- **Setorização de Risco Geológico SGB/CPRM:** 47 setores oficiais de risco alto e muito alto (`SC_JACINTO_SR_*`).
- **FBDS em Alta Resolução (1:5.000 — `SC_4208708`):** Uso e Cobertura do Solo (3.594 polígonos), APP (2.813), Cursos d'Água (7.026), Rios Duplos (24), Massas d'Água (67) e Nascentes (3.154).
- **IMA-SC & MMA/ICMBio:** Parque Nacional da Serra Geral, Bacias Hidrográficas (Araranguá e Mampituba), Declividade do Terreno (2.111 polígonos) e Regiões Fitogeográficas.
- **Painel Socioeconômico Interativo (IBGE SIDRA):** Censo 2022 (10.624 hab., 430,704 km², 24,67 hab./km², 58,95% urbana / 41,05% rural, 3.951 domicílios), PIB Municipal 2021–2023 + VAB Setorial, Produção Agrícola Municipal (PAM — Arroz, Banana, Fumo, Milho, Maracujá), Pecuária (PPM), Uso do Solo FBDS e Equipamentos Públicos (20 Unidades de Saúde DataSUS/CNES, Escolas, Pontes e Atrativos Turísticos).
- **Ferramentas GIS completas:** Busca unificada (localidades, ruas, rodovias, saúde, escolas, risco, turismo e coordenadas), Raio-X Territorial (identificação ponto-em-polígono multi-camada), medição geodésica de distâncias e áreas, desenho/anotação com exportação GeoJSON, importação de Shapefile (`.zip`), GeoJSON e KML, controle de ordem (`▲/▼`) e transparência, impressão em PDF e Central de Downloads com metadados de 21 campos.

## Padrão Cartográfico e Transparência

- **Referência Geodésica:** SIRGAS 2000 (EPSG:4674 / UTM 22S EPSG:31982), exibido em web em WGS 84 (EPSG:4326) com leitura simultânea de coordenadas em **SIRGAS 2000 UTM 22S**, **WGS 84** e **DMS**.
- **Camadas Pendentes de Obtenção Municipal:** Nenhuma camada fictícia foi incluída. Zoneamento do Plano Diretor Municipal, Perímetro Urbano Legal, Cadastro Imobiliário (quadras e lotes), Parcelamento do Solo e Bairros Oficiais constam explicitamente como **pendentes de obtenção junto à Prefeitura Municipal de Jacinto Machado**.

## Fontes Oficiais Utilizadas

- **SGB / CPRM & IPT (RIGeo):** https://rigeo.sgb.gov.br/items/c43f811a-d579-4e78-aa19-cb4e54394f08
- **IBGE (Malhas, Setores Censo 2022 e SIDRA):** https://servicodados.ibge.gov.br/ e https://apisidra.ibge.gov.br/
- **FBDS (`SC_4208708`):** https://geo.fbds.org.br/SC/JACINTO_MACHADO/
- **SIGSC (Aerolevantamento SC — WMS/WFS):** https://sigsc.sc.gov.br/
- **IMA-SC / MMA-ICMBio:** https://geo.ima.sc.gov.br/
- **DataSUS / CNES (`420870`):** https://apidadosabertos.saude.gov.br/
- **OpenStreetMap (ODbL):** https://www.openstreetmap.org/
