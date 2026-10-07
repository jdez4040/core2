// Offline support for the A+ Core 2 Drill.
// Bump VERSION whenever index.html changes so phones pick up the new copy.
const VERSION = "core2-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the phone's copy first so it opens instantly and works with no signal.
// When online, quietly fetch a fresh copy in the background for next launch.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // video links go straight to the network

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached =
        (await cache.match(req, { ignoreSearch: true })) ||
        (req.mode === "navigate" ? await cache.match("./index.html") : undefined);

      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      return res || new Response("Offline and not cached yet. Open the app once with a connection.", {
        status: 503, headers: { "Content-Type": "text/plain" },
      });
    })
  );
});
