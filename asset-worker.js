const prefix=new URL('private-assets/',self.registration.scope).href;
const cacheName='pz-local-assets-v1:'+new URL(prefix).pathname;
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(prefix))return;
 event.respondWith((async()=>{
  const cache=await caches.open(cacheName),stored=await cache.match(event.request);
  return stored||fetch(event.request);
 })());
});
