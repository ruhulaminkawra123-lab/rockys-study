/* রকির AI স্টাডি গাইডার — offline PWA service worker
   Strategy: cache-first for instant/offline start + background refresh (stale-while-revalidate).
   Bump CACHE whenever index.html changes so old copies are purged. */
const CACHE='rocky-hsc-study-v3';
const CORE=['./','./index.html'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{}))))   /* one missing file must not abort install */
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(!e.request.url.startsWith('http'))return;
  e.respondWith(
    caches.match(e.request,{ignoreSearch:true}).then(hit=>{
      const net=fetch(e.request).then(res=>{
        if(res&&(res.ok||res.type==='opaque')){
          const cp=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});
        }
        return res;
      }).catch(()=>hit||(e.request.mode==='navigate'
        ? caches.match('./index.html').then(r=>r||caches.match('./'))
        : undefined));
      return hit||net;
    })
  );
});
