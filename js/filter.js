// Écran de choix commun à Réviser et aux jeux : un ou plusieurs thèmes, un ou plusieurs niveaux (« Tous » et « Tous » = aléatoire)
import { base } from './langs.js';
import { t, locale } from './i18n.js';
import { cardsOf } from './cards.js';
import { notions, cardText } from './content.js';
import { hasClearVisual } from './face.js';
import { topBar, emptyState } from './play-kit.js';
import { esc } from './ui.js';

const RANK = { beginner: 1, A1: 1, A2: 2, B1: 3, B2: 3 };
const tierOf = (n, zh) => (n ? Math.max(1, Math.min(zh ? n.hsk || 3 : RANK[n.cefr] ?? 3, 3)) : 0);
export const tierName = (k, zh) => (zh ? `HSK ${k}` : ['', 'A1', 'A2', 'B1'][k]) + (k === 3 ? '+' : '');

// Les cartes de la personne, avec leur texte, leur thème et leur niveau.
// all : tous les mots du contenu, même ceux pas encore dans les cartes (jeu Duo)
export async function myItems(course, { withPicto = false, all = false } = {}) {
  const zh = base(course.target) === 'zh';
  const data = await notions();
  const out = [];
  const src = all ? data.notions.map((n) => ({ card: null, notion: n.id })) : await cardsOf(course.id);
  for (const c of src) {
    const txt = await cardText(c, course);
    if (!txt.front?.w || !txt.back?.w) continue;
    if (withPicto && !hasClearVisual(txt)) continue;
    const id = c.notion;
    const n = id ? data._byId.get(id) : null;
    out.push({ card: c.card === null ? null : c, txt, theme: n ? n.theme : 'mine', tier: tierOf(n, zh) });
  }
  return { items: out, themes: data.themes, zh };
}

const key = (course, k = '') => `rv-filter-${course.id}${k ? `-${k}` : ''}`;
// Choix multiple : listes vides = tous les thèmes, tous les niveaux
export function savedFilter(course, k = '') {
  let f = {};
  try { f = JSON.parse(localStorage.getItem(key(course, k)) || '{}'); } catch { /* stockage indisponible */ }
  const themes = Array.isArray(f.themes) ? f.themes : f.theme && f.theme !== 'all' ? [f.theme] : [];
  const tiers = Array.isArray(f.tiers) ? f.tiers : f.tier ? [f.tier] : [];
  return { themes, tiers };
}
const save = (course, f, k = '') => { try { localStorage.setItem(key(course, k), JSON.stringify(f)); } catch { /* stockage indisponible */ } };
export const applyFilter = (items, f) => items.filter((i) => (!f.themes.length || f.themes.includes(i.theme)) && (!f.tiers.length || f.tiers.includes(i.tier)));

// title, back : barre du haut ; min : cartes nécessaires ; startHref : adresse de la séance
export async function filterScreen(el, course, { title, back = '#/', min = 1, withPicto = false, all = false, fkey = '', startHref }) {
  const { items, themes, zh } = await myItems(course, { withPicto, all });
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
  const f = savedFilter(course, fkey);
  f.themes = f.themes.filter((id) => present.has(id));
  f.tiers = f.tiers.filter((k) => tiers.includes(k));

  el.innerHTML = `<div class="page filter enter">${topBar(title, back)}
    <div class="set-label">${esc(t('f.level'))}</div><div class="chips tiers"></div>
    <div class="set-label">${esc(t('f.theme'))}</div><div class="chips themes"></div>
    <div class="sticky-act"><p class="hint small need" hidden></p><a class="btn primary go"></a></div></div>`;
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const paint = () => {
    const nT = (k) => applyFilter(items, { themes: f.themes, tiers: [k] }).length;
    const nH = (id) => applyFilter(items, { themes: [id], tiers: f.tiers }).length;
    const allT = applyFilter(items, { themes: f.themes, tiers: [] }).length, allH = applyFilter(items, { themes: [], tiers: f.tiers }).length;
    el.querySelector('.tiers').innerHTML = `<button data-k="0" class="chip ${f.tiers.length ? '' : 'on'}">${esc(t('f.all'))}<small>${allT}</small></button>`
      + tiers.map((k) => { const n = nT(k), on = f.tiers.includes(k); return `<button data-k="${k}" class="chip ${on ? 'on' : ''}" ${n || on ? '' : 'disabled'}>${esc(tierName(k, zh))}<small>${n}</small></button>`; }).join('');
    el.querySelector('.themes').innerHTML = `<button data-id="all" class="chip ${f.themes.length ? '' : 'on'}">${esc(t('f.all'))}<small>${allH}</small></button>`
      + thList.map((id) => { const n = nH(id), on = f.themes.includes(id); return `<button data-id="${esc(id)}" class="chip ${on ? 'on' : ''}" ${n || on ? '' : 'disabled'}>${esc(thName(id))}<small>${n}</small></button>`; }).join('');
    const n = applyFilter(items, f).length, go = el.querySelector('.go'), need = el.querySelector('.need');
    go.textContent = t(n === 1 ? 'f.start1' : 'f.start', { n });
    const ok = n >= min;
    go.classList.toggle('off', !ok);
    go.setAttribute('aria-disabled', String(!ok));
    go.href = ok ? startHref : 'javascript:void 0';
    need.hidden = ok;
    need.textContent = t('f.need', { n: min });
    el.querySelectorAll('.tiers .chip').forEach((b) => b.onclick = () => { const k = +b.dataset.k; f.tiers = k ? toggle(f.tiers, k) : []; if (f.tiers.length === tiers.length) f.tiers = []; save(course, f, fkey); paint(); });
    el.querySelectorAll('.themes .chip').forEach((b) => b.onclick = () => { const id = b.dataset.id; f.themes = id === 'all' ? [] : toggle(f.themes, id); if (f.themes.length === thList.length) f.themes = []; save(course, f, fkey); paint(); });
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
