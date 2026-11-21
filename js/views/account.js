// Compte : connexion, création de compte sur invitation, mot de passe oublié, nouveau mot de passe
import { t, setLocale, locale } from '../i18n.js';
import { loadProfile, profile, isSetUp } from '../profile.js';
import { api } from '../api.js';
import { signIn } from '../sync.js';
import { esc, logo, icon } from '../ui.js';
import { base } from '../langs.js';

const errText = (code) => t(`acc.err.${code}`) === `acc.err.${code}` ? t('acc.err.server') : t(`acc.err.${code}`);

export async function render(el, params = {}) {
  let mode = params.reset ? 'reset' : params.invite ? 'signup' : 'login';
  let invite = (params.invite || '').toUpperCase();
  let inviteOk = false;

  const field = (id, type, label, extra = '') => `<label class="set-label" for="${id}">${esc(label)}</label><input id="${id}" class="field" type="${type}" ${extra}>`;

  async function draw() {
    let body = '';
    if (mode === 'login') {
      body = `<h1>${esc(t('acc.loginTitle'))}</h1>
        <form class="acc-form" novalidate>
          ${field('em', 'email', t('acc.email'), 'autocomplete="username" inputmode="email" autocapitalize="off" required')}
          ${field('pw', 'password', t('acc.password'), 'autocomplete="current-password" required')}
          <p class="acc-err" role="alert" hidden></p>
          <button class="btn primary go">${esc(t('acc.login'))}</button>
        </form>
        <button class="link-btn to-forgot">${esc(t('acc.forgot'))}</button>
        <div class="acc-alt"><p class="hint small">${esc(t('acc.noAccount'))}</p><button class="btn ghost to-signup">${esc(t('acc.haveInvite'))}</button></div>`;
    } else if (mode === 'signup') {
      if (invite && !inviteOk) { try { await api('invite_check', { code: invite }); inviteOk = true; } catch (e) { inviteOk = false; if (e.code !== 'invite') { /* hors ligne : on vérifiera à l'envoi */ inviteOk = true; } } }
      body = `<button class="icon-btn back" aria-label="${esc(t('ui.back'))}">${icon('back')}</button>
        <h1>${esc(t('acc.signupTitle'))}</h1><p class="hint">${esc(t('acc.signupHint'))}</p>
        <form class="acc-form" novalidate>
          ${inviteOk ? `<input type="hidden" id="iv" value="${esc(invite)}">` : field('iv', 'text', t('acc.invite'), `autocapitalize="characters" autocomplete="off" value="${esc(invite)}"`)}
          ${field('nm', 'text', t('acc.name'), 'autocomplete="given-name" maxlength="30"')}
          ${field('em', 'email', t('acc.email'), 'autocomplete="username" inputmode="email" autocapitalize="off" required')}
          ${field('pw', 'password', t('acc.newPassword'), 'autocomplete="new-password" minlength="8" required')}
          <p class="hint small">${esc(t('acc.pwHint'))}</p>
          <p class="acc-err" role="alert" hidden></p>
          <button class="btn primary go">${esc(t('acc.signup'))}</button>
        </form>
        <p class="hint small acc-privacy">${esc(t('acc.privacy'))}</p>`;
    } else if (mode === 'forgot') {
      body = `<button class="icon-btn back" aria-label="${esc(t('ui.back'))}">${icon('back')}</button>
        <h1>${esc(t('acc.forgotTitle'))}</h1><p class="hint">${esc(t('acc.forgotHint'))}</p>
        <form class="acc-form" novalidate>
          ${field('em', 'email', t('acc.email'), 'autocomplete="username" inputmode="email" autocapitalize="off" required')}
          <p class="acc-err" role="alert" hidden></p>
          <button class="btn primary go">${esc(t('acc.send'))}</button>
        </form>`;
    } else if (mode === 'sent') {
      body = `<h1>${esc(t('acc.sentTitle'))}</h1><p class="hint">${esc(t('acc.sentHint'))}</p><button class="btn ghost to-login">${esc(t('acc.backLogin'))}</button>`;
    } else if (mode === 'reset') {
      body = `<h1>${esc(t('acc.resetTitle'))}</h1>
        <form class="acc-form" novalidate>
          ${field('pw', 'password', t('acc.newPassword'), 'autocomplete="new-password" minlength="8" required')}
          <p class="hint small">${esc(t('acc.pwHint'))}</p>
          <p class="acc-err" role="alert" hidden></p>
          <button class="btn primary go">${esc(t('acc.save'))}</button>
        </form>`;
    }
    el.innerHTML = `<div class="ob acc enter"><div class="ob-head">${logo('ob-logo')}<div class="brand">Recto Verso</div></div>${body}</div>`;
    bind();
  }

  function bind() {
    el.querySelector('.back')?.addEventListener('click', () => { mode = 'login'; draw(); });
    el.querySelector('.to-login')?.addEventListener('click', () => { mode = 'login'; draw(); });
    el.querySelector('.to-forgot')?.addEventListener('click', () => { mode = 'forgot'; draw(); });
    el.querySelector('.to-signup')?.addEventListener('click', () => { mode = 'signup'; draw(); });
    const form = el.querySelector('form');
    if (!form) return;
    const err = el.querySelector('.acc-err');
    const go = el.querySelector('.go');
    const val = (id) => el.querySelector(`#${id}`)?.value.trim() ?? '';
    const show = (code) => { err.textContent = errText(code); err.hidden = false; };
    el.querySelector('input:not([type=hidden])')?.focus();
    form.onsubmit = async (e) => {
      e.preventDefault();
      err.hidden = true;
      const email = val('em');
      const pw = el.querySelector('#pw')?.value ?? '';
      if (el.querySelector('#em') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return show('email');
      if ((mode === 'signup' || mode === 'reset') && pw.length < 8) return show('password_short');
      if (mode === 'login' && !pw) return show('bad_login');
      go.disabled = true;
      const label = go.textContent;
      go.textContent = t('acc.wait');
      try {
        let res;
        if (mode === 'login') res = await api('login', { email, password: pw });
        else if (mode === 'signup') res = await api('signup', { invite: val('iv'), email, password: pw, name: val('nm') });
        else if (mode === 'reset') res = await api('reset', { token: params.reset, password: pw });
        else if (mode === 'forgot') { await api('forgot', { email, lang: base(locale()) }); mode = 'sent'; draw(); return; }
        go.textContent = t('acc.syncing');
        await signIn(res.user);
        await loadProfile();
        if (!profile.name && res.user.name) { const { saveProfile } = await import('../profile.js'); await saveProfile({ name: res.user.name }); }
        if (profile.native) await setLocale(profile.native);
        history.replaceState(null, '', location.pathname);
        location.hash = isSetUp() ? '#/' : '#/bienvenue';
      } catch (ex) {
        show(ex.code || 'server');
        go.disabled = false;
        go.textContent = label;
      }
    };
  }

  await draw();
}
