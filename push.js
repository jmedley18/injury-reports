/* Real Web Push alerts via the injury-push Cloudflare Worker (see /workspace/injury-push/FRONTEND_INTEGRATION.md).
   Self-contained: uses globals from index.html (favs, rosters, LEAGUES, norm, LS, esc, toast, $) only at call time. */
const PUSH_API='https://injury-push.jmedley.workers.dev';
const pushSupported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const b64uToBytes=s=>{const b=atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0));};
const pushOn=()=>LS.get('ir_push',false);

// What the user follows = starred teams + every player in every saved list (NFL/MLB/NBA only)
function currentFollows(){
  const teams=favs.map(k=>{const [league,teamId]=k.split(':');return{league,teamId};}).filter(t=>LEAGUES[t.league]&&t.teamId);
  const seen=new Set(),players=[];
  for(const r of rosters)for(const p of r.players||[]){
    if(!LEAGUES[p.lg])continue;
    const k=p.lg+':'+(p.id||norm(p.n));if(seen.has(k))continue;seen.add(k);
    players.push({league:p.lg,espnAthleteId:p.id||'',name:p.n});
  }
  return{teams,players};
}
async function getPushSub(){if(!pushSupported())return null;const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription();}
async function postPush(path,body){const r=await fetch(PUSH_API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let j={};try{j=await r.json();}catch(e){}if(!r.ok||j.ok===false)throw new Error(j.error||('HTTP '+r.status));return j;}

// Must be called from a tap (iOS requires a user gesture for the permission prompt)
async function enablePush(){
  if(!pushSupported()){toast(isIOS&&!isStandalone()?'Add the app to your Home Screen first':'This browser can\'t do push alerts');return false;}
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){toast('Notifications are blocked in settings');return false;}
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){const {publicKey}=await (await fetch(PUSH_API+'/vapid-public-key')).json();
    sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBytes(publicKey)});}
  LS.set('ir_push',true);
  await syncPush(true);
  postPush('/test',{endpoint:sub.endpoint}).catch(()=>{}); // confirmation push proves the whole path works
  return true;
}
async function disablePush(){
  const sub=await getPushSub().catch(()=>null);
  if(sub){postPush('/unsubscribe',{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe().catch(()=>{});}
  LS.set('ir_push',false);LS.set('ir_push_sig','');
}
async function sendTestPush(){
  const sub=await getPushSub();if(!sub)throw new Error('not subscribed');
  await syncPush(false);return postPush('/test',{endpoint:sub.endpoint});
}
// Send follows to the server whenever they change (debounced; skipped when nothing changed)
let pushSyncTimer=null;
function schedulePushSync(){clearTimeout(pushSyncTimer);pushSyncTimer=setTimeout(()=>syncPush(false),1500);}
async function syncPush(force){
  if(!pushOn())return null;
  try{
    const sub=await getPushSub();
    if(!sub){LS.set('ir_push',false);return null;} // permission revoked / subscription lost
    const follows=currentFollows();
    const sig=JSON.stringify([sub.endpoint,follows]);
    if(!force&&LS.get('ir_push_sig','')===sig)return null;
    const j=await postPush('/subscribe',{subscription:sub.toJSON(),follows});
    LS.set('ir_push_sig',sig);LS.set('ir_push_last',j);return j;
  }catch(e){return null;} // offline: retried on next change/open
}

/* ---------- the one alerts control (shown on ★ Mine) ---------- */
function pushPanelHtml(){return '<div class="glass alertbar" id="pushPanel" style="flex-wrap:wrap">🔔<div>Alerts…</div></div>';}
async function renderPushPanel(){
  const el=document.getElementById('pushPanel');if(!el)return;
  const f=currentFollows();const nf=f.teams.length+f.players.length;
  const hint=`<div class="note" style="width:100%;margin-top:6px">Get notified when your starred teams or My Players have an injury update, even when the app is closed. "What's new" also shows changes here in the app.</div>`;
  if(!pushSupported()){
    el.innerHTML=isIOS&&!isStandalone()
      ?`📲<div><b>Want push alerts?</b><br><span style="opacity:.75">On iPhone, tap <b>Share</b> → <b>Add to Home Screen</b>, then open Injury Reports from your Home Screen and turn alerts on there.</span></div>`
      :`🔔<div>Changes show in "What's new" here. <span style="opacity:.65">This browser doesn't support push alerts.</span></div>`;
    return;
  }
  const sub=await getPushSub().catch(()=>null);const on=pushOn()&&!!sub;
  if(!document.body.contains(el))return;
  if(Notification.permission==='denied'&&!on){el.innerHTML=`🔕<div><b>Notifications are blocked</b><br><span style="opacity:.75">Allow notifications for this site in your browser or phone settings, then come back.</span></div>`;return;}
  el.innerHTML=on
    ?`🔔<div><b>Push alerts on</b><br><span style="opacity:.75">Following ${f.teams.length} team${f.teams.length!==1?'s':''} · ${f.players.length} player${f.players.length!==1?'s':''}</span></div><button id="pushTest" style="background:rgba(255,255,255,.14)">Send test</button><button id="pushOff" style="background:rgba(255,255,255,.08);margin-left:0">Turn off</button>`+hint
    :`🔔<div><b>Push alerts</b><br><span style="opacity:.75">${nf?`For your ${nf} followed team${nf!==1?'s':''}/player${nf!==1?'s':''}`:'Star teams or add players to follow them'}</span></div><button id="pushOn">Enable</button>`+hint;
  const on1=el.querySelector('#pushOn'),off=el.querySelector('#pushOff'),tst=el.querySelector('#pushTest');
  if(on1)on1.onclick=async()=>{on1.disabled=true;on1.textContent='…';try{if(await enablePush())toast('Push alerts on · test alert sent');}catch(e){toast('Couldn\'t turn on alerts: '+e.message);}renderPushPanel();};
  if(off)off.onclick=async()=>{off.disabled=true;await disablePush();toast('Push alerts off');renderPushPanel();};
  if(tst)tst.onclick=async()=>{tst.disabled=true;tst.textContent='Sending…';try{await sendTestPush();toast('Test alert sent');}catch(e){toast('Test failed: '+e.message);}tst.disabled=false;tst.textContent='Send test';};
}
