// Premier lancement (et ajout d'une langue) : ta langue, les langues à apprendre, le niveau, le prénom
import { LANGS, lang, flag, endonym, learnable, levelsFor, base, ready, hasContent } from '../langs.js';
import { t, setLocale, langName } from '../i18n.js';
import { profile, saveProfile, prefersReducedMotion } from '../profile.js';
import { addCourse, listCourses, setActive } from '../courses.js';
import { esc, logo, flip, icon } from '../ui.js';

const ASK = ['Quelle est ta langue ?', 'What is your language?', '¿Cuál es tu idioma?', 'Qual è la tua lingua?', 'Qual é a tua língua?', 'Was ist deine Sprache?', '你的母语是什么？'];

export async function render(el, params = {}) {
  const adding = params.mode === 'add';
  const st = { native: profile.native, targets: [], i: 0, levels: {}, variants: {}, name: profile.name || '' };
  let timer;

  const go = (html, cls = '') => {
    clearInterval(timer);
    el.innerHTML = `<div class="ob ${cls}">${html}</div>`;
    el.querySelector('.ob')?.classList.add('enter');
  };

  // 1. Ta langue
  function stepNative() {
    go(`<div class="ob-head">${logo('ob-logo')}<div class="brand">Recto Verso</div>
      <h1 class="ask" aria-live="polite">${ASK[0]}</h1></div>
      <div class="lang-list">${LANGS.map((l) => `<button class="lang-row" data-code="${l.code}">
        ${flag(l.variants ? l.variants[0].tag : l.code)}<span class="ln">${esc(l.name)}${l.sub ? ` <small>${esc(l.sub)}</small>` : ''}</span>${icon('chevron')}</button>`).join('')}</div>`, 'first');
    let k = 0;
    const ask = el.querySelector('.ask');
    timer = setInterval(() => { k = (k + 1) % ASK.length; ask.classList.remove('swap'); void ask.offsetWidth; ask.classList.add('swap'); setTimeout(() => { ask.textContent = ASK[k]; }, 180); }, 2400);
    el.querySelectorAll('.lang-row').forEach((b) => b.onclick = async () => {
      const l = lang(b.dataset.code);
      if (l.variants) return stepVariant(l, async (tag) => { st.native = tag; await setLocale(tag); stepTargets(); }, stepNative);
      st.native = l.code; await setLocale(l.code); stepTargets();
    });
  }

  // Variante (anglais du Royaume-Uni ou des États-Unis, portugais du Portugal ou du Brésil)
  function stepVariant(l, done, back) {
    go(`${backBtn()}<h1>${t('ob.variant')}</h1>
      <div class="lang-list">${l.variants.map((v) => `<button class="lang-row" data-tag="${v.tag}">${flag(v.tag)}<span class="ln">${esc(endonym(v.tag))}</span>${icon('chevron')}</button>`).join('')}</div>`);
    el.querySelector('.back').onclick = back;
    el.querySelectorAll('.lang-row').forEach((b) => b.onclick = () => done(b.dataset.tag));
  }

  // 2. Les langues à apprendre : chaque carte se retourne quand on la choisit
  async function stepTargets() {
    const have = adding ? new Set((await listCourses()).map((c) => base(c.target))) : new Set();
    const list = learnable(st.native).filter((l) => !have.has(l.code));
    const ok = list.filter((l) => ready(st.native, l.code));
    if (!list.length) { go(`${backBtn()}<p class="empty">${t('courses.none')}</p>`); el.querySelector('.back').onclick = () => (location.hash = '#/'); return; }
    // Langue maternelle sans contenu : on le dit tout de suite, sans faire choisir une langue vide
    if (!hasContent(st.native)) {
      go(`${backBtn()}<h1>${t('ob.targets')}</h1><p class="hint">${t('ob.soonNative')}</p>
        <button class="btn primary next">${t('ob.soonPick')}</button>`);
      el.querySelector('.back').onclick = adding ? () => (location.hash = '#/') : stepNative;
      el.querySelector('.next').onclick = adding ? () => (location.hash = '#/reglages') : stepNative;
      return;
    }
    const soon = list.filter((l) => !ok.includes(l));
    const tile = (l) => `${flag(l.variants ? l.variants[0].tag : l.code, 'big')}<b>${esc(langName(l.code))}</b>`;
    go(`${backBtn()}<h1>${t('ob.targets')}</h1><p class="hint">${t('ob.targetsHint')}</p>
      <div class="pick-grid">${ok.map((l) => `<button class="pick flip ${st.targets.includes(l.code) ? 'flipped' : ''}" data-code="${l.code}" aria-pressed="${st.targets.includes(l.code)}">
        <span class="in"><span class="face front">${tile(l)}<small>${esc(l.name)}</small></span>
        <span class="face back">${tile(l)}<span class="tick">${icon('check')}</span></span></span></button>`).join('')}
        ${soon.map((l) => `<div class="pick soon" aria-disabled="true"><span class="face front">${tile(l)}<small class="soon-tag">${esc(t('ob.soon'))}</small></span></div>`).join('')}</div>
      <div class="sticky-act"><button class="btn primary next" ${st.targets.length ? '' : 'disabled'}>${t('ob.next')}</button></div>`);
    el.querySelector('.back').onclick = adding ? () => (location.hash = '#/') : stepNative;
    const next = el.querySelector('.next');
    el.querySelectorAll('.pick').forEach((b) => b.onclick = () => {
      const c = b.dataset.code, on = !st.targets.includes(c);
      st.targets = on ? [...st.targets, c] : st.targets.filter((x) => x !== c);
      b.setAttribute('aria-pressed', on); flip(b, on);
      next.disabled = !st.targets.length;
    });
    next.onclick = () => { st.i = 0; stepLevel(); };
  }

  // 3. Le niveau (et la variante) pour chaque langue choisie
  function stepLevel() {
    const code = st.targets[st.i];
    const l = lang(code);
    const tag = st.variants[code] || (l.variants ? l.variants[0].tag : code);
    st.variants[code] = tag;
    const lv = st.levels[code] || 'beginner';
    const label = (x) => x === 'beginner' ? t('lvl.beginner') : x === 'HSK7' ? t('lvl.HSK7') : x.startsWith('HSK') ? t('lvl.HSK', { n: x.slice(3) }) : t(`lvl.${x}`);
    go(`${backBtn()}<div class="lvl-flag">${flag(tag, 'huge')}</div><h1>${t('ob.level', { lang: langName(code) })}</h1>
      ${l.variants ? `<div class="seg">${l.variants.map((v) => `<button data-tag="${v.tag}" class="${v.tag === tag ? 'on' : ''}">${flag(v.tag)}${esc(v.name)}</button>`).join('')}</div>` : ''}
      <div class="levels">${levelsFor(code).map((x) => `<button class="lvl ${x === lv ? 'on' : ''}" data-l="${x}">${esc(label(x))}</button>`).join('')}</div>
      <div class="sticky-act"><button class="btn primary next">${t('ob.next')}</button></div>`);
    el.querySelector('.back').onclick = () => (st.i ? (st.i--, stepLevel()) : stepTargets());
    el.querySelectorAll('.seg button').forEach((b) => b.onclick = () => { st.variants[code] = b.dataset.tag; stepLevel(); });
    el.querySelectorAll('.lvl').forEach((b) => b.onclick = () => {
      st.levels[code] = b.dataset.l;
      el.querySelectorAll('.lvl').forEach((x) => x.classList.toggle('on', x === b));
    });
    el.querySelector('.next').onclick = () => {
      st.levels[code] ||= 'beginner';
      if (st.i < st.targets.length - 1) { st.i++; stepLevel(); } else if (adding) finish(); else stepName();
    };
  }

  // 4. Le prénom
  function stepName() {
    go(`${backBtn()}<h1>${t('ob.name')}</h1><p class="hint">${t('ob.nameHint')}</p>
      <input class="field" maxlength="30" autocomplete="given-name" placeholder="${esc(t('ob.namePh'))}" value="${esc(st.name)}">
      <button class="btn primary next">${t('ob.next')}</button><button class="btn ghost later">${t('ob.later')}</button>`);
    const input = el.querySelector('.field');
    el.querySelector('.back').onclick = () => { st.i = st.targets.length - 1; stepLevel(); };
    const done = (name) => { st.name = name.trim(); prefersReducedMotion() ? stepAnim() : finish(); };
    el.querySelector('.next').onclick = () => done(input.value);
    el.querySelector('.later').onclick = () => done('');
    input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value); };
  }

  // 5. Animations, seulement si l'appareil demande des animations réduites
  function stepAnim() {
    go(`${backBtn()}<h1 class="small">${t('ob.anim')}</h1>
      <div class="levels">
        <button class="lvl opt" data-a="full"><b>${t('anim.full')}</b><small>${t('anim.fullHint')}</small></button>
        <button class="lvl opt" data-a="calm"><b>${t('anim.calm')}</b><small>${t('anim.calmHint')}</small></button></div>`);
    el.querySelector('.back').onclick = stepName;
    el.querySelectorAll('.opt').forEach((b) => b.onclick = () => finish(b.dataset.a));
  }

  async function finish(anim) {
    if (!adding) await saveProfile({ native: st.native, name: st.name, anim: anim || profile.anim || 'full', created: profile.created || Date.now() });
    let first;
    for (const code of st.targets) {
      const c = await addCourse(st.variants[code] || code, st.levels[code] || 'beginner');
      first ||= c;
    }
    if (first) await setActive(first.id);
    location.hash = '#/';
  }

  const backBtn = () => `<button class="back icon-btn" aria-label="${esc(t('ui.back'))}">${icon('back')}</button>`;

  if (adding) stepTargets(); else stepNative();
  return () => clearInterval(timer);
}

