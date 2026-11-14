"""Construit le contenu publié à partir de la saisie (content/author.py) et des paquets de « J'apprends le chinois ».
Produit data/notions.json, data/lang/{fr,zh,en}.json et 04_CONTENU/notions.csv (relecture).
Vérifie : pictos présents dans OpenMoji, anglais confirmé par CC-CEDICT (sinon signalé).
Usage : python content/build_content.py <packs.json> <openmoji.json> <cedict.txt.gz> <dossier_csv>"""
import csv, gzip, json, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from author import T

root = pathlib.Path(__file__).resolve().parent.parent
packs_path, om_path, cedict_path, csv_dir = sys.argv[1:5]
packs = json.load(open(packs_path, encoding='utf-8'))['packs']
om = {e['hexcode'].replace('-FE0F', '') for e in json.load(open(om_path, encoding='utf-8'))}

THEMES = {  # nom du thème dans les 7 langues : fr, en, es, it, pt, de, zh
 'salutations': ['Salutations et politesse', 'Greetings and manners', 'Saludos y cortesía', 'Saluti e cortesia', 'Cumprimentos e cortesia', 'Begrüßung und Höflichkeit', '问候与礼貌'],
 'famille': ['La famille', 'Family', 'La familia', 'La famiglia', 'A família', 'Die Familie', '家庭'],
 'chiffres': ['Les chiffres', 'Numbers', 'Los números', 'I numeri', 'Os números', 'Die Zahlen', '数字'],
 'temps': ['Le temps qui passe', 'Time', 'El tiempo', 'Il tempo', 'O tempo', 'Die Zeit', '时间'],
 'manger': ['Manger et boire', 'Food and drink', 'Comer y beber', 'Mangiare e bere', 'Comer e beber', 'Essen und Trinken', '吃喝'],
 'couleurs': ['Les couleurs', 'Colours', 'Los colores', 'I colori', 'As cores', 'Die Farben', '颜色'],
 'lieux': ['Lieux et déplacements', 'Places and travel', 'Lugares y desplazamientos', 'Luoghi e spostamenti', 'Lugares e deslocações', 'Orte und Wege', '地点与出行'],
 'questions': ['Les gens et les questions', 'People and questions', 'Personas y preguntas', 'Persone e domande', 'Pessoas e perguntas', 'Menschen und Fragen', '人与疑问'],
 'verbes': ['Les verbes du quotidien', 'Everyday verbs', 'Verbos cotidianos', 'Verbi quotidiani', 'Verbos do dia a dia', 'Alltagsverben', '日常动词'],
 'corps': ['Le corps et la santé', 'Body and health', 'El cuerpo y la salud', 'Il corpo e la salute', 'O corpo e a saúde', 'Körper und Gesundheit', '身体与健康'],
 'maison': ['La maison et les objets', 'Home and objects', 'La casa y los objetos', 'La casa e gli oggetti', 'A casa e os objetos', 'Haus und Gegenstände', '家与物品'],
 'vetements': ['Les vêtements', 'Clothes', 'La ropa', 'I vestiti', 'A roupa', 'Die Kleidung', '衣服'],
 'animaux': ['Les animaux', 'Animals', 'Los animales', 'Gli animali', 'Os animais', 'Die Tiere', '动物'],
 'meteo': ['Météo et saisons', 'Weather and seasons', 'El tiempo y las estaciones', 'Meteo e stagioni', 'Tempo e estações', 'Wetter und Jahreszeiten', '天气与季节'],
 'adjectifs': ['Décrire', 'Describing', 'Describir', 'Descrivere', 'Descrever', 'Beschreiben', '描述'],
 'argent': ['Faire des courses', 'Shopping', 'De compras', 'Fare la spesa', 'Fazer compras', 'Einkaufen', '购物'],
 'ecole': ['École et travail', 'School and work', 'Escuela y trabajo', 'Scuola e lavoro', 'Escola e trabalho', 'Schule und Arbeit', '学习与工作'],
 'loisirs': ['Les loisirs', 'Free time', 'El ocio', 'Il tempo libero', 'Os tempos livres', 'Freizeit', '休闲'],
 'liens': ['Petits mots utiles', 'Useful little words', 'Palabras útiles', 'Piccole parole utili', 'Pequenas palavras úteis', 'Nützliche kleine Wörter', '常用小词'],
}
CODES = ['fr', 'en', 'es', 'it', 'pt', 'de', 'zh']

# CC-CEDICT : définitions anglaises par caractères simplifiés
defs = {}
for line in gzip.open(cedict_path, 'rt', encoding='utf-8'):
    if line.startswith('#'): continue
    m = re.match(r'(\S+) (\S+) \[[^\]]*\] /(.*)/', line)
    if m: defs.setdefault(m.group(2), []).append(m.group(3).lower())

def confirmed(hz, en):
    d = ' / '.join(defs.get(hz, []))
    if not d: return False
    parts = [re.sub(r'\(.*?\)', '', p).strip() for p in re.split(r'[;,]', en)]
    for p in parts:
        p = re.sub(r'^to ', '', p.lower()).strip(' ?!')
        if p and (re.search(r'\b' + re.escape(p) + r'\b', d)):
            return True
    return False

# Écarts de forme seulement (orthographe britannique, pluriel, synonyme proche), comparés un à un aux définitions CC-CEDICT
MANUAL = {'妈妈', '米饭', '颜色', '火车站', '飞机', '在', '那儿', '眼睛', '耳朵', '疼', '洗手间', '大衣', '快', '照片', '没有', '一点儿'}

CEFR = {0: 'A1', 1: 'A1', 2: 'A1', 3: 'A2', 4: 'B1', 5: 'B2', 6: 'B2', 7: 'B2'}
notions, themes = [], []
fr, zh, en = {}, {}, {}
rows, unconfirmed, nopicto = [], [], []
for p in packs:
    themes.append({'id': p['id'], 'glyph': p['glyph'], 'names': dict(zip(CODES, THEMES[p['id']]))})
    for w in p['words']:
        hz, py, frs, lvl = w[0], w[1], w[2], w[3] or 1
        nid, art, g, frw, enw, enus, pos, picto = T[hz]
        if picto and picto.replace('-FE0F', '') not in om:
            nopicto.append(f'{hz} {picto}'); picto = ''
        n = {'id': nid, 'theme': p['id'], 'pos': pos, 'hsk': lvl, 'cefr': CEFR.get(lvl, 'B2'), 'sens': frs}
        if picto: n['picto'] = picto
        notions.append(n)
        fe = {'w': frw}
        if art: fe['art'] = art
        if g: fe['g'] = g
        fr[nid] = fe
        zh[nid] = {'w': hz, 'py': py, 'ok': ['cfdict', 'cedict', 'google', 'deepl']}
        ok = confirmed(hz, enw) or hz in MANUAL
        ee = {'w': enw, 'ok': ['claude', 'cedict'] if ok else ['claude']}
        if enus: ee['var'] = {'en-US': {'w': enus}}
        en[nid] = ee
        if not ok: unconfirmed.append(f'{hz} → {enw}  (CC-CEDICT : {" / ".join(defs.get(hz, ["?"]))[:90]})')
        rows.append([nid, p['id'], lvl, n['cefr'], pos, picto, art, g, frw, frs, hz, py, enw, enus, 'oui' if ok else 'à relire'])

data = root / 'data'
(data / 'lang').mkdir(parents=True, exist_ok=True)
json.dump({'v': 2, 'themes': themes, 'notions': notions}, open(data / 'notions.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for code, d in [('fr', fr), ('zh', zh), ('en', en)]:
    json.dump({'lang': code, 'entries': d}, open(data / 'lang' / f'{code}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
pathlib.Path(csv_dir).mkdir(parents=True, exist_ok=True)
with open(pathlib.Path(csv_dir) / 'notions.csv', 'w', newline='', encoding='utf-8-sig') as f:
    wr = csv.writer(f, delimiter=';')
    wr.writerow(['id', 'theme', 'hsk', 'cecrl', 'nature', 'picto', 'article_fr', 'genre_fr', 'mot_fr', 'sens_fr', 'chinois', 'pinyin', 'anglais_GB', 'anglais_US', 'anglais_confirmé_CC-CEDICT'])
    wr.writerows(rows)
print(len(notions), 'notions ·', len(notions) - len(unconfirmed), 'anglais confirmés par CC-CEDICT ·', sum(1 for n in notions if 'picto' in n), 'avec picto')
print('pictos absents d\'OpenMoji :', nopicto)
print('anglais à relire :'); print('\n'.join(unconfirmed))
