// Mises à jour : le service worker télécharge la nouvelle version en arrière-plan et l'applique tout seul.
// L'application vérifie au lancement, à chaque retour au premier plan et toutes les 30 minutes.
import { t } from './i18n.js';

let reg = null;
const busy = () => /^#\/(reviser|jouer|creer)/.test(location.hash); // ne pas couper une séance en cours

function restartBar() {
  if (document.querySelector('.update-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'update-bar';
  bar.innerHTML = `<span>${t('upd.ready')}</span><button>${t('upd.restart')}</button>`;
  bar.querySelector('button').onclick = () => location.reload();
  document.body.append(bar);
}

export function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const hadController = !!navigator.serviceWorker.controller;
  let done = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (done || !hadController) return; // premier lancement : rien à recharger
    done = true;
    if (busy()) restartBar(); else location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((r) => {
    reg = r;
    if (r.waiting) r.waiting.postMessage('skip');
    r.addEventListener('updatefound', () => {
      const w = r.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && r.waiting) r.waiting.postMessage('skip'); });
    });
    setInterval(() => r.update().catch(() => {}), 30 * 60000);
  }).catch(() => {});
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg?.update().catch(() => {}); });
}

export async function checkForUpdate() {
  if (!reg) return 'off';
  const before = reg.installing || reg.waiting;
  await reg.update();
  return reg.installing || reg.waiting || before ? 'updating' : 'latest';
}
