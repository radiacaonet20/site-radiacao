const CACHE_NAME = 'radiacaonet-v3.0';
const APP_SHELL = [
  './',
  './index.html',
  './painel.html',
  './style.css?v=3.0',
  './painel.css?v=3.0',
  './script.js?v=3.0',
  './firebase-public.js?v=3.0',
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

function isLiveDataRequest(url) {
  return url.includes('/api/') ||
         url.includes('firebaseio.com') ||
         url.includes('/listen/') ||
         url.endsWith('.mp3') ||
         url.includes('radio.mp3');
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Streaming, AzuraCast API e Firebase nunca entram no cache.
  if (isLiveDataRequest(url)) return;

  // Apenas GET pode ser atendido pelo Cache API.
  if (request.method !== 'GET') return;

  // Navegação: sempre tenta a versão mais nova; offline, usa o shell correto.
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

  // Arquivos do próprio app: Network First, garantindo atualização sem perder o offline.
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

  // Recursos externos (fontes/imagens): Cache First depois do primeiro acesso.
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
