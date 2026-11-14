// Réglages : prénom, langue, animations, langues apprises, version
import { LANGS, flag, endonym, lang } from '../langs.js';
import { t, setLocale, langName } from '../i18n.js';
import { profile, saveProfile } from '../profile.js';
import { listCourses, removeCourse, addCourse, setActive } from '../courses.js';
import { checkForUpdate } from '../update.js';
import { exportBackup, importBackup } from '../backup.js';
import { APP_VERSION } from '../version.js';
import { esc, icon, toast, sheet, closeSheet } from '../ui.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export async function render(el) {
  const courses = await listCourses();
  el.innerHTML = `<div class="page enter">
    <div class="top"><a class="icon-btn" href="#/" aria-label="${esc(t('ui.back'))}">${icon('back')}</a><span class="ttl">${esc(t('set.title'))}</span><span style="width:40px"></span></div>

    <label class="set-label" for="nm">${esc(t('set.name'))}</label>
    <input id="nm" class="field" maxlength="30" value="${esc(profile.name)}" placeholder="${esc(t('ob.namePh'))}">

    <div class="set-label">${esc(t('set.native'))}</div>
    <button class="set-row native">${flag(profile.native)}<span>${esc(endonym(profile.native))}</span>${icon('chevron')}</button>
    <p class="hint small">${esc(t('set.nativeHint'))}</p>

    <div class="set-label">${esc(t('set.theme'))}</div>
    <div class="seg wide theme">${['auto', 'light', 'dark'].map((x) => `<button data-t="${x}" class="${(profile.theme || 'auto') === x ? 'on' : ''}">${esc(t(`theme.${x}`))}</button>`).join('')}</div>

    <div class="set-label">${esc(t('set.anim'))}</div>
    <div class="seg wide anim">
      <button data-a="full" class="${profile.anim !== 'calm' ? 'on' : ''}">${esc(t('anim.full'))}</button>
      <button data-a="calm" class="${profile.anim === 'calm' ? 'on' : ''}">${esc(t('anim.calm'))}</button>
    </div>

    <div class="set-label">${esc(t('courses.title'))}</div>
    <div class="course-list">${courses.map((c) => `<div class="course-row static">${flag(c.target, 'big')}<span><b>${esc(cap(langName(c.target)))}</b></span>
      <button class="mini-btn rm" data-id="${esc(c.id)}">${esc(t('courses.remove'))}</button></div>`).join('')}</div>
    <a class="btn ghost" href="#/ajouter">${icon('plus')} ${esc(t('courses.add'))}</a>

    <div class="set-label">${esc(t('backup.title'))}</div>
    <p class="hint small">${esc(t('backup.hint'))}</p>
    <div class="duo"><button class="btn ghost exp">${esc(t('backup.export'))}</button>
      <label class="btn ghost imp">${esc(t('backup.import'))}<input type="file" accept="application/json,.json" hidden></label></div>

    <div class="set-label">${esc(t('set.version'))}</div>
    <div class="set-row static"><span>Recto Verso ${APP_VERSION}</span><button class="mini-btn upd">${esc(t('set.update'))}</button></div>
    <a class="set-row" href="#/sources"><span>${esc(t('set.sources'))}</span>${icon('chevron')}</a>
  </div>`;

  const nm = el.querySelector('#nm');
  nm.onchange = async () => { await saveProfile({ name: nm.value.trim() }); toast(t('set.saved')); };

  el.querySelectorAll('.seg.anim button').forEach((b) => b.onclick = async () => {
    await saveProfile({ anim: b.dataset.a });
    el.querySelectorAll('.seg.anim button').forEach((x) => x.classList.toggle('on', x === b));
  });
  el.querySelectorAll('.seg.theme button').forEach((b) => b.onclick = async () => {
    await saveProfile({ theme: b.dataset.t });
    el.querySelectorAll('.seg.theme button').forEach((x) => x.classList.toggle('on', x === b));
  });

  // Retirer une langue : deux touchers, sans fenêtre de confirmation
  el.querySelectorAll('.rm').forEach((b) => b.onclick = async () => {
    if (!b.classList.contains('armed')) { b.classList.add('armed'); toast(t('courses.confirm')); setTimeout(() => b.classList.remove('armed'), 4000); return; }
    await removeCourse(b.dataset.id);
    if (!(await listCourses()).length) { location.hash = '#/ajouter'; return; }
    render(el);
  });

  el.querySelector('.upd').onclick = async () => {
    const r = await checkForUpdate().catch(() => 'off');
    toast(r === 'updating' ? t('set.updating') : t('set.upToDate'));
  };

  el.querySelector('.native').onclick = () => pickNative(el);

  el.querySelector('.exp').onclick = async () => { await exportBackup(); toast(t('backup.exported')); };
  const inp = el.querySelector('.imp input');
  inp.onchange = async () => {
    const f = inp.files?.[0];
    if (!f) return;
    try { const n = await importBackup(f); toast(t('backup.done', { n })); render(el); }
    catch { toast(t('backup.bad')); }
    inp.value = '';
  };
}

// Changer de langue maternelle : l'interface bascule ; les parcours de l'ancienne langue sont gardés de côté
function pickNative(el) {
  const rows = LANGS.flatMap((l) => (l.variants ? l.variants.map((v) => v.tag) : [l.code]));
  const sh = sheet(`<h2>${esc(t('set.native'))}</h2><div class="course-list">${rows.map((tag) => `<button class="course-row ${tag === profile.native ? 'on' : ''}" data-tag="${tag}">${flag(tag, 'big')}<span><b>${esc(endonym(tag))}</b></span>${tag === profile.native ? icon('check') : ''}</button>`).join('')}</div>`);
  sh.querySelectorAll('.course-row').forEach((b) => b.onclick = async () => {
    const tag = b.dataset.tag;
    closeSheet();
    if (tag === profile.native) return;
    const old = await listCourses();
    await saveProfile({ native: tag, activeCourse: '' });
    await setLocale(tag);
    // Reprend les mêmes langues apprises depuis la nouvelle langue maternelle (sauf la langue elle-même)
    for (const c of old) if (lang(c.target).code !== lang(tag).code) await addCourse(c.target, c.level);
    const list = await listCourses();
    if (list[0]) await setActive(list[0].id);
    render(el);
  });
}
