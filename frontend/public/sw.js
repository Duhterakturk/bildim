// Bildim service worker.
//
// Amaç: (1) PWA/TWA kurulabilirlik kriterlerini karşılamak (bir fetch
// dinleyicisi olan kayıtlı bir service worker), (2) statik build
// varlıklarını (hashli JS/CSS, ikonlar) önbelleğe alıp tekrar ziyarette ve
// zayıf bağlantıda hızlandırmak. `/api/*` istekleri KASITLI olarak asla
// önbelleğe alınmaz — skor/oturum verisi her zaman güncel olmalı.
const CACHE_VERSION = "bildim-v31";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/bildim-brain-192.png", "/icons/bildim-brain-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

// Storage may be unavailable in private mode or when the device is full.
async function readCache(request) {
  try { return await caches.match(request); } catch { return undefined; }
}
async function refresh(request, key = request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(key, copy)).catch(() => {});
    }
    return response;
  } catch { return null; }
}
function unavailable(navigation = false) {
  const body = navigation
    ? '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bildim — Bağlantı bekleniyor</title><body><main><h1>Bağlantı kurulamadı</h1><p>İnternet bağlantınızı kontrol edip yeniden deneyebilirsiniz.</p><a href="">Yeniden dene</a></main></body></html>'
    : 'Bağlantı kurulamadı';
  return new Response(body, { status: 503, headers: {
    'Content-Type': navigation ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  } });
}
async function openShell(request) {
  const cached = readCache('/');
  const network = refresh(request, '/');
  let timer;
  const hurried = new Promise((resolve) => {
    timer = setTimeout(() => cached.then(resolve), 2500);
  });
  const winner = await Promise.race([network, hurried]);
  clearTimeout(timer);
  return winner || (await cached) || (await network) || unavailable(true);
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
    readCache(request).then((cached) => {
      const network = refresh(request);
      return cached || network.then((response) => response || unavailable());
    })
  );
});
