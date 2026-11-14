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

export async function notions() {
  const d = await json('data/notions.json');
  if (!d._byId) d._byId = new Map(d.notions.map((n) => [n.id, n]));
  return d;
}
export const notion = async (id) => (await notions())._byId.get(id);

// Mot d'une notion dans une langue, variante appliquée (« appartement » → flat / apartment)
export async function entry(id, tag) {
  const d = await json(`data/lang/${base(tag)}.json`).catch(() => ({ entries: {} }));
  const e = d.entries[id];
  if (!e) return null;
  const { var: variants, ...rest } = e;
  return { ...rest, ...(variants?.[tag] || {}) };
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
    const codes = new Set(cards.map((c) => d._byId.get(c.notion)?.picto).filter(Boolean));
    for (const code of codes) await fetch(`pictos/${code}.svg`).catch(() => {});
  } catch {}
}
