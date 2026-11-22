"""Un mot par traduction : nettoie data/lang/{fr,en,es,it,de}.json (0.12.0).
Hérité de la première app chinoise, beaucoup d'entrées portaient plusieurs sens (« famille ; maison », « je, moi »)
ou une précision entre parenthèses (« bonjour (le matin) »). Après passage :
  w    = un seul mot ou une seule expression
  note = la précision utile (affichée en petit sous le mot)
  alt  = les autres sens (acceptés comme réponses, montrés en « aussi » quand on apprend le chinois)
Idempotent : une entrée déjà propre n'est pas modifiée. Un rapport est écrit dans tools/clean_words_report.csv.
Usage : python tools/clean_words.py (depuis 03_APP)"""
import csv, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
LANGS = ['fr', 'en', 'es', 'it', 'de']
PAREN = re.compile(r'\s*[(（]([^)）]*)[)）]\s*')


def split_entry(w):
    """Renvoie (mot, note, alts)."""
    w = w.strip()
    parts = [p.strip() for p in w.split(';') if p.strip()]
    head, alts = parts[0], parts[1:]
    notes = [m.strip() for m in PAREN.findall(head) if m.strip()]
    head = PAREN.sub(' ', head).strip()
    # Une phrase entière (« los, weiter so! », « Entschuldigung, darf ich fragen… ») garde sa virgule
    if ',' in head and not re.search(r'[!…]$', head):
        bits = [b.strip() for b in re.split(r'(?<=\?)\s*,\s*|,\s*', head) if b.strip()]
        head, alts = bits[0], bits[1:] + alts
    head = re.sub(r'\s+', ' ', head).strip(' ,')
    return head, ' ; '.join(notes), [a for a in alts if a and a != head]


def clean(e):
    if 'note' in e or 'alt' in e:
        return e, False
    w, note, alts = split_entry(e['w'])
    if w == e['w'] and not note and not alts:
        return e, False
    out = {**e, 'w': w}
    if note:
        out['note'] = note
    if alts:
        out['alt'] = alts
    if 'var' in e:
        out['var'] = {tag: {**v, 'w': split_entry(v['w'])[0]} if 'w' in v else v for tag, v in e['var'].items()}
    return out, True


report = []
for lang in LANGS:
    p = root / 'data' / 'lang' / f'{lang}.json'
    data = json.loads(p.read_text(encoding='utf-8'))
    E = data['entries']
    before = {k: v['w'] for k, v in E.items()}
    changed = 0
    for k, e in list(E.items()):
        E[k], ch = clean(e)
        changed += ch
    # Deux notions qui finissent avec le même mot : la précision les distingue (sinon le premier autre sens)
    seen = {}
    for k, e in E.items():
        seen.setdefault((e.get('art', ''), e['w'].lower()), []).append(k)
    clashes = 0
    for key, ks in seen.items():
        if len(ks) < 2:
            continue
        clashes += 1
        bare = [k for k in ks if not E[k].get('note')]
        if len(bare) > 1:  # une seule entrée sans précision suffit à les distinguer
            for k in bare[1:] if not E[bare[0]].get('alt') else bare:
                if E[k].get('alt'):
                    E[k]['note'] = E[k]['alt'][0]
    for k, e in E.items():
        if before[k] != e['w'] or e.get('note') or e.get('alt'):
            report.append([lang, k, before[k], e['w'], e.get('note', ''), ' | '.join(e.get('alt', [])),
                           'doublon' if len(seen[(e.get('art', ''), e['w'].lower())]) > 1 else ''])
    p.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{lang} : {changed} entrées nettoyées, {clashes} mots partagés par plusieurs notions')

with open(root / 'tools' / 'clean_words_report.csv', 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['langue', 'notion', 'avant', 'mot', 'précision', 'autres sens', 'doublon'])
    w.writerows(report)
print(len(report), 'lignes dans tools/clean_words_report.csv')
