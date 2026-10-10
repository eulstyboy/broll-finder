/* Bille Foraine : version installable et hors ligne.
   Fichiers du jeu : réseau d'abord (les mises à jour arrivent tout de suite), copie locale si hors ligne.
   Polices et bibliothèques externes (adresses versionnées) : copie locale d'abord.
   Les scores (/api/) ne passent jamais par le cache. */
const CACHE = 'eulst-bille-2';
/* polices et bibliothèques externes, préchargées pour jouer hors ligne dès l'installation */
const EXTERNAL_PRECACHE = ["https://fonts.googleapis.com/css2?family=Jersey+10&family=Pixelify+Sans:wght@400;600;700&display=swap"];
const PRECACHE = ["./", "./index.html", "./levels.js", "./game.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled([...PRECACHE, ...EXTERNAL_PRECACHE].map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('eulst-bille-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const EXTERNAL = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (!url.href.startsWith(self.registration.scope)) return; /* /api/ et le reste du site : réseau seul */
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
        if (hit) return hit;
        if (req.mode === 'navigate') return cache.match('./index.html');
        throw err;
      }
    })());
    return;
  }

  if (EXTERNAL.includes(url.origin)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })());
  }
});
