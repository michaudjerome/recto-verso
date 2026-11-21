// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = 'ebe38b32';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=ebe38b32",
 "js/api.js?v=ebe38b32",
 "js/app.js?v=ebe38b32",
 "js/backup.js?v=ebe38b32",
 "js/cards.js?v=ebe38b32",
 "js/content.js?v=ebe38b32",
 "js/courses.js?v=ebe38b32",
 "js/db.js?v=ebe38b32",
 "js/dict.js?v=ebe38b32",
 "js/face.js?v=ebe38b32",
 "js/filter.js?v=ebe38b32",
 "js/fx.js?v=ebe38b32",
 "js/greet.js?v=ebe38b32",
 "js/i18n.js?v=ebe38b32",
 "js/langs.js?v=ebe38b32",
 "js/notice.js?v=ebe38b32",
 "js/photos.js?v=ebe38b32",
 "js/pinyin.js?v=ebe38b32",
 "js/play-kit.js?v=ebe38b32",
 "js/profile.js?v=ebe38b32",
 "js/srs.js?v=ebe38b32",
 "js/sync.js?v=ebe38b32",
 "js/ui.js?v=ebe38b32",
 "js/update.js?v=ebe38b32",
 "js/version.js?v=ebe38b32",
 "js/views/account.js?v=ebe38b32",
 "js/views/create.js?v=ebe38b32",
 "js/views/discover.js?v=ebe38b32",
 "js/views/home.js?v=ebe38b32",
 "js/views/onboarding.js?v=ebe38b32",
 "js/views/play.js?v=ebe38b32",
 "js/views/review.js?v=ebe38b32",
 "js/views/settings.js?v=ebe38b32",
 "js/views/sources.js?v=ebe38b32",
 "js/vendor/ts-fsrs.mjs?v=ebe38b32",
 "data/lang/de.json?v=ebe38b32",
 "data/lang/en.json?v=ebe38b32",
 "data/lang/es.json?v=ebe38b32",
 "data/lang/fr.json?v=ebe38b32",
 "data/lang/it.json?v=ebe38b32",
 "data/lang/zh.json?v=ebe38b32",
 "data/notions.json?v=ebe38b32",
 "data/ui/de.json?v=ebe38b32",
 "data/ui/en.json?v=ebe38b32",
 "data/ui/es.json?v=ebe38b32",
 "data/ui/fr.json?v=ebe38b32",
 "data/ui/it.json?v=ebe38b32",
 "data/ui/pt.json?v=ebe38b32",
 "data/ui/zh.json?v=ebe38b32",
 "fonts/fraunces-500.woff2",
 "fonts/fraunces-700.woff2",
 "fonts/inter-400.woff2",
 "fonts/inter-500.woff2",
 "fonts/inter-600.woff2",
 "fonts/inter-700.woff2",
 "icons/apple-touch-icon.png",
 "icons/favicon-32.png",
 "icons/favicon.svg",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png"
];

self.addEventListener('install', (e) => {
  // cache: 'reload' contourne le cache HTTP du navigateur (GitHub Pages garde les fichiers 10 min)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = (await caches.keys()).filter((k) => k.startsWith('rv-'));
    const cur = await caches.open(CACHE);
    // On garde les fichiers lourds déjà téléchargés (police chinoise, pictos, dictionnaires) d'une version à l'autre
    for (const k of keep) if (k !== CACHE) {
      const old = await caches.open(k);
      for (const r of await old.keys()) if (/\/(fonts\/kai|pictos\/|dict\/)/.test(r.url) && !(await cur.match(r))) await cur.put(r, await old.match(r));
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Le serveur (comptes, synchronisation, installation) n'est jamais mis en cache
  if (/\/api\//.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
