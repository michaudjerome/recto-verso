// Répétition espacée FSRS (librairie ts-fsrs, MIT), parcours par parcours
import { fsrs, createEmptyCard, Rating, State } from './vendor/ts-fsrs.mjs';
import { put, getAllByIndex } from './db.js';
import { dayKey } from './ui.js';
import { locale } from './i18n.js';

const f = fsrs({ request_retention: 0.9, enable_fuzz: true, maximum_interval: 3650 });
export { Rating, State };
export const GRADES = [[Rating.Again, 'again'], [Rating.Hard, 'hard'], [Rating.Good, 'good'], [Rating.Easy, 'easy']];

const toDate = (t) => (t == null ? undefined : new Date(t));
function toFsrs(c) {
  if (!c.fsrs) return createEmptyCard(new Date(c.created || Date.now()));
  return { ...c.fsrs, due: toDate(c.fsrs.due), last_review: toDate(c.fsrs.last_review) };
}
const fromFsrs = (fc) => ({ ...fc, due: +fc.due, last_review: fc.last_review ? +fc.last_review : null });

export const isNew = (c) => !c.fsrs || c.fsrs.state === State.New;

// Délai court dans la langue de la personne : « 5 min », « 3 j », « 3d », « 3天 »
const unit = (n, u) => { try { return new Intl.NumberFormat(locale(), { style: 'unit', unit: u, unitDisplay: 'narrow' }).format(n); } catch { return `${n} ${u}`; } };
export function human(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return unit(m, 'minute');
  const h = Math.round(m / 60);
  if (h < 24) return unit(h, 'hour');
  const d = Math.round(h / 24);
  if (d < 31) return unit(d, 'day');
  const mo = Math.round(d / 30);
  if (mo < 12) return unit(mo, 'month');
  return unit(Math.round(d / 365), 'year');
}

export function preview(card, now = new Date()) {
  const rec = f.repeat(toFsrs(card), now);
  return Object.fromEntries(GRADES.map(([g]) => [g, rec[g].card.due - now]));
}

export async function grade(card, rating, mode = 'review', now = new Date()) {
  const wasNew = isNew(card);
  const { card: next } = f.next(toFsrs(card), now, rating);
  const updated = { ...card, fsrs: fromFsrs(next), due: +next.due, state: next.state };
  await put('cards', updated);
  await log(card, rating, mode, wasNew, now);
  return updated;
}

// Une réponse dans un jeu compte dans l'historique, sans toucher à la répétition espacée
export const log = (card, rating, mode, wasNew = false, now = new Date()) =>
  put('logs', { day: dayKey(now), ts: +now, course: card.course, card: card.id, rating, mode, wasNew });

export async function newSeenToday(courseId) {
  const logs = await getAllByIndex('logs', 'course', courseId);
  const today = dayKey();
  return new Set(logs.filter((l) => l.day === today && l.wasNew).map((l) => l.card)).size;
}

// File du jour : cartes dues d'abord, puis les nouvelles dans la limite quotidienne du parcours
export async function todayQueue(cards, course) {
  const now = Date.now();
  const due = cards.filter((c) => !isNew(c) && c.due <= now).sort((a, b) => a.due - b.due);
  const left = Math.max(0, (course.newPerDay ?? 10) - (await newSeenToday(course.id)));
  const fresh = cards.filter(isNew).sort((a, b) => a.created - b.created).slice(0, left);
  return [...due, ...fresh];
}
