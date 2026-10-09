/* Rotating referral banner for Joe's sportsbook links. Self-contained: renders into #adSlot. */
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
function mount(){
  const slot=document.getElementById('adSlot');if(!slot)return;
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
window.IRAds={mount,ads:ADS};
})();
