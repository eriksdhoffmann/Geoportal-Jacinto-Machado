import os, io, zipfile, requests

os.makedirs('data_raw/suscet', exist_ok=True)

class FastRemoteZipFile(io.RawIOBase):
    def __init__(self, url, block_size=2*1024*1024):
        self.url = url
        self.session = requests.Session()
        h = self.session.head(url, timeout=15)
        self.size = int(h.headers.get('Content-Length', 0))
        self.block_size = block_size
        self.pos = 0
        self.buf_start = -1
        self.buf = b''
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
        if self.pos >= self.size or n == 0: return b''
        out = bytearray()
        while len(out) < n and self.pos < self.size:
            if not (self.buf_start <= self.pos < self.buf_start + len(self.buf)):
                end = min(self.pos + max(self.block_size, n) - 1, self.size - 1)
                r = self.session.get(self.url, headers={'Range': f'bytes={self.pos}-{end}'}, timeout=60)
                self.buf_start = self.pos
                self.buf = r.content
                if not self.buf: break
            off = self.pos - self.buf_start
            take = min(n - len(out), len(self.buf) - off)
            out.extend(self.buf[off:off+take])
            self.pos += take
        return bytes(out)

url = 'https://rigeo.sgb.gov.br/server/api/core/bitstreams/5434e439-7854-4412-9106-bf7117e5572d/content'
rz = FastRemoteZipFile(url)
wanted_exts = ('.shp', '.dbf', '.shx', '.prj', '.cpg', '.sbn', '.sbx')
count = 0
with zipfile.ZipFile(rz) as z:
    for info in z.infolist():
        fn = info.filename
        if info.is_dir() or fn.startswith('14.PontosSelecionados'):
            continue
        if fn.lower().endswith(wanted_exts) or fn.startswith('09.Hietogramas/'):
            out_path = os.path.join('data_raw/suscet', fn)
            if os.path.exists(out_path) and os.path.getsize(out_path) == info.file_size and info.file_size > 0:
                continue
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with z.open(info) as src, open(out_path, 'wb') as dst:
                data = src.read()
                dst.write(data)
            count += 1
            print(f'Extracted {fn} ({len(data):,} B)', flush=True)
print(f'ALL DONE! Extracted {count} new files.', flush=True)
