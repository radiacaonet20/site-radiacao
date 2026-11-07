const CACHE_NAME = 'radiacaonet-v9.3';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=13.2',
  './script.js?v=community-3.3',
  './firebase-public.js?v=5.5',
  './site-dynamic.js?v=1.3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function isLiveDataRequest(urlString) {
  return urlString.includes('/api/') ||
         urlString.includes('firebaseio.com') ||
         urlString.includes('firebasedatabase.app') ||
         urlString.includes('/listen/') ||
         urlString.endsWith('.mp3') ||
         urlString.includes('radio.mp3') ||
         urlString.includes('rss2json.com') ||
         urlString.includes('allorigins.win') ||
         urlString.includes('globo.com') ||
         urlString.includes('workers.dev');
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  // Controla somente recursos HTTP(S) da própria origem.
  // Extensões, esquemas internos e CDNs seguem diretamente pelo navegador.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;
  if (isLiveDataRequest(request.url)) return;
  if (request.method !== 'GET') return;
  const urlString = request.url;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isSameOrigin(url) && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('./index.html');
        })
    );
    return;
  }

  if (isSameOrigin(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Requisições externas não são interceptadas nem armazenadas por este worker.
});
