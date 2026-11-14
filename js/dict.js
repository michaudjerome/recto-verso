// Recherche de mots pour Créer : les 1 020 notions de l'app (6 langues) et, pour le chinois, un dictionnaire complet
// dict/zh-fr.json (CFDICT, CC BY-SA 3.0) ou dict/zh-en.json (CC-CEDICT, CC BY-SA 4.0), téléchargé à la première recherche.
// Entrée du dictionnaire : [simplifié, traditionnel ou '', pinyin à tons, définitions séparées par '/', niveau HSK (0 = hors liste)]
import { base } from './langs.js';
import { notions, entry } from './content.js';

export const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'u').toLowerCase();
const flat = (s) => strip(s).replace(/[\s'’·\-1-5]/g, '').replace(/v/g, 'u');
export const hasHan = (s) => /\p{Script=Han}/u.test(s);
// Le texte tapé est-il une suite de syllabes pinyin (sans tons) ? « chat » ne l'est pas, « pengyou » oui.
const INI = '(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?';
const FIN = ['iang', 'iong', 'uang', 'ueng', 'ang', 'eng', 'ing', 'ong', 'ian', 'iao', 'uai', 'uan', 'van', 'ai', 'ao', 'an', 'ei', 'en', 'er', 'ia', 'ie', 'in', 'iu', 'ou', 'ua', 'uo', 'ui', 'un', 've', 'ue', 'a', 'o', 'e', 'i', 'u', 'v', 'n', 'ng'];
const SYL = new RegExp(`^${INI}(?:${FIN.join('|')})r?$`);
export function isPinyin(f) {
  const ok = [true];
  for (let i = 1; i <= f.length; i++) { ok[i] = false; for (let j = Math.max(0, i - 6); j < i && !ok[i]; j++) ok[i] = ok[j] && SYL.test(f.slice(j, i)); }
  return f.length > 0 && ok[f.length];
}
const ART = /^(l'|l’|(le|la|les|un|une|des|el|los|las|il|lo|gli|i|der|die|das|ein|eine|the|a|an|to|se|s')\s+)/;
const plain = (s) => strip(s).replace(/\(.*?\)/g, ' ').replace(/[!?¡¿.…,;:]/g, ' ').replace(/\s+/g, ' ').trim().replace(ART, '');

/* ---------- Notions de l'app ---------- */
let idx = null, idxKey = '';
async function notionIndex(course) {
  const key = course.id;
  if (idx && idxKey === key) return idx;
  const d = await notions();
  idx = [];
  for (const n of d.notions) {
    const [tg, nt, zh] = await Promise.all([entry(n.id, course.target), entry(n.id, course.native), entry(n.id, 'zh')]);
    if (!tg || !nt) continue;
    const keys = [...new Set([tg.w, nt.w].flatMap((w) => String(w).split(/[;,]/)).map(plain).filter(Boolean))];
    idx.push({ n, tg, nt, keys, py: zh?.py ? flat(zh.py) : '', hz: zh?.w || '' });
  }
  idxKey = key;
  return idx;
}

export async function searchNotions(q, course, limit = 12) {
  q = q.trim();
  if (!q) return [];
  const list = await notionIndex(course);
  const zh = base(course.target) === 'zh' || base(course.native) === 'zh';
  const pq = plain(q), fq = flat(q), han = hasHan(q);
  const scored = [];
  for (const it of list) {
    let s = 0;
    if (han) {
      if (it.hz === q) s = 100; else if (it.hz.includes(q)) s = 50;
    } else {
      for (const k of it.keys) {
        if (k === pq) s = Math.max(s, 100);
        else if (pq.length >= 3 && k.startsWith(pq)) s = Math.max(s, 60);
        else if (pq.length >= 3 && (` ${k} `).includes(` ${pq}`)) s = Math.max(s, 35);
      }
      if (zh && fq && it.py && isPinyin(fq)) {
        if (it.py === fq) s = Math.max(s, 95);
        else if (fq.length >= 4 && it.py.startsWith(fq)) s = Math.max(s, 55);
      }
    }
    if (s) scored.push([s - (it.n.hsk || 3), it]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, limit).map((x) => x[1]);
}

/* ---------- Dictionnaire chinois ---------- */
let loading = null, E = null, bySimp, byTrad, loadedLang = '';
export const dictLang = (native) => (base(native) === 'fr' ? 'fr' : 'en');

export function loadDict(native) {
  const lang = dictLang(native);
  if (loading && loadedLang === lang) return loading;
  loadedLang = lang; E = null;
  // Sans paramètre de version : le fichier reste en cache hors ligne d'une version de l'app à l'autre
  loading = fetch(`dict/zh-${lang}.json`).then((r) => { if (!r.ok) throw new Error('dict'); return r.json(); }).then((d) => {
    const e = d.e;
    bySimp = new Map(); byTrad = new Map();
    e.forEach((x, i) => {
      x.push(flat(x[2]), strip(x[3]));
      (bySimp.get(x[0]) || bySimp.set(x[0], []).get(x[0])).push(i);
      if (x[1]) (byTrad.get(x[1]) || byTrad.set(x[1], []).get(x[1])).push(i);
    });
    E = e;
    return true;
  }).catch((err) => { loading = null; throw err; });
  return loading;
}
export const dictReady = () => !!E;
const RUDE = /pejor|péjor|injurieu|insult|vulgai|vulgar|derog|offensive|slur|chinetoqu|obscen|argot sexuel/;

// Regroupe les lectures d'un même mot (行 : háng / xíng)
function group(indexes, limit = 20) {
  const out = new Map();
  for (const i of indexes) {
    const e = E[i];
    if (!out.has(e[0])) { if (out.size >= limit) continue; out.set(e[0], { hanzi: e[0], readings: [], level: 0 }); }
    const g = out.get(e[0]);
    const same = g.readings.find((r) => r.pinyin === e[2]);
    if (same) { for (const d of e[3].split('/')) if (!same.defs.includes(d)) same.defs.push(d); }
    else g.readings.push({ pinyin: e[2], defs: e[3].split('/') });
    if (e[4] && (!g.level || e[4] < g.level)) g.level = e[4];
  }
  return [...out.values()];
}

// Caractères, pinyin avec ou sans tons (« ma » donne mā, má, mǎ, mà) ou mot dans la langue des définitions
export function searchDict(q) {
  if (!E) return [];
  q = q.trim();
  if (!q) return [];
  if (hasHan(q)) {
    const exact = [...(bySimp.get(q) || []), ...(byTrad.get(q) || [])];
    const starts = [];
    for (let i = 0; i < E.length && starts.length < 120; i++) if (E[i][0] !== q && E[i][0].startsWith(q)) starts.push(i);
    return group([...exact, ...starts]);
  }
  const sq = plain(q), fq0 = flat(q), fq = isPinyin(fq0) ? fq0 : '';
  const toned = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(q) ? q.replace(/[\s'’]/g, '').toLowerCase() : '';
  const re = new RegExp(`(^|[^a-z])${sq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
  const scored = [];
  for (let i = 0; i < E.length; i++) {
    const e = E[i];
    if (RUDE.test(e[6])) continue; // pas d'insultes ni de termes injurieux dans les suggestions
    let s = 0;
    if (fq && e[5] === fq) s = toned && e[2].replace(/'/g, '') !== toned ? 70 : 100;
    else if (fq.length >= 4 && e[5].startsWith(fq)) s = 25;
    if (sq.length >= 2) {
      const defs = e[6].split('/').map((d) => d.replace(ART, ''));
      if (defs.some((d) => d === sq)) s = Math.max(s, 90);
      else if (defs.some((d) => d.startsWith(sq + ' (') || d.startsWith(sq + ' !'))) s = Math.max(s, 80);
      else if (sq.length >= 3 && re.test(e[6])) s = Math.max(s, 30);
    }
    if (!s) continue;
    s += e[4] ? 20 - e[4] * 2 : -12; // mots HSK d'abord, niveaux bas en tête
    s -= e[0].length;
    scored.push([s, i]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return group(scored.map((x) => x[1]));
}

// Définition courte pour le verso (sans variantes ni renvois)
export const shortDefs = (defs, n = 2) => defs.filter((d) => !/^(\(|variante|cf\.|voir |variant|see )/i.test(d)).slice(0, n).join(', ') || defs[0] || '';
