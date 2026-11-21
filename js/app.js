import { openDb, askPersistence } from './db.js';
import { initSync, syncNow, currentAccount } from './sync.js';
import * as account from './views/account.js';
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

const routes = { compte: account, '': home, bienvenue: onboarding, ajouter: onboarding, reglages: settingsView, sources, reviser: review, jouer: play, decouvrir: discover, creer: create };

const el = document.getElementById('app');
let cleanup;
let needLogin = false;

async function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  let name = path.split('/')[0];
  // Compte obligatoire : sans compte (ou session expirée), seule la page de connexion est accessible
  if ((!currentAccount() || needLogin) && name !== 'compte') { location.hash = '#/compte'; return; }
  if (name === 'compte') { /* connexion, invitation, nouveau mot de passe */ }
  else if (!isSetUp() && name !== 'bienvenue') { if (location.hash !== '#/bienvenue') { location.hash = '#/bienvenue'; return; } name = 'bienvenue'; }
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

const NEW_HOME = 'https://recto-verso.jeromemichaud.fr/';

// Ancienne adresse GitHub Pages : panneau de déménagement, plus d'app
async function movedPanel() {
  await setLocale(profile.native || guessLocale());
  const { logo } = await import('./ui.js');
  const { getAll } = await import('./db.js');
  const has = (await getAll('cards')).length > 0;
  el.innerHTML = `<div class="ob acc enter"><div class="ob-head">${logo('ob-logo')}<div class="brand">Recto Verso</div></div>
    <h1>${esc(t('move.title'))}</h1><p class="hint">${esc(t('move.text'))}</p>
    <a class="btn primary" href="${NEW_HOME}">${esc(t('move.go'))}</a>
    <p class="hint small" style="margin-top:18px">${esc(t('move.install'))}</p>
    ${has ? `<button class="link-btn exp">${esc(t('move.export'))}</button>` : ''}</div>`;
  el.querySelector('.exp')?.addEventListener('click', async () => { const { exportBackup } = await import('./backup.js'); await exportBackup(); });
}

(async () => {
  await openDb();
  if (/\.github\.io$/.test(location.hostname)) { await loadProfile(); registerSW(); return movedPanel(); }
  await loadProfile();
  await initSync();
  await setLocale(profile.native || guessLocale());
  // Session refusée par le serveur : on garde les données de l'appareil et on redemande la connexion
  addEventListener('rv-auth', () => { needLogin = true; route(); });
  // Changements arrivés d'un autre appareil : profil rechargé, écran d'accueil ou réglages rafraîchis
  addEventListener('rv-synced', async (e) => {
    if (e.detail?.profile) { await loadProfile(); if (profile.native) await setLocale(profile.native); }
    const name = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
    if (name === '' || name === 'reglages' || (name === 'bienvenue' && isSetUp())) { if (name === 'bienvenue') location.hash = '#/'; else route(); }
  });
  addEventListener('rv-signed-in', () => { needLogin = false; });
  askPersistence();
  addEventListener('hashchange', route);
  route();
  registerSW();
  if (currentAccount()) syncNow();
  // Pictos des cartes déjà gardées : préchargés quand le téléphone est libre
  setTimeout(async () => {
    try { const { activeCourse } = await import('./courses.js'); const { cardsOf } = await import('./cards.js'); const { warmPictos } = await import('./content.js');
      const c = await activeCourse(); if (c) warmPictos(await cardsOf(c.id)); } catch {}
  }, 4000);
})();

// Avant tout compte : la langue du navigateur, si l'app la parle
function guessLocale() {
  const ok = ['fr', 'en', 'es', 'it', 'de', 'zh'];
  for (const l of navigator.languages || [navigator.language || 'fr']) { const b = String(l).slice(0, 2).toLowerCase(); if (ok.includes(b)) return b === 'en' ? (/US/i.test(l) ? 'en-US' : 'en-GB') : b; }
  return 'fr';
}
