// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = '975a6a6d';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=975a6a6d",
 "js/app.js?v=975a6a6d",
 "js/backup.js?v=975a6a6d",
 "js/cards.js?v=975a6a6d",
 "js/content.js?v=975a6a6d",
 "js/courses.js?v=975a6a6d",
 "js/db.js?v=975a6a6d",
 "js/dict.js?v=975a6a6d",
 "js/face.js?v=975a6a6d",
 "js/greet.js?v=975a6a6d",
 "js/i18n.js?v=975a6a6d",
 "js/langs.js?v=975a6a6d",
 "js/notice.js?v=975a6a6d",
 "js/photos.js?v=975a6a6d",
 "js/pinyin.js?v=975a6a6d",
 "js/play-kit.js?v=975a6a6d",
 "js/profile.js?v=975a6a6d",
 "js/srs.js?v=975a6a6d",
 "js/ui.js?v=975a6a6d",
 "js/update.js?v=975a6a6d",
 "js/version.js?v=975a6a6d",
 "js/views/create.js?v=975a6a6d",
 "js/views/discover.js?v=975a6a6d",
 "js/views/home.js?v=975a6a6d",
 "js/views/onboarding.js?v=975a6a6d",
 "js/views/play.js?v=975a6a6d",
 "js/views/review.js?v=975a6a6d",
 "js/views/settings.js?v=975a6a6d",
 "js/views/sources.js?v=975a6a6d",
 "js/vendor/ts-fsrs.mjs?v=975a6a6d",
 "data/lang/de.json?v=975a6a6d",
 "data/lang/en.json?v=975a6a6d",
 "data/lang/es.json?v=975a6a6d",
 "data/lang/fr.json?v=975a6a6d",
 "data/lang/it.json?v=975a6a6d",
 "data/lang/zh.json?v=975a6a6d",
 "data/notions.json?v=975a6a6d",
 "data/ui/de.json?v=975a6a6d",
 "data/ui/en.json?v=975a6a6d",
 "data/ui/es.json?v=975a6a6d",
 "data/ui/fr.json?v=975a6a6d",
 "data/ui/it.json?v=975a6a6d",
 "data/ui/pt.json?v=975a6a6d",
 "data/ui/zh.json?v=975a6a6d",
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
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
