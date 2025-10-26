// Service Worker for taiyzun.com
const CACHE_NAME = 'taiyzun-cache-v1';
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
  '/assets/video/sora.mp4',
  '/assets/Portraits/taiyzun_shahpurwala%2000001.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000002.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000003.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000004.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000005.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000006.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000007.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000008.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000009.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000010.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000011.jpeg',
  '/assets/Portraits/taiyzun_shahpurwala%2000012.jpeg'
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        // Make network request and cache the response
        return fetch(fetchRequest).then(response => {
          // Check if response is valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it can only be used once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});