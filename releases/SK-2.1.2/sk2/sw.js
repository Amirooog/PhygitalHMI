// Offline support for the Sliding Knob. Bump VERSION with every build; it must match BUILD and HMI_CONFIG in index.html.
const VERSION = 'SK-2.1.2';
const SHELL = ['./', 'index.html', '../shared/hmi.css', '../shared/hmi.js', 'manifest.webmanifest', '../shared/tokens.css', '../shared/tasks.js', '../shared/logger.js', '../shared/researcher.js', '../shared/researcher.css', '../shared/boot.js', '../shared/boot.css', 'knob2.js', 'knob2.css',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Own files: network first, so a new build arrives when online; cache when offline (in the car).
  if (url.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-store' })
      .then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
    return;
  }
  // Google Fonts and icon font: cache first.
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    })));
  }
});
