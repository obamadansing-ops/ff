/* Offline cache for the Plazma Burst 2 mobile build. Bump V to force clients to refresh. */
const V = 'pb2m-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'mobile/mobile.js', 'mobile/mobile.css'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  const shell = r.mode === 'navigate' || u.pathname.endsWith('/') || /\/(index\.html|sw\.js|manifest\.webmanifest)$|\/mobile\//.test(u.pathname);
  if (shell) { // small files: network first so updates arrive, cache as offline fallback
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { // big game assets: cache first
    if (res.status === 200) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
    return res;
  })));
});
