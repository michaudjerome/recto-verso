import { openDb, askPersistence } from './db.js';
import { loadProfile, profile, isSetUp } from './profile.js';
import { setLocale, t } from './i18n.js';
import { registerSW } from './update.js';
import { esc } from './ui.js';
import * as home from './views/home.js';
import * as onboarding from './views/onboarding.js';
import * as settingsView from './views/settings.js';
import * as sources from './views/sources.js';

const routes = { '': home, bienvenue: onboarding, ajouter: onboarding, reglages: settingsView, sources };

const el = document.getElementById('app');
let cleanup;

async function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  let name = path.split('/')[0];
  if (!isSetUp() && name !== 'bienvenue') { if (location.hash !== '#/bienvenue') { location.hash = '#/bienvenue'; return; } name = 'bienvenue'; }
  const view = routes[name] ?? home;
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  if (name === 'ajouter') params.mode = 'add';
  try { cleanup?.(); } catch {}
  cleanup = undefined;
  try { cleanup = await view.render(el, params); }
  catch (err) {
    console.error(err);
    el.innerHTML = `<div class="page"><p class="empty">${esc(t('ui.error'))}</p><p class="hint small">${esc(err.message || err)}</p><a class="btn ghost" href="#/">${esc(t('ui.home'))}</a></div>`;
  }
  window.scrollTo(0, 0);
}

(async () => {
  await openDb();
  await loadProfile();
  await setLocale(profile.native || 'fr');
  askPersistence();
  addEventListener('hashchange', route);
  route();
  registerSW();
})();
