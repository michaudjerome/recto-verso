// Contenu publié avec l'app : les notions (data/notions.json) et les mots de chaque langue
// (data/lang/<langue>.json). Les cartes ne recopient pas le texte : elles le lisent ici.
import { base } from './langs.js';
import { photoUrl } from './photos.js';

const v = () => (window.APP_STAMP ? `?v=${window.APP_STAMP}` : '');
const cache = new Map();
const json = (path) => {
  if (!cache.has(path)) cache.set(path, fetch(`${path}${v()}`).then((r) => { if (!r.ok) throw new Error(path); return r.json(); }));
  return cache.get(path);
};

// Corrections faites par l'administrateur (page Admin), reçues du serveur et gardées hors ligne.
// edits = { fr: { pomme: { w, note, alt } }, _n: { pomme: { picto } } } ; une entrée vide = retour au contenu publié
let edits = {};
try { edits = JSON.parse(localStorage.getItem('rv-edits') || '{}'); } catch { edits = {}; }
export const editsRev = () => { try { return +localStorage.getItem('rv-edits-rev') || 0; } catch { return 0; } };
export function setEdits(e, rev = 0) {
  edits = e || {};
  try { localStorage.setItem('rv-edits', JSON.stringify(edits)); localStorage.setItem('rv-edits-rev', String(rev)); } catch { /* stockage indisponible : on redemandera */ }
  const d = cache.get('data/notions.json');
  if (d) d.then((x) => { delete x._byId; }).catch(() => {});
  dispatchEvent(new Event('rv-content'));
}
const patch = (obj, e) => (e && Object.keys(e).length ? { ...obj, ...e } : obj);

export async function notions() {
  const d = await json('data/notions.json');
  if (!d._byId) {
    d._orig ||= d.notions;
    d.notions = d._orig.map((n) => patch(n, edits._n?.[n.id]));
    d._byId = new Map(d.notions.map((n) => [n.id, n]));
  }
  return d;
}
export const notion = async (id) => (await notions())._byId.get(id);

// Mot d'une notion dans une langue, variante appliquée (« appartement » → flat / apartment)
export async function entry(id, tag) {
  const d = await json(`data/lang/${base(tag)}.json`).catch(() => ({ entries: {} }));
  const raw = d.entries[id];
  if (!raw) return null;
  const { var: variants, ...rest } = raw;
  const e = patch({ ...rest, ...(variants?.[tag] || {}) }, edits[base(tag)]?.[id]); // la correction de l'admin passe en dernier
  return e.w ? e : null;
}

// Une paire est « vérifiée » si les deux mots ont au moins deux sources concordantes
// (le français historique, sans liste de sources, fait référence). Sinon : « non relue ».
export function reviewedPair(a, b, ea, eb) {
  const ok = (code, e) => (code === 'fr' && !e?.ok) || (e?.ok?.length ?? 0) >= 2;
  const verified = ok(base(a), ea) && ok(base(b), eb);
  return { verified, label: verified ? 'verified' : 'unreviewed' };
}

// Texte d'une carte : contenu publié, puis ce que la personne a modifié elle-même (perso)
export async function cardText(card, course) {
  if (!card.notion) return { notion: null, front: card.perso?.front || {}, back: card.perso?.back || {}, ex: card.perso?.ex, picto: card.perso?.picto, photoUrl: await photoUrl(card.perso?.photo), perso: true, check: { label: 'perso' } };
  const [n, front, back] = await Promise.all([notion(card.notion), entry(card.notion, course.target), entry(card.notion, course.native)]);
  return { notion: n, front: { ...front, ...(card.perso?.front || {}) }, back: { ...back, ...(card.perso?.back || {}) }, check: reviewedPair(course.target, course.native, front, back) };
}

// Pictos des cartes de la personne : téléchargés en arrière-plan pour être disponibles hors ligne
export async function warmPictos(cards) {
  try {
    const d = await notions();
    const ns = cards.map((c) => d._byId.get(c.notion)).filter(Boolean);
    for (const f of new Set(ns.map((n) => (n.img ? `img/${n.img}.webp` : n.picto ? `pictos/${n.picto}.svg` : '')).filter(Boolean))) await fetch(f).catch(() => {});
  } catch {}
}
