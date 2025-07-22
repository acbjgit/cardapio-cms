// sw.js - Service Worker

const CACHE_NAME = 'cardapio-online-v1';
// Lista de ficheiros a serem guardados em cache para funcionamento offline
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
    // Adicione aqui os seus ícones quando os criar
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

// Evento de Instalação: guarda os ficheiros em cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento de Fetch: serve os ficheiros a partir do cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se o ficheiro estiver no cache, retorna-o
                if (response) {
                    return response;
                }
                // Caso contrário, busca na rede
                return fetch(event.request);
            })
    );
});
