// Stockage local : IndexedDB, rien ne quitte le téléphone.
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

export const get = async (s, key) => req((await store(s)).get(key));
export const getAll = async (s) => req((await store(s)).getAll());
export const put = async (s, value, key) => req((await store(s, 'readwrite')).put(value, key));
export const del = async (s, key) => req((await store(s, 'readwrite')).delete(key));
export const getAllByIndex = async (s, index, query) => req((await store(s)).index(index).getAll(query));
export const countByIndex = async (s, index, query) => req((await store(s)).index(index).count(query));

// Supprime toutes les entrées d'un magasin qui correspondent à un index (ex. les cartes d'un parcours)
export async function deleteByIndex(s, index, query) {
  const st = await store(s, 'readwrite');
  const keys = await req(st.index(index).getAllKeys(query));
  await Promise.all(keys.map((k) => req(st.delete(k))));
  return keys.length;
}

export const kvGet = (key) => get('kv', key);
export const kvSet = (key, value) => put('kv', value, key);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Demande au navigateur de ne pas effacer les données en cas de manque de place
export async function askPersistence() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch {}
}
