// Parcours : une langue apprise depuis sa langue maternelle (« fr>en-GB », « fr>zh »).
// Chaque parcours garde ses cartes, son niveau, son objectif et sa série de jours.
import { get, getAll, put, del, deleteByIndex } from './db.js';
import { profile, saveProfile } from './profile.js';
import { dayKey } from './ui.js';

export const courseId = (native, target) => `${native}>${target}`;

export async function listCourses() {
  const all = (await getAll('courses')).filter((c) => c.native === profile.native);
  return all.sort((a, b) => a.created - b.created);
}

export async function activeCourse() {
  const list = await listCourses();
  return list.find((c) => c.id === profile.activeCourse) || list[0] || null;
}

export async function addCourse(target, level = 'beginner') {
  const id = courseId(profile.native, target);
  const existing = await get('courses', id);
  const c = existing || {
    id, native: profile.native, target, level, created: Date.now(),
    goal: 20, newPerDay: 10, streak: { count: 0, last: '' },
  };
  if (existing) c.level = level;
  await put('courses', c);
  return c;
}

export const setActive = (id) => saveProfile({ activeCourse: id });

// Retire un parcours et tout ce qui lui appartient
export async function removeCourse(id) {
  await deleteByIndex('cards', 'course', id);
  await deleteByIndex('decks', 'course', id);
  await deleteByIndex('logs', 'course', id);
  await del('courses', id);
  if (profile.activeCourse === id) {
    const next = (await listCourses())[0];
    await saveProfile({ activeCourse: next?.id || '' });
  }
}

// Série : un jour compte dès qu'on a travaillé dans ce parcours
export function streakOf(c) {
  const s = c?.streak || { count: 0, last: '' };
  const today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
  return s.last === today || s.last === dayKey(y) ? s.count : 0;
}

export async function markActivity(c) {
  const today = dayKey();
  if (c.streak?.last === today) return c;
  const n = streakOf(c) + 1;
  const next = { ...c, streak: { count: n, last: today } };
  await put('courses', next);
  return next;
}
