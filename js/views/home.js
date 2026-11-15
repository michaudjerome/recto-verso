// Accueil (esthétique « J'apprends le chinois ») : salutation, parcours, bloc du jour, quatre modes, compteurs
import { flag, base } from '../langs.js';
import { t, langName } from '../i18n.js';
import { profile } from '../profile.js';
import { listCourses, activeCourse, setActive, streakOf } from '../courses.js';
import { greeting } from '../greet.js';
import { esc, logo, icon, flip, sheet, closeSheet } from '../ui.js';
import { cardsOf } from '../cards.js';
import { State } from '../srs.js';
import { pickNotice, noticeHTML, bindNotice } from '../notice.js';

const MODES = [
  ['review', 'reviser'], ['play', 'jouer'], ['discover', 'decouvrir'], ['create', 'creer'],
];

export async function render(el) {
  const course = await activeCourse();
  if (!course) { location.hash = '#/ajouter'; return; }
  const g = greeting(profile.name);
  const streak = streakOf(course);
  const cards = await cardsOf(course.id);
  const mastered = cards.filter((c) => c.fsrs && c.fsrs.state === State.Review && (c.fsrs.scheduled_days || 0) >= 21).length;
  const notice = await pickNotice();
  const zh = base(course.target) === 'zh';

  el.innerHTML = `<div class="home enter">
    <header class="home-top">
      <div class="brandline">${logo('mini-logo')}<span>Recto Verso</span></div>
      <a class="icon-btn" href="#/reglages" aria-label="${esc(t('set.title'))}">${icon('gear')}</a>
    </header>
    <section class="hello"><h1>${esc(g.title)}</h1><p>${esc(g.line)}</p></section>
    <button class="course-pill flip" aria-label="${esc(t('courses.title'))}">
      <span class="in"><span class="face front">${pillInner(course)}</span><span class="face back">${pillInner(course)}</span></span>
    </button>
    <section class="today">
      ${cards.length ? `<div class="l">${esc(t('today.ready'))}</div><a class="btn accent go" href="#/reviser">${esc(t('today.start'))}</a>`
      : `<div class="l done">${esc(t('today.first'))}</div><a class="btn accent go" href="#/decouvrir">${esc(t('today.discover'))}</a>`}
    </section>
    <div class="modes">${MODES.map(([k, route]) => `<button class="mode flip" data-route="${route}" aria-label="${esc(t(`home.${k}`))}">
      <span class="in"><span class="face front">${zh ? `<span class="zh glyph">${GLYPH[k]}</span>` : icon(k)}<b>${esc(t(`home.${k}`))}</b></span>
      <span class="face back">${logo('mode-logo')}</span></span></button>`).join('')}</div>
    <div class="stats"><div><b>${streak}</b>${esc(t('stats.streak'))}</div><div><b>${cards.length}</b>${esc(t('stats.cards'))}</div><div><b>${mastered}</b>${esc(t('stats.mastered'))}</div></div>
    ${noticeHTML(notice)}
  </div>`;

  // La carte du mode se retourne, puis on entre dans le mode
  el.querySelectorAll('.mode').forEach((b) => b.onclick = () => { flip(b, true); setTimeout(() => (location.hash = `#/${b.dataset.route}`), 420); });
  el.querySelector('.course-pill').onclick = () => openCourses(el);
  bindNotice(el);
}

const GLYPH = { review: '复', play: '玩', discover: '探', create: '写' };

const pillInner = (c) => `${flag(c.native)}<span class="arrow">→</span>${flag(c.target)}
  <span class="pill-txt"><small>${esc(t('home.learning'))}</small><b>${esc(cap(langName(c.target)))}</b></span>${icon('chevron')}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function openCourses(el) {
  const list = await listCourses();
  const cur = (await activeCourse())?.id;
  const sh = sheet(`<h2>${esc(t('courses.title'))}</h2>
    <div class="course-list">${list.map((c) => `<button class="course-row ${c.id === cur ? 'on' : ''}" data-id="${esc(c.id)}">
      ${flag(c.target, 'big')}<span><b>${esc(cap(langName(c.target)))}</b><small>${esc(levelLabel(c))}</small></span>${c.id === cur ? icon('check') : ''}</button>`).join('')}</div>
    <a class="btn ghost add" href="#/ajouter">${icon('plus')} ${esc(t('courses.add'))}</a>`);
  sh.querySelector('.add').onclick = closeSheet;
  sh.querySelectorAll('.course-row').forEach((b) => b.onclick = async () => {
    const id = b.dataset.id;
    closeSheet();
    if (id === cur) return;
    await setActive(id);
    // La pastille se retourne pour montrer la nouvelle langue
    const c = list.find((x) => x.id === id);
    const pill = el.querySelector('.course-pill');
    const face = pill.classList.contains('flipped') ? '.front' : '.back';
    pill.querySelector(face).innerHTML = pillInner(c);
    flip(pill);
    setTimeout(() => render(el), 760);
  });
}

function levelLabel(c) {
  const x = c.level;
  if (x === 'beginner') return t('lvl.beginner');
  if (x === 'HSK7') return t('lvl.HSK7');
  if (x.startsWith('HSK')) return t('lvl.HSK', { n: x.slice(3) });
  return t(`lvl.${x}`);
}

