// Effets de réponse : petite gerbe de confettis quand c'est juste, secousse et lueur rouge brèves quand c'est faux.
// Pas de vibration du téléphone : tout se passe à l'écran. Animations réduites : seulement un changement de couleur.
const calm = () => document.documentElement.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['--t1', '--t2', '--t3', '--t4', '--seal'];

function glow(el, color, ms = 450) {
  el?.animate?.([{ boxShadow: `0 0 0 2.5px ${color}, 0 0 22px ${color}` }, { boxShadow: '0 0 0 0 transparent' }], { duration: ms, easing: 'ease-out' });
}

// Bonne réponse
export function cheer(el) {
  if (!el) return;
  const css = getComputedStyle(document.documentElement);
  if (calm()) { glow(el, css.getPropertyValue('--t3').trim()); return; }
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 120);
  const box = document.createElement('div');
  box.className = 'fx-burst';
  box.style.cssText = `left:${x}px;top:${y}px`;
  document.body.append(box);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, d = 60 + Math.random() * 70;
    p.style.background = css.getPropertyValue(COLORS[i % COLORS.length]).trim();
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.append(p);
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40}px)) rotate(${Math.random() * 540 - 270}deg) scale(.6)`, opacity: 0 },
    ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
  setTimeout(() => box.remove(), 1000);
}

// Erreur : la carte tremble, son bord rougit, un voile rouge passe sur l'écran, puis tout revient à la normale
export function oops(el) {
  const red = getComputedStyle(document.documentElement).getPropertyValue('--t1').trim();
  glow(el, red);
  if (calm()) return;
  shake(el, 7);
  const v = document.createElement('div');
  v.className = 'fx-veil';
  document.body.append(v);
  v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => v.remove(), 450);
}

// Simple secousse, sans rouge (« À revoir » dans Réviser : c'est toi qui juges, l'app ne sanctionne pas)
export function nudge(el) { if (!calm()) shake(el, 4); }

function shake(el, px) {
  el?.animate?.([0, -px, px, -px * 0.6, px * 0.6, 0].map((v) => ({ translate: `${v}px 0` })), { duration: 340, easing: 'ease-out' });
}
