// Petits utilitaires d'interface
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  duo: '<rect x="3" y="5" width="7" height="14" rx="2"/><rect x="14" y="5" width="7" height="14" rx="2"/><path d="M10 9h4M10 15h4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  review: '<rect x="5" y="4" width="11" height="15" rx="2"/><path d="M19 8v10a2 2 0 0 1-2 2H9"/>',
  play: '<rect x="3" y="6" width="8" height="12" rx="1.6" transform="rotate(-10 7 12)"/><rect x="13" y="6" width="8" height="12" rx="1.6" transform="rotate(10 17 12)"/>',
  discover: '<rect x="6" y="3" width="12" height="17" rx="2"/><path d="M12 8.5l1.2 2.5 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3z"/>',
  create: '<rect x="5" y="3" width="13" height="18" rx="2"/><path d="M11.5 9v6M8.5 12h6"/>',
};
export const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

// Le logo : la pile tamponnée (carte claire devant, verso sombre derrière, sceau rouge)
export const logo = (cls = '') => `<svg class="logo ${cls}" viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(-1.5 .5)">
<rect x="30" y="16" width="50" height="66" rx="8" fill="var(--ink)" transform="rotate(9 55 49)"/>
<rect x="16" y="10" width="50" height="68" rx="8" fill="var(--card)" stroke="var(--ink)" stroke-width="6"/>
<g transform="rotate(-8 68 70)"><rect x="49" y="51" width="38" height="38" rx="8" fill="var(--seal)"/>
<path d="M57.5 70.5l7.14 7.14 13.26-16.32" fill="none" stroke="var(--card)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g></g></svg>`;

let toastTimer;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg; el.setAttribute('role', 'status');
  document.body.append(el);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 2600);
}

// Date locale du jour au format AAAA-MM-JJ (pour les séries de jours)
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Retourne un élément .flip (recto/verso) avec l'animation de l'app
export function flip(el, toBack = !el.classList.contains('flipped')) {
  el.classList.remove('flipping', 'unflipping');
  void el.offsetWidth;
  el.classList.add(toBack ? 'flipping' : 'unflipping');
  el.classList.toggle('flipped', toBack);
  setTimeout(() => el.classList.remove('flipping', 'unflipping'), 720);
}

// Panneau qui monte du bas de l'écran
export function sheet(html, { onOpen } = {}) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  wrap.querySelector('.sheet-bg').onclick = closeSheet;
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  onOpen?.(wrap.querySelector('.sheet'));
  return wrap.querySelector('.sheet');
}
export function closeSheet() {
  const w = document.querySelector('.sheet-wrap');
  if (!w) return;
  w.classList.remove('open');
  setTimeout(() => w.remove(), 250);
}

// Minuteries liées à l'écran : si on change d'écran entre-temps, elles ne font plus rien
export const nav = { gen: 0 };
export function later(fn, ms) { const g = nav.gen; return setTimeout(() => { if (g === nav.gen) fn(); }, ms); }
