// Cartes d'un parcours : une notion du contenu publié, ou une carte créée de toutes pièces
import { get, put, del, getAllByIndex, uid } from './db.js';

export const cardId = (course, notion, dir = 't>n') => `${course}|${notion}|${dir}`;

export const cardsOf = (courseId) => getAllByIndex('cards', 'course', courseId);
export const getCard = (id) => get('cards', id);

export async function addNotion(course, notion, deck = 'default') {
  const id = cardId(course.id, notion);
  const existing = await get('cards', id);
  if (existing) return existing;
  const now = Date.now();
  const c = { id, course: course.id, notion, dir: 't>n', deck, created: now, due: now, state: 0 };
  await put('cards', c);
  return c;
}

// Carte perso : front = langue apprise, back = langue maternelle
export async function savePerso(course, { front, back, ex, picto, photo }, existing) {
  const now = Date.now();
  const perso = { front, back, ex: ex || '', picto: picto || '', photo: photo || '' };
  const c = existing
    ? { ...existing, perso, updated: now }
    : { id: cardId(course.id, `p:${uid()}`), course: course.id, notion: null, dir: 't>n', deck: 'default', perso, created: now, updated: now, due: now, state: 0 };
  await put('cards', c);
  return c;
}

export const deleteCard = (id) => del('cards', id);
