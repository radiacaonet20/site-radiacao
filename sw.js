const CACHE_NAME = 'radiacaonet-v6.7';
const APP_SHELL = [
  './',
  './index.html',
  './painel.html',
  './style.css?v=11.3',
  './painel.css?v=3.0',
  './script.js?v=11.7',
  './firebase-public.js?v=5.0',
  './painel.js?v=3.0',
  './painel-firebase.js?v=3.0',
  './manifest.json',
  './manifest-painel.json'
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
         urlString.includes('/listen/') ||
         urlString.endsWith('.mp3') ||
         urlString.includes('radio.mp3') ||
         urlString.includes('rss2json.com') ||
         urlString.includes('allorigins.win') ||
         urlString.includes('globo.com');
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const urlString = request.url;

  if (isLiveDataRequest(urlString)) return;
  if (request.method !== 'GET') return;

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
          return caches.match(url.pathname.endsWith('/painel.html') ? './painel.html' : './index.html');
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

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});