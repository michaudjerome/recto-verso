"""Phase 3 : index de vérification croisée hors ligne.
Sources : Open Multilingual Wordnet (PWN 3.0 + wordnets fra/ita/spa(MCR)/cmn(COW) + traductions Wiktionnaire),
Wiktionnaire espagnol-anglais (doozan/spanish_data), FreeDict eng-fra, HSK 3.0 (drkameleon, définitions CC-CEDICT),
genres : Lexique 3.83 (fr), Flex It (it), german-nouns (de), Wiktionnaire (es).
Usage : python xref.py <dossier_sources> <sortie.pkl>"""
import collections, json, pickle, re, sys, glob, pathlib
S = pathlib.Path(sys.argv[1]); OUT = sys.argv[2]
POS = {'n': 'n', 'v': 'v', 'a': 'a', 's': 'a', 'r': 'r'}
def norm(w):
    w = w.lower().replace('_', ' ').replace('+的', '').replace('+', '').strip()
    w = re.sub(r"^(to |the |a |an |le |la |les |l'|el |los |las |il |lo |gli |der |die |das )", '', w)
    return w.strip(' .!?¡¿')
syn_en = collections.defaultdict(set)          # synset -> lemmes anglais
en_syn = collections.defaultdict(set)          # lemme anglais -> synsets
def tab(path, lang_key):
    d = collections.defaultdict(set)
    for line in open(path, encoding='utf-8'):
        if line.startswith('#'): continue
        p = line.rstrip('\n').split('\t')
        if len(p) < 3 or not (p[1] == 'lemma' or p[1].endswith(':lemma')): continue
        d[p[0]].add(norm(p[2]))
    return d
for s, ws in tab(S / 'omw/wns/eng/wn-data-eng.tab', 'eng').items():
    syn_en[s] |= ws
    for w in ws: en_syn[w].add(s)
LANGS = {'fr': ['fra/wn-data-fra.tab', 'wikt/wn-wikt-fra.tab'], 'it': ['ita/wn-data-ita.tab', 'wikt/wn-wikt-ita.tab'],
         'es': ['mcr/wn-data-spa.tab', 'wikt/wn-wikt-spa.tab'], 'zh': ['cow/wn-data-cmn.tab', 'wikt/wn-wikt-cmn.tab'],
         'de': ['wikt/wn-wikt-deu.tab']}
syn_l = {}
for l, files in LANGS.items():
    m = collections.defaultdict(set)
    for f in files:
        for s, ws in tab(S / 'omw/wns' / f, l).items(): m[s] |= ws
    syn_l[l] = dict(m)
# OdeNet (wordnet allemand ouvert) relié à PWN 3.0 par l'ILI
ili = dict(l.rstrip('\n').split('\t')[:2] for l in open(S / 'ili30.tab', encoding='utf-8') if '\t' in l)
odn = open(S / 'odenet.xml', encoding='utf-8').read()
syn_ili = {m.group(1): ili.get(m.group(2)) for m in re.finditer(r'<Synset id="([^"]+)" ili="([^"]+)"', odn)}
for e in re.finditer(r'<Lemma writtenForm="([^"]+)".*?</LexicalEntry>', odn, re.S):
    for sid in re.findall(r'synset="([^"]+)"', e.group(0)):
        o = syn_ili.get(sid)
        if o: syn_l['de'].setdefault(o, set()).add(norm(e.group(1)))
# Wiktionnaire espagnol : mot -> mots des gloses anglaises
es_gl = collections.defaultdict(set); cur = None
for line in open(S / 'gen/es-en.data', encoding='utf-8'):
    if line.startswith('_____'): cur = None; continue
    if cur is None and line.strip() and not line.startswith(' '): cur = norm(line); continue
    if line.startswith('  gloss:') and cur: es_gl[cur].add(line[8:].strip().lower())
# FreeDict eng-fra (TEI)
fd = collections.defaultdict(set)
tei = glob.glob(str(S / 'fd/eng-fra/*.tei'))
if tei:
    txt = open(tei[0], encoding='utf-8').read()
    for e in re.findall(r'<entry.*?</entry>', txt, re.S):
        o = re.search(r'<orth>(.*?)</orth>', e)
        if not o: continue
        for q in re.findall(r'<quote>(.*?)</quote>', e): fd[norm(o.group(1))].add(norm(q))
# FreeDict spa-eng : mot espagnol -> traductions anglaises
for f in glob.glob(str(S / 'fdd/spa-eng/*.tei')):
    txt = open(f, encoding='utf-8').read()
    for e in re.findall(r'<entry.*?</entry>', txt, re.S):
        o = re.search(r'<orth>(.*?)</orth>', e)
        if o: es_gl[norm(o.group(1))].update(q.lower() for q in re.findall(r'<quote>(.*?)</quote>', e))
# HSK 3.0
hsk = {}
for e in json.load(open(S / 'hsk/complete.json', encoding='utf-8')):
    lv = [int(x[4:]) for x in e['level'] if x.startswith('new-')]
    if not lv: continue
    f = e['forms'][0]
    hsk.setdefault(e['simplified'], {'lv': min(lv), 'py': f['transcriptions']['pinyin'], 'mean': ' / '.join(m for g in e['forms'] for m in g['meanings']).lower()})
gen = json.load(open(S / 'gen/genders.json', encoding='utf-8'))
pickle.dump({'syn_en': dict(syn_en), 'en_syn': dict(en_syn), 'syn_l': syn_l, 'es_gl': dict(es_gl), 'fd': dict(fd), 'hsk': hsk, 'gen': gen}, open(OUT, 'wb'))
print('synsets', len(syn_en), {l: len(v) for l, v in syn_l.items()}, 'es', len(es_gl), 'fd', len(fd), 'hsk', len(hsk))
