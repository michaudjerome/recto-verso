"""Phase 3 : vérification croisée d'une notion et calcul de son niveau.
verify(n) -> dict par langue : liste des sources qui confirment (vide = non confirmé)."""
import csv, pickle, re, pathlib
X = pickle.load(open('/home/claude/sources/xref.pkl', 'rb'))
from xref_norm import norm
CJ = {}
for r in csv.DictReader(open('/home/claude/sources/cefrj/cefrj-vocabulary-profile-1.5.csv', encoding='utf-8')):
    for h in r['headword'].split('/'):
        CJ.setdefault(h.strip().lower(), {})[r['pos']] = r['CEFR']
PMAP = {'nom': 'n', 'verbe': 'v', 'adj': 'as', 'adv': 'r'}
CJPOS = {'nom': 'noun', 'verbe': 'verb', 'adj': 'adjective', 'adv': 'adverb'}
def omw(en, l, pos):
    out = set()
    for e in en.split('|'):
        for s in X['en_syn'].get(norm(e), ()):
            if pos and s[-1] not in pos: continue
            out |= X['syn_l'][l].get(s, set())
    return out
def has(text, en):
    for e in en.split('|'):
        e = norm(e)
        if e and re.search(r'(^|[^a-z])' + re.escape(e) + r'($|[^a-z])', text): return True
    return False
def variants(w, l):
    v = {w}
    for p in ("se ", "s'", "sich ", "si "):
        if w.startswith(p): v.add(w[len(p):])
    if l == 'es' and w.endswith('se') and len(w) > 4: v.add(w[:-2])
    if l == 'it' and w.endswith('rsi'): v.add(w[:-3] + 're')
    if l == 'it' and w.endswith('arsi'): v.add(w[:-4] + 'are')
    return v
def verify(n):
    en, pos = n['en'], PMAP.get(n['pos'])
    r = {}
    for l in ['fr', 'es', 'it', 'de', 'zh']:
        W = variants(norm(n[l]), l); src = []
        if W & omw(en, l, pos): src.append('omw')
        elif pos and W & omw(en, l, None): src.append('omw~')
        if l == 'fr' and any(x in W for e in en.split('|') for x in X['fd'].get(norm(e), ())): src.append('freedict')
        if l == 'es' and any(has(g, en) for w in W for g in X['es_gl'].get(w, ())): src.append('eswikt')
        if l == 'zh' and n[l] in X['hsk'] and has(X['hsk'][n[l]]['mean'], en): src.append('hsk30')
        r[l] = src
    return r
# Corrections manuelles d'anomalies évidentes de CEFR-J (adjectif classé bien au-dessus de son adverbe)
OVERRIDE = {'deep': 'A2'}
def cefr(n):
    if n['en'].lower() in OVERRIDE: return OVERRIDE[n['en'].lower()]
    lv = []
    for e in n['en'].split('|')[:1]:
        d = CJ.get(e.lower().strip())
        if d: lv.append(d.get(CJPOS.get(n['pos'], ''), min(d.values())))
    return lv[0] if lv else None
def hsk(zh):
    h = X['hsk'].get(zh); return h['lv'] if h else None
