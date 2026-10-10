// App-shell cache only. Live injury data (ESPN), player search, Sleeper API, logos and headshots
// are never intercepted or cached here, so reports are always fetched fresh from the network.
const CACHE='injury-reports-v11';
const ASSETS=['./','index.html','manifest.json','teams.json','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.png','scores.js','scores.css','push.js','ads.js','ads.css','pages.css','about.html','privacy.html','terms.html','contact.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(a=>new Request(a,{cache:'reload'})))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin)return; // cross-origin (live data) passes straight through
  // network-first for our own files so updates show up; cache is only an offline fallback
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}return r;})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
// tapping a change-alert notification opens the app on My Players
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./#mine';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    for(const c of cs){if('focus' in c){c.navigate&&c.navigate(url).catch(()=>{});return c.focus();}}
    return self.clients.openWindow(url);
  }));
});

// Real push alerts from the injury-push server (arrive even when the app is closed)
self.addEventListener('push',e=>{
  let d={};
  try{d=e.data?e.data.json():{};}catch(err){d={title:'Injury Reports',body:e.data?e.data.text():''};}
  const title=d.title||'Injury update';
  e.waitUntil(Promise.all([
    self.registration.showNotification(title,{
      body:d.body||'',icon:'icon-192.png',badge:'favicon.png',tag:d.tag||'ir-push',renotify:true,data:{url:d.url||'./#mine'}
    }),
    // tell any open app window so it refreshes the reports right away
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage({type:'ir-push',title,body:d.body||'',url:d.url||''})))
  ]));
});
// If the browser rotates the subscription, re-register it (follows are carried over server-side and re-sent by the page on next open)
self.addEventListener('pushsubscriptionchange',e=>{
  e.waitUntil((async()=>{
    const PUSH_API='https://injury-push.jmedley.workers.dev';
    const {publicKey}=await (await fetch(PUSH_API+'/vapid-public-key')).json();
    const sub=await self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(publicKey)});
    await fetch(PUSH_API+'/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub.toJSON(),oldEndpoint:e.oldSubscription?e.oldSubscription.endpoint:undefined})});
  })());
});
function b64uToBytes(s){const b=atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0));}
