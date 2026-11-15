// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = '6e989bb0';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=6e989bb0",
 "js/app.js?v=6e989bb0",
 "js/backup.js?v=6e989bb0",
 "js/cards.js?v=6e989bb0",
 "js/content.js?v=6e989bb0",
 "js/courses.js?v=6e989bb0",
 "js/db.js?v=6e989bb0",
 "js/dict.js?v=6e989bb0",
 "js/face.js?v=6e989bb0",
 "js/filter.js?v=6e989bb0",
 "js/fx.js?v=6e989bb0",
 "js/greet.js?v=6e989bb0",
 "js/i18n.js?v=6e989bb0",
 "js/langs.js?v=6e989bb0",
 "js/notice.js?v=6e989bb0",
 "js/photos.js?v=6e989bb0",
 "js/pinyin.js?v=6e989bb0",
 "js/play-kit.js?v=6e989bb0",
 "js/profile.js?v=6e989bb0",
 "js/srs.js?v=6e989bb0",
 "js/ui.js?v=6e989bb0",
 "js/update.js?v=6e989bb0",
 "js/version.js?v=6e989bb0",
 "js/views/create.js?v=6e989bb0",
 "js/views/discover.js?v=6e989bb0",
 "js/views/home.js?v=6e989bb0",
 "js/views/onboarding.js?v=6e989bb0",
 "js/views/play.js?v=6e989bb0",
 "js/views/review.js?v=6e989bb0",
 "js/views/settings.js?v=6e989bb0",
 "js/views/sources.js?v=6e989bb0",
 "js/vendor/ts-fsrs.mjs?v=6e989bb0",
 "data/lang/de.json?v=6e989bb0",
 "data/lang/en.json?v=6e989bb0",
 "data/lang/es.json?v=6e989bb0",
 "data/lang/fr.json?v=6e989bb0",
 "data/lang/it.json?v=6e989bb0",
 "data/lang/zh.json?v=6e989bb0",
 "data/notions.json?v=6e989bb0",
 "data/ui/de.json?v=6e989bb0",
 "data/ui/en.json?v=6e989bb0",
 "data/ui/es.json?v=6e989bb0",
 "data/ui/fr.json?v=6e989bb0",
 "data/ui/it.json?v=6e989bb0",
 "data/ui/pt.json?v=6e989bb0",
 "data/ui/zh.json?v=6e989bb0",
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
