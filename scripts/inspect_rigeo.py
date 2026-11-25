import io, zipfile, requests

class RemoteZipFile(io.RawIOBase):
    def __init__(self, url):
        self.url = url
        h = requests.head(url, timeout=15)
        self.size = int(h.headers.get('Content-Length', 0))
        self.pos = 0
    def seekable(self): return True
    def readable(self): return True
    def seek(self, offset, whence=0):
        if whence == 0: self.pos = offset
        elif whence == 1: self.pos += offset
        elif whence == 2: self.pos = self.size + offset
        return self.pos
    def tell(self): return self.pos
    def read(self, n=-1):
        if n == -1: n = self.size - self.pos
        end = min(self.pos + n - 1, self.size - 1)
        if self.pos > end: return b''
        r = requests.get(self.url, headers={'Range': f'bytes={self.pos}-{end}'}, timeout=30)
        self.pos += len(r.content)
        return r.content

print('=== BC ZIP ALL FILES ===')
with zipfile.ZipFile('data_raw/bc_jacintomachado_sc.zip') as z:
    for info in z.infolist():
        if info.filename.endswith('.shp') or info.filename.endswith('.dbf'):
            print(f'  {info.filename} ({info.file_size} B)')

print('\n=== SIG_SUSCET FOLDERS & SHAPEFILES ===')
url = 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/5434e439-7854-4412-9106-bf7117e5572d/content'
rz = RemoteZipFile(url)
with zipfile.ZipFile(rz) as z:
    folders = sorted(set(i.filename.split('/')[0] for i in z.infolist()))
    print('Top folders:', folders)
    for info in z.infolist():
        fn = info.filename
        if fn.lower().endswith(('.shp', '.geojson', '.kml', '.kmz', '.pdf', '.png', '.jpg')) and not fn.startswith('14.PontosSelecionados'):
            if not fn.lower().endswith('.jpg') or info.file_size < 500000:
                print(f'  {fn} ({info.file_size:,} B)')

print('\n=== PRODUTOS_MDE FILES ===')
url2 = 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/e7e05db0-fcd6-47d7-b80f-2d10b5e7cfd6/content'
rz2 = RemoteZipFile(url2)
with zipfile.ZipFile(rz2) as z:
    for info in z.infolist():
        print(f'  {info.filename} ({info.file_size:,} B)')
