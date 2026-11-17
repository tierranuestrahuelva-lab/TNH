/* Solo recursos estáticos de Reparto; nunca guarda respuestas de Supabase. */
const CACHE = 'tn-reparto-v2'
const FICHEROS = ['./', 'index.html', 'app.js?v=gps-puntual', 'prep.js', 'almacen-logica.js', 'trazabilidad.js', 'comercial.js', 'comercial-media.js', 'config.js', 'styles.css', 'assets/logo-white.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'vendor/leaflet.css', 'vendor/leaflet.js', 'vendor/xlsx.full.min.js', 'vendor/JsBarcode.all.min.js']
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHEROS)).then(() => self.skipWaiting())))
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('tn-reparto-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())))
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url), scope = new URL(self.registration.scope)
  if (e.request.method !== 'GET' || u.origin !== scope.origin || !u.pathname.startsWith(scope.pathname)) return
  e.respondWith(fetch(e.request).then((res) => { if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)) }; return res }).catch(() => caches.match(e.request, { ignoreSearch: true })))
})