// Profil de la personne (un seul par téléphone) et réglages
import { kvGet, kvSet } from './db.js';

const DEFAULTS = { name: '', native: '', anim: 'full', theme: 'auto', activeCourse: '', created: 0 };
export const profile = { ...DEFAULTS };

export async function loadProfile() {
  Object.assign(profile, DEFAULTS, (await kvGet('profile')) || {});
  applyProfile();
  return profile;
}

export async function saveProfile(patch) {
  Object.assign(profile, patch);
  applyProfile();
  await kvSet('profile', { ...profile });
}

export const isSetUp = () => !!profile.native;

export function applyProfile() {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme();
  root.classList.toggle('calm', profile.anim === 'calm');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue('--paper').trim();
  try { localStorage.setItem('rv-look', JSON.stringify({ theme: profile.theme, anim: profile.anim })); } catch {}
}

// Thème : clair, sombre, ou automatique (suit le réglage du téléphone, même en cours d'utilisation)
const darkQuery = (() => { try { return matchMedia('(prefers-color-scheme: dark)'); } catch { return null; } })();
export const resolvedTheme = () => (profile.theme === 'dark' || profile.theme === 'light' ? profile.theme : darkQuery?.matches ? 'dark' : 'light');
darkQuery?.addEventListener?.('change', () => { if (profile.theme === 'auto' || !profile.theme) applyProfile(); });

// L'appareil demande-t-il des animations réduites ?
export const prefersReducedMotion = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
