// Sauvegarde : un fichier qui contient tout (cartes, progression, photos), rien ne passe par Internet.
// Lit aussi les sauvegardes de « J'apprends le chinois » pour reprendre les cartes et la progression.
import { getAll, put, get, kvGet, kvSet } from './db.js';
import { profile, saveProfile } from './profile.js';
import { addCourse, setActive } from './courses.js';
import { cardId } from './cards.js';
import { APP_VERSION } from './version.js';
import { dayKey } from './ui.js';
import { base } from './langs.js';

const toB64 = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
const fromB64 = async (dataUrl) => (await fetch(dataUrl)).blob();

export async function exportBackup() {
  const [courses, cards, decks, logs, photos] = await Promise.all(['courses', 'cards', 'decks', 'logs', 'photos'].map(getAll));
  const ph = await Promise.all(photos.map(async (p) => ({ ...p, blob: await toB64(p.blob) })));
  const data = { app: 'recto-verso', format: 1, version: APP_VERSION, exported: new Date().toISOString(), profile: { ...profile }, courses, cards, decks, logs, photos: ph };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = `recto-verso-${dayKey()}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  await kvSet('lastBackup', Date.now());
  return cards.length;
}

const newer = (a, b) => (a.fsrs?.last_review || 0) > (b.fsrs?.last_review || 0) || (a.updated || 0) > (b.updated || 0);

export async function importBackup(file) {
  const data = JSON.parse(await file.text());
  if (data?.app === 'japprends-le-chinois') return importChinese(data);
  if (data?.app !== 'recto-verso' || !Array.isArray(data.cards)) throw new Error('bad');
  for (const c of data.courses || []) if (!(await get('courses', c.id))) await put('courses', c);
  for (const d of data.decks || []) await put('decks', d);
  for (const p of data.photos || []) if (!(await get('photos', p.id))) await put('photos', { ...p, blob: await fromB64(p.blob) });
  let n = 0;
  for (const c of data.cards) { const m = await get('cards', c.id); if (!m || newer(c, m)) { await put('cards', c); n++; } }
  const seen = new Set((await getAll('logs')).map((l) => `${l.ts}:${l.card}`));
  for (const l of data.logs || []) if (!seen.has(`${l.ts}:${l.card}`)) { const { id, ...rest } = l; await put('logs', rest); }
  if (!profile.native && data.profile) await saveProfile(data.profile);
  return n;
}

// « J'apprends le chinois » : chaque caractère retrouve sa notion (sinon il devient une carte perso), progression comprise
async function importChinese(data) {
  if (base(profile.native) === 'zh') throw new Error('bad');
  const course = await addCourse('zh', 'beginner');
  const zh = (await (await fetch(`data/lang/zh.json${window.APP_STAMP ? `?v=${window.APP_STAMP}` : ''}`)).json()).entries;
  const byHanzi = new Map(Object.entries(zh).map(([id, e]) => [e.w, id]));
  const ids = new Map();
  let n = 0;
  for (const c of data.cards || []) {
    const notion = byHanzi.get(c.hanzi);
    const id = notion ? cardId(course.id, notion) : cardId(course.id, `p:jlc-${c.id}`);
    const card = {
      id, course: course.id, notion: notion || null, dir: 't>n', deck: 'default',
      created: c.created || Date.now(), updated: c.updated || c.created || Date.now(), due: c.due ?? Date.now(), state: c.state ?? 0,
      ...(c.fsrs ? { fsrs: c.fsrs } : {}),
      ...(notion ? {} : { perso: { front: { w: c.hanzi, py: c.pinyin }, back: { w: c.fr }, ex: c.example || '', picto: '' } }),
    };
    const m = await get('cards', id);
    if (!m || newer(card, m)) { await put('cards', card); n++; }
    ids.set(c.id, id);
  }
  const seen = new Set((await getAll('logs')).map((l) => `${l.ts}:${l.card}`));
  for (const l of data.logs || []) {
    const card = ids.get(l.cardId);
    if (card && !seen.has(`${l.ts}:${card}`)) await put('logs', { day: l.day, ts: l.ts, course: course.id, card, rating: l.rating, mode: 'review', wasNew: !!l.wasNew });
  }
  if (!profile.name && data.settings?.name) await saveProfile({ name: data.settings.name });
  await setActive(course.id);
  return n;
}

export const lastBackup = () => kvGet('lastBackup');
