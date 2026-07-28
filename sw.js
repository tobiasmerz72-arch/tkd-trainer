const CACHE_NAME="tobis-taekwondo-academy-v4-3-cards-20260728";
const FILES=["./","./index.html","./styles.css","./app.js","./manifest.json","./common_terms.json","./techniques.json","./theory.json","./tkd-hero.png","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE_NAME?null:caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 e.respondWith(fetch(e.request).then(r=>{if(r&&r.status===200){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy))}return r})
 .catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))))
});
