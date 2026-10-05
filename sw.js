// NOME DA VERSÃO DO CACHE (Mude este número sempre que fizer grandes atualizações)
const CACHE_NAME = 'radiacaonet-v2.0';

// Arquivos principais que o PWA deve guardar
const urlsToCache = [
  '/',
  '/index.html',
  '/painel.html',
  '/style.css?v=2.0',
  '/script.js?v=2.0',
  'https://i.postimg.cc/YSV5B7jW/Logo-Nova-Cor-200.png',
  'https://i.postimg.cc/jd7JYYbX/Logo-Nova-Cor-200.png'
];

// 1. INSTALAÇÃO: Baixa os arquivos novos e "fura a fila" para assumir o controle rápido
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache PWA aberto com sucesso');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ATIVAÇÃO: O faxineiro! Apaga caches de versões antigas automaticamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Limpando cache antigo do PWA:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma o controle de todas as abas abertas na hora
});

// 3. ESTRATÉGIA NETWORK FIRST: Tenta baixar o mais novo, se estiver sem internet, usa o cache
self.addEventListener('fetch', (event) => {
  // Ignora requisições de API (como o AzuraCast e Firebase) para não cacheá-las incorretamente
  if (event.request.url.includes('api/') || event.request.url.includes('firebaseio.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a requisição deu certo, salva uma cópia silenciosa no cache para quando ficar offline
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse; // Devolve o arquivo fresquinho da internet
      })
      .catch(() => {
        // Se falhou (sem internet), busca do cache!
        console.log('Buscando arquivo do cache PWA:', event.request.url);
        return caches.match(event.request);
      })
  );
});