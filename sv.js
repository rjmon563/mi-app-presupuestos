const CACHE_NAME = 'presupro-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Instalación: Guarda los archivos en la memoria del móvil
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Guardando archivos en caché...');
      return cache.addAll(ASSETS);
    })
  );
});

// Intercepta las peticiones para que funcione offline
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});