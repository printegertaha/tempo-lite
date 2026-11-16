// Athar (أثـر) — Offline-First Service Worker
const CACHE_VERSION = 'athar-v1.0.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Pre-cached assets for instant offline startup
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon.svg',
];

// Essential app routes to proactively pre-cache for offline navigation
const CORE_ROUTES = [
  '/',
  '/tasks',
  '/planner',
  '/habits',
  '/journal',
  '/abstinence',
  '/analytics',
  '/calendar',
  '/gym',
  '/nutrition',
  '/expenses',
  '/settings',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // 1. Precache offline fallback and core static assets
      await cache.addAll(PRECACHE_URLS);

      // 2. Precache core app routes gracefully (don't fail install if a route has temporary issue)
      for (const route of CORE_ROUTES) {
        try {
          const res = await fetch(route, { credentials: 'same-origin' });
          if (res.ok) {
            await cache.put(route, res);
          }
        } catch {
          // If a route cannot be fetched now, it will be cached on first navigation
        }
      }
    })
  );
  self.skipWaiting();
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

  // 1. Ignore non-GET requests (mutations, outbox sync, POST/PUT/DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Security: Never cache authentication endpoints or secret sessions
  if (url.pathname.startsWith('/api/auth')) {
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
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Attempt exact URL from runtime or static cache
          const cachedResponse = await caches.match(request);
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

  // 4. Next.js Immutable Static Assets — only truly immutable ones (hashed filenames in /_next/static)
  // NOTE: Do NOT cache /_next/static/chunks or generic .js by extension — Turbopack dev chunks are
  // not content-hashed and stale caches cause "module factory not available" errors.
  if (
    url.pathname.startsWith('/_next/static/media/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // /_next/static/chunks and .js files — always network-first to avoid stale module errors
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
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

// Update listener: reload client when instructed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

