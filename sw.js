// Este arquivo funciona como um motor em segundo plano para o PWA.
// Ele é obrigatório para que navegadores como Chrome permitam a instalação do site como App.

self.addEventListener('install', (e) => {
  console.log('[Service Worker] Radiação.Net Instalado');
});

self.addEventListener('fetch', (e) => {
  // Apenas deixa a requisição passar normalmente. 
  // No futuro, isso pode ser usado para fazer o site funcionar offline.
  e.respondWith(fetch(e.request).catch(() => console.log('Acesso offline')));
});