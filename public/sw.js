// Athar (أثـر) — Offline-First Service Worker
const CACHE_VERSION = 'athar-v1.2.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Pre-cached assets for instant offline startup
const PRECACHE_URLS = [
  '/welcome',
  '/manifest.json',
  '/offline.html',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Essential app routes to proactively pre-cache for offline navigation
const CORE_ROUTES = [
  '/welcome',
  '/',
  '/tasks',
  '/habits',
  '/habits/wheel',
  '/journal',
  '/abstinence',
  '/analytics',
  '/calendar',
  '/gym',
  '/nutrition',
  '/expenses',
  '/quran',
  '/settings',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // 1. Precache offline fallback and core static assets
      await cache.addAll(PRECACHE_URLS);

      // 2. Precache core app routes gracefully (skip redirected responses)
      for (const route of CORE_ROUTES) {
        try {
          const res = await fetch(route, { credentials: 'same-origin', redirect: 'manual' });
          if (res.status === 200) {
            await cache.put(route, res);
          }
        } catch {
          // If a route cannot be fetched now, it will be cached on first navigation
        }
      }
    })
  );
  // Activate immediately ONLY on fresh install; updates wait for user confirmation via SKIP_WAITING
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!key.startsWith(CACHE_VERSION)) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1. Never cache authentication endpoints, API routes, login, or register
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/login' ||
    url.pathname === '/register'
  ) {
    return;
  }

  // 2. Next.js RSC Flight navigation & prefetch payloads for static app-shell routes:
  // Cache under a distinct synthetic URL prefix `/__rsc` so Flight data never collides with HTML documents.
  const isRscRequest =
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-Prefetch') ||
    request.headers.has('Next-Router-Segment-Prefetch');

  if (isRscRequest) {
    const rscCacheKey = new Request(`${url.origin}/__rsc${url.pathname}`);
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(rscCacheKey, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedRsc = await caches.match(rscCacheKey);
          if (cachedRsc) return cachedRsc;
          return new Response('', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 3. Navigation requests (HTML page loads)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(url.pathname, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Attempt exact pathname from runtime or static cache
          const cachedResponse =
            (await caches.match(url.pathname)) || (await caches.match(request));
          if (cachedResponse) {
            return cachedResponse;
          }

          // Attempt root '/' app shell cache
          const rootCached = await caches.match('/');
          if (rootCached) {
            return rootCached;
          }

          // First-time visit without internet: render offline.html
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 4. Production Next.js hashed static bundles & static media assets (Cache-First)
  // PwaRegister only registers sw.js when NODE_ENV === 'production', where /_next/static/ files are content-hashed & immutable.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // Other /_next/ requests (e.g. _next/image) — Network-First with cache fallback
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // 5. Default: Stale-While-Revalidate for other GET requests
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Background Sync fallback trigger (notifies open clients to flush IDB Outbox)
self.addEventListener('sync', (event) => {
  if (event.tag === 'athar-outbox-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'SW_BACKGROUND_SYNC' });
        }
      })
    );
  }
});

// Update listener: promote waiting SW when user confirms update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

