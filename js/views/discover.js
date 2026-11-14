// Découvrir : une pile face cachée ; on retourne la carte du dessus, on la garde ou on la passe
import { t } from '../i18n.js';
import { notions, cardText } from '../content.js';
import { cardsOf, addNotion } from '../cards.js';
import { frontHTML, backHTML } from '../face.js';
import { shuffle, requireCourse, topBar, emptyState } from '../play-kit.js';
import { esc, flip, logo, toast, later } from '../ui.js';

const RANK = { beginner: 0, A1: 1, A2: 2, B1: 3, B2: 4 };
const levelOf = (n, course) => (course.target.startsWith('zh') ? `HSK${n.hsk || 9}` : n.cefr || 'B2');

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const have = new Set((await cardsOf(course.id)).map((c) => c.notion));
  const zh = course.target.startsWith('zh');
  const rank = (lv) => (zh ? +String(lv).replace(/\D/g, '') || 0 : RANK[lv] ?? 9);
  const pile = [];
  for (const n of (await notions()).notions) {
    if (have.has(n.id)) continue;
    const txt = await cardText({ notion: n.id }, course);
    if (txt.front?.w && txt.back?.w) pile.push({ n, txt, r: rank(levelOf(n, course)) });
  }
  // Les mots du niveau choisi et des niveaux en dessous d'abord, dans un ordre varié
  const mine = rank(course.level === 'beginner' ? (zh ? 'HSK1' : 'A1') : course.level);
  const order = [...shuffle(pile.filter((p) => p.r <= mine)), ...shuffle(pile.filter((p) => p.r > mine)).sort((a, b) => a.r - b.r)];

  if (!order.length) {
    el.innerHTML = `<div class="page">${topBar(t('disc.title'))}${emptyState(t('disc.empty'), t('disc.emptyHint'), `<a class="btn primary" href="#/reviser">${esc(t('home.review'))}</a>`)}</div>`;
    return;
  }

  el.innerHTML = `<div class="page discover">${topBar(t('disc.title'))}
    <div class="meta"><span class="left"></span></div>
    <div class="stage"><div class="stack g2"></div><div class="stack g1"></div></div>
    <div class="duo"><button class="btn ghost skip" disabled>${esc(t('disc.skip'))}</button><button class="btn primary keep" disabled>${esc(t('disc.keep'))}</button></div></div>`;
  const stage = el.querySelector('.stage'), keep = el.querySelector('.keep'), skip = el.querySelector('.skip');
  let cur;

  // La carte arrive face cachée (dos au logo) : on la retourne pour découvrir le mot et sa traduction
  function deal() {
    if (!el.querySelector('.left')) return; // on a quitté l'écran pendant l'animation
    cur = order.shift();
    el.querySelector('.left').textContent = `${order.length + (cur ? 1 : 0)}`;
    stage.querySelector('.card')?.remove();
    keep.disabled = skip.disabled = true;
    if (!cur) { render(el); return; }
    stage.insertAdjacentHTML('beforeend', `<div class="card flip enter-card"><div class="in">
      <div class="face front cover">${logo('cover-logo')}<div class="hint-line">${esc(t('disc.tap'))}</div></div>
      <div class="face back"><div class="disc-front">${frontHTML(cur.txt, course, { showPy: true })}</div>${backHTML(cur.txt, course)}</div></div></div>`);
    const c = stage.querySelector('.card');
    c.onclick = () => { if (!c.classList.contains('flipped')) { flip(c, true); keep.disabled = skip.disabled = false; } };
  }
  keep.onclick = async () => {
    await addNotion(course, cur.n.id, cur.n.theme || 'default');
    toast(t('disc.kept'));
    stage.querySelector('.card').classList.add('out-2');
    later(deal, 450);
  };
  skip.onclick = () => {
    stage.querySelector('.card').classList.add('out-1');
    order.push(cur); // reviendra plus tard
    later(deal, 450);
  };
  deal();
}
