// Jouer : Quiz, Memory, Écris ce que tu vois. Tout se joue en retournant des cartes.
import { base } from '../langs.js';
import { t } from '../i18n.js';
import { log, Rating } from '../srs.js';
import { word, visual, pinyinHtml, frontHTML, cardShell } from '../face.js';
import { strip } from '../pinyin.js';
import { pool, shuffle, requireCourse, topBar, emptyState, victory } from '../play-kit.js';
import { esc, icon, flip, logo, later } from '../ui.js';

export async function render(el, params) {
  const course = await requireCourse();
  if (!course) return;
  const game = params.jeu;
  if (game === 'quiz') return quiz(el, course);
  if (game === 'memory') return memory(el, course);
  if (game === 'ecris') return write(el, course);
  el.innerHTML = `<div class="page enter">${topBar(t('play.title'))}
    <div class="games">${[['quiz', 'play.quiz', 'play.quizSub', 'review'], ['memory', 'play.memory', 'play.memorySub', 'play'], ['ecris', 'play.write', 'play.writeSub', 'create']]
      .map(([k, n, s, ic]) => `<a class="game-row" href="#/jouer?jeu=${k}">${icon(ic)}<span><b>${esc(t(n))}</b><small>${esc(t(s))}</small></span>${icon('chevron')}</a>`).join('')}</div></div>`;
}

const notEnough = (el, n, title) => { el.innerHTML = `<div class="page">${topBar(title, '#/jouer')}${emptyState(t('play.notEnough', { n }), '', `<a class="btn primary" href="#/decouvrir">${esc(t('home.discover'))}</a>`)}</div>`; };
const logIt = (i, ok, mode) => i.card && log(i.card, ok ? Rating.Good : Rating.Again, mode);

// ---------- Quiz : un mot au recto, trois traductions ; la carte touchée se retourne sur ✓ ou ✗ ----------
async function quiz(el, course) {
  const { mine, extra } = await pool(course);
  const all = [...mine, ...extra];
  if (all.length < 3) return notEnough(el, 3, t('play.quiz'));
  const rounds = (mine.length >= 3 ? mine : all).slice(0, 10);
  let k = 0, good = 0;
  const done = [];

  function round() {
    const q = rounds[k];
    if (!q) return victory(el, course, done, { sub: t('quiz.score', { n: good, t: rounds.length }), againHref: '#/jouer?jeu=quiz&r=' + Date.now() });
    const wrong = shuffle(all.filter((x) => x !== q && x.txt.back.w !== q.txt.back.w)).slice(0, 2);
    const opts = shuffle([q, ...wrong]);
    el.innerHTML = `<div class="page quiz">${topBar(t('play.quiz'), '#/jouer')}
      <div class="meta"><span>${k + 1} / ${rounds.length}</span></div><div class="bar"><i style="width:${(k / rounds.length) * 100}%"></i></div>
      <div class="q-card enter">${frontHTML(q.txt, course, { showPy: false })}</div>
      <p class="hint center">${esc(t('quiz.pick'))}</p>
      <div class="answers">${opts.map((o, i) => `<div class="answer flip" data-i="${i}"><div class="in">
        <div class="face front">${word(o.txt.back, course.native)}</div>
        <div class="face back ${o === q ? 'ok' : 'ko'}">${icon(o === q ? 'check' : 'close')}${word(o.txt.back, course.native)}</div></div></div>`).join('')}</div></div>`;
    let answered = false;
    el.querySelectorAll('.answer').forEach((a) => a.onclick = () => {
      if (answered) return;
      answered = true;
      const o = opts[+a.dataset.i], ok = o === q;
      flip(a, true);
      if (ok) good++;
      else later(() => flip(el.querySelector(`.answer[data-i="${opts.indexOf(q)}"]`), true), 450);
      logIt(q, ok, 'quiz');
      if (ok) done.push(q);
      later(() => { k++; round(); }, ok ? 1100 : 1800);
    });
  }
  round();
}

// ---------- Memory : retrouver les paires mot ↔ traduction, cartes faces cachées ----------
async function memory(el, course) {
  const { mine, extra } = await pool(course);
  const all = [...mine, ...extra];
  if (all.length < 3) return notEnough(el, 3, t('play.memory'));
  const pairs = all.slice(0, 6);
  const deck = shuffle(pairs.flatMap((p, i) => [{ i, side: 'f', p }, { i, side: 'b', p }]));
  let moves = 0, found = 0, open = [], lock = false;
  const face = (d) => d.side === 'f'
    ? `${word(d.p.txt.front, course.target)}${base(course.target) === 'zh' ? pinyinHtml(d.p.txt.front) : ''}`
    : `${visual(d.p.txt, 'm-pict')}${word(d.p.txt.back, course.native)}`;

  el.innerHTML = `<div class="page memory">${topBar(t('play.memory'), '#/jouer')}
    <div class="meta"><span class="mv">${esc(t('memory.moves', { n: 0 }))}</span><span class="pf">${esc(t('memory.pairs', { n: 0 }))}</span></div>
    <div class="m-grid c${deck.length > 8 ? 4 : 3}">${deck.map((d, k) => `<div class="m-card flip" data-k="${k}"><div class="in">
      <div class="face front">${logo('m-logo')}</div><div class="face back ${d.side}">${face(d)}</div></div></div>`).join('')}</div></div>`;

  el.querySelectorAll('.m-card').forEach((c) => c.onclick = () => {
    if (lock || c.classList.contains('flipped')) return;
    flip(c, true);
    open.push(c);
    if (open.length < 2) return;
    moves++; lock = true;
    const [a, b] = open.map((x) => deck[+x.dataset.k]);
    const ok = a.i === b.i;
    el.querySelector('.mv').textContent = t('memory.moves', { n: moves });
    later(() => {
      if (ok) {
        open.forEach((x) => x.classList.add('matched'));
        found++;
        logIt(a.p, true, 'memory');
        el.querySelector('.pf').textContent = t('memory.pairs', { n: found });
        if (found === pairs.length) later(() => victory(el, course, pairs, { sub: t('memory.moves', { n: moves }), againHref: '#/jouer?jeu=memory&r=' + Date.now() }), 700);
      } else open.forEach((x) => flip(x, false));
      open = []; lock = false;
    }, ok ? 450 : 1000);
  });
}

// ---------- Écris ce que tu vois : une image au recto, on écrit le mot, la carte se retourne ----------
const norm = (s) => strip(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
function lev(a, b) {
  const m = [...Array(b.length + 1).keys()];
  for (let x = 1; x <= a.length; x++) { let p = m[0]; m[0] = x; for (let y = 1; y <= b.length; y++) { const tmp = m[y]; m[y] = Math.min(m[y] + 1, m[y - 1] + 1, p + (a[x - 1] === b[y - 1] ? 0 : 1)); p = tmp; } }
  return m[b.length];
}
// ok : juste ; near : accent, ton ou une lettre près ; ko : à revoir
export function judge(answer, e, tag) {
  const raw = answer.trim();
  if (!raw) return 'ko';
  const zh = base(tag) === 'zh';
  const exact = [e.w, e.art ? `${e.art} ${e.w}` : ''].filter(Boolean).map((x) => x.toLowerCase());
  if (exact.includes(raw.toLowerCase())) return 'ok';
  if (zh && e.py && raw.replace(/\s+/g, '') === e.py.replace(/\s+/g, '')) return 'ok';
  const targets = [e.w, e.art ? `${e.art} ${e.w}` : '', zh ? e.py : ''].filter(Boolean).map(norm);
  const u = norm(raw);
  if (targets.includes(u)) return zh ? 'ok' : 'near'; // en chinois, le pinyin sans les tons est accepté
  return targets.some((x) => x.length > 3 && lev(u, x) <= 1) ? 'near' : 'ko';
}

async function write(el, course) {
  const { mine, extra } = await pool(course, { withPicto: true });
  const items = [...mine, ...extra].slice(0, 10);
  if (!items.length) { el.innerHTML = `<div class="page">${topBar(t('play.write'), '#/jouer')}${emptyState(t('write.noPicto'), '', `<a class="btn primary" href="#/decouvrir">${esc(t('home.discover'))}</a>`)}</div>`; return; }
  const zh = base(course.target) === 'zh';
  let k = 0;
  const done = [];

  function next() {
    const it = items[k];
    if (!it) return victory(el, course, done, { sub: t('win.cards', { n: done.length }), againHref: '#/jouer?jeu=ecris&r=' + Date.now() });
    const p = visual(it.txt);
    el.innerHTML = `<div class="page write">${topBar(t('play.write'), '#/jouer')}
      <div class="meta"><span>${k + 1} / ${items.length}</span></div><div class="bar"><i style="width:${(k / items.length) * 100}%"></i></div>
      <div class="stage tall">${cardShell(`<div class="corner">Recto</div><div class="pict huge">${p}</div>
        <input class="field center" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t(zh ? 'write.phZh' : 'write.ph'))}">
        <button class="btn primary go">${esc(t('write.check'))}</button>`, '<div class="corner r">Verso</div><div class="verdict-box"></div>')}</div>
      <button class="btn ghost nextb" hidden>${esc(t('write.next'))}</button></div>`;
    const card = el.querySelector('.card'), input = card.querySelector('input');
    later(() => input.focus(), 300);
    const go = () => {
      const v = judge(input.value, it.txt.front, course.target);
      const L = { ok: ['write.ok', '好'], near: ['write.near', '棒'], ko: ['write.ko', '学'] }[v];
      card.querySelector('.verdict-box').innerHTML = `<div class="stamp s-${v}">${L[1]}</div><div class="verdict v-${v}">${esc(t(L[0]))}</div>
        ${word(it.txt.front, course.target, { big: true })}${zh ? `<div>${pinyinHtml(it.txt.front)}</div>` : ''}
        ${v !== 'ok' && input.value.trim() ? `<div class="yours">${esc(t('write.yours', { w: input.value.trim() }))}</div>` : ''}
        <div class="tr small">${word(it.txt.back, course.native)}</div>`;
      input.blur();
      flip(card, true);
      logIt(it, v !== 'ko', 'write');
      if (v !== 'ko') done.push(it);
      el.querySelector('.nextb').hidden = false;
    };
    card.querySelector('.go').onclick = (e) => { e.stopPropagation(); go(); };
    input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    input.onclick = (e) => e.stopPropagation();
    el.querySelector('.nextb').onclick = () => { k++; next(); };
  }
  next();
}
