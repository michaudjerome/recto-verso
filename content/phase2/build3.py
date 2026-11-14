"""Phase 2 : fusionne les notions nouvelles et les traductions es/it/de dans data/, avec les sources de vérification.
Entrées : p2/new.json, p2/res.txt (« id bits » rendus par le navigateur), p2/picto.json, p2/drops.json
Bits (12) : zhE zhF enE enF frE frF esE esF itE itF deE deF  (E = Wiktionnaire anglais, F = Wiktionnaire français)"""
import json, re, csv, pathlib
P = pathlib.Path(__file__).parent
RV = pathlib.Path('/home/claude/rv')
d = json.load(open(P / 'new.json'))
res = dict(l.split(' ') for l in open(P / 'res.txt', encoding='utf-8').read().split('\n') if ' ' in l)
picto = json.load(open(P / 'picto.json'))

M = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'ü': 'ǖǘǚǜ'}
def syl(s):
    m = re.match(r'([a-zü:]+)([1-5])$', s.lower().replace('u:', 'ü'))
    if not m: return s
    b, t = m.groups(); t = int(t)
    if t == 5: return b
    for v in 'ae':
        if v in b: return b.replace(v, M[v][t - 1], 1)
    if 'ou' in b: return b.replace('o', M['o'][t - 1], 1)
    for i in range(len(b) - 1, -1, -1):
        if b[i] in M: return b[:i] + M[b[i]][t - 1] + b[i + 1:]
    return b
def pinyin(p):
    out = ''
    for x in p.split():
        s = syl(x)
        if out and s[0] in 'aeiouāáǎàēéěèōóǒò': out += "'"
        out += s
    return out

def src(bits, i, j):
    b = bits if bits and bits != 'E' else '0' * 12
    o = []
    if b[i] == '1': o.append('enwikt')
    if b[j] == '1': o.append('frwikt')
    return o

notions = json.load(open(RV / 'data/notions.json'))
L = {l: json.load(open(RV / f'data/lang/{l}.json')) for l in ['fr', 'en', 'zh']}
for l in ['es', 'it', 'de']:
    L[l] = {'lang': l, 'entries': {}}

def put(lang, nid, e, sources):
    e = dict(e); e['ok'] = ['claude'] + sources
    L[lang]['entries'][nid] = e

stats = {l: [0, 0] for l in ['fr', 'en', 'es', 'it', 'de']}
for n in d['new']:
    nid, b = n['id'], res.get(n['id'])
    lvl = n['hsk']
    nn = {'id': nid, 'theme': n['theme'], 'pos': n['pos'], 'hsk': lvl, 'cefr': 'A1' if lvl == 1 else 'A2', 'sens': n['fr']['w']}
    if nid in picto: nn['picto'] = picto[nid]
    notions['notions'].append(nn)
    L['zh']['entries'][nid] = {'w': n['zh'], 'py': pinyin(n['py']), 'ok': ['hsk30', 'cedict']}
    for lang, (i, j) in {'fr': (4, 5), 'en': (2, 3), 'es': (6, 7), 'it': (8, 9), 'de': (10, 11)}.items():
        s = src(b, i, j)
        put(lang, nid, n[lang], s)
        stats[lang][0] += 1; stats[lang][1] += bool(s)
for nid, tr in d['base'].items():
    b = res.get(nid)
    for lang, (i, j) in {'es': (6, 7), 'it': (8, 9), 'de': (10, 11)}.items():
        s = src(b, i, j)
        put(lang, nid, tr[lang], s)
        stats[lang][0] += 1; stats[lang][1] += bool(s)

notions['v'] = notions.get('v', 1) + 1
json.dump(notions, open(RV / 'data/notions.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for l, v in L.items():
    json.dump(v, open(RV / f'data/lang/{l}.json', 'w'), ensure_ascii=False, separators=(',', ':'))

# Tableau de relecture
rows = []
by = {l: L[l]['entries'] for l in L}
for n in notions['notions']:
    i = n['id']
    def w(l):
        e = by[l].get(i, {}); a = e.get('art', '')
        return (a + ('' if a.endswith("'") or not a else ' ') + e.get('w', '')) if e else ''
    def ok(l):
        e = by[l].get(i, {})
        return '' if 'ok' not in e else ('oui' if len(e['ok']) >= 2 else 'non relue')
    rows.append([i, n['theme'], n['hsk'], n['cefr'], n['pos'], n.get('picto', ''), by['zh'][i]['w'], by['zh'][i]['py'], w('fr'), ok('fr'), w('en'), ok('en'), w('es'), ok('es'), w('it'), ok('it'), w('de'), ok('de')])
with open(P / 'notions-1020.csv', 'w', newline='', encoding='utf-8-sig') as f:
    wr = csv.writer(f, delimiter=';')
    wr.writerow(['id', 'thème', 'HSK', 'CECRL', 'nature', 'picto', 'chinois', 'pinyin', 'français', 'fr relu', 'anglais', 'en relu', 'espagnol', 'es relu', 'italien', 'it relu', 'allemand', 'de relu'])
    wr.writerows(rows)
print(len(notions['notions']), 'notions ·', sum('picto' in n for n in notions['notions']), 'avec picto')
for l, (t, k) in stats.items():
    print(f'{l} : {k}/{t} attestés ({100 * k / t:.0f} %)')
