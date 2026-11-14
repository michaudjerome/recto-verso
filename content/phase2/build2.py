"""Phase 2 de Recto Verso : assemble les notions rédigées (lot 1 + A à D), les traductions es/it/de des 246 notions
de base (E), contrôle les doublons et prépare la liste de vérification Wiktionnaire.
Usage : python3 build2.py  → p2/new.json (notions nouvelles), p2/verify.json (pour le navigateur)"""
import json, re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from lot1_author import L as L1, DROP as D1

P = pathlib.Path(__file__).parent
RV = pathlib.Path('/home/claude/rv')
cands = {c['zh']: c for c in json.load(open(P / 'cands.json'))}

# Arbitrages après relecture croisée des lots (doublons de sens avec la base ou entre lots)
EXTRA_DROP = {'说话': 'doublon de 说 (parler)', '跑': 'doublon de 跑步 (courir)', '旅行': 'doublon de 旅游 (voyager)',
              '体育': 'doublon de 运动 (sport)', '计算机': 'doublon de 电脑 (ordinateur)', '睡': 'doublon de 睡觉 (dormir)',
              '用': 'doublon de 使用 (utiliser)', '起来': 'doublon de 起床 (se lever)', '口': 'doublon de 嘴 (bouche)', '叫作': 'doublon de 叫', '可是': 'doublon de 但是 (mais)', '干': 'doublon de 做 (faire)', '许多': 'doublon de 多 (beaucoup)', '饭馆': 'doublon de 饭店 (restaurant)'}
FIX = {
 '车站': ('arret-station', 'lieux', 'nom', "l'arrêt (de bus), la station:m", 'stop, station', 'la parada', 'la fermata', 'die Haltestelle'),
 '能': ('pouvoir-capacite', 'verbes', 'verbe', 'pouvoir (être capable de)', 'can (be able to)', 'poder (ser capaz)', 'riuscire a', 'können (fähig sein)'),
 '明白': ('saisir', 'verbes', 'verbe', 'saisir, comprendre clairement', 'to get it, to understand', 'entender', 'capire', 'begreifen'),
 '小时': ('heure-duree', 'temps', 'nom', "l'heure (durée):f", 'hour', 'la hora', "l'ora:f", 'die Stunde'),
 '一边': ('tout-en', 'liens', 'mot', 'tout en (faisant)', 'while (doing)', 'mientras', 'mentre', 'während'),
 '平': ('plat-adj', 'adjectifs', 'adj', 'plat', 'flat', 'plano', 'piatto', 'flach'),
 '或者': ('ou-bien', 'liens', 'mot', 'ou (bien)', 'or', 'o', 'o', 'oder'),
 '老': ('vieux-age', 'adjectifs', 'adj', 'vieux, âgé', 'old', 'viejo', 'vecchio', 'alt'),
 '走': ('partir-s-en-aller', 'verbes', 'verbe', "partir, s'en aller", 'to leave, to go', 'irse', 'andare via', 'weggehen'),
}

def read(name):
    out = {}
    for line in open(P / name, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line.strip():
            continue
        p = line.split('|')
        z = p[0]
        if p[1] == '-':
            out[z] = ('DROP', p[2])
        else:
            assert len(p) == 9, line
            out[z] = tuple(p[1:])
    return out

notes = {}
for z, v in L1.items():
    notes[z] = v
for z, r in D1.items():
    notes[z] = ('DROP', r)
for f in 'ABCD':
    for z, v in read(f + '.txt').items():
        assert z not in notes, ('deux fois', z)
        notes[z] = v
for z, r in EXTRA_DROP.items():
    notes[z] = ('DROP', r)
notes.update(FIX)

missing = [z for z in cands if z not in notes]
assert not missing, missing
kept = {z: v for z, v in notes.items() if v[0] != 'DROP'}

base = json.load(open(RV / 'data/notions.json'))
base_ids = {n['id'] for n in base['notions']}
seen = {}; bad = []
for z, v in kept.items():
    i = v[0]
    if i in base_ids or i in seen: bad.append((z, i, seen.get(i)))
    seen[i] = z
assert not bad, bad

themes = {t['id'] for t in base['themes']}
POS = {'nom', 'verbe', 'adj', 'adv', 'pron', 'mot', 'expr', 'num'}
for z, v in kept.items():
    assert v[1] in themes, (z, v[1])
    assert v[2] in POS, (z, v[2])

# Articles et genres
ARTS = {
 'fr': {'le': 'm', 'la': 'f', 'les': None, "l'": None},
 'es': {'el': 'm', 'la': 'f', 'los': 'm', 'las': 'f'},
 'it': {'il': 'm', 'lo': 'm', 'la': 'f', 'i': 'm', 'gli': 'm', 'le': 'f', "l'": None},
 'de': {'der': 'm', 'die': 'f', 'das': 'n'},
}
def entry(lang, s, noun):
    mark = None
    m = re.search(r':([mfn])$', s)
    if m:
        mark, s = m.group(1), s[:m.start()]
    e = {'w': s}
    if noun and lang in ARTS:
        m = re.match(r"^(l'|(\w+) )(.+)$", s)
        if m:
            a = "l'" if m.group(1) == "l'" else m.group(2)
            rest = m.group(3)
            if a in ARTS[lang] and not re.search(r"[,;] *(l'|\b(le|la|les|el|los|las|il|lo|gli|i|der|die|das)\b)", rest):
                g = mark or ARTS[lang][a] or 'm'
                e = {'w': rest, 'art': a, 'g': g}
    return e

new = []
for z, v in kept.items():
    i, th, pos, fr, en, es, it, de = v
    c = cands[z]
    noun = pos == 'nom'
    new.append({'zh': z, 'id': i, 'theme': th, 'pos': pos, 'hsk': c['lv'], 'py': c['py'], 'tw': c['tw'],
                'fr': entry('fr', fr, noun), 'en': {'w': en}, 'es': entry('es', es, noun), 'it': entry('it', it, noun), 'de': entry('de', de, noun)})

# Traductions es/it/de des 246 notions de base
bpos = {n['id']: n['pos'] for n in base['notions']}
bE = {}
for line in open(P / 'E.txt', encoding='utf-8'):
    p = line.rstrip('\n').split('|')
    if len(p) == 4:
        bE[p[0]] = {l: entry(l, s, bpos[p[0]] == 'nom') for l, s in zip(['es', 'it', 'de'], p[1:])}
assert set(bE) == base_ids, (base_ids - set(bE), set(bE) - base_ids)

json.dump({'new': new, 'base': bE}, open(P / 'new.json', 'w'), ensure_ascii=False, indent=0)
drops = {z: v[1] for z, v in notes.items() if v[0] == 'DROP'}
json.dump(drops, open(P / 'drops.json', 'w'), ensure_ascii=False, indent=0)

# Liste de vérification (mots-clés sans article ni précision)
ART = re.compile(r"^(l'|(?:le|la|les|el|los|las|il|lo|gli|i|der|die|das)\s+)", re.I)
def head(s):
    s = re.sub(r'\(.*?\)', '', s)
    s = re.split(r'[;,]', s)[0]
    s = s.replace('…', '').replace('!', '').replace('?', '').replace('¡', '').replace('¿', '').replace('-ci', '').replace('-là', '')
    s = re.sub(r'^to ', '', s.strip())
    s = ART.sub('', s.strip())
    return s.strip(' -')
fr_b = json.load(open(RV / 'data/lang/fr.json'))['entries']
en_b = json.load(open(RV / 'data/lang/en.json'))['entries']
zh_b = json.load(open(RV / 'data/lang/zh.json'))['entries']
V = []
for n in new:
    V.append({'i': n['id'], 'f': [n['zh']] + n['tw'], 'en': head(n['en']['w']), 'fr': head(n['fr']['w']), 'es': head(n['es']['w']), 'it': head(n['it']['w']), 'de': head(n['de']['w'])})
for i, d in bE.items():
    V.append({'i': i, 'f': [zh_b[i]['w']], 'en': head(en_b[i]['w']), 'fr': head(fr_b[i]['w']), 'es': head(d['es']['w']), 'it': head(d['it']['w']), 'de': head(d['de']['w']), 'b': 1})
json.dump(V, open(P / 'verify.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('nouvelles notions', len(new), '| écartés', len(drops), '| base', len(bE), '| total', len(new) + len(bE), '| à vérifier', len(V))
