const CACHE_NAME = "ondoku-garden-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.json",

  // sounds
  "./sounds/pop.mp3",
  "./sounds/bloom.mp3",
  "./sounds/next.mp3",

  // common growth images（必要分だけ）
  "./images/common/grow_0.png",
  "./images/common/grow_1.png",
  "./images/common/grow_2.png",
  "./images/common/grow_3.png",
  "./images/common/grow_4.png",
  "./images/common/grow_5.png",
  "./images/common/grow_6.png",
  "./images/common/grow_7.png",

  // blooms（作った分だけ）
  "./images/bloom/sunflower.png",
  "./images/bloom/rose.png",
  "./images/bloom/sakura.png",
  "./images/bloom/tulip.png",
  "./images/bloom/dandelion.png",
  "./images/bloom/morningglory.png",
  "./images/bloom/violet.png",
  "./images/bloom/lily.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});