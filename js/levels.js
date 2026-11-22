// Les 4 niveaux de la plateforme. Le niveau d'un mot dépend de la langue apprise :
// le chinois suit la liste officielle HSK 3.0, les autres langues le cadre européen (CECRL).
//   1 Débutant      A1  · HSK 1-2
//   2 Élémentaire   A2  · HSK 3
//   3 Intermédiaire B1  · HSK 4
//   4 Avancé        B2  · HSK 5-6
// Au-delà (C1, HSK 7-9) : hors plateforme (0).
import { base } from './langs.js';
import { t } from './i18n.js';
import { put } from './db.js';

export const LEVELS = [1, 2, 3, 4];
const HSK = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 4 };
const CEFR = { A1: 1, A2: 2, B1: 3, B2: 4 };

// Niveau d'une notion pour une langue apprise (0 = hors plateforme ou inconnu)
export function levelOf(n, target) {
  if (!n) return 0;
  // Mot chinois absent des listes HSK (souvent un mot concret : clé, plage…) : on suit le CECRL ; HSK 7-9 reste hors plateforme
  if (base(target) === 'zh') return n.hsk == null ? CEFR[n.cefr] || 0 : HSK[n.hsk] || 0;
  return CEFR[n.cefr] || 0;
}

// Niveau global d'un parcours ; les anciens parcours gardaient un niveau plus fin (A1, HSK3…)
const OLD = { beginner: 1, A1: 1, HSK1: 1, HSK2: 1, A2: 2, HSK3: 2, B1: 3, HSK4: 3, B2: 4, HSK5: 4, HSK6: 4, HSK7: 4 };
export const courseLevel = (c) => (LEVELS.includes(c?.lv) ? c.lv : OLD[c?.level] || 1);

export async function setCourseLevel(c, lv) {
  const next = { ...c, lv, level: ['', 'A1', 'A2', 'B1', 'B2'][lv] || c.level }; // « level » pour les appareils encore en 0.12
  await put('courses', next);
  return next;
}

export const levelName = (lv) => t(`lv.${lv}`);
export const levelSub = (lv, target) => (base(target) === 'zh' ? ['', 'HSK 1-2', 'HSK 3', 'HSK 4', 'HSK 5-6'] : ['', 'A1', 'A2', 'B1', 'B2'])[lv];
