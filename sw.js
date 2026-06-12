/* Daily Dashboard service worker — network-first everywhere so updates
   always arrive; the cache is the offline fallback. */
var CACHE = "dd-cache-v4";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg",
             "./workout/index.html", "./workout/manifest.webmanifest", "./workout/icon.svg",
             "./storage/index.html", "./storage/manifest.webmanifest", "./storage/icon.svg"];

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
  if(e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function(r){
      if(r && r.ok && e.request.url.indexOf(self.location.origin) === 0){
        var copy = r.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      }
      return r;
    }).catch(function(){ return caches.match(e.request); })
  );
});
