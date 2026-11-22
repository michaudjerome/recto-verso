// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = 'b6249f10';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=b6249f10",
 "js/api.js?v=b6249f10",
 "js/app.js?v=b6249f10",
 "js/backup.js?v=b6249f10",
 "js/cards.js?v=b6249f10",
 "js/content.js?v=b6249f10",
 "js/courses.js?v=b6249f10",
 "js/db.js?v=b6249f10",
 "js/dict.js?v=b6249f10",
 "js/face.js?v=b6249f10",
 "js/filter.js?v=b6249f10",
 "js/fx.js?v=b6249f10",
 "js/greet.js?v=b6249f10",
 "js/i18n.js?v=b6249f10",
 "js/langs.js?v=b6249f10",
 "js/notice.js?v=b6249f10",
 "js/photos.js?v=b6249f10",
 "js/pinyin.js?v=b6249f10",
 "js/play-kit.js?v=b6249f10",
 "js/profile.js?v=b6249f10",
 "js/srs.js?v=b6249f10",
 "js/sync.js?v=b6249f10",
 "js/ui.js?v=b6249f10",
 "js/update.js?v=b6249f10",
 "js/version.js?v=b6249f10",
 "js/views/account.js?v=b6249f10",
 "js/views/create.js?v=b6249f10",
 "js/views/discover.js?v=b6249f10",
 "js/views/home.js?v=b6249f10",
 "js/views/onboarding.js?v=b6249f10",
 "js/views/play.js?v=b6249f10",
 "js/views/review.js?v=b6249f10",
 "js/views/settings.js?v=b6249f10",
 "js/views/sources.js?v=b6249f10",
 "js/vendor/ts-fsrs.mjs?v=b6249f10",
 "data/lang/de.json?v=b6249f10",
 "data/lang/en.json?v=b6249f10",
 "data/lang/es.json?v=b6249f10",
 "data/lang/fr.json?v=b6249f10",
 "data/lang/it.json?v=b6249f10",
 "data/lang/zh.json?v=b6249f10",
 "data/notions.json?v=b6249f10",
 "data/ui/de.json?v=b6249f10",
 "data/ui/en.json?v=b6249f10",
 "data/ui/es.json?v=b6249f10",
 "data/ui/fr.json?v=b6249f10",
 "data/ui/it.json?v=b6249f10",
 "data/ui/pt.json?v=b6249f10",
 "data/ui/zh.json?v=b6249f10",
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
