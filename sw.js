// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = 'a3dd33fd';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=a3dd33fd",
 "js/app.js?v=a3dd33fd",
 "js/backup.js?v=a3dd33fd",
 "js/cards.js?v=a3dd33fd",
 "js/content.js?v=a3dd33fd",
 "js/courses.js?v=a3dd33fd",
 "js/db.js?v=a3dd33fd",
 "js/face.js?v=a3dd33fd",
 "js/greet.js?v=a3dd33fd",
 "js/i18n.js?v=a3dd33fd",
 "js/langs.js?v=a3dd33fd",
 "js/photos.js?v=a3dd33fd",
 "js/pinyin.js?v=a3dd33fd",
 "js/play-kit.js?v=a3dd33fd",
 "js/profile.js?v=a3dd33fd",
 "js/srs.js?v=a3dd33fd",
 "js/ui.js?v=a3dd33fd",
 "js/update.js?v=a3dd33fd",
 "js/version.js?v=a3dd33fd",
 "js/views/create.js?v=a3dd33fd",
 "js/views/discover.js?v=a3dd33fd",
 "js/views/home.js?v=a3dd33fd",
 "js/views/onboarding.js?v=a3dd33fd",
 "js/views/play.js?v=a3dd33fd",
 "js/views/review.js?v=a3dd33fd",
 "js/views/settings.js?v=a3dd33fd",
 "js/views/sources.js?v=a3dd33fd",
 "js/vendor/ts-fsrs.mjs?v=a3dd33fd",
 "data/lang/en.json?v=a3dd33fd",
 "data/lang/fr.json?v=a3dd33fd",
 "data/lang/zh.json?v=a3dd33fd",
 "data/notions.json?v=a3dd33fd",
 "data/ui/de.json?v=a3dd33fd",
 "data/ui/en.json?v=a3dd33fd",
 "data/ui/es.json?v=a3dd33fd",
 "data/ui/fr.json?v=a3dd33fd",
 "data/ui/it.json?v=a3dd33fd",
 "data/ui/pt.json?v=a3dd33fd",
 "data/ui/zh.json?v=a3dd33fd",
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
