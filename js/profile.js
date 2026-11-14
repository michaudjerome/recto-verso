// Profil de la personne (un seul par téléphone) et réglages
import { kvGet, kvSet } from './db.js';

const DEFAULTS = { name: '', native: '', anim: 'full', theme: 'zen', activeCourse: '', created: 0 };
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
  root.dataset.theme = profile.theme;
  root.classList.toggle('calm', profile.anim === 'calm');
  try { localStorage.setItem('rv-look', JSON.stringify({ theme: profile.theme, anim: profile.anim })); } catch {}
}

// L'appareil demande-t-il des animations réduites ?
export const prefersReducedMotion = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
