// Réviser : le mot au recto, on retourne la carte, on note sa réponse ; la note décide où la carte s'en va
import { base } from '../langs.js';
import { t } from '../i18n.js';
import { cardsOf } from '../cards.js';
import { cardText } from '../content.js';
import { todayQueue, grade, preview, human, GRADES, Rating } from '../srs.js';
import { frontHTML, backHTML, cardShell } from '../face.js';
import { requireCourse, topBar, emptyState, victory } from '../play-kit.js';
import { esc, flip, later } from '../ui.js';

const OUT = { [Rating.Again]: 'out-0', [Rating.Hard]: 'out-1', [Rating.Good]: 'out-2', [Rating.Easy]: 'out-3' };

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const queue = await todayQueue(await cardsOf(course.id), course);
  if (!queue.length) {
    el.innerHTML = `<div class="page">${topBar(t('home.review'))}${emptyState(t('rev.empty'), t('rev.emptyHint'), `<a class="btn primary" href="#/decouvrir">${esc(t('home.discover'))}</a>`)}</div>`;
    return;
  }
  const total = queue.length;
  const done = [];
  let cur, txt, stage = 0, busy = false;
  const zh = base(course.target) === 'zh';

  el.innerHTML = `<div class="page review">${topBar(t('home.review'))}
    <div class="meta"><span class="cnt"></span></div><div class="bar"><i></i></div>
    <div class="stage"><div class="stack g2"></div><div class="stack g1"></div></div>
    <div class="rates">${GRADES.map(([g, k]) => `<button class="rate r-${k}" data-g="${g}"><b>${esc(t(`grade.${k}`))}</b><small></small></button>`).join('')}</div></div>`;
  const stageEl = el.querySelector('.stage'), rates = el.querySelector('.rates');

  async function deal() {
    cur = queue.shift();
    if (!cur) return victory(el, course, done, { sub: t('win.cards', { n: done.length }) });
    txt = await cardText(cur, course);
    stage = 0;
    el.querySelector('.cnt').textContent = `${Math.min(done.length + 1, total)} / ${total}`;
    el.querySelector('.bar i').style.width = `${(done.length / total) * 100}%`;
    stageEl.querySelector('.card')?.remove();
    stageEl.insertAdjacentHTML('beforeend', cardShell(frontHTML(txt, course, { hint: t(zh ? 'rev.tapPy' : 'rev.tapFlip') }), backHTML(txt, course), 'enter-card'));
    const c = stageEl.querySelector('.card');
    c.onclick = tap;
    rates.classList.remove('show');
    const pv = preview(cur);
    rates.querySelectorAll('.rate').forEach((b) => { b.querySelector('small').textContent = human(pv[b.dataset.g]); });
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
    const g = +b.dataset.g;
    rates.classList.remove('show');
    stageEl.querySelector('.card').classList.add(OUT[g]);
    const updated = await grade(cur, g, 'review');
    if (g === Rating.Again) queue.push(updated); // revient plus tard dans la séance
    else done.push({ card: updated, txt });
    later(async () => { busy = false; await deal(); }, g === Rating.Easy ? 820 : 600);
  };

  await deal();
}
