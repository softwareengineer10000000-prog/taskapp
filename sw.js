// Bumo ths whenever any cached file changes, so the browser fetches fresh copies.
const CACHE_NAME = 'taskflow-v7';

const APP_SHELL = [
    './',
    'index.html',
    'completed.html',
    'index.css',
    'completed.css',
    'preloader.css',
    'utils.js',
    'index.js',
    'completed.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => 
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
})

self.addEventListener('fetch', (event) => {
    const {request} = event;

    // Only handle GET requests for static assets. This deliberately skips
    // POST requests to database.php - those must always hit the real
    // network (or fail, which utils.js already handles gracefully).
    if (request.methd !== 'GET') return;

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request)
                .then((response) => {
                    // Cache a copy of anything new we load from this origin,
                    // so it's available offline next time too.
                    if (response.ok && request.url.startsWith(self.location.origin)) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => cached); // offline and not cached - nothing more we can do
        })
    )
})