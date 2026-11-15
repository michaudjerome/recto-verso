// Réviser : on choisit un thème et un niveau, puis les cartes défilent sans fin.
// On retourne la carte, puis « Je savais » ou « À revoir » ; la répétition espacée continue en arrière-plan.
import { base } from '../langs.js';
import { t } from '../i18n.js';
import { grade, Rating } from '../srs.js';
import { getCard } from '../cards.js';
import { frontHTML, backHTML, cardShell } from '../face.js';
import { requireCourse, topBar } from '../play-kit.js';
import { esc, flip, later } from '../ui.js';
import { markActivity } from '../courses.js';
import { filterScreen, myItems, savedFilter, applyFilter } from '../filter.js';
import { cheer, nudge } from '../fx.js';

export async function render(el, params) {
  const course = await requireCourse();
  if (!course) return;
  if (!params.go) return filterScreen(el, course, { title: t('home.review'), startHref: `#/reviser?go=${Date.now()}` });

  const { items } = await myItems(course);
  const picked = applyFilter(items, savedFilter(course));
  if (!picked.length) { location.hash = '#/reviser'; return; }
  const zh = base(course.target) === 'zh';
  const txtOf = new Map(picked.map((i) => [i.card.id, i.txt]));
  // Les plus fragiles d'abord : échéance la plus ancienne en tête (les nouvelles cartes en font partie)
  const order = async () => (await Promise.all(picked.map((i) => getCard(i.card.id)))).filter(Boolean).sort((a, b) => (a.due || 0) - (b.due || 0));
  let queue = await order();
  let cur, stage = 0, busy = false, started = false, lastId = null;

  el.innerHTML = `<div class="page review">${topBar(t('home.review'), '#/reviser')}
    <div class="stage"><div class="stack g2"></div><div class="stack g1"></div></div>
    <div class="rates two"><button class="rate r-again" data-g="${Rating.Again}"><b>${esc(t('rev.again'))}</b></button>
      <button class="rate r-good" data-g="${Rating.Good}"><b>${esc(t('rev.knew'))}</b></button></div></div>`;
  const stageEl = el.querySelector('.stage'), rates = el.querySelector('.rates');

  async function deal() {
    if (!queue.length) { queue = await order(); if (queue.length > 1 && queue[0].id === lastId) queue.push(queue.shift()); } // nouveau tour
    cur = queue.shift();
    lastId = cur.id;
    stage = 0;
    if (!el.querySelector('.rates')) return; // écran quitté
    stageEl.querySelector('.card')?.remove();
    const txt = txtOf.get(cur.id);
    stageEl.insertAdjacentHTML('beforeend', cardShell(frontHTML(txt, course, { hint: t(zh ? 'rev.tapPy' : 'rev.tapFlip') }), backHTML(txt, course), 'enter-card'));
    stageEl.querySelector('.card').onclick = tap;
    rates.classList.remove('show');
  }

  function tap() {
    const c = stageEl.querySelector('.card');
    if (busy || c.classList.contains('flipped')) return;
    if (zh && stage === 0) {
      c.querySelector('.py-line')?.classList.add('show');
      c.querySelector('.hint-line').textContent = t('rev.tapFlip');
      stage = 1; return;
    }
    flip(c, true); stage = 2;
    later(() => rates.classList.add('show'), 280);
  }

  rates.onclick = async (e) => {
    const b = e.target.closest('.rate');
    if (!b || busy || stage < 2) return;
    busy = true;
    const g = +b.dataset.g, c = stageEl.querySelector('.card');
    rates.classList.remove('show');
    if (g === Rating.Good) cheer(c); else nudge(c);
    const updated = await grade(cur, g, 'review');
    if (!started) { started = true; markActivity(course); } // la série compte dès la première carte révisée
    if (g === Rating.Again) queue.splice(Math.min(3, queue.length), 0, updated); // revient trois cartes plus loin
    later(() => c.classList.add(g === Rating.Good ? 'out-2' : 'out-0'), g === Rating.Good ? 120 : 340);
    later(async () => { busy = false; await deal(); }, g === Rating.Good ? 700 : 900);
  };

  await deal();
}
