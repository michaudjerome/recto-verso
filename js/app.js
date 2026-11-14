import { openDb, askPersistence } from './db.js';
import { loadProfile, profile, isSetUp } from './profile.js';
import { setLocale, t } from './i18n.js';
import { registerSW } from './update.js';
import { esc, nav, closeSheet } from './ui.js';
import * as home from './views/home.js';
import * as onboarding from './views/onboarding.js';
import * as settingsView from './views/settings.js';
import * as sources from './views/sources.js';
import * as review from './views/review.js';
import * as play from './views/play.js';
import * as discover from './views/discover.js';
import * as create from './views/create.js';

const routes = { '': home, bienvenue: onboarding, ajouter: onboarding, reglages: settingsView, sources, reviser: review, jouer: play, decouvrir: discover, creer: create };

const el = document.getElementById('app');
let cleanup;

async function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  let name = path.split('/')[0];
  if (!isSetUp() && name !== 'bienvenue') { if (location.hash !== '#/bienvenue') { location.hash = '#/bienvenue'; return; } name = 'bienvenue'; }
  const view = routes[name] ?? home;
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  if (name === 'ajouter') params.mode = 'add';
  nav.gen++;
  closeSheet();
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
  // Pictos des cartes déjà gardées : préchargés quand le téléphone est libre
  setTimeout(async () => {
    try { const { activeCourse } = await import('./courses.js'); const { cardsOf } = await import('./cards.js'); const { warmPictos } = await import('./content.js');
      const c = await activeCourse(); if (c) warmPictos(await cardsOf(c.id)); } catch {}
  }, 4000);
})();
