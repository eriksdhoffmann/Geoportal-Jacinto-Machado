import os, re, io, zipfile, requests
from urllib.parse import urljoin

session = requests.Session()
session.headers.update({'User-Agent': 'GeoportalJacintoMachado/1.0'})

# 1. Download FBDS SC_4208708 (APP, USO, HIDROGRAFIA)
for sub in ['APP', 'USO', 'HIDROGRAFIA']:
    url = f'https://geo.fbds.org.br/SC/JACINTO_MACHADO/{sub}/'
    r = session.get(url, timeout=20)
    files = sorted(set(re.findall(r'href="([^"]+\.(?:shp|dbf|shx|prj|cpg))"', r.text, re.I)))
    sub_dir = f'data_raw/fbds/{sub}'
    os.makedirs(sub_dir, exist_ok=True)
    for href in files:
        if '_APP_USO' in href.upper(): continue
        full = urljoin(url, href)
        fn = os.path.basename(href)
        out = os.path.join(sub_dir, fn)
        if os.path.exists(out) and os.path.getsize(out) > 0: continue
        fr = session.get(full, timeout=60)
        if fr.status_code == 200:
            open(out, 'wb').write(fr.content)
            print(f'FBDS {sub}/{fn}: {len(fr.content):,} B', flush=True)

# 2. Ensure Pedologia.shp/.dbf/.shx/.prj are extracted from RIGeo
ped_dir = 'data_raw/suscet/07.Pedologia'
if not os.path.exists(os.path.join(ped_dir, 'Pedologia.shp')) or os.path.getsize(os.path.join(ped_dir, 'Pedologia.dbf')) == 0:
    from scripts.extract_rigeo import FastRemoteZipFile
    url = 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/5434e439-7854-4412-9106-bf7117e5572d/content'
    rz = FastRemoteZipFile(url)
    with zipfile.ZipFile(rz) as z:
        for info in z.infolist():
            if info.filename.startswith('07.Pedologia/') and not info.is_dir():
                out = os.path.join('data_raw/suscet', info.filename)
                os.makedirs(os.path.dirname(out), exist_ok=True)
                data = z.open(info).read()
                open(out, 'wb').write(data)
                print(f'Extracted {info.filename} ({len(data):,} B)', flush=True)
print('DONE FBDS + Pedologia!', flush=True)
