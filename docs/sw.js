const CACHE='ohaeng-1776712248';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.includes('/assets/')){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{caches.open(CACHE).then(ch=>ch.put(e.request,r.clone()));return r;})));
  } else {
    e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE).then(ch=>ch.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request)));
  }
});