"""Phase 3 : lit les lots, vérifie chaque mot par croisement et calcule les niveaux. Rapport dans check_report.tsv."""
import sys, glob, re, json, collections
sys.path.insert(0, '.')
from verify import verify, cefr, hsk, X
from xref_norm import norm
LANGS = ['fr', 'es', 'it', 'de', 'zh']
def parse(line):
    t = [x.strip() for x in line.split('|')]
    out = []
    for x in t:
        if x in ('m', 'f', 'n') and out: out[-1] += '|' + x
        else: out.append(x)
    return out
def bare(w):
    w = w.split('|')[0]
    return re.sub(r"^(le |la |les |l'|el |los |las |il |lo |gli |i |le |der |die |das )", '', w)
def gender(l, w):
    g = w.split('|')[1] if '|' in w else None
    a = w.split(' ')[0] if ' ' in w else ''
    if not g:
        g = {'le': 'm', 'la': 'f', 'el': 'm', 'il': 'm', 'lo': 'm', 'der': 'm', 'die': 'f', 'das': 'n', 'los': 'm', 'las': 'f', 'i': 'm', 'gli': 'm'}.get(a)
        if l == 'fr' and a == 'les': g = None
        if l == 'it' and a == 'le': g = 'f'
        if l == 'de' and a == 'die' and bare(w).endswith(('en', 'n')) and False: g = None
    return g
def load(files):
    rows = []
    for f in files:
        for line in open(f, encoding='utf-8'):
            if not line.strip() or line.startswith('#'): continue
            p = parse(line.rstrip('\n'))
            if len(p) != 8: print('FORMAT', f, line.strip()); continue
            en, pos, th, fr, es, it, de, zh = p
            rows.append({'en': en, 'pos': pos, 'theme': th, 'fr': fr, 'es': es, 'it': it, 'de': de, 'zh': zh, 'file': f})
    return rows
if __name__ == '__main__':
    rows = load(sys.argv[1:])
    G = X['gen']; stat = collections.Counter(); out = []
    for r in rows:
        n = {'en': r['en'], 'pos': r['pos'], **{l: (bare(r[l]) if r['pos'] == 'nom' else r[l]) for l in LANGS}}
        v = verify(n); c = cefr(n); h = hsk(r['zh'])
        gerr = []
        if r['pos'] == 'nom':
            for l in ['fr', 'es', 'it', 'de']:
                g = gender(l, r[l]); w = bare(r[l]); known = G[l].get(w) or G[l].get(w.lower())
                if g and known and g not in known: gerr.append(f'{l}:{g}≠{known}')
        miss = [l for l in LANGS if not v[l]]
        stat['rows'] += 1; stat['cefr_' + str(c)] += 1; stat['hsk_' + str(h)] += 1
        for l in miss: stat['miss_' + l] += 1
        if gerr: stat['gender_err'] += 1
        out.append('\t'.join([r['en'], r['pos'], str(c), str(h), ','.join(miss), ' '.join(gerr), r['zh'], r['fr']]))
    open('check_report.tsv', 'w').write('\n'.join(out))
    print(dict(sorted(stat.items())))
