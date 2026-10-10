/* Ad banner slot (#adSlot): rotating sportsbook referral banner + optional Google AdSense unit. Self-contained. */
/* ===== AdSense config: fill these in after AdSense approval. While ADSENSE_CLIENT is '', nothing from Google loads. ===== */
const ADSENSE_CLIENT='ca-pub-1050159149162190'; // your publisher ID, e.g. 'ca-pub-1234567890123456' (placeholder: ca-pub-XXXXXXXXXXXXXXXX)
const ADSENSE_SLOT='';     // display ad unit ID (data-ad-slot) from AdSense > Ads > By ad unit. Empty = load the script only (Auto ads)
const ADSENSE_MODE='alternate'; // 'replace'   = AdSense unit only, sportsbook banner never shows
                                // 'alternate' = each app open randomly shows EITHER the AdSense unit OR the sportsbook banner
                                // 'both'      = AdSense unit above the sportsbook banner
// AdSense units are never rotated, refreshed, hidden or given a close button (that would break AdSense policies).
(()=>{
const ADS=[
  {id:'fanatics',brand:'Fanatics Sportsbook',mark:'F',cta:'Sign up with Fanatics →',url:'https://fanatics.onelink.me/5kut/19bgxs9w',
   bg:'linear-gradient(135deg,#1a1a1a,#3a0b10)',glow:'#e4002b',mark_bg:'#e4002b',mark_fg:'#fff',cta_c:'#ff8a8a'},
  {id:'draftkings',brand:'DraftKings Sportsbook',mark:'DK',cta:'Sign up with DraftKings →',url:'https://sportsbook.draftkings.com/r/sb/joemedley18/US-IN-SA/US-IN',
   bg:'linear-gradient(135deg,#0b0b0b,#14290f)',glow:'#53d337',mark_bg:'#53d337',mark_fg:'#0b0b0b',cta_c:'#7ee667'},
  {id:'fanduel',brand:'FanDuel Sportsbook',mark:'FD',cta:'Sign up with FanDuel →',url:'https://fndl.co/nbt8cz9',
   bg:'linear-gradient(135deg,#0a1f44,#0c3a7a)',glow:'#1493ff',mark_bg:'#1493ff',mark_fg:'#fff',cta_c:'#8cc8ff'}
];
const ROTATE_MS=8000, KEY='ir_ad_hidden';
const FINE='21+ and present in an eligible state. Gambling problem? Call 1-800-GAMBLER. Terms apply.';
let i=Math.floor(Math.random()*ADS.length), timer=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function linkInner(a){return `<span class="ad-mark">${esc(a.mark)}</span><span class="ad-txt"><span class="ad-brand">${esc(a.brand)}</span><br><span class="ad-cta">${esc(a.cta)}</span></span>`;}
function paint(el,a){
  el.style.setProperty('--bg',a.bg);el.style.setProperty('--glow',a.glow);el.style.setProperty('--mark',a.mark_bg);el.style.setProperty('--markfg',a.mark_fg);el.style.setProperty('--cta',a.cta_c);
  const l=el.querySelector('.ad-link');l.href=a.url;l.setAttribute('aria-label',`${a.brand}: ${a.cta.replace(' →','')} (advertisement, opens in new tab)`);l.dataset.ad=a.id;l.innerHTML=linkInner(a);
  el.querySelectorAll('.ad-dots i').forEach((d,k)=>d.classList.toggle('on',k===i));
}
const ADSENSE_ON=/^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);
let adsenseLoaded=false;
function loadAdsense(){
  if(!ADSENSE_ON||adsenseLoaded)return;adsenseLoaded=true;
  if(document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'))return; // already in <head> statically
  const sc=document.createElement('script');sc.async=true;sc.crossOrigin='anonymous';
  sc.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(ADSENSE_CLIENT);
  document.head.appendChild(sc);
}
function mountAdsense(host){
  if(!ADSENSE_ON||!ADSENSE_SLOT)return false;
  const d=document.createElement('div');d.className='ad-gs';
  d.innerHTML=`<div class="ad-gs-label">Advertisement</div><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADSENSE_CLIENT)}" data-ad-slot="${esc(ADSENSE_SLOT)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  host.appendChild(d);
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
  return true;
}
// decide once per app open which units show
const SHOW_GS=ADSENSE_ON&&!!ADSENSE_SLOT&&(ADSENSE_MODE==='replace'||ADSENSE_MODE==='both'||(ADSENSE_MODE==='alternate'&&Math.random()<.5));
const SHOW_SB=!(SHOW_GS&&(ADSENSE_MODE==='replace'||ADSENSE_MODE==='alternate'));
let gsMounted=false;
function mount(){
  const slot=document.getElementById('adSlot');if(!slot)return;
  loadAdsense();
  if(SHOW_GS&&!gsMounted){let g=document.getElementById('adGs');if(!g){g=document.createElement('div');g.id='adGs';slot.parentNode.insertBefore(g,slot);}gsMounted=mountAdsense(g);}
  if(!SHOW_SB){slot.innerHTML='';return;}
  if(sessionStorage.getItem(KEY)==='1'){slot.innerHTML='';return;}
  slot.innerHTML=`<div class="ad" role="complementary" aria-label="Advertisement"><a class="ad-link" target="_blank" rel="sponsored noopener"></a>
    <span class="ad-tag">Ad</span><button class="ad-x" aria-label="Hide ad for this session">✕</button>
    <div class="ad-fine">${esc(FINE)}</div><div class="ad-dots">${ADS.map(()=>'<i></i>').join('')}</div></div>`;
  const el=slot.firstChild;paint(el,ADS[i]);
  el.querySelector('.ad-x').onclick=()=>{sessionStorage.setItem(KEY,'1');clearInterval(timer);slot.innerHTML='';};
  clearInterval(timer);
  timer=setInterval(()=>{
    if(document.hidden)return;
    const l=el.querySelector('.ad-link');l.classList.add('fade');
    setTimeout(()=>{i=(i+1)%ADS.length;paint(el,ADS[i]);l.classList.remove('fade');},450);
  },ROTATE_MS);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.IRAds={mount,ads:ADS,adsense:{on:ADSENSE_ON,slot:ADSENSE_SLOT,mode:ADSENSE_MODE,showGs:SHOW_GS,showSb:SHOW_SB}};
})();
