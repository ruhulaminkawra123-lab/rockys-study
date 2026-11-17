/* রকির AI স্টাডি গাইডার — offline PWA service worker
   Strategy: cache-first for instant/offline start + background refresh (stale-while-revalidate).
   Also shows/handles the timer-finished system notification.
   Bump CACHE whenever index.html changes so old copies are purged. */
const CACHE='rocky-hsc-study-v7';
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

/* Tap on the "session finished" notification: focus the open app (and tell it to stop the alarm),
   or open a fresh window if the app was closed. */
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if('focus' in c){
          try{c.postMessage({type:'rocky-stop-alarm'});}catch(err){}
          return c.focus();
        }
      }
      return self.clients.openWindow?self.clients.openWindow('./'):undefined;
    })
  );
});

/* Optional: if you ever add a push server, its payload ({title, body}) is shown the same high-priority way. */
self.addEventListener('push',e=>{
  let d={};
  try{d=e.data?e.data.json():{};}catch(err){d={body:e.data?e.data.text():''};}
  e.waitUntil(self.registration.showNotification(d.title||'🔔 রকির স্টাডি গাইডার',{
    body:d.body||'টাইমার শেষ হয়েছে',
    tag:'rocky-timer',renotify:true,requireInteraction:true,silent:false,
    vibrate:[400,150,400,150,600],lang:'bn-BD',data:{url:'./'}
  }));
});
