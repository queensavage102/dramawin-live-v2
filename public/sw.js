const CACHE_NAME = 'dramawin-pwa-v2';
const APP_SHELL = ['/manifest.json', '/icon.svg', '/pwa-192x192.png', '/pwa-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isNetworkFirstAsset(request, url) {
  if (request.mode === 'navigate' || request.destination === 'document') {
    return true;
  }
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    /\.(html?|m?js|css)(\?|$)/i.test(url.pathname) ||
    url.pathname === '/'
  ) {
    return true;
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API routes or sw.js itself
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') {
    return;
  }

  // Network-First for HTML, JS, and CSS so every visitor gets the latest code automatically
  if (isNetworkFirstAsset(request, url)) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === 'navigate') {
              return caches.match('/').then((rootCached) => rootCached || Response.error());
            }
            return Response.error();
          })
        )
    );
    return;
  }

  // Cache-First for static icons/images
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
        }
        return response;
      });
    })
  );
});
