// Petits mots d'accueil, dans la langue de la personne. Uniquement de la bonne humeur.
import { t } from './i18n.js';

export function moment(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'night';
  if (h < 11) return 'morning';
  if (h < 14) return 'day';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'evening';
  return 'night';
}

// Message stable pendant un même moment de la journée
export function greeting(name = '', d = new Date()) {
  const m = moment(d);
  const title = t(`greet.${m}`);
  const seed = d.getDate() * 7 + ['night', 'morning', 'day', 'afternoon', 'evening'].indexOf(m);
  const line = t(`greet.l${(seed % 4) + 1}`);
  return { title: name ? withName(title, name) : title, line };
}

// « Bonjour ☀️ » → « Bonjour Jérôme ☀️ » ; « ¡Hola! 🌻 » → « ¡Hola Jérôme! 🌻 »
function withName(title, name) {
  const m = title.match(/^(.*?)([!！]?)(\s*[\p{Extended_Pictographic}☀-➿️‍\s]*)$/u);
  if (!m) return `${title} ${name}`;
  return `${m[1]} ${name}${m[2]}${m[3]}`;
}
