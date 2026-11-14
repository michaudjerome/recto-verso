// Service worker généré par tools/stamp.py : ne pas modifier à la main
const V = 'b4eeccc4';
const CACHE = `rv-${V}`;
const CORE = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "css/base.css?v=b4eeccc4",
 "js/app.js?v=b4eeccc4",
 "js/content.js?v=b4eeccc4",
 "js/courses.js?v=b4eeccc4",
 "js/db.js?v=b4eeccc4",
 "js/greet.js?v=b4eeccc4",
 "js/i18n.js?v=b4eeccc4",
 "js/langs.js?v=b4eeccc4",
 "js/profile.js?v=b4eeccc4",
 "js/ui.js?v=b4eeccc4",
 "js/update.js?v=b4eeccc4",
 "js/version.js?v=b4eeccc4",
 "js/views/home.js?v=b4eeccc4",
 "js/views/onboarding.js?v=b4eeccc4",
 "js/views/settings.js?v=b4eeccc4",
 "js/views/sources.js?v=b4eeccc4",
 "js/vendor/ts-fsrs.mjs?v=b4eeccc4",
 "data/lang/en.json?v=b4eeccc4",
 "data/lang/fr.json?v=b4eeccc4",
 "data/lang/zh.json?v=b4eeccc4",
 "data/notions.json?v=b4eeccc4",
 "data/ui/de.json?v=b4eeccc4",
 "data/ui/en.json?v=b4eeccc4",
 "data/ui/es.json?v=b4eeccc4",
 "data/ui/fr.json?v=b4eeccc4",
 "data/ui/it.json?v=b4eeccc4",
 "data/ui/pt.json?v=b4eeccc4",
 "data/ui/zh.json?v=b4eeccc4",
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
