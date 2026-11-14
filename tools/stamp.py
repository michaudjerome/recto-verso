"""Ajoute ?v=<empreinte> à chaque module JS, au CSS et aux données, et régénère sw.js.
Chaque publication change l'empreinte : le navigateur recharge tous les fichiers ensemble.
Usage : python tools/stamp.py (depuis 03_APP)"""
import hashlib, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
rel = lambda p: p.relative_to(root).as_posix()
files = sorted((root / 'js').rglob('*.js')) + sorted((root / 'js').rglob('*.mjs'))
DATA = sorted((root / 'data').rglob('*.json'))
CSS = sorted((root / 'css').glob('*.css'))
h = hashlib.sha1()
for p in files + DATA + CSS:
    h.update(rel(p).encode()); h.update(p.read_bytes())
v = h.hexdigest()[:8]
imports = {f'./{rel(p)}': f'./{rel(p)}?v={v}' for p in files}
block = f'<script type="importmap" id="stamp">{json.dumps({"imports": imports}, separators=(",", ":"))}</script>\n<script>window.APP_STAMP = "{v}";</script>'
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<script type="importmap" id="stamp">.*?</script>\n<script>window.APP_STAMP = "\w+";</script>\n', '', html, flags=re.S)
html = re.sub(r'href="css/(\w+)\.css(\?v=\w+)?"', lambda m: f'href="css/{m.group(1)}.css?v={v}"', html)
html = re.sub(r'<script type="module" src="js/app\.js(\?v=\w+)?"></script>', block + f'\n<script type="module" src="js/app.js?v={v}"></script>', html)
(root / 'index.html').write_text(html, encoding='utf-8')
# Hors ligne : tout le nécessaire, sauf la police chinoise (2 Mo, mise en cache à la première utilisation)
core = ['./', 'index.html', 'manifest.webmanifest'] + [f'{rel(p)}?v={v}' for p in CSS + files + DATA]
core += [rel(p) for p in sorted((root / 'fonts').glob('*.woff2')) if p.name != 'kai.woff2']
core += [rel(p) for p in sorted((root / 'icons').iterdir())]
sw = (root / 'tools' / 'sw.template.js').read_text(encoding='utf-8').replace('__V__', v).replace('__CORE__', json.dumps(core, indent=1))
(root / 'sw.js').write_text(sw, encoding='utf-8')
print('empreinte', v, '·', len(core), 'fichiers pour le hors ligne')
