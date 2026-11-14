// Découvrir : une pile face cachée ; on retourne la carte du dessus, on la garde ou on la passe
import { t } from '../i18n.js';
import { notions, cardText } from '../content.js';
import { cardsOf, addNotion } from '../cards.js';
import { frontHTML, backHTML } from '../face.js';
import { shuffle, requireCourse, topBar, emptyState } from '../play-kit.js';
import { esc, flip, logo, toast, later } from '../ui.js';
import { locale } from '../i18n.js';
import { base } from '../langs.js';

const RANK = { beginner: 0, A1: 1, A2: 2, B1: 3, B2: 4 };
const levelOf = (n, course) => (course.target.startsWith('zh') ? `HSK${n.hsk || 9}` : n.cefr || 'B2');
const LOT_MAX = 30, LOT_MIN = 8;
let mode = 'one';
try { mode = localStorage.getItem('rv-disc-mode') || 'one'; } catch { /* stockage indisponible */ }

// Lots par thème : un petit thème reste entier ; un grand est coupé par niveau (1, 2, 3 et plus), puis en lots de 30 au plus
function lotsOf(all, themes, zh) {
  const tier = (n) => Math.min(zh ? n.hsk || 3 : RANK[n.cefr] ?? 3, 3) || 1;
  const name = (k, merged) => (zh ? `HSK ${k}` : ['', 'A1', 'A2', 'B1'][k]) + (k === 3 || merged ? '+' : '');
  const lots = [];
  for (const th of themes) {
    const items = all.filter((p) => p.n.theme === th.id);
    if (!items.length) continue;
    if (items.length <= LOT_MAX) { lots.push({ th, label: '', items }); continue; }
    let groups = [1, 2, 3].map((k) => ({ k, merged: false, items: items.filter((p) => tier(p.n) === k) })).filter((g) => g.items.length);
    // Un niveau trop petit rejoint le niveau d'avant
    for (let i = groups.length - 1; i > 0; i--) if (groups[i].items.length < LOT_MIN) { groups[i - 1].items.push(...groups[i].items); groups[i - 1].merged = true; groups.splice(i, 1); }
    for (const g of groups) {
      const parts = Math.ceil(g.items.length / LOT_MAX), size = Math.ceil(g.items.length / parts);
      for (let i = 0; i < parts; i++) lots.push({ th, label: name(g.k, g.merged) + (parts > 1 ? ` · ${i + 1}/${parts}` : ''), items: g.items.slice(i * size, (i + 1) * size) });
    }
  }
  return lots;
}
const segHTML = () => `<div class="seg wide disc-mode">${['one', 'theme'].map((m) => `<button data-m="${m}" class="${mode === m ? 'on' : ''}">${esc(t(m === 'one' ? 'disc.oneByOne' : 'disc.byTheme'))}</button>`).join('')}</div>`;
function bindSeg(el) {
  el.querySelectorAll('.disc-mode button').forEach((b) => b.onclick = () => {
    if (b.dataset.m === mode) return;
    mode = b.dataset.m;
    try { localStorage.setItem('rv-disc-mode', mode); } catch { /* stockage indisponible */ }
    render(el);
  });
}

export async function render(el) {
  const course = await requireCourse();
  if (!course) return;
  const have = new Set((await cardsOf(course.id)).map((c) => c.notion));
  const zh = course.target.startsWith('zh');
  const rank = (lv) => (zh ? +String(lv).replace(/\D/g, '') || 0 : RANK[lv] ?? 9);
  const data = await notions(), all = [];
  for (const n of data.notions) {
    const txt = await cardText({ notion: n.id }, course);
    if (txt.front?.w && txt.back?.w) all.push({ n, txt, r: rank(levelOf(n, course)) });
  }
  if (mode === 'theme') return renderLots(el, course, lotsOf(all, data.themes, zh), have);
  const pile = all.filter((p) => !have.has(p.n.id));
  // Les mots du niveau choisi et des niveaux en dessous d'abord, dans un ordre varié
  const mine = rank(course.level === 'beginner' ? (zh ? 'HSK1' : 'A1') : course.level);
  const order = [...shuffle(pile.filter((p) => p.r <= mine)), ...shuffle(pile.filter((p) => p.r > mine)).sort((a, b) => a.r - b.r)];

  if (!order.length) {
    el.innerHTML = `<div class="page">${topBar(t('disc.title'))}${segHTML()}${emptyState(t('disc.empty'), t('disc.emptyHint'), `<a class="btn primary" href="#/reviser">${esc(t('home.review'))}</a>`)}</div>`;
    bindSeg(el);
    return;
  }

  el.innerHTML = `<div class="page discover">${topBar(t('disc.title'))}${segHTML()}
    <div class="meta"><span class="left"></span></div>
    <div class="stage"><div class="stack g2"></div><div class="stack g1"></div></div>
    <div class="duo"><button class="btn ghost skip" disabled>${esc(t('disc.skip'))}</button><button class="btn primary keep" disabled>${esc(t('disc.keep'))}</button></div></div>`;
  bindSeg(el);
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

// Par thème : un toucher ajoute tout le lot (sauf les mots déjà pris) ; Réviser en présente quelques-uns par jour
function renderLots(el, course, lots, have) {
  const lang = base(locale());
  const thName = (th) => th.names?.[lang] || th.names?.fr || th.id;
  let html = '', last = null;
  lots.forEach((lot, i) => {
    if (lot.th !== last) { html += `${last ? '</div>' : ''}<div class="set-label">${esc(thName(lot.th))}</div><div class="list lots">`; last = lot.th; }
    html += `<button class="row lot" data-i="${i}"></button>`;
  });
  el.innerHTML = `<div class="page lots-page">${topBar(t('disc.title'))}${segHTML()}
    <p class="hint lots-hint">${esc(t('disc.lotHint', { n: course.newPerDay ?? 10 }))}</p>${html}</div></div>`;
  bindSeg(el);
  const paint = (b) => {
    const lot = lots[+b.dataset.i], k = lot.items.filter((p) => have.has(p.n.id)).length, n = lot.items.length;
    const sample = lot.items.slice(0, 4).map((p) => p.txt.front.w).join(', ');
    b.disabled = k === n;
    b.innerHTML = `<span class="grow"><b>${esc(lot.label || t('disc.lotWords', { n }))}</b><small>${esc(sample)}${n > 4 ? '…' : ''}</small>
      ${k ? `<small class="have">${esc(t('disc.lotHave', { k, n }))}</small>` : ''}</span>
      <span class="tag">${esc(k === n ? t('disc.lotFull') : t('disc.lotAdd', { n: n - k }))}</span>`;
  };
  el.querySelectorAll('.lot').forEach((b) => {
    paint(b);
    b.onclick = async () => {
      const lot = lots[+b.dataset.i], todo = lot.items.filter((p) => !have.has(p.n.id));
      if (!todo.length) return;
      b.disabled = true;
      for (const p of todo) { await addNotion(course, p.n.id, p.n.theme || 'default'); have.add(p.n.id); }
      toast(todo.length === 1 ? t('disc.kept') : t('disc.lotAdded', { n: todo.length }));
      if (!el.querySelector('.lots-page')) return;
      el.querySelectorAll('.lot').forEach(paint); // un même mot ne figure que dans un lot, mais on repeint tout par sécurité
    };
  });
}
