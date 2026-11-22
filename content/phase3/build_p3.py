"""Phase 3 : fusionne les lots vérifiés dans data/ et recale les niveaux de toutes les notions.
Règles : un mot non confirmé par au moins une source (wordnets OMW, FreeDict, Wiktionnaire hors ligne,
HSK 3.0, ou Wiktionnaire en ligne : wikt_ok_lines.txt) fait écarter toute la notion (bad_lines.txt).
Niveaux : CEFR-J pour fr/en/es/it/de (par le mot anglais), HSK 3.0 pour le chinois (mot chinois ;
mot composé : niveau le plus haut de ses parties ; hors HSK 1-6 : absent pour les apprenants du chinois).
Doublons : un mot déjà présent dans une langue (contenu existant ou lot précédent) fait écarter la notion.
Usage : python build_p3.py   (écrit data/notions.json, data/lang/*.json, content/phase3/build_report.tsv)"""
import sys, json, glob, re, csv, collections, pathlib, unicodedata
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from check import load, bare, LANGS
from verify import verify, cefr, X, CJ
from xref_norm import norm
from pypinyin import pinyin, Style
P = pathlib.Path(__file__).parent; RV = P.parent.parent; D = RV / 'data'
CODES = ['fr', 'en', 'es', 'it', 'de', 'zh']
N = json.load(open(D / 'notions.json', encoding='utf-8'))
L = {l: json.load(open(D / f'lang/{l}.json', encoding='utf-8')) for l in CODES}
HSK = X['hsk']; G = X['gen']
def key_line(en, miss): return en + '|' + '|'.join(f'{l}:{w}' for l, w in miss)
WOK = set(open(P / 'wikt_ok_lines.txt', encoding='utf-8').read().split('\n'))
BAD = set(open(P / 'bad_lines.txt', encoding='utf-8').read().split('\n'))
THEMES = {
 'travail': ['Le travail et l\'économie', 'Work and economy', 'El trabajo y la economía', 'Il lavoro e l\'economia', 'O trabalho e a economia', 'Arbeit und Wirtschaft', '工作与经济'],
 'nature': ['La nature et l\'environnement', 'Nature and environment', 'La naturaleza y el medio ambiente', 'La natura e l\'ambiente', 'A natureza e o ambiente', 'Natur und Umwelt', '自然与环境'],
 'societe': ['La société', 'Society', 'La sociedad', 'La società', 'A sociedade', 'Gesellschaft', '社会'],
 'emotions': ['Sentiments et caractère', 'Feelings and character', 'Sentimientos y carácter', 'Sentimenti e carattere', 'Sentimentos e caráter', 'Gefühle und Charakter', '情感与性格'],
 'medias': ['Médias et numérique', 'Media and digital', 'Medios y tecnología digital', 'Media e digitale', 'Media e digital', 'Medien und Digitales', '媒体与数字'],
 'idees': ['Idées et opinions', 'Ideas and opinions', 'Ideas y opiniones', 'Idee e opinioni', 'Ideias e opiniões', 'Ideen und Meinungen', '观点与想法'],
}
UICODES = ['fr', 'en', 'es', 'it', 'pt', 'de', 'zh']
have_th = {t['id'] for t in N['themes']}
for tid, names in THEMES.items():
    if tid not in have_th: N['themes'].append({'id': tid, 'glyph': '', 'names': dict(zip(UICODES, names))})

def hsk_level(zh):
    h = HSK.get(zh)
    if h: return h['lv'], 'hsk30'
    # mot composé : découpage glouton en mots HSK 1-6
    i, lv = 0, 0
    while i < len(zh):
        for j in range(len(zh), i, -1):
            h = HSK.get(zh[i:j])
            if h and h['lv'] <= 6 and (j - i > 1 or j == len(zh) or True):
                lv = max(lv, h['lv']); i = j; break
        else: return None, None
    return lv, 'hsk30-parts'
def py_of(zh):
    h = HSK.get(zh)
    if h: return h['py'].replace(' ', '')
    return ''.join(x[0] for x in pinyin(zh, style=Style.TONE))
def slug(s):
    s = unicodedata.normalize('NFD', s.lower()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
ART = {'fr': {'le': 'm', 'la': 'f', 'les': None, "l'": None}, 'es': {'el': 'm', 'la': 'f', 'los': 'm', 'las': 'f'},
       'it': {'il': 'm', 'lo': 'm', 'la': 'f', "l'": None, 'i': 'm', 'gli': 'm', 'le': 'f'}, 'de': {'der': 'm', 'die': 'f', 'das': 'n'}}
def split_noun(l, raw):
    g = None
    if '|' in raw: raw, g = raw.split('|')
    m = re.match(r"^(l'|\S+ )(.*)$", raw)
    art, w = (m.group(1).strip(), m.group(2)) if m and m.group(1).strip() in ART[l] else (None, raw)
    if art and g is None:
        g = ART[l][art]
        if l == 'de' and art == 'die':  # « die » peut être un pluriel : on ne garde le féminin que s'il est attesté
            known = G['de'].get(w, ''); g = 'f' if 'f' in known else None
    return w, art, g

# Mots existants par langue (pour les doublons)
used = {l: collections.defaultdict(set) for l in CODES}
for nid, e in [(i, e) for l in CODES for i, e in L[l]['entries'].items()]: pass
for l in CODES:
    for i, e in L[l]['entries'].items(): used[l][norm(e['w'])].add(i)
ids = {n['id'] for n in N['notions']}

rows = load(sorted(glob.glob(str(P / 'lots/*.txt'))))
report, stat = [], collections.Counter()
new_notions = []
for r in rows:
    pos = r['pos']
    w = {l: (bare(r[l]) if pos == 'nom' else r[l]) for l in LANGS}
    v = verify({'en': r['en'], 'pos': pos, **w})
    miss = [(l, w[l]) for l in LANGS if not v[l]]
    k = key_line(r['en'], miss)
    why = None
    if miss and k in BAD: why = 'non confirmé : ' + ','.join(l for l, _ in miss)
    elif miss and k not in WOK: why = 'non vérifié'
    if miss and not why:
        for l, _ in miss: v[l] = ['enwikt']
    lvl = re.search(r'expr_(A1|A2|B1|B2)', r['file'])
    c = lvl.group(1) if lvl else cefr({'en': r['en'], 'pos': pos})
    if not why and c not in ('A1', 'A2', 'B1', 'B2'): why = 'niveau CECRL inconnu'
    en_w = ('to ' + r['en']) if pos == 'verbe' else r['en']
    if not why:
        dup = [l for l in CODES if used[l].get(norm(en_w if l == 'en' else w.get(l, '')))]
        if dup: why = 'doublon : ' + ','.join(dup)
    if why:
        stat['écarté'] += 1; stat[why.split(' :')[0]] += 1
        report.append([r['en'], pos, str(c), why, r['fr'], r['zh']]); continue
    hl, hsrc = hsk_level(r['zh'])
    nid = slug(w['fr'])
    if nid in ids: nid = slug(w['fr'] + '-' + r['en'])
    if nid in ids: stat['id'] += 1; continue
    ids.add(nid)
    n = {'id': nid, 'theme': r['theme'], 'pos': pos, 'hsk': hl if hl and hl <= 6 else None, 'cefr': c, 'sens': w['fr']}
    new_notions.append(n)
    for l in LANGS:
        e = {'ok': ['claude'] + v[l]}
        if pos == 'nom' and l != 'zh':
            ww, art, g = split_noun(l, r[l])
            e = {'w': ww, **({'art': art} if art else {}), **({'g': g} if g else {}), **e}
        else: e = {'w': w[l], **e}
        if l == 'zh': e = {'w': r['zh'], 'py': py_of(r['zh']), 'ok': ['claude'] + v[l] + ([hsrc] if hsrc and hsrc not in v[l] else [])}
        L[l]['entries'][nid] = e
        used[l][norm(e['w'])].add(nid)
    L['en']['entries'][nid] = {'w': en_w, 'ok': ['claude', 'cefrj']}
    used['en'][norm(en_w)].add(nid)
    stat['ajouté'] += 1; stat['ajouté_' + c] += 1
    report.append([r['en'], pos, c, 'ajouté hsk=' + str(n['hsk']), r['fr'], r['zh']])

# Recalage des niveaux des notions existantes
relv = collections.Counter()
for n in N['notions']:
    en = L['en']['entries'].get(n['id'], {}).get('w', '')
    c = cefr({'en': re.sub(r'^to ', '', en), 'pos': n['pos']}) if en else None
    if c in ('A1', 'A2', 'B1', 'B2') and c != n['cefr']: relv[(n['cefr'], c)] += 1; n['cefr'] = c
    zh = L['zh']['entries'].get(n['id'], {}).get('w')
    if zh and zh in HSK and HSK[zh]['lv'] != n.get('hsk'):
        relv[('hsk', n.get('hsk'), HSK[zh]['lv'])] += 1; n['hsk'] = HSK[zh]['lv'] if HSK[zh]['lv'] <= 6 else None
N['notions'] += new_notions
N['v'] = 4
json.dump(N, open(D / 'notions.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for l in CODES: json.dump(L[l], open(D / f'lang/{l}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
with open(P / 'build_report.tsv', 'w', encoding='utf-8') as f: f.write('\n'.join('\t'.join(x) for x in report))
print(dict(stat)); print('recalage', sorted(relv.items(), key=lambda x: -x[1])[:30])
lv = collections.Counter((n['cefr']) for n in N['notions']); print('cefr total', sorted(lv.items()))
hz = collections.Counter((n.get('hsk')) for n in N['notions']); print('hsk total', sorted(hz.items(), key=str))
