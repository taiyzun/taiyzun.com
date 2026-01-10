// Service Worker for taiyzun.com
const CACHE_NAME = 'taiyzun-core-v3';
const RUNTIME_IMAGE_CACHE = 'taiyzun-images-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/odyssey.html',
  '/creations.html',
  '/journey.html',
  '/connect.html',
  '/style.css',
  '/assets/css/gallery.css',
  '/assets/js/gallery.js',
  '/assets/js/diagnostics.js',
  '/assets/js/image-loader.js',
  '/assets/manifest.json',
  '/assets/images/logo.png',
  '/assets/images/Taiyzun-logo.png',
  '/assets/video/sora.mp4'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event Strategy
self.addEventListener('fetch', event => {
  const request = event.request;

  // Handle image requests with a cache-first strategy
  if (request.destination === 'image' || request.url.includes('/assets/Portraits/')) {
    event.respondWith(
      caches.open(RUNTIME_IMAGE_CACHE).then(cache =>
        cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              trimCache(RUNTIME_IMAGE_CACHE, 60);
            }
            return networkResponse;
          }).catch(() => {
            // Fallback to a small cached image (logo)
            return caches.match('/assets/images/logo.png');
          });
        })
      )
    );
    return;
  }

  // Default: try cache first, then network and cache the response
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }

      return fetch(request.clone()).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseToCache);
          });

        return networkResponse;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Helper: trim cache to max items
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
      }
    });
  });
} 
