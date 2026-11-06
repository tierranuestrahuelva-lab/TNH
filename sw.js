const C = 'guia-tn-v2', IMG = 'guia-tn-img';
const F = ['./', 'index.html', 'styles.css', 'app.js', 'data.js', 'manifest.webmanifest', 'assets/logo.svg', 'assets/logo-white.svg', 'assets/icon.svg', 'assets/icon-192.png', 'assets/fira-400.woff2', 'assets/fira-600.woff2', 'assets/fira-cond-500.woff2', 'assets/qrcode.js', 'assets/zxing.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  if (/\/img\/\d+\.jpg$/.test(r.url)) {
    e.respondWith(caches.open(IMG).then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  if (new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r, { ignoreSearch: true })));
});
