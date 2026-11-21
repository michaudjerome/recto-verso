// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = '53b6203a';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=53b6203a",
 "js/api.js?v=53b6203a",
 "js/app.js?v=53b6203a",
 "js/backup.js?v=53b6203a",
 "js/cards.js?v=53b6203a",
 "js/content.js?v=53b6203a",
 "js/courses.js?v=53b6203a",
 "js/db.js?v=53b6203a",
 "js/dict.js?v=53b6203a",
 "js/face.js?v=53b6203a",
 "js/filter.js?v=53b6203a",
 "js/fx.js?v=53b6203a",
 "js/greet.js?v=53b6203a",
 "js/i18n.js?v=53b6203a",
 "js/langs.js?v=53b6203a",
 "js/notice.js?v=53b6203a",
 "js/photos.js?v=53b6203a",
 "js/pinyin.js?v=53b6203a",
 "js/play-kit.js?v=53b6203a",
 "js/profile.js?v=53b6203a",
 "js/srs.js?v=53b6203a",
 "js/sync.js?v=53b6203a",
 "js/ui.js?v=53b6203a",
 "js/update.js?v=53b6203a",
 "js/version.js?v=53b6203a",
 "js/views/account.js?v=53b6203a",
 "js/views/create.js?v=53b6203a",
 "js/views/discover.js?v=53b6203a",
 "js/views/home.js?v=53b6203a",
 "js/views/onboarding.js?v=53b6203a",
 "js/views/play.js?v=53b6203a",
 "js/views/review.js?v=53b6203a",
 "js/views/settings.js?v=53b6203a",
 "js/views/sources.js?v=53b6203a",
 "js/vendor/ts-fsrs.mjs?v=53b6203a",
 "data/lang/de.json?v=53b6203a",
 "data/lang/en.json?v=53b6203a",
 "data/lang/es.json?v=53b6203a",
 "data/lang/fr.json?v=53b6203a",
 "data/lang/it.json?v=53b6203a",
 "data/lang/zh.json?v=53b6203a",
 "data/notions.json?v=53b6203a",
 "data/ui/de.json?v=53b6203a",
 "data/ui/en.json?v=53b6203a",
 "data/ui/es.json?v=53b6203a",
 "data/ui/fr.json?v=53b6203a",
 "data/ui/it.json?v=53b6203a",
 "data/ui/pt.json?v=53b6203a",
 "data/ui/zh.json?v=53b6203a",
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
