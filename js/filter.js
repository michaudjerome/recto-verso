// Écran de choix commun à Réviser et aux jeux : un thème et un niveau (« Tous » et « Tous » = aléatoire)
import { base } from './langs.js';
import { t, locale } from './i18n.js';
import { cardsOf } from './cards.js';
import { notions, cardText } from './content.js';
import { hasVisual } from './face.js';
import { topBar, emptyState } from './play-kit.js';
import { esc } from './ui.js';

const RANK = { beginner: 1, A1: 1, A2: 2, B1: 3, B2: 3 };
const tierOf = (n, zh) => (n ? Math.max(1, Math.min(zh ? n.hsk || 3 : RANK[n.cefr] ?? 3, 3)) : 0);
export const tierName = (k, zh) => (zh ? `HSK ${k}` : ['', 'A1', 'A2', 'B1'][k]) + (k === 3 ? '+' : '');

// Les cartes de la personne, avec leur texte, leur thème et leur niveau
export async function myItems(course, { withPicto = false } = {}) {
  const zh = base(course.target) === 'zh';
  const data = await notions();
  const out = [];
  for (const c of await cardsOf(course.id)) {
    const txt = await cardText(c, course);
    if (!txt.front?.w || !txt.back?.w) continue;
    if (withPicto && !hasVisual(txt)) continue;
    const n = c.notion ? data._byId.get(c.notion) : null;
    out.push({ card: c, txt, theme: n ? n.theme : 'mine', tier: tierOf(n, zh) });
  }
  return { items: out, themes: data.themes, zh };
}

const key = (course) => `rv-filter-${course.id}`;
export function savedFilter(course) {
  try { return { theme: 'all', tier: 0, ...JSON.parse(localStorage.getItem(key(course)) || '{}') }; } catch { return { theme: 'all', tier: 0 }; }
}
const save = (course, f) => { try { localStorage.setItem(key(course), JSON.stringify(f)); } catch { /* stockage indisponible */ } };
export const applyFilter = (items, f) => items.filter((i) => (f.theme === 'all' || i.theme === f.theme) && (!f.tier || i.tier === f.tier));

// title, back : barre du haut ; min : cartes nécessaires ; startHref : adresse de la séance
export async function filterScreen(el, course, { title, back = '#/', min = 1, withPicto = false, startHref }) {
  const { items, themes, zh } = await myItems(course, { withPicto });
  if (!items.length) {
    const msg = withPicto ? t('write.noPicto') : t('rev.emptyHint');
    el.innerHTML = `<div class="page">${topBar(title, back)}${emptyState(t('f.none'), msg, `<a class="btn primary" href="#/decouvrir">${esc(t('home.discover'))}</a>`)}</div>`;
    return;
  }
  const lang = base(locale());
  const thName = (id) => (id === 'mine' ? t('f.mine') : themes.find((x) => x.id === id)?.names?.[lang] || themes.find((x) => x.id === id)?.names?.fr || id);
  const present = new Set(items.map((i) => i.theme));
  const thList = [...themes.map((x) => x.id).filter((id) => present.has(id)), ...(present.has('mine') ? ['mine'] : [])];
  const tiers = [1, 2, 3].filter((k) => items.some((i) => i.tier === k));
  let f = savedFilter(course);
  if (f.theme !== 'all' && !present.has(f.theme)) f.theme = 'all';
  if (f.tier && !tiers.includes(f.tier)) f.tier = 0;

  el.innerHTML = `<div class="page filter enter">${topBar(title, back)}
    <div class="set-label">${esc(t('f.level'))}</div><div class="chips tiers"></div>
    <div class="set-label">${esc(t('f.theme'))}</div><div class="chips themes"></div>
    <div class="sticky-act"><p class="hint small need" hidden></p><a class="btn primary go"></a></div></div>`;
  const paint = () => {
    const nT = (k) => applyFilter(items, { theme: f.theme, tier: k }).length;
    const nH = (id) => applyFilter(items, { theme: id, tier: f.tier }).length;
    el.querySelector('.tiers').innerHTML = [0, ...tiers].map((k) => { const n = nT(k); return `<button data-k="${k}" class="chip ${f.tier === k ? 'on' : ''}" ${n ? '' : 'disabled'}>${esc(k ? tierName(k, zh) : t('f.all'))}<small>${n}</small></button>`; }).join('');
    el.querySelector('.themes').innerHTML = ['all', ...thList].map((id) => { const n = nH(id); return `<button data-id="${esc(id)}" class="chip ${f.theme === id ? 'on' : ''}" ${n ? '' : 'disabled'}>${esc(id === 'all' ? t('f.all') : thName(id))}<small>${n}</small></button>`; }).join('');
    const n = applyFilter(items, f).length, go = el.querySelector('.go'), need = el.querySelector('.need');
    go.textContent = t(n === 1 ? 'f.start1' : 'f.start', { n });
    const ok = n >= min;
    go.classList.toggle('off', !ok);
    go.setAttribute('aria-disabled', String(!ok));
    go.href = ok ? startHref : 'javascript:void 0';
    need.hidden = ok;
    need.textContent = t('f.need', { n: min });
    el.querySelectorAll('.tiers .chip').forEach((b) => b.onclick = () => { f.tier = +b.dataset.k; save(course, f); paint(); });
    el.querySelectorAll('.themes .chip').forEach((b) => b.onclick = () => { f.theme = b.dataset.id; save(course, f); paint(); });
  };
  paint();
}

// Une pioche sans fin : on mélange, on épuise, on remélange (sans reprendre tout de suite la dernière carte)
export function endless(list, shuffle) {
  let bag = [], last = null;
  return () => {
    if (!bag.length) { bag = shuffle(list); if (bag.length > 1 && bag[0] === last) bag.push(bag.shift()); }
    last = bag.shift();
    return last;
  };
}
