// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = '96303da3';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=96303da3",
 "js/api.js?v=96303da3",
 "js/app.js?v=96303da3",
 "js/backup.js?v=96303da3",
 "js/cards.js?v=96303da3",
 "js/content.js?v=96303da3",
 "js/courses.js?v=96303da3",
 "js/db.js?v=96303da3",
 "js/dict.js?v=96303da3",
 "js/face.js?v=96303da3",
 "js/filter.js?v=96303da3",
 "js/fx.js?v=96303da3",
 "js/greet.js?v=96303da3",
 "js/i18n.js?v=96303da3",
 "js/langs.js?v=96303da3",
 "js/notice.js?v=96303da3",
 "js/photos.js?v=96303da3",
 "js/pinyin.js?v=96303da3",
 "js/play-kit.js?v=96303da3",
 "js/profile.js?v=96303da3",
 "js/report.js?v=96303da3",
 "js/srs.js?v=96303da3",
 "js/sync.js?v=96303da3",
 "js/ui.js?v=96303da3",
 "js/update.js?v=96303da3",
 "js/version.js?v=96303da3",
 "js/views/account.js?v=96303da3",
 "js/views/admin.js?v=96303da3",
 "js/views/create.js?v=96303da3",
 "js/views/discover.js?v=96303da3",
 "js/views/home.js?v=96303da3",
 "js/views/onboarding.js?v=96303da3",
 "js/views/play.js?v=96303da3",
 "js/views/progress.js?v=96303da3",
 "js/views/review.js?v=96303da3",
 "js/views/settings.js?v=96303da3",
 "js/views/sources.js?v=96303da3",
 "js/vendor/ts-fsrs.mjs?v=96303da3",
 "data/lang/de.json?v=96303da3",
 "data/lang/en.json?v=96303da3",
 "data/lang/es.json?v=96303da3",
 "data/lang/fr.json?v=96303da3",
 "data/lang/it.json?v=96303da3",
 "data/lang/zh.json?v=96303da3",
 "data/notions.json?v=96303da3",
 "data/ui/de.json?v=96303da3",
 "data/ui/en.json?v=96303da3",
 "data/ui/es.json?v=96303da3",
 "data/ui/fr.json?v=96303da3",
 "data/ui/it.json?v=96303da3",
 "data/ui/pt.json?v=96303da3",
 "data/ui/zh.json?v=96303da3",
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
