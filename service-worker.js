const CACHE_NAME = "offline-great-courses-v14";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./src/app.js",
  "./src/styles.css",
  "./content/curriculum-index.json",
  "./content/weeks/week-001.json",
  "./content/weeks/week-002.json",
  "./content/weeks/week-003.json",
  "./content/weeks/week-004.json",
  "./content/weeks/week-005.json",
  "./content/weeks/week-006.json",
  "./content/weeks/week-007.json",
  "./content/weeks/week-008.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
