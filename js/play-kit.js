// Outils partagés par les modes : réserve de mots, mélange, écran de victoire
import { cardsOf } from './cards.js';
import { notions, cardText } from './content.js';
import { activeCourse, markActivity } from './courses.js';
import { picto, word } from './face.js';
import { t } from './i18n.js';
import { esc, icon, later } from './ui.js';

export const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Mots jouables : d'abord ceux de la personne, puis le reste du contenu pour compléter
export async function pool(course, { withPicto = false } = {}) {
  const cards = await cardsOf(course.id);
  const mine = [], extra = [];
  for (const c of cards) {
    const txt = await cardText(c, course);
    if (txt.front?.w && txt.back?.w) mine.push({ card: c, txt });
  }
  const have = new Set(cards.map((c) => c.notion));
  for (const n of (await notions()).notions) {
    if (have.has(n.id)) continue;
    const txt = await cardText({ notion: n.id }, course);
    if (txt.front?.w && txt.back?.w) extra.push({ card: null, txt });
  }
  const keep = (i) => !withPicto || !!(i.txt.picto || i.txt.notion?.picto);
  return { mine: shuffle(mine.filter(keep)), extra: shuffle(extra.filter(keep)) };
}

export async function requireCourse() {
  const c = await activeCourse();
  if (!c) { location.hash = '#/'; return null; }
  return c;
}

export const topBar = (title, back = '#/') => `<div class="top"><a class="icon-btn" href="${back}" aria-label="${esc(t('ui.back'))}">${icon('back')}</a><span class="ttl">${esc(title)}</span><span style="width:40px"></span></div>`;

export const emptyState = (title, hint, cta = '') => `<div class="empty-state enter"><div class="empty-card flip"><div class="in"><div class="face front"><span>🌱</span></div></div></div>
  <p class="empty-title">${esc(title)}</p>${hint ? `<p class="hint">${esc(hint)}</p>` : ''}${cta}</div>`;

// Victoire : les cartes de la séance se retournent en cascade, puis le sceau se pose
export async function victory(el, course, items, { sub = '', againHref = '' } = {}) {
  await markActivity(course);
  const tiles = items.slice(0, 5);
  el.innerHTML = `<div class="win enter">
    <div class="win-grid">${tiles.map((i) => `<div class="tile flip"><div class="in"><div class="face front"></div>
      <div class="face back">${picto(i.txt.picto || i.txt.notion?.picto) || word(i.txt.front, course.target)}</div></div></div>`).join('')}
      <div class="tile flip seal-tile"><div class="in"><div class="face front"></div><div class="face back">${icon('check')}</div></div></div></div>
    <h2>${esc(t('win.title'))}</h2><p class="hint">${esc(sub)}</p>
    ${againHref ? `<a class="btn ghost" href="${againHref}">${esc(t('win.again'))}</a>` : ''}
    <a class="btn primary" href="#/">${esc(t('win.home'))}</a></div>`;
  el.querySelectorAll('.tile').forEach((n, k) => later(() => n.classList.add('flipping', 'flipped'), 250 + k * 150));
}
