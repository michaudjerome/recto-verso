// Jouer : Quiz, Memory, Écris ce que tu vois. Tout se joue en retournant des cartes.
import { base } from '../langs.js';
import { t } from '../i18n.js';
import { log, Rating } from '../srs.js';
import { word, visual, pinyinHtml, frontHTML, cardShell } from '../face.js';
import { strip } from '../pinyin.js';
import { pool, shuffle, requireCourse, topBar } from '../play-kit.js';
import { esc, icon, flip, logo, later } from '../ui.js';
import { locale } from '../i18n.js';
import { notions as allNotions, cardText } from '../content.js';
import { markActivity } from '../courses.js';
import { filterScreen, myItems, savedFilter, applyFilter, endless } from '../filter.js';
import { cheer, oops, nudge } from '../fx.js';

export async function render(el, params) {
  const course = await requireCourse();
  if (!course) return;
  const game = params.jeu;
  const G = { quiz: ['play.quiz', 1, false, quiz], memory: ['play.memory', 3, false, memory], ecris: ['play.write', 1, true, write] }[game];
  if (G) {
    const [title, min, withPicto, run] = G;
    if (!params.go) return filterScreen(el, course, { title: t(title), back: '#/jouer', min, withPicto, startHref: `#/jouer?jeu=${game}&go=${Date.now()}` });
    const { items } = await myItems(course, { withPicto });
    const picked = applyFilter(items, savedFilter(course));
    if (picked.length < min) { location.hash = `#/jouer?jeu=${game}`; return; }
    markActivity(course);
    return run(el, course, picked, `#/jouer?jeu=${game}`);
  }
  el.innerHTML = `<div class="page enter">${topBar(t('play.title'))}
    <div class="games">${[['quiz', 'play.quiz', 'play.quizSub', 'review'], ['memory', 'play.memory', 'play.memorySub', 'play'], ['ecris', 'play.write', 'play.writeSub', 'create']]
      .map(([k, n, s, ic]) => `<a class="game-row" href="#/jouer?jeu=${k}">${icon(ic)}<span><b>${esc(t(n))}</b><small>${esc(t(s))}</small></span>${icon('chevron')}</a>`).join('')}</div></div>`;
}

const logIt = (i, ok, mode) => i.card && log(i.card, ok ? Rating.Good : Rating.Again, mode);

// ---------- Quiz : un mot au recto, trois traductions ; la carte touchée se retourne sur ✓ ou ✗ ----------
async function quiz(el, course, picked, back) {
  const { mine, extra } = await pool(course);
  const all = [...mine, ...extra];
  const nextQ = endless(picked, shuffle);

  function round() {
    const q = nextQ();
    const wrong = shuffle(all.filter((x) => x.txt.back.w !== q.txt.back.w)).slice(0, 2);
    const opts = shuffle([q, ...wrong]);
    el.innerHTML = `<div class="page quiz">${topBar(t('play.quiz'), back)}
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
      later(() => (ok ? cheer(a) : oops(a)), 300);
      if (!ok) later(() => flip(el.querySelector(`.answer[data-i="${opts.indexOf(q)}"]`), true), 650);
      logIt(q, ok, 'quiz');
      later(round, ok ? 1200 : 2000);
    });
  }
  round();
}

// ---------- Memory : retrouver les paires mot ↔ traduction, cartes faces cachées ----------
async function memory(el, course, picked, back) {
  const nextP = endless(picked, shuffle);
  const size = Math.min(6, picked.length);
  const face = (d) => d.side === 'f'
    ? `${word(d.p.txt.front, course.target)}${base(course.target) === 'zh' ? pinyinHtml(d.p.txt.front) : ''}`
    : `${visual(d.p.txt, 'm-pict')}${word(d.p.txt.back, course.native)}`;

  // Une grille gagnée laisse place à une nouvelle, sans fin
  function grid() {
    const pairs = [];
    while (pairs.length < size) { const p = nextP(); if (!pairs.includes(p)) pairs.push(p); }
    const deck = shuffle(pairs.flatMap((p, i) => [{ i, side: 'f', p }, { i, side: 'b', p }]));
    let found = 0, open = [], lock = false;
    el.innerHTML = `<div class="page memory">${topBar(t('play.memory'), back)}
      <div class="m-grid enter c${deck.length > 8 ? 4 : 3}">${deck.map((d, k) => `<div class="m-card flip" data-k="${k}"><div class="in">
        <div class="face front">${logo('m-logo')}</div><div class="face back ${d.side}">${face(d)}</div></div></div>`).join('')}</div></div>`;
    el.querySelectorAll('.m-card').forEach((c) => c.onclick = () => {
      if (lock || c.classList.contains('flipped')) return;
      flip(c, true);
      open.push(c);
      if (open.length < 2) return;
      lock = true;
      const [a, b] = open.map((x) => deck[+x.dataset.k]);
      const ok = a.i === b.i, pair = open;
      later(() => {
        if (ok) {
          pair.forEach((x) => x.classList.add('matched'));
          cheer(pair[1]);
          found++;
          logIt(a.p, true, 'memory');
          if (found === pairs.length) later(() => { cheer(el.querySelector('.m-grid')); later(grid, 900); }, 500);
          open = []; lock = false;
        } else {
          pair.forEach((x) => oops(x));
          later(() => { pair.forEach((x) => flip(x, false)); open = []; lock = false; }, 650);
        }
      }, ok ? 420 : 500);
    });
  }
  grid();
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

// Les autres mots de l'app, pour reconnaître une réponse juste… mais pas celle attendue (« lapin » au lieu de « rapide »)
async function otherWords(course) {
  const map = new Map();
  for (const n of (await allNotions()).notions) {
    const txt = await cardText({ notion: n.id }, course);
    if (!txt.front?.w) continue;
    for (const w of [txt.front.w, txt.front.py, ...String(txt.front.w).split(/[;,]/)].filter(Boolean)) {
      const k = norm(w.replace(/\(.*?\)/g, ''));
      if (k && !map.has(k)) map.set(k, { id: n.id, txt });
    }
  }
  return map;
}

async function write(el, course, picked, back) {
  const zh = base(course.target) === 'zh';
  const nextI = endless(picked, shuffle);
  const others = await otherWords(course);
  const themes = (await allNotions()).themes, lang = base(locale());
  const clue = (n) => (n ? [t(`pos.${n.pos}`), themes.find((x) => x.id === n.theme)?.names?.[lang]].filter((x) => x && !x.startsWith('pos.')).join(' · ') : '');

  function next() {
    const it = nextI();
    const p = visual(it.txt);
    const line = clue(it.txt.notion);
    el.innerHTML = `<div class="page write">${topBar(t('play.write'), back)}
      <div class="stage tall">${cardShell(`<div class="corner">Recto</div><div class="pict huge">${p}</div>
        ${line ? `<div class="clue">${esc(line)}</div>` : ''}
        <div class="clue-word" hidden>${word(it.txt.back, course.native)}</div>
        <input class="field center" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t(zh ? 'write.phZh' : 'write.ph'))}">
        <div class="duo"><button class="btn ghost hint-b">${esc(t('write.hint'))}</button><button class="btn primary go">${esc(t('write.check'))}</button></div>`, '<div class="corner r">Verso</div><div class="verdict-box"></div>')}</div>
      <button class="btn ghost nextb" hidden>${esc(t('write.next'))}</button></div>`;
    const card = el.querySelector('.card'), input = card.querySelector('input');
    later(() => input.focus(), 300);
    let done = false, helped = false;
    const go = () => {
      if (done) return;
      done = true;
      let v = judge(input.value, it.txt.front, course.target);
      if (v === 'ok' && helped) v = 'near'; // avec l'indice, c'est « presque »
      let other = null;
      if (v === 'ko') { const o = others.get(norm(input.value)); if (o && o.id !== it.txt.notion?.id) { other = o; v = 'other'; } }
      const L = { ok: ['write.ok', '好'], near: ['write.near', '棒'], ko: ['write.ko', '学'], other: ['write.vOther', '换'] }[v];
      card.querySelector('.verdict-box').innerHTML = `<div class="stamp s-${v}">${L[1]}</div><div class="verdict v-${v}">${esc(t(L[0]))}</div>
        ${other ? `<div class="yours">${esc(t('write.other', { w: input.value.trim(), m: other.txt.back?.w || '' }))}</div>` : ''}
        ${word(it.txt.front, course.target, { big: true })}${zh ? `<div>${pinyinHtml(it.txt.front)}</div>` : ''}
        ${!other && v !== 'ok' && input.value.trim() ? `<div class="yours">${esc(t('write.yours', { w: input.value.trim() }))}</div>` : ''}
        <div class="tr small">${word(it.txt.back, course.native)}</div>`;
      input.blur();
      flip(card, true);
      later(() => (v === 'ko' ? oops(card) : v === 'other' ? nudge(card) : cheer(card)), 420);
      logIt(it, v === 'ok' || v === 'near', 'write');
      el.querySelector('.nextb').hidden = false;
    };
    card.querySelector('.hint-b').onclick = (e) => {
      e.stopPropagation();
      helped = true;
      card.querySelector('.clue-word').hidden = false;
      e.currentTarget.disabled = true;
      input.focus();
    };
    card.querySelector('.go').onclick = (e) => { e.stopPropagation(); go(); };
    input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    input.onclick = (e) => e.stopPropagation();
    el.querySelector('.nextb').onclick = next;
  }
  next();
}
