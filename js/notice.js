// Bandeau d'accueil : proposer d'installer l'app, puis rappeler de sauvegarder.
// Un seul bandeau à la fois ; « Plus tard » le met de côté une semaine.
import { t } from './i18n.js';
import { esc, icon, sheet, closeSheet, toast } from './ui.js';
import { kvGet, kvSet, getAll } from './db.js';
import { exportBackup } from './backup.js';

const DAY = 864e5;
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
addEventListener('appinstalled', () => { deferred = null; kvSet('installed', Date.now()); });

export const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function platform() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Navigateur intégré à une autre app (Gmail, Facebook, Instagram, LinkedIn…) : l'installation y est impossible
  if (/GSA\/|FBAN|FBAV|Instagram|LinkedInApp|Line\/|MicroMessenger|Snapchat|; wv\)/.test(ua)) return ios ? 'ios-inapp' : 'inapp';
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios';
  return /Android/.test(ua) ? 'android' : 'desktop';
}

// Gestes illustrés pour l'iPhone : le bouton Partager de Safari, puis « Sur l'écran d'accueil »
const SHARE = '<svg class="i" viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M6 11v9h12v-9"/></svg>';
const ADDHOME = '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';

// Installation : la vraie fenêtre du navigateur quand il la propose (Android), sinon les gestes à faire
export async function install() {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => ({}));
    deferred = null;
    if (r.outcome === 'accepted') { toast(t('inst.done')); return true; }
    return false;
  }
  const p = platform();
  const steps = p === 'ios' ? [[SHARE, t('inst.ios1')], [ADDHOME, t('inst.ios2')]] : p === 'android' ? [['⋮', t('inst.android1')], [ADDHOME, t('inst.android2')]] : null;
  const inapp = p === 'inapp' || p === 'ios-inapp';
  const body = steps
    ? `<ol class="steps">${steps.map(([ic, s], i) => `<li><span class="n">${i + 1}</span><span class="st-ic">${ic}</span><span>${esc(s)}</span></li>`).join('')}</ol>`
    : inapp ? `<p class="hint">${esc(t(p === 'ios-inapp' ? 'inst.inappIos' : 'inst.inapp'))}</p><button class="btn ghost cp">${esc(t('inst.copy'))}</button>`
      : `<p class="hint">${esc(t(p === 'ios-other' ? 'inst.iosOther' : 'inst.desktop'))}</p>`;
  const sh = sheet(`<h2>${esc(t('inst.title'))}</h2><p class="hint">${esc(t('inst.hint'))}</p>${body}
    <button class="btn primary ok">${esc(t('ob.next'))}</button>`);
  sh.querySelector('.ok').onclick = closeSheet;
  sh.querySelector('.cp')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.origin + '/'); toast(t('acc.copied')); } catch { prompt('', location.origin + '/'); } });
  return false;
}

// Quel bandeau montrer ? La sauvegarde passe d'abord quand elle est due : c'est elle qui protège les cartes
export async function pickNotice() {
  const now = Date.now();
  let first = await kvGet('firstUse');
  if (!first) { first = now; await kvSet('firstUse', now); }
  const snooze = (await kvGet('noticeSnooze')) || {};
  const free = (k) => !snooze[k] || snooze[k] < now;
  const last = await kvGet('lastBackup');
  // Avec un compte, les cartes sont déjà sauvegardées sur le serveur : plus de rappel de sauvegarde par fichier
  if (false && free('backup')) {
    const n = (await getAll('cards')).length;
    if (n >= 15 && now - (last || first) > 14 * DAY) return 'backup';
  }
  if (free('install') && !isInstalled() && platform() !== 'desktop' && now - first > 0) return 'install';
  return null;
}

export function noticeHTML(kind) {
  if (kind === 'install') return `<section class="notice" data-k="install">${icon('plus')}<div><b>${esc(t('inst.title'))}</b><p>${esc(t('inst.hint'))}</p>
    <div class="notice-act"><button class="btn primary sm go">${esc(t(deferred ? 'inst.btn' : 'inst.how'))}</button><button class="btn ghost sm later">${esc(t('ob.later'))}</button></div></div></section>`;
  if (kind === 'backup') return `<section class="notice" data-k="backup">${icon('check')}<div><b>${esc(t('bk.remind'))}</b><p>${esc(t('bk.remindHint'))}</p>
    <div class="notice-act"><button class="btn primary sm go">${esc(t('bk.save'))}</button><button class="btn ghost sm later">${esc(t('ob.later'))}</button></div></div></section>`;
  return '';
}

export function bindNotice(root) {
  const n = root.querySelector('.notice');
  if (!n) return;
  const k = n.dataset.k;
  const hide = () => { n.classList.add('gone'); setTimeout(() => n.remove(), 300); };
  n.querySelector('.later').onclick = async () => {
    const s = (await kvGet('noticeSnooze')) || {};
    s[k] = Date.now() + 7 * DAY;
    await kvSet('noticeSnooze', s);
    hide();
  };
  n.querySelector('.go').onclick = async () => {
    if (k === 'backup') { await exportBackup(); toast(t('backup.exported')); hide(); return; }
    if (await install()) hide();
  };
}
