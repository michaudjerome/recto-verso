// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = 'c4d5cb3b';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=c4d5cb3b",
 "js/app.js?v=c4d5cb3b",
 "js/backup.js?v=c4d5cb3b",
 "js/cards.js?v=c4d5cb3b",
 "js/content.js?v=c4d5cb3b",
 "js/courses.js?v=c4d5cb3b",
 "js/db.js?v=c4d5cb3b",
 "js/face.js?v=c4d5cb3b",
 "js/greet.js?v=c4d5cb3b",
 "js/i18n.js?v=c4d5cb3b",
 "js/langs.js?v=c4d5cb3b",
 "js/notice.js?v=c4d5cb3b",
 "js/photos.js?v=c4d5cb3b",
 "js/pinyin.js?v=c4d5cb3b",
 "js/play-kit.js?v=c4d5cb3b",
 "js/profile.js?v=c4d5cb3b",
 "js/srs.js?v=c4d5cb3b",
 "js/ui.js?v=c4d5cb3b",
 "js/update.js?v=c4d5cb3b",
 "js/version.js?v=c4d5cb3b",
 "js/views/create.js?v=c4d5cb3b",
 "js/views/discover.js?v=c4d5cb3b",
 "js/views/home.js?v=c4d5cb3b",
 "js/views/onboarding.js?v=c4d5cb3b",
 "js/views/play.js?v=c4d5cb3b",
 "js/views/review.js?v=c4d5cb3b",
 "js/views/settings.js?v=c4d5cb3b",
 "js/views/sources.js?v=c4d5cb3b",
 "js/vendor/ts-fsrs.mjs?v=c4d5cb3b",
 "data/lang/en.json?v=c4d5cb3b",
 "data/lang/fr.json?v=c4d5cb3b",
 "data/lang/zh.json?v=c4d5cb3b",
 "data/notions.json?v=c4d5cb3b",
 "data/ui/de.json?v=c4d5cb3b",
 "data/ui/en.json?v=c4d5cb3b",
 "data/ui/es.json?v=c4d5cb3b",
 "data/ui/fr.json?v=c4d5cb3b",
 "data/ui/it.json?v=c4d5cb3b",
 "data/ui/pt.json?v=c4d5cb3b",
 "data/ui/zh.json?v=c4d5cb3b",
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
