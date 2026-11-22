// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = 'c7fb2e94';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=c7fb2e94",
 "js/api.js?v=c7fb2e94",
 "js/app.js?v=c7fb2e94",
 "js/backup.js?v=c7fb2e94",
 "js/cards.js?v=c7fb2e94",
 "js/content.js?v=c7fb2e94",
 "js/courses.js?v=c7fb2e94",
 "js/db.js?v=c7fb2e94",
 "js/dict.js?v=c7fb2e94",
 "js/face.js?v=c7fb2e94",
 "js/filter.js?v=c7fb2e94",
 "js/fx.js?v=c7fb2e94",
 "js/greet.js?v=c7fb2e94",
 "js/i18n.js?v=c7fb2e94",
 "js/langs.js?v=c7fb2e94",
 "js/levels.js?v=c7fb2e94",
 "js/notice.js?v=c7fb2e94",
 "js/photos.js?v=c7fb2e94",
 "js/pinyin.js?v=c7fb2e94",
 "js/play-kit.js?v=c7fb2e94",
 "js/profile.js?v=c7fb2e94",
 "js/report.js?v=c7fb2e94",
 "js/srs.js?v=c7fb2e94",
 "js/sync.js?v=c7fb2e94",
 "js/ui.js?v=c7fb2e94",
 "js/update.js?v=c7fb2e94",
 "js/version.js?v=c7fb2e94",
 "js/views/account.js?v=c7fb2e94",
 "js/views/admin.js?v=c7fb2e94",
 "js/views/create.js?v=c7fb2e94",
 "js/views/discover.js?v=c7fb2e94",
 "js/views/home.js?v=c7fb2e94",
 "js/views/onboarding.js?v=c7fb2e94",
 "js/views/play.js?v=c7fb2e94",
 "js/views/progress.js?v=c7fb2e94",
 "js/views/review.js?v=c7fb2e94",
 "js/views/settings.js?v=c7fb2e94",
 "js/views/sources.js?v=c7fb2e94",
 "js/vendor/ts-fsrs.mjs?v=c7fb2e94",
 "data/lang/de.json?v=c7fb2e94",
 "data/lang/en.json?v=c7fb2e94",
 "data/lang/es.json?v=c7fb2e94",
 "data/lang/fr.json?v=c7fb2e94",
 "data/lang/it.json?v=c7fb2e94",
 "data/lang/zh.json?v=c7fb2e94",
 "data/notions.json?v=c7fb2e94",
 "data/ui/de.json?v=c7fb2e94",
 "data/ui/en.json?v=c7fb2e94",
 "data/ui/es.json?v=c7fb2e94",
 "data/ui/fr.json?v=c7fb2e94",
 "data/ui/it.json?v=c7fb2e94",
 "data/ui/pt.json?v=c7fb2e94",
 "data/ui/zh.json?v=c7fb2e94",
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
      for (const r of await old.keys()) if (/\/(fonts\/kai|pictos\/|img\/|dict\/)/.test(r.url) && !(await cur.match(r))) await cur.put(r, await old.match(r));
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
