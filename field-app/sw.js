/* ============================================================================
 * sw.js — Service worker for offline use.
 * Pre-caches the app shell so it opens with no internet at the job site.
 * Bump CACHE version when you change any cached file.
 * ========================================================================== */
const CACHE = 'field-agreements-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './agreements.js',
  './storage.js',
  './pdf.js',
  './manifest.webmanifest',
  './vendor/pdf-lib.min.js',
  './vendor/signature_pad.umd.min.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Cache-first for our own assets; network fallback for everything else.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      // Runtime-cache same-origin GETs so future loads work offline
      if (res.ok && new URL(req.url).origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
