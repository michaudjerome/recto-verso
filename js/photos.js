// Photos perso du mode Créer : compressées sur le téléphone (environ 500 px), jamais envoyées en ligne
import { get, put, del, uid } from './db.js';

const urls = new Map();

export async function compress(file, max = 512) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = (type) => new Promise((r) => c.toBlob(r, type, 0.8));
  let b = await blob('image/webp');
  if (!b || b.type !== 'image/webp') b = await blob('image/jpeg'); // anciens Safari : pas d'encodage WebP
  return b;
}

export async function savePhoto(blob) {
  const id = uid();
  await put('photos', { id, blob, created: Date.now() });
  return id;
}

export async function photoUrl(id) {
  if (!id) return '';
  if (urls.has(id)) return urls.get(id);
  const p = await get('photos', id);
  if (!p?.blob) return '';
  const u = URL.createObjectURL(p.blob);
  urls.set(id, u);
  return u;
}

export const deletePhoto = (id) => (id ? del('photos', id) : null);
