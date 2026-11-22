// Choix du niveau avant Réviser et les jeux : 4 grands boutons sur toute la page, le niveau de la plateforme en surbrillance.
// Plus de thèmes ici : les thèmes servent seulement à ajouter des mots dans Découvrir.
import { t } from './i18n.js';
import { cardsOf } from './cards.js';
import { notions, cardText } from './content.js';
import { hasClearVisual } from './face.js';
import { topBar, emptyState } from './play-kit.js';
import { LEVELS, levelOf, courseLevel, levelName, levelSub } from './levels.js';
import { esc } from './ui.js';

// Les cartes de la personne (ou, avec all, tous les mots du contenu) avec leur texte et leur niveau.
// Les cartes créées de toutes pièces n'ont pas de niveau : elles comptent dans tous les niveaux.
export async function myItems(course, { withPicto = false, all = false } = {}) {
  const data = await notions();
  const out = [];
  const src = all ? data.notions.map((n) => ({ card: null, notion: n.id })) : await cardsOf(course.id);
  for (const c of src) {
    const txt = await cardText(c, course);
    if (!txt.front?.w || !txt.back?.w) continue;
    if (withPicto && !hasClearVisual(txt)) continue;
    const n = c.notion ? data._byId.get(c.notion) : null;
    out.push({ card: c.card === null ? null : c, txt, lv: n ? levelOf(n, course.target) : -1 });
  }
  return { items: out };
}

// Les éléments d'un niveau (les cartes perso, sans niveau, sont de tous les niveaux)
export const atLevel = (items, lv) => items.filter((i) => i.lv === lv || i.lv === -1);

// title : barre du haut ; min : mots nécessaires ; href(lv) : adresse de la séance pour ce niveau
export async function levelScreen(el, course, { title, back = '#/', min = 1, withPicto = false, all = false, href }) {
  const { items } = await myItems(course, { withPicto, all });
  const cur = courseLevel(course);
  const counts = Object.fromEntries(LEVELS.map((lv) => [lv, atLevel(items, lv).length]));
  if (!all && !items.length) {
    const msg = withPicto ? t('write.noPicto') : t('rev.emptyHint');
    el.innerHTML = `<div class="page fill">${topBar(title, back)}${emptyState(t('f.none'), msg, `<a class="btn primary" href="#/decouvrir">${esc(t('home.discover'))}</a>`)}</div>`;
    return;
  }
  el.innerHTML = `<div class="page fill lvl-page enter">${topBar(title, back)}
    <div class="lvl-grid">${LEVELS.map((lv) => {
      const n = counts[lv], ok = n >= min;
      return `<a class="lvl-tile ${lv === cur ? 'cur' : ''} ${ok ? '' : 'off'}" ${ok ? `href="${href(lv)}"` : 'aria-disabled="true"'}>
        <span class="lvl-n">${lv}</span><span class="lvl-txt"><b>${esc(levelName(lv))}</b><small>${esc(levelSub(lv, course.target))}</small></span>
        <span class="lvl-c">${ok ? esc(t(n === 1 ? 'f.words1' : 'f.words', { n })) : esc(n ? t('f.need', { n: min }) : t('f.noneLevel'))}</span>
        ${lv === cur ? `<span class="lvl-badge">${esc(t('lv.mine'))}</span>` : ''}</a>`;
    }).join('')}</div></div>`;
}

// Une pioche sans fin : on mélange, on épuise, on remélange (sans reprendre tout de suite la dernière carte)
export function endless(list, shuffle) {
  let bag = [], last = null;
  return () => {
    if (!bag.length) { bag = shuffle(list); if (bag.length > 1 && bag[0] === last) bag.push(bag.shift()); }
    last = bag.shift();
    return last;
  };
}
