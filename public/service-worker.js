/* Service worker for Check the air PWA
 * - Caches app shell (JS/CSS/icons) with stale-while-revalidate
 * - Bypasses cache for API calls (they need fresh data)
 * - Network-first for HTML so new deploys propagate immediately
 */
const CACHE_VERSION = "cta-v2026-02-01";
const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.json",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-maskable-512.png",
    "/apple-touch-icon.png",
    "/favicon.ico",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) =>
            cache.addAll(APP_SHELL).catch(() => {
                // Ignore individual asset failures during install
            }),
        ),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Never cache API calls — always fresh from backend
    if (url.pathname.startsWith("/api/")) return;

    // HTML navigations: network-first so new builds replace old HTML
    const accept = req.headers.get("accept") || "";
    if (req.mode === "navigate" || accept.includes("text/html")) {
        event.respondWith(
            fetch(req)
                .then((resp) => {
                    const copy = resp.clone();
                    caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
                    return resp;
                })
                .catch(() => caches.match(req).then((cached) => cached || caches.match("/"))),
        );
        return;
    }

    // Same-origin assets: stale-while-revalidate
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(req).then((cached) => {
                const network = fetch(req)
                    .then((resp) => {
                        if (resp && resp.ok) {
                            const copy = resp.clone();
                            caches
                                .open(CACHE_VERSION)
                                .then((c) => c.put(req, copy))
                                .catch(() => {});
                        }
                        return resp;
                    })
                    .catch(() => cached);
                return cached || network;
            }),
        );
    }
});
