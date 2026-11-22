// Découvrir : une pile face cachée ; on retourne la carte du dessus, on la garde ou on la passe
import { t } from '../i18n.js';
import { notions, cardText } from '../content.js';
import { cardsOf, addNotion, deleteCard, cardId } from '../cards.js';
import { frontHTML, backHTML } from '../face.js';
import { shuffle, requireCourse, topBar, emptyState } from '../play-kit.js';
import { esc, flip, logo, toast, later } from '../ui.js';
import { locale } from '../i18n.js';
import { base } from '../langs.js';
import { courseLevel, levelOf as lvOf, levelName } from '../levels.js';

const LOT_MAX = 30;
let mode = 'one';
try { mode = localStorage.getItem('rv-disc-mode') || 'one'; } catch { /* stockage indisponible */ }

// Lots par thème, dans le niveau de la plateforme : un petit thème reste entier, un grand est coupé en lots de 30 au plus
function lotsOf(all, themes) {
  const lots = [];
  for (const th of themes) {
    const items = all.filter((p) => p.n.theme === th.id);
    if (!items.length) continue;
    const parts = Math.ceil(items.length / LOT_MAX), size = Math.ceil(items.length / parts);
    for (let i = 0; i < parts; i++) lots.push({ th, label: parts > 1 ? `${i + 1}/${parts}` : '', items: items.slice(i * size, (i + 1) * size) });
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
  // Seulement les mots du niveau de la plateforme : pas de mots basiques quand on est en intermédiaire
  const lvNow = courseLevel(course);
  const data = await notions(), all = [];
  for (const n of data.notions) {
    if (lvOf(n, course.target) !== lvNow) continue;
    const txt = await cardText({ notion: n.id }, course);
    if (txt.front?.w && txt.back?.w) all.push({ n, txt });
  }
  if (mode === 'theme') return renderLots(el, course, lotsOf(all, data.themes), have, [{ label: levelName(lvNow), items: all, level: true }]);
  const order = shuffle(all.filter((p) => !have.has(p.n.id)));

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

// Par thème : un toucher ajoute tout le lot (sauf les mots déjà pris) ; « Retirer » enlève le lot en deux touchers
function renderLots(el, course, lots, have, levels) {
  const lang = base(locale());
  const thName = (th) => th.names?.[lang] || th.names?.fr || th.id;
  const groups = [...levels, ...lots];
  const row = (i) => `<div class="row lot" data-i="${i}"></div>`;
  let html = `<div class="set-label">${esc(t('disc.levelHead'))}</div><div class="list lots levels">${levels.map((_, i) => row(i)).join('')}</div>`;
  let last = null;
  lots.forEach((lot, j) => {
    if (lot.th !== last) { html += `${last ? '</div>' : ''}<div class="set-label">${esc(thName(lot.th))}</div><div class="list lots">`; last = lot.th; }
    html += row(levels.length + j);
  });
  el.innerHTML = `<div class="page lots-page">${topBar(t('disc.title'))}${segHTML()}
    <p class="hint lots-hint">${esc(t('disc.lotHint'))}</p>${html}</div></div>`;
  bindSeg(el);
  const paint = (r) => {
    const lot = groups[+r.dataset.i], k = lot.items.filter((p) => have.has(p.n.id)).length, n = lot.items.length;
    const sample = lot.items.slice(0, 4).map((p) => p.txt.front.w).join(', ');
    const title = lot.level ? t('disc.levelAll', { l: lot.label, n }) : `${t('disc.lotWords', { n })}${lot.label ? ` · ${lot.label}` : ''}`;
    r.classList.toggle('full', k === n);
    r.innerHTML = `<span class="grow"><b>${esc(title)}</b><small>${esc(sample)}${n > 4 ? '…' : ''}</small>
      ${k ? `<small class="have">${esc(t('disc.lotHave', { k, n }))}</small>` : ''}</span>
      <span class="lot-acts">${k < n ? `<button class="mini-btn add">${esc(t('disc.lotAdd', { n: n - k }))}</button>` : `<span class="tag">${esc(t('disc.lotFull'))}</span>`}
      ${k ? `<button class="mini-btn rm">${esc(t('disc.remove'))}</button>` : ''}</span>`;
    r.querySelector('.add')?.addEventListener('click', () => add(r));
    r.querySelector('.rm')?.addEventListener('click', (e) => remove(r, e.currentTarget));
  };
  const repaint = () => { if (el.querySelector('.lots-page')) el.querySelectorAll('.lot').forEach(paint); };
  let busy = false;
  async function add(r) {
    if (busy) return;
    const todo = groups[+r.dataset.i].items.filter((p) => !have.has(p.n.id));
    if (!todo.length) return;
    busy = true;
    r.classList.add('busy');
    try { for (const p of todo) { await addNotion(course, p.n.id, p.n.theme || 'default'); have.add(p.n.id); } }
    finally { busy = false; r.classList.remove('busy'); }
    toast(todo.length === 1 ? t('disc.kept') : t('disc.lotAdded', { n: todo.length }));
    repaint();
  }
  // Retirer efface aussi la progression : premier toucher pour armer, second pour confirmer
  async function remove(r, b) {
    if (busy) return;
    const owned = groups[+r.dataset.i].items.filter((p) => have.has(p.n.id));
    if (!b.classList.contains('armed')) {
      b.classList.add('armed');
      b.textContent = t('disc.removeConfirm', { n: owned.length });
      later(() => { if (b.isConnected) { b.classList.remove('armed'); b.textContent = t('disc.remove'); } }, 4000);
      return;
    }
    busy = true;
    r.classList.add('busy');
    try { for (const p of owned) { await deleteCard(cardId(course.id, p.n.id)); have.delete(p.n.id); } }
    finally { busy = false; r.classList.remove('busy'); }
    toast(t('disc.removed', { n: owned.length }));
    repaint();
  }
  el.querySelectorAll('.lot').forEach(paint);
}
