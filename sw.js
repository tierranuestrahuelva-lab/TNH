const C = 'tpv-tn-v4';
const F = ['./', 'index.html', 'styles.css', 'app.js', 'movil.js', 'data.js', 'manifest.webmanifest', 'assets/logo.svg', 'assets/logo-white.svg', 'assets/logo-ticket.svg', 'assets/icon.svg', 'assets/icon-192.png', 'assets/fira-400.woff2', 'assets/fira-600.woff2', 'assets/fira-cond-500.woff2', 'assets/JsBarcode.code128.min.js', 'assets/qrcode.js', 'assets/xlsx.full.min.js', 'assets/zxing.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
