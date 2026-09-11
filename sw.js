javascript const CACHE_NAME = &#39;valla-control-v4&#39;;
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/api.js",
  "./manifest.json",
  "./icons/icon.svg"
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Cacheando recursos principales...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación y limpieza de caches antiguos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Eliminando cache antiguo:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de recuperación (Fetch)
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Si la petición va a Google Script o Google Drive, usar Network First
  if (requestUrl.hostname.includes("google") || requestUrl.hostname.includes("script.google")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: "Sin conexión a internet" }), {
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // Para recursos estáticos locales (PWA shell): Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
