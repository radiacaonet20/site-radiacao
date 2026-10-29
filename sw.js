const CACHE_NAME = 'radiacaonet-v6.4';

// Recursos essenciais do site público. As versões devem corresponder ao index.html.
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css?v=11.0',
  './script.js?v=11.0',
  './firebase-public.js?v=5.0',
  './manifest.json?v=6.0'
];

// Recursos do painel são opcionais para o site público: uma falha neles
// não deve impedir a instalação do cache principal. A auditoria do painel
// será feita separadamente.
const OPTIONAL_ASSETS = [
  './painel.html',
  './painel.css?v=3.0',
  './painel.js?v=3.0',
  './painel-firebase.js?v=3.0',
  './manifest-painel.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // O núcleo precisa ser armazenado para considerar a instalação válida.
    await cache.addAll(CORE_ASSETS);

    // Arquivos opcionais são armazenados individualmente; falhas isoladas
    // não cancelam a instalação do service worker.
    await Promise.allSettled(
      OPTIONAL_ASSETS.map((asset) => cache.add(asset))
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('radiacaonet-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
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

async function cacheResponse(request, response) {
  if (!response || !response.ok) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  } catch (error) {
    // Falha de cache não deve impedir a resposta de rede.
    console.warn('Não foi possível atualizar o cache:', error);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const urlString = request.url;

  // Áudio, APIs, Firebase e feeds devem sempre usar dados atuais.
  if (isLiveDataRequest(urlString)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (isSameOrigin(url) && response.ok) {
          event.waitUntil(cacheResponse(request, response));
        }
        return response;
      } catch (error) {
        const cachedPage = await caches.match(request);
        if (cachedPage) return cachedPage;

        const fallback = url.pathname.endsWith('/painel.html')
          ? './painel.html'
          : './index.html';
        const cachedFallback = await caches.match(fallback);
        if (cachedFallback) return cachedFallback;

        return new Response('Você está offline. Conecte-se à internet e tente novamente.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  if (isSameOrigin(url)) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) event.waitUntil(cacheResponse(request, response));
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // Recursos externos: cache-first para reaproveitar recursos já baixados.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      event.waitUntil((async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn('Não foi possível armazenar recurso externo:', error);
        }
      })());
    }
    return response;
  })());
});
