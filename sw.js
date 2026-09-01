const CACHE = 'ratsion-v6';
const ASSETS = ['./', 'index.html', 'ratsion-ru-sajt.html', 'ratsion-sajt.html',
  'manifest-ru.json', 'manifest-kz.json', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // не трогаем supabase/шрифты
  // HTML-страницы (сам сайт) — СЕТЬ В ПЕРВУЮ ОЧЕРЕДЬ: при интернете всегда свежая версия,
  // без сети — из кэша (офлайн). Так любое обновление сайта подтянется само.
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHTML) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp));
        }
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }
  // Остальное (иконки, манифест) — кэш в первую очередь, обновляем в фоне.
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
