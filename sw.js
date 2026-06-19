/* Daily Dashboard service worker — network-first everywhere so updates
   always arrive; the cache is the offline fallback. Big immutable chess
   assets (engine/library/pieces) are cache-first so the 7 MB engine only
   downloads once. */
var CACHE = "dd-cache-v6";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg",
             "./workout/index.html", "./workout/manifest.webmanifest", "./workout/icon.svg",
             "./storage/index.html", "./storage/manifest.webmanifest", "./storage/icon.svg",
             "./sculpt/index.html", "./sculpt/manifest.webmanifest", "./sculpt/icon.svg",
             "./chess/index.html", "./chess/manifest.webmanifest", "./chess/icon.svg"];

function isImmutable(url){
  return url.indexOf("/chess/engine/") > -1 ||
         url.indexOf("/chess/lib/") > -1 ||
         url.indexOf("/chess/pieces/") > -1;
}

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
  if(isImmutable(e.request.url)){
    e.respondWith(
      caches.match(e.request).then(function(hit){
        if(hit) return hit;
        return fetch(e.request).then(function(r){
          if(r && r.ok){
            var copy = r.clone();
            caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
          }
          return r;
        });
      })
    );
    return;
  }
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
