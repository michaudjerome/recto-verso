// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = '834ea28d';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=834ea28d",
 "js/app.js?v=834ea28d",
 "js/backup.js?v=834ea28d",
 "js/cards.js?v=834ea28d",
 "js/content.js?v=834ea28d",
 "js/courses.js?v=834ea28d",
 "js/db.js?v=834ea28d",
 "js/face.js?v=834ea28d",
 "js/greet.js?v=834ea28d",
 "js/i18n.js?v=834ea28d",
 "js/langs.js?v=834ea28d",
 "js/notice.js?v=834ea28d",
 "js/photos.js?v=834ea28d",
 "js/pinyin.js?v=834ea28d",
 "js/play-kit.js?v=834ea28d",
 "js/profile.js?v=834ea28d",
 "js/srs.js?v=834ea28d",
 "js/ui.js?v=834ea28d",
 "js/update.js?v=834ea28d",
 "js/version.js?v=834ea28d",
 "js/views/create.js?v=834ea28d",
 "js/views/discover.js?v=834ea28d",
 "js/views/home.js?v=834ea28d",
 "js/views/onboarding.js?v=834ea28d",
 "js/views/play.js?v=834ea28d",
 "js/views/review.js?v=834ea28d",
 "js/views/settings.js?v=834ea28d",
 "js/views/sources.js?v=834ea28d",
 "js/vendor/ts-fsrs.mjs?v=834ea28d",
 "data/lang/de.json?v=834ea28d",
 "data/lang/en.json?v=834ea28d",
 "data/lang/es.json?v=834ea28d",
 "data/lang/fr.json?v=834ea28d",
 "data/lang/it.json?v=834ea28d",
 "data/lang/zh.json?v=834ea28d",
 "data/notions.json?v=834ea28d",
 "data/ui/de.json?v=834ea28d",
 "data/ui/en.json?v=834ea28d",
 "data/ui/es.json?v=834ea28d",
 "data/ui/fr.json?v=834ea28d",
 "data/ui/it.json?v=834ea28d",
 "data/ui/pt.json?v=834ea28d",
 "data/ui/zh.json?v=834ea28d",
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
