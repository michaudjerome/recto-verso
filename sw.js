// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = '5dbc5ebe';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=5dbc5ebe",
 "js/app.js?v=5dbc5ebe",
 "js/cards.js?v=5dbc5ebe",
 "js/content.js?v=5dbc5ebe",
 "js/courses.js?v=5dbc5ebe",
 "js/db.js?v=5dbc5ebe",
 "js/face.js?v=5dbc5ebe",
 "js/greet.js?v=5dbc5ebe",
 "js/i18n.js?v=5dbc5ebe",
 "js/langs.js?v=5dbc5ebe",
 "js/pinyin.js?v=5dbc5ebe",
 "js/play-kit.js?v=5dbc5ebe",
 "js/profile.js?v=5dbc5ebe",
 "js/srs.js?v=5dbc5ebe",
 "js/ui.js?v=5dbc5ebe",
 "js/update.js?v=5dbc5ebe",
 "js/version.js?v=5dbc5ebe",
 "js/views/create.js?v=5dbc5ebe",
 "js/views/discover.js?v=5dbc5ebe",
 "js/views/home.js?v=5dbc5ebe",
 "js/views/onboarding.js?v=5dbc5ebe",
 "js/views/play.js?v=5dbc5ebe",
 "js/views/review.js?v=5dbc5ebe",
 "js/views/settings.js?v=5dbc5ebe",
 "js/views/sources.js?v=5dbc5ebe",
 "js/vendor/ts-fsrs.mjs?v=5dbc5ebe",
 "data/lang/en.json?v=5dbc5ebe",
 "data/lang/fr.json?v=5dbc5ebe",
 "data/lang/zh.json?v=5dbc5ebe",
 "data/notions.json?v=5dbc5ebe",
 "data/ui/de.json?v=5dbc5ebe",
 "data/ui/en.json?v=5dbc5ebe",
 "data/ui/es.json?v=5dbc5ebe",
 "data/ui/fr.json?v=5dbc5ebe",
 "data/ui/it.json?v=5dbc5ebe",
 "data/ui/pt.json?v=5dbc5ebe",
 "data/ui/zh.json?v=5dbc5ebe",
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
