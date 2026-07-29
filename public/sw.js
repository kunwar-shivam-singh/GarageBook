const CACHE_NAME = 'garagebook-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// On install, cache all predefined static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// On activation, clear old caches to handle updates smoothly
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercept requests and cache them based on asset types
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Skip non-GET, API, or database connections
  if (
    request.method !== 'GET' ||
    request.url.includes('/api/') ||
    request.url.includes('supabase.co') ||
    request.url.includes('chrome-extension://')
  ) {
    return;
  }

  const url = new URL(request.url);

  // 2. Network-First cache fallback strategy for HTML/page documents
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/login') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // If offline, try serving the index/login from cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/login') || caches.match('/');
          });
        })
    );
    return;
  }

  // 3. Cache-First network fallback strategy for static assets (JS, CSS, images, icons, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Verify response is valid to cache
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Fallback if resource is completely offline
          if (request.destination === 'image') {
            return caches.match('/icons/icon-192x192.png');
          }
          return new Response('Offline resource unavailable', { status: 503, statusText: 'Service Unavailable' });
        });
    })
  );
});
