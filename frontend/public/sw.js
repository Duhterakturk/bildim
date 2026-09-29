// Bildim service worker.
//
// Amaç: (1) PWA/TWA kurulabilirlik kriterlerini karşılamak (bir fetch
// dinleyicisi olan kayıtlı bir service worker), (2) statik build
// varlıklarını (hashli JS/CSS, ikonlar) önbelleğe alıp tekrar ziyarette ve
// zayıf bağlantıda hızlandırmak. `/api/*` istekleri KASITLI olarak asla
// önbelleğe alınmaz — skor/oturum verisi her zaman güncel olmalı.
const CACHE_VERSION = "bildim-v7";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/bildim-192.png", "/icons/bildim-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function openShell(request) {
  const cached = caches.match("/");
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put("/", copy)).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  const hurried = new Promise((resolve) => {
    setTimeout(() => cached.then(resolve), 2500);
  });
  const winner = await Promise.race([network, hurried]);
  if (winner) return winner;
  return (await network) || (await cached) || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // her zaman ağdan, hiç önbelleklenmez

  if (request.mode === "navigate") {
    event.respondWith(openShell(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
