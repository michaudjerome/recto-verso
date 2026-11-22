// Jouer : Quiz, Memory, Écris ce que tu vois, Duo. Tout se joue en retournant des cartes.
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
import { levelScreen, myItems, atLevel, endless } from '../filter.js';
import { cheer, oops, nudge } from '../fx.js';
import { reportButton } from '../report.js';

export async function render(el, params) {
  const course = await requireCourse();
  if (!course) return;
  const game = params.jeu;
  // Duo pioche dans tous les mots du niveau choisi, découverts ou non
  const G = { quiz: ['play.quiz', 1, false, quiz], memory: ['play.memory', 3, false, memory], ecris: ['play.write', 1, true, write], duo: ['play.duo', DUO_SIZE, false, duo, true] }[game];
  if (G) {
    const [title, min, withPicto, run, all = false] = G;
    const lv = +params.lv;
    if (!lv) return levelScreen(el, course, { title: t(title), back: '#/jouer', min, withPicto, all, href: (l) => `#/jouer?jeu=${game}&lv=${l}` });
    const { items } = await myItems(course, { withPicto, all });
    const picked = atLevel(items, lv);
    if (picked.length < min) { location.hash = `#/jouer?jeu=${game}`; return; }
    markActivity(course);
    return run(el, course, picked, `#/jouer?jeu=${game}`, `#/jouer?jeu=${game}&lv=${lv}&go=${Date.now()}`);
  }
  el.innerHTML = `<div class="page enter">${topBar(t('play.title'))}
    <div class="games">${[['quiz', 'play.quiz', 'play.quizSub', 'review'], ['memory', 'play.memory', 'play.memorySub', 'play'], ['duo', 'play.duo', 'play.duoSub', 'duo'], ['ecris', 'play.write', 'play.writeSub', 'create']]
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
export function judge(answer, e, tag, fromZh = false) {
  const raw = answer.trim();
  if (!raw) return 'ko';
  const zh = base(tag) === 'zh';
  // Le mot, avec ou sans article ; ses autres sens viennent du mot chinois (家 : famille et maison),
  // ils ne sont donc acceptés que si l'on part du chinois
  const words = [e.w, ...(fromZh ? e.alt || [] : [])];
  const exact = words.flatMap((w) => [w, e.art ? `${e.art} ${w}` : '']).filter(Boolean).map((x) => x.toLowerCase());
  if (exact.includes(raw.toLowerCase())) return 'ok';
  if (zh && e.py && raw.replace(/\s+/g, '') === e.py.replace(/\s+/g, '')) return 'ok';
  const targets = [...words.flatMap((w) => [w, e.art ? `${e.art} ${w}` : '']), zh ? e.py : ''].filter(Boolean).map(norm);
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
    for (const w of [txt.front.w, txt.front.py, ...(base(course.native) === 'zh' ? txt.front.alt || [] : [])].filter(Boolean)) {
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
    reportButton(el, course, () => it.txt.notion?.id);
    const card = el.querySelector('.card'), input = card.querySelector('input');
    later(() => input.focus(), 300);
    let done = false, helped = false;
    const go = () => {
      if (done) return;
      done = true;
      let v = judge(input.value, it.txt.front, course.target, base(course.native) === 'zh');
      if (v === 'ok' && helped) v = 'near'; // avec l'indice, c'est « presque »
      let other = null;
      if (v === 'ko') { const o = others.get(norm(input.value)); if (o && o.id !== it.txt.notion?.id) { other = o; v = 'other'; } }
      // Le tampon porte le logo Recto Verso, plus les caractères chinois de l'ancienne app
      const L = { ok: 'write.ok', near: 'write.near', ko: 'write.ko', other: 'write.vOther' }[v];
      card.querySelector('.verdict-box').innerHTML = `<div class="stamp s-${v}">${logo('stamp-logo')}</div><div class="verdict v-${v}">${esc(t(L))}</div>
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

// ---------- Duo : deux colonnes de 5, langue apprise à gauche, langue maternelle à droite ; on relie les paires ----------
// Une paire trouvée laisse sa place à un nouveau mot ; 50 paires pour finir le niveau. Duo ne touche pas à Réviser.
const DUO_SIZE = 5, DUO_GOAL = 50;
const keyOf = (e) => strip(String(e?.w || '')).toLowerCase().trim();
async function duo(el, course, picked, back, replay) {
  const next = endless(picked, shuffle);
  const zh = base(course.target) === 'zh';
  const left = [], right = []; // un mot par case ; null pendant le remplacement
  let found = 0, errors = 0, sel = null, lock = false;
  const t0 = Date.now();
  // Jamais deux mots identiques (ou deux traductions identiques) dans la même grille
  const clash = (it) => [...left, ...right].some((x) => x && (x === it || keyOf(x.txt.front) === keyOf(it.txt.front) || keyOf(x.txt.back) === keyOf(it.txt.back)));
  const draw = () => { for (let k = 0; k < 60; k++) { const it = next(); if (!clash(it)) return it; } return null; };
  for (let k = 0; k < DUO_SIZE; k++) { const it = draw(); if (it) left.push(it); }
  shuffle(left).forEach((it) => right.push(it));
  const cell = (it, side, k) => `<button class="duo-cell ${side}" data-side="${side}" data-k="${k}" data-id="${esc(it?.txt.notion?.id || '')}">${it
    ? side === 'l' ? `${word(it.txt.front, course.target)}${zh ? pinyinHtml(it.txt.front) : ''}` : word(it.txt.back, course.native) : ''}</button>`;
  el.innerHTML = `<div class="page duo-page">${topBar(t('play.duo'), back)}
    <div class="duo-bar"><span class="duo-fill"></span></div><p class="duo-count"></p>
    <div class="duo-grid enter"><div class="duo-col l">${left.map((it, k) => cell(it, 'l', k)).join('')}</div>
      <div class="duo-col r">${right.map((it, k) => cell(it, 'r', k)).join('')}</div></div></div>`;
  const grid = el.querySelector('.duo-grid');
  const paintCount = () => {
    el.querySelector('.duo-fill').style.width = `${(found / DUO_GOAL) * 100}%`;
    el.querySelector('.duo-count').textContent = t('duo.count', { n: found, total: DUO_GOAL });
  };
  paintCount();
  const btn = (side, k) => grid.querySelector(`.duo-cell[data-side="${side}"][data-k="${k}"]`);
  const fill = (side, k, it) => { const b = btn(side, k); b.outerHTML = cell(it, side, k); const nb = btn(side, k); nb.classList.add('arrive'); bind(nb); };
  function bind(b) {
    b.onclick = () => {
      const side = b.dataset.side, k = +b.dataset.k, it = (side === 'l' ? left : right)[k];
      if (lock || !it) return;
      if (!sel || sel.side === side) { // premier mot, ou on change d'avis dans la même colonne
        grid.querySelectorAll('.duo-cell.on').forEach((x) => x.classList.remove('on'));
        if (sel && sel.side === side && sel.k === k) { sel = null; return; }
        sel = { side, k, it };
        b.classList.add('on');
        return;
      }
      const a = btn(sel.side, sel.k), ok = sel.it === it;
      if (ok) {
        const [lk, rk] = side === 'l' ? [k, sel.k] : [sel.k, k];
        left[lk] = right[rk] = null;
        sel = null;
        a.classList.remove('on');
        [a, b].forEach((x) => x.classList.add('gone'));
        cheer(b);
        found++;
        paintCount();
        if (found >= DUO_GOAL) { lock = true; later(finish, 700); return; }
        refill();
      } else {
        errors++;
        lock = true;
        [a, b].forEach((x) => oops(x));
        later(() => { a.classList.remove('on'); sel = null; lock = false; }, 450);
      }
    };
  }
  grid.querySelectorAll('.duo-cell').forEach(bind);
  // Renouvellement par vagues : quand il ne reste qu'une paire, 4 nouvelles arrivent ensemble,
  // mélangées indépendamment dans chaque colonne (impossible de deviner une paire à sa position ou à son arrivée)
  function refill() {
    const onBoard = left.filter(Boolean).length;
    if (onBoard > 1) return;
    const want = Math.min(DUO_SIZE - onBoard, DUO_GOAL - found - onBoard, left.filter((x) => !x).length);
    if (want <= 0) return;
    lock = true;
    later(() => { try {
      const fresh = [];
      for (let k = 0; k < want; k++) { const it = draw(); if (!it) break; fresh.push(it); left[left.indexOf(null)] = it; } // réserve la place pour l'anti-doublon
      fresh.forEach((it) => { left[left.indexOf(it)] = null; });
      const freeL = shuffle(left.map((x, k) => (x ? -1 : k)).filter((k) => k >= 0));
      const freeR = shuffle(right.map((x, k) => (x ? -1 : k)).filter((k) => k >= 0));
      fresh.forEach((it, i) => { left[freeL[i]] = it; right[freeR[i]] = it; });
      fresh.forEach((it, i) => { fill('l', freeL[i], it); fill('r', freeR[i], it); });
    } finally { lock = false; }
      if (!left.some(Boolean)) finish(); // réserve de mots épuisée : on termine proprement
    }, 520);
  }
  function finish() {
    const s = Math.round((Date.now() - t0) / 1000);
    const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    markActivity(course);
    el.innerHTML = `<div class="win enter duo-win">${logo('win-logo')}
      <h2>${esc(t('duo.done'))}</h2>
      <div class="duo-stats"><div><b>${esc(time)}</b><small>${esc(t('duo.time'))}</small></div><div><b>${errors}</b><small>${esc(t(errors === 1 ? 'duo.error1' : 'duo.errors'))}</small></div></div>
      <a class="btn ghost" href="${replay.replace(/go=\d+/, `go=${Date.now()}`)}">${esc(t('win.again'))}</a>
      <a class="btn primary" href="#/jouer">${esc(t('play.title'))}</a></div>`;
    cheer(el.querySelector('.win-logo'));
  }
}
