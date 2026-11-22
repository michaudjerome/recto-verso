// Réglages : prénom, langue, animations, langues apprises, version
import { LANGS, flag, endonym, lang, hasContent, ready } from '../langs.js';
import { t, setLocale, langName } from '../i18n.js';
import { profile, saveProfile } from '../profile.js';
import { listCourses, removeCourse, addCourse, setActive, activeCourse } from '../courses.js';
import { put } from '../db.js';
import { checkForUpdate } from '../update.js';
import { exportBackup, importBackup, lastBackup } from '../backup.js';
import { isInstalled, install } from '../notice.js';
import { APP_VERSION } from '../version.js';
import { esc, icon, toast, sheet, closeSheet } from '../ui.js';
import { api } from '../api.js';
import { currentAccount, syncNow, syncState, pendingCount, signOut } from '../sync.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export async function render(el) {
  const courses = await listCourses();
  const cur = await activeCourse();
  const lb = await lastBackup();
  const when = lb ? new Intl.DateTimeFormat(profile.native, { day: 'numeric', month: 'long', year: 'numeric' }).format(lb) : '';
  el.innerHTML = `<div class="page enter">
    <div class="top"><a class="icon-btn" href="#/" aria-label="${esc(t('ui.back'))}">${icon('back')}</a><span class="ttl">${esc(t('set.title'))}</span><span style="width:40px"></span></div>

    ${accountBlock()}

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
    <p class="hint small last-bk">${esc(lb ? t('bk.last', { d: when }) : t('bk.never'))}</p>
${isInstalled() ? '' : `
    <div class="set-label">${esc(t('inst.title'))}</div>
    <button class="set-row inst">${icon('plus')}<span>${esc(t('set.install'))}</span>${icon('chevron')}</button>
`}
    <div class="set-label">${esc(t('set.version'))}</div>
    <div class="set-row static"><span class="nowrap">Recto Verso ${APP_VERSION}</span><button class="mini-btn upd">${esc(t('set.update'))}</button></div>
    <a class="set-row" href="#/sources"><span>${esc(t('set.sources'))}</span>${icon('chevron')}</a>
  </div>`;

  bindAccount(el);

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

  el.querySelector('.exp').onclick = async () => { await exportBackup(); toast(t('backup.exported')); render(el); };
  el.querySelector('.inst')?.addEventListener('click', () => install());
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
  const sh = sheet(`<h2>${esc(t('set.native'))}</h2><div class="course-list">${rows.map((tag) => `<button class="course-row ${tag === profile.native ? 'on' : ''}" data-tag="${tag}" ${hasContent(tag) ? '' : 'disabled'}>${flag(tag, 'big')}<span><b>${esc(endonym(tag))}</b>${hasContent(tag) ? '' : `<small>${esc(t('ob.soon'))}</small>`}</span>${tag === profile.native ? icon('check') : ''}</button>`).join('')}</div>`);
  sh.querySelectorAll('.course-row').forEach((b) => b.onclick = async () => {
    const tag = b.dataset.tag;
    closeSheet();
    if (tag === profile.native) return;
    const old = await listCourses();
    await saveProfile({ native: tag, activeCourse: '' });
    await setLocale(tag);
    // Reprend les mêmes langues apprises depuis la nouvelle langue maternelle (sauf la langue elle-même)
    for (const c of old) if (lang(c.target).code !== lang(tag).code && ready(tag, c.target)) await addCourse(c.target, c.level);
    const list = await listCourses();
    if (list[0]) await setActive(list[0].id);
    render(el);
  });
}

// ---------- Compte ----------
function syncLine() {
  const st = syncState.state;
  if (st === 'syncing') return t('acc.st.syncing');
  if (st === 'offline') return t('acc.st.offline');
  if (st === 'error') return t('acc.st.error');
  if (pendingCount()) return t('acc.st.pending', { n: pendingCount() });
  if (!syncState.last) return t('acc.st.never');
  const min = Math.round((Date.now() - syncState.last) / 60000);
  if (min < 1) return t('acc.st.now');
  const rtf = new Intl.RelativeTimeFormat(profile.native || 'fr', { numeric: 'auto' });
  const d = min < 60 ? rtf.format(-min, 'minute') : min < 2880 ? rtf.format(-Math.round(min / 60), 'hour') : rtf.format(-Math.round(min / 1440), 'day');
  return t('acc.st.ago', { d });
}

function accountBlock() {
  const a = currentAccount();
  if (!a) return '';
  return `<div class="set-label">${esc(t('acc.title'))}</div>
    <div class="acc-card">
      <div class="acc-mail">${icon('check')}<span><b>${esc(a.email)}</b><small class="sync-line">${esc(syncLine())}</small></span></div>
      <div class="duo"><button class="btn ghost sync-now">${esc(t('acc.syncNow'))}</button><button class="btn ghost logout">${esc(t('acc.logout'))}</button></div>
      ${a.admin ? `<div class="duo"><a class="btn accent" href="#/admin">${icon('shield')} Admin</a><button class="btn ghost invite">${icon('plus')} ${esc(t('acc.inviteBtn'))}</button></div>` : ''}
      <div class="acc-links"><button class="link-btn chpw">${esc(t('acc.changePw'))}</button><button class="link-btn delacc">${esc(t('acc.delete'))}</button></div>
    </div>
    <p class="hint small">${esc(t('acc.syncHint'))}</p>`;
}

function bindAccount(el) {
  const line = el.querySelector('.sync-line');
  if (!line) return;
  const refresh = () => { if (line.isConnected) line.textContent = syncLine(); else removeEventListener('rv-sync-state', refresh); };
  addEventListener('rv-sync-state', refresh);
  el.querySelector('.sync-now').onclick = async () => { await syncNow(); refresh(); toast(syncState.state === 'idle' ? t('acc.st.now') : syncLine()); };
  const out = el.querySelector('.logout');
  out.onclick = async () => {
    if (!out.classList.contains('armed')) {
      await syncNow();
      out.classList.add('armed');
      toast(pendingCount() ? t('acc.logoutPending', { n: pendingCount() }) : t('acc.logoutConfirm'));
      setTimeout(() => out.classList.remove('armed'), 5000);
      return;
    }
    await signOut();
    location.hash = '#/compte';
    location.reload();
  };
  el.querySelector('.invite')?.addEventListener('click', () => inviteSheet());
  el.querySelector('.chpw').onclick = () => passwordSheet();
  el.querySelector('.delacc').onclick = () => deleteSheet();
}

const errText = (code) => (t(`acc.err.${code}`) === `acc.err.${code}` ? t('acc.err.server') : t(`acc.err.${code}`));

function passwordSheet() {
  const sh = sheet(`<h2>${esc(t('acc.changePw'))}</h2>
    <form class="acc-form" novalidate>
      <label class="set-label" for="op">${esc(t('acc.oldPassword'))}</label><input id="op" class="field" type="password" autocomplete="current-password">
      <label class="set-label" for="np">${esc(t('acc.newPassword'))}</label><input id="np" class="field" type="password" autocomplete="new-password" minlength="8">
      <p class="hint small">${esc(t('acc.pwHint'))}</p><p class="acc-err" hidden></p>
      <button class="btn primary">${esc(t('acc.save'))}</button></form>`);
  const f = sh.querySelector('form'), err = sh.querySelector('.acc-err');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const np = sh.querySelector('#np').value;
    if (np.length < 8) { err.textContent = errText('password_short'); err.hidden = false; return; }
    try { await api('password', { old: sh.querySelector('#op').value, new: np }); closeSheet(); toast(t('set.saved')); }
    catch (ex) { err.textContent = errText(ex.code); err.hidden = false; }
  };
}

function deleteSheet() {
  const sh = sheet(`<h2>${esc(t('acc.delete'))}</h2><p class="hint">${esc(t('acc.deleteHint'))}</p>
    <form class="acc-form" novalidate>
      <label class="set-label" for="dp">${esc(t('acc.password'))}</label><input id="dp" class="field" type="password" autocomplete="current-password">
      <p class="acc-err" hidden></p>
      <button class="btn primary danger">${esc(t('acc.deleteGo'))}</button></form>`);
  const f = sh.querySelector('form'), err = sh.querySelector('.acc-err');
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('delete', { password: sh.querySelector('#dp').value }); await signOut({ remote: false }); location.hash = '#/compte'; location.reload(); }
    catch (ex) { err.textContent = errText(ex.code); err.hidden = false; }
  };
}

async function inviteSheet() {
  const sh = sheet(`<h2>${esc(t('acc.inviteTitle'))}</h2><p class="hint">${esc(t('acc.inviteHint'))}</p>
    <form class="acc-form inv-new" novalidate>
      <label class="set-label" for="ivn">${esc(t('acc.inviteNote'))}</label><input id="ivn" class="field" maxlength="60" placeholder="${esc(t('acc.inviteNotePh'))}">
      <button class="btn primary">${esc(t('acc.inviteCreate'))}</button></form>
    <div class="inv-out" hidden></div><div class="inv-list"><p class="hint small">…</p></div>`);
  const list = sh.querySelector('.inv-list');
  const fmt = (ms) => new Intl.DateTimeFormat(profile.native || 'fr', { day: 'numeric', month: 'short' }).format(ms);
  const load = async () => {
    try {
      const r = await api('invites', {});
      const open = r.invites.filter((i) => !i.used_at && i.expires > Date.now());
      list.innerHTML = `${open.length ? `<div class="set-label">${esc(t('acc.inviteOpen'))}</div>${open.map((i) => `<div class="inv-row"><span><b>${esc(i.note || i.code)}</b><small>${esc(t('acc.inviteUntil', { d: fmt(i.expires) }))}</small></span>
          <button class="mini-btn cp" data-url="${esc(`${r.base}#/compte?invite=${i.code}`)}">${esc(t('acc.copy'))}</button><button class="mini-btn rm" data-code="${esc(i.code)}">${esc(t('courses.remove'))}</button></div>`).join('')}` : ''}
        <div class="set-label">${esc(t('acc.members'))}</div>${r.users.map((u) => `<div class="inv-row"><span><b>${esc(u.name || u.email)}</b><small>${esc(u.email)}</small></span></div>`).join('')}`;
      list.querySelectorAll('.cp').forEach((b) => b.onclick = () => share(b.dataset.url));
      list.querySelectorAll('.rm').forEach((b) => b.onclick = async () => { await api('invite_drop', { code: b.dataset.code }); load(); });
    } catch (ex) { list.innerHTML = `<p class="hint small">${esc(errText(ex.code))}</p>`; }
  };
  sh.querySelector('.inv-new').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('invite_new', { note: sh.querySelector('#ivn').value.trim() });
      const out = sh.querySelector('.inv-out');
      out.hidden = false;
      out.innerHTML = `<div class="inv-link"><code>${esc(r.url)}</code></div><div class="duo"><button class="btn ghost cp1">${esc(t('acc.copy'))}</button><button class="btn accent sh1">${esc(t('acc.share'))}</button></div>`;
      out.querySelector('.cp1').onclick = () => copy(r.url);
      out.querySelector('.sh1').onclick = () => share(r.url);
      sh.querySelector('#ivn').value = '';
      load();
    } catch (ex) { toast(errText(ex.code)); }
  };
  load();
}

async function copy(url) {
  try { await navigator.clipboard.writeText(url); toast(t('acc.copied')); } catch { prompt('', url); }
}
async function share(url) {
  if (navigator.share) { try { await navigator.share({ title: 'Recto Verso', text: t('acc.shareText'), url }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
  copy(url);
}
