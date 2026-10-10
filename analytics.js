/* Privacy-friendly stats for Sideline Status. No cookies, no user IDs, no fingerprinting.
   1) Cloudflare Web Analytics beacon (visits/page views) once CF_BEACON_TOKEN is filled in (public site token from the CF dashboard).
   2) Anonymous feature counts (app opens, tab views, Watch taps, ad clicks per brand, push enables, fantasy connects), batched and
      sent to our Worker (POST /e) as plain counts like {"tab:nfl":2}. */
(function(){
var CF_BEACON_TOKEN=''; // Cloudflare Web Analytics site token, e.g. '0123456789abcdef0123456789abcdef'. Empty = beacon off.
var E='https://injury-push.jmedley.workers.dev/e';
try{if(CF_BEACON_TOKEN&&!document.querySelector('script[src*="cloudflareinsights.com/beacon"]')){var s=document.createElement('script');s.defer=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon',JSON.stringify({token:CF_BEACON_TOKEN,spa:true}));document.head.appendChild(s);}}catch(e){}
var q={},n=0,t=null;
function flush(){if(!n)return;var body=JSON.stringify({c:q});q={};n=0;clearTimeout(t);
  try{if(navigator.sendBeacon&&navigator.sendBeacon(E,new Blob([body],{type:'text/plain'})))return;}catch(e){}
  try{fetch(E,{method:'POST',body:body,keepalive:true,headers:{'Content-Type':'text/plain'}}).catch(function(){});}catch(e){}}
function track(k){try{k=String(k).toLowerCase();if(!/^[a-z_]+(:[a-z0-9_+-]{1,24})?$/.test(k))return;q[k]=(q[k]||0)+1;n++;clearTimeout(t);t=setTimeout(flush,15000);if(n>=30)flush();}catch(e){}}
addEventListener('pagehide',flush);document.addEventListener('visibilitychange',function(){if(document.hidden)flush();});
window.IRTrack=track;window.IRTrackSlug=function(s){return String(s||'').toLowerCase().replace(/\+/g,'plus').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,24);};
})();
