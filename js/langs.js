// Les langues de Recto Verso : nom dans la langue elle-même, variantes, drapeaux dessinés
// (les émojis drapeaux ne s'affichent pas sous Windows, d'où des drapeaux en SVG)

export const LANGS = [
  { code: 'fr', name: 'Français', gender: true },
  { code: 'en', name: 'English', variants: [{ tag: 'en-GB', name: 'United Kingdom' }, { tag: 'en-US', name: 'United States' }] },
  { code: 'es', name: 'Español', gender: true },
  { code: 'it', name: 'Italiano', gender: true },
  { code: 'de', name: 'Deutsch', gender: true },
  { code: 'zh', name: '中文', sub: '简体', script: 'hans' },
];

export const base = (tag) => String(tag || '').split('-')[0];
export const lang = (tag) => LANGS.find((l) => l.code === base(tag));
export const hasVariants = (code) => !!lang(code)?.variants;

// Nom affiché d'une langue ou d'une variante, dans sa propre langue
export function endonym(tag) {
  const l = lang(tag);
  if (!l) return tag;
  const v = l.variants?.find((x) => x.tag === tag);
  return v ? `${l.name} · ${v.name}` : l.name;
}

const star = (cx, cy, r, rot = 0) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2 + rot, rr = i % 2 ? r * 0.38 : r;
    p.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${p.join(' ')}" fill="#FFDE00"/>`;
};

const FLAGS = {
  fr: '<rect width="10" height="20" fill="#002654"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE1126"/>',
  it: '<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/>',
  de: '<rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCE00"/>',
  es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
  'en-GB': '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#C8102E" stroke-width="3.4"/>',
  'en-US': `${Array.from({ length: 13 }, (_, i) => `<rect y="${(i * 20 / 13).toFixed(2)}" width="30" height="${(20 / 13).toFixed(2)}" fill="${i % 2 ? '#fff' : '#B22234'}"/>`).join('')}<rect width="13" height="10.77" fill="#3C3B6E"/>${[2.2, 5.4, 8.6].flatMap((y) => [2, 5, 8, 11].map((x) => `<circle cx="${x}" cy="${y}" r=".7" fill="#fff"/>`)).join('')}`,
  'pt-PT': `<rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#FF0000"/><circle cx="12" cy="10" r="4.4" fill="#FFCC00"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="#FF0000" stroke-width="1"/>`,
  'pt-BR': '<rect width="30" height="20" fill="#009B3A"/><polygon points="15,2.5 27.5,10 15,17.5 2.5,10" fill="#FEDF00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9.2 Q15 8 19.4 10.6" stroke="#fff" stroke-width=".9" fill="none"/>',
  zh: `<rect width="30" height="20" fill="#DE2910"/>${star(5, 5, 3)}${star(10, 2, 1)}${star(12, 4, 1)}${star(12, 7, 1)}${star(10, 9, 1)}`,
};
FLAGS.en = FLAGS['en-GB'];
FLAGS.pt = FLAGS['pt-PT'];

export const flag = (tag, cls = '') => `<svg class="flag ${cls}" viewBox="0 0 30 20" aria-hidden="true">${FLAGS[tag] || FLAGS[base(tag)] || ''}</svg>`;

// Langues dont le contenu (data/lang/<code>.json) existe (le portugais est retiré pour le moment)
export const CONTENT = ['fr', 'en', 'zh', 'es', 'it', 'de'];
export const hasContent = (tag) => CONTENT.includes(base(tag));
// Un parcours est possible si la langue maternelle et la langue apprise ont toutes deux leur contenu
export const ready = (native, target) => hasContent(native) && hasContent(target);

// Langues proposées à l'apprentissage : toutes sauf la sienne (celles sans contenu s'affichent « Bientôt »)
export const learnable = (native) => LANGS.filter((l) => l.code !== base(native));

// Niveaux : CECRL pour les langues européennes, HSK pour le chinois
export const levelsFor = (tag) => base(tag) === 'zh'
  ? ['beginner', 'HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7']
  : ['beginner', 'A1', 'A2', 'B1', 'B2'];
