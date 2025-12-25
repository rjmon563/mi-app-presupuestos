const CACHE_NAME = 'presupro-v3-cache'; // Cambiado a v3 para forzar la actualización
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png' // Asegúrate de que el nombre coincida con tu archivo de imagen
];

// Instalación: Guarda los archivos en el móvil
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Borra cachés antiguos para que no ocupen espacio
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Estrategia: Carga primero de internet, si falla, usa el caché (Network First)
// Esto es mejor para una app donde los datos cambian
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
