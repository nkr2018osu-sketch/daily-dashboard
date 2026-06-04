/* Daily Dashboard service worker — offline shell + fresh calendar */
var CACHE = "dd-cache-v1";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);
  // events.json: network-first so calendar updates show; fall back to cache offline
  if(url.pathname.indexOf("events.json") !== -1){
    e.respondWith(
      fetch(e.request).then(function(r){
        var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); return r;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }
  // shell: cache-first
  e.respondWith(caches.match(e.request).then(function(c){ return c || fetch(e.request); }));
});
