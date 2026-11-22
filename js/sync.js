// Synchronisation avec le compte : l'app travaille toujours en local (hors ligne d'abord),
// envoie ce qui a changé et récupère ce qui a changé sur les autres appareils.
// Règle de fusion : pour chaque enregistrement, la version la plus récente l'emporte ; l'historique s'additionne.
import { api, ApiError } from './api.js';
import { kvGet, kvSet, get, getAll, putRaw, delRaw, watchChanges, clearAll, SYNCED, ridOf } from './db.js';

const BATCH = 150;
const MAX_BYTES = 3_500_000;
let account = null;
let rev = 0;
let dirty = new Map(); // `${magasin}\t${identifiant}` -> { s, k, x }
let timer = 0, saveTimer = 0, running = null, again = false;

export const syncState = { state: 'idle', last: 0, error: '' }; // idle | syncing | offline | error | signedout
const emit = (name, detail) => dispatchEvent(new CustomEvent(name, { detail }));
const setState = (state, error = '') => { Object.assign(syncState, { state, error }); emit('rv-sync-state', syncState); };

export const currentAccount = () => account;
export const pendingCount = () => dirty.size;

export async function initSync() {
  account = (await kvGet('account')) || null;
  rev = (await kvGet('syncRev')) || 0;
  syncState.last = (await kvGet('syncLast')) || 0;
  dirty = new Map(Object.entries((await kvGet('syncDirty')) || {}));
  watchChanges(mark);
  // 0.11.2 : le serveur a pu ignorer une partie des envois (PHP 32 bits) ; chaque appareil renvoie tout une fois
  if (account && (await kvGet('syncFull')) !== 2) { await markAll(); await kvSet('syncFull', 2); }
  addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
    else if (dirty.size) syncNow({ keepalive: true });
  });
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 60000);
  return account;
}

function mark(s, k, x = false) {
  dirty.set(`${s}\t${k}`, { s, k, x });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDirty, 300);
  if (account) { clearTimeout(timer); timer = setTimeout(() => syncNow(), 1500); }
}
const saveDirty = () => kvSet('syncDirty', Object.fromEntries(dirty));

const toB64 = (blob) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
const fromB64 = async (url) => (await fetch(url)).blob();

// Prépare un lot de changements à envoyer (taille limitée, photos comprises)
async function collect() {
  const out = [], taken = [];
  let bytes = 0, logs = null;
  for (const [key, e] of dirty) {
    if (out.length >= BATCH || bytes > MAX_BYTES) break;
    let rec = null;
    if (!e.x) {
      if (e.s === 'kv') rec = await get('kv', e.k);
      else if (e.s === 'logs') { logs ??= new Map((await getAll('logs')).map((l) => [ridOf('logs', l), l])); rec = logs.get(e.k) || null; }
      else rec = await get(e.s, e.k);
    }
    let d = null;
    if (rec) {
      d = { ...rec };
      if (e.s === 'logs') delete d.id;
      if (e.s === 'photos' && d.blob instanceof Blob) d.blob = await toB64(d.blob);
    }
    const c = rec ? { s: e.s, k: e.k, u: rec._u || Date.now(), d } : { s: e.s, k: e.k, u: Date.now(), x: true };
    bytes += rec ? JSON.stringify(d).length : 60;
    out.push(c);
    taken.push([key, e]);
  }
  return { out, taken };
}

// Applique ce qui vient du serveur, sans le renvoyer
async function apply(changes) {
  let n = 0, profile = false, logs = null;
  for (const r of changes) {
    if (!SYNCED.includes(r.s)) continue;
    if (r.s === 'logs') {
      logs ??= new Map((await getAll('logs')).map((l) => [ridOf('logs', l), l.id]));
      const id = logs.get(r.k);
      if (r.x) { if (id !== undefined) { await delRaw('logs', id); logs.delete(r.k); n++; } }
      else if (id === undefined && r.d) { const { id: _, ...rest } = r.d; logs.set(r.k, await putRaw('logs', rest)); n++; }
      continue;
    }
    const local = r.s === 'kv' ? await get('kv', r.k) : await get(r.s, r.k);
    const lu = local?._u || 0;
    if (r.x) {
      if (local && lu <= r.u) { await delRaw(r.s, r.k); n++; }
      continue;
    }
    if (!r.d || (local && lu >= r.u)) continue;
    const d = { ...r.d, _u: r.u };
    if (r.s === 'photos' && typeof d.blob === 'string') d.blob = await fromB64(d.blob);
    if (r.s === 'kv') { await putRaw('kv', d, r.k); profile = true; } else await putRaw(r.s, d);
    n++;
  }
  return { n, profile };
}

async function cycle({ keepalive = false } = {}) {
  let total = 0, profile = false;
  for (let round = 0; round < 50; round++) {
    const { out, taken } = await collect();
    const res = await api('sync', { since: rev, changes: out }, { keepalive: keepalive && JSON.stringify(out).length < 60000 });
    for (const [key, e] of taken) if (dirty.get(key) === e) dirty.delete(key);
    await saveDirty();
    const a = await apply(res.changes || []);
    total += a.n; profile ||= a.profile;
    rev = res.rev; await kvSet('syncRev', rev);
    if (res.user && account && (res.user.admin !== account.admin || res.user.name !== account.name)) { account = { ...account, ...res.user }; await kvSet('account', account); }
    if (!res.more && !dirty.size) break;
    if (keepalive) break;
  }
  syncState.last = Date.now();
  await kvSet('syncLast', syncState.last);
  if (total) emit('rv-synced', { count: total, profile });
}

export function syncNow(opts) {
  if (!account) return Promise.resolve();
  if (running) { again = true; return running; }
  setState('syncing');
  running = (async () => {
    try {
      do { again = false; await cycle(opts); } while (again);
      setState('idle');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { setState('signedout'); emit('rv-auth'); }
      else setState(err?.code === 'offline' ? 'offline' : 'error', err?.code || String(err));
    } finally { running = null; }
  })();
  return running;
}

// Connexion réussie : rattache l'appareil au compte puis récupère tout
export async function signIn(user) {
  const prev = (await kvGet('account')) || null;
  if (prev && prev.id !== user.id) { await clearAll(); dirty.clear(); rev = 0; }
  if (!prev || prev.id !== user.id) {
    rev = 0;
    await kvSet('syncRev', 0);
    // Données déjà présentes sur l'appareil (avant tout compte) : elles rejoignent le compte
    if (!prev) await markAll(false);
  }
  account = { id: user.id, email: user.email, name: user.name || '', admin: !!user.admin };
  await kvSet('account', account);
  await kvSet('syncFull', 2);
  emit('rv-signed-in');
  await saveDirty();
  await syncNow();
  if (syncState.state === 'error' || syncState.state === 'offline') throw new ApiError(syncState.error || 'server', 0);
}

// Marque tout le contenu de l'appareil comme à envoyer (le serveur garde la version la plus récente)
async function markAll(save = true) {
  for (const s of SYNCED) {
    if (s === 'kv') { if (await get('kv', 'profile')) dirty.set('kv\tprofile', { s: 'kv', k: 'profile', x: false }); continue; }
    for (const v of await getAll(s)) dirty.set(`${s}\t${ridOf(s, v)}`, { s, k: ridOf(s, v), x: false });
  }
  if (save) await saveDirty();
}

// Déconnexion : l'appareil est vidé (les données restent dans le compte)
export async function signOut({ remote = true } = {}) {
  if (remote) { try { await syncNow(); } catch { /* hors ligne */ } try { await api('logout', {}); } catch { /* hors ligne */ } }
  account = null; dirty.clear(); rev = 0;
  await clearAll();
  try { Object.keys(localStorage).filter((k) => k.startsWith('rv-')).forEach((k) => localStorage.removeItem(k)); } catch { /* indisponible */ }
}
