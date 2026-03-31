// Service Worker for taiyzun.com
const CACHE_NAME = 'taiyzun-core-v6';
const RUNTIME_IMAGE_CACHE = 'taiyzun-images-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/odyssey.html',
  '/creations.html',
  '/journey.html',
  '/connect.html',
  '/style.css',
  '/assets/manifest.json',
  '/assets/images/logo.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_IMAGE_CACHE) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event Strategy
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Navigation requests should be network-first to avoid Safari redirect issues
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

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
      if (response && !response.redirected) {
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
      }).catch(() => Response.error());
    })
  );
});

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && !networkResponse.redirected) {
      return networkResponse;
    }
  } catch (_) {}

  const cachedPage = await caches.match('/index.html');
  if (cachedPage) {
    const body = await cachedPage.clone().text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }

  return new Response('Page unavailable offline', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

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
