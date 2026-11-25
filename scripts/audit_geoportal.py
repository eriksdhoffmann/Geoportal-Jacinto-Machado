import subprocess, glob, json, os, re

for f in sorted(glob.glob('js/*.js')):
    if 'bundle' in f or 'limite-' in f or 'indicadores-' in f: continue
    r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
    print(f'NODE CHECK {f}:', 'OK' if r.returncode == 0 else r.stderr)

cat = open('js/catalog.js', encoding='utf-8').read()
files = sorted(set(re.findall(r"localFile:\s*'([^']+)'", cat)))
missing = []
total_feats = 0
for lf in files:
    if not os.path.exists(lf):
        missing.append(lf)
    elif lf.endswith('.geojson'):
        d = json.load(open(lf, encoding='utf-8'))
        total_feats += len(d.get('features', []))
print(f'CATALOG FILES: {len(files)} | missing={missing} | total_features={total_feats:,}')

for f in ['index.html', 'downloads.html'] + [p for p in glob.glob('js/*.js') if 'bundle' not in p]:
    txt = open(f, encoding='utf-8').read().lower()
    cnt = txt.count('araquari')
    if cnt:
        print(f'WARNING: {f} has {cnt} mentions of araquari')
print('AUDIT DONE')
