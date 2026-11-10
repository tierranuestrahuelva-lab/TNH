const C = 'central-tn-v1';
const F = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'assets/logo-white.svg', 'assets/logo.svg', 'assets/icon-192.png', 'assets/fira-400.woff2', 'assets/fira-600.woff2', 'assets/fira-cond-500.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('central-tn') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r, { ignoreSearch: true })));
});
