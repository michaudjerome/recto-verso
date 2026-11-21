// Stockage local : IndexedDB. Chaque écriture des données de la personne est signalée à la synchronisation (js/sync.js).
const NAME = 'recto-verso';
const VERSION = 1;
let opening;

export function openDb() {
  opening ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      const has = (n) => d.objectStoreNames.contains(n);
      if (!has('kv')) d.createObjectStore('kv');
      if (!has('courses')) d.createObjectStore('courses', { keyPath: 'id' });
      if (!has('cards')) {
        const s = d.createObjectStore('cards', { keyPath: 'id' });
        s.createIndex('course', 'course');
        s.createIndex('notion', 'notion');
        s.createIndex('course_due', ['course', 'due']);
      }
      if (!has('decks')) d.createObjectStore('decks', { keyPath: 'id' }).createIndex('course', 'course');
      if (!has('logs')) {
        const l = d.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        l.createIndex('day', 'day');
        l.createIndex('course', 'course');
      }
      if (!has('photos')) d.createObjectStore('photos', { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return opening;
}

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const store = async (name, mode = 'readonly') => (await openDb()).transaction(name, mode).objectStore(name);

// Magasins synchronisés avec le compte (dans kv, seul le profil part sur le serveur)
export const SYNCED = ['kv', 'courses', 'cards', 'decks', 'logs', 'photos'];
const synced = (s, key) => SYNCED.includes(s) && (s !== 'kv' || key === 'profile');
let onChange = null;
export const watchChanges = (fn) => { onChange = fn; };
// Identifiant stable d'un enregistrement d'un appareil à l'autre (les historiques ont un numéro local)
export const ridOf = (s, value, key) => (s === 'kv' ? key : s === 'logs' ? `${value.ts}:${value.card}` : value.id);

export const get = async (s, key) => req((await store(s)).get(key));
export const getAll = async (s) => req((await store(s)).getAll());
export async function put(s, value, key) {
  const tracked = synced(s, key) && value && typeof value === 'object';
  if (tracked) value._u = Math.max(Date.now(), (value._u || 0) + 1);
  const k = await req((await store(s, 'readwrite')).put(value, key));
  if (tracked) onChange?.(s, ridOf(s, value, key));
  return k;
}
export async function del(s, key) {
  const tracked = synced(s, key);
  const value = tracked ? await get(s, key) : null;
  await req((await store(s, 'readwrite')).delete(key));
  if (tracked && value) onChange?.(s, ridOf(s, value, key), true);
}
// Écritures venues du serveur : ne repartent pas vers lui
export const putRaw = async (s, value, key) => req((await store(s, 'readwrite')).put(value, key));
export const delRaw = async (s, key) => req((await store(s, 'readwrite')).delete(key));
export async function clearAll() {
  const d = await openDb();
  await Promise.all([...d.objectStoreNames].map((n) => req(d.transaction(n, 'readwrite').objectStore(n).clear())));
}
export const getAllByIndex = async (s, index, query) => req((await store(s)).index(index).getAll(query));
export const countByIndex = async (s, index, query) => req((await store(s)).index(index).count(query));

// Supprime toutes les entrées d'un magasin qui correspondent à un index (ex. les cartes d'un parcours)
export async function deleteByIndex(s, index, query) {
  const st = await store(s, 'readwrite');
  const values = synced(s) ? await req(st.index(index).getAll(query)) : [];
  const keys = await req(st.index(index).getAllKeys(query));
  await Promise.all(keys.map((k) => req(st.delete(k))));
  for (const v of values) onChange?.(s, ridOf(s, v), true);
  return keys.length;
}

export const kvGet = (key) => get('kv', key);
export const kvSet = (key, value) => put('kv', value, key);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Demande au navigateur de ne pas effacer les données en cas de manque de place
export async function askPersistence() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch {}
}
