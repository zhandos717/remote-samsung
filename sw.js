// Service worker: caches the app shell so the remote opens without network.
// The TV connection is a websocket, which the service worker never touches.
var CACHE = 'tv-remote-v2';
var SHELL = [
  './', './index.html', './settings.html', './styles.css',
  './tv.js', './remote.js', './settings.js',
  './manifest.json', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Network first, fall back to cache when offline; refresh the cache on success
  event.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
    })
  );
});
