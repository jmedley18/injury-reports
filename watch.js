/* Where-to-watch links for Scores game cards + "My TV provider" setting (gear icon in the header).
   Only https universal links: they open the installed app (ESPN, Peacock, DIRECTV...) when iOS/Android allows it, otherwise the website.
   We never say a game is free or streamable on a service; ESPN lists the channel, we link to that channel's app/site, and to the
   user's TV provider only when that provider normally carries the channel ("Open DIRECTV"). Saved on this device: ir_tv_provider. */
(function(){
const PROVIDERS={
  directv:{name:'DIRECTV',url:'https://www.directv.com/guide/'},
  dtvstream:{name:'DIRECTV STREAM',url:'https://stream.directv.com/'},
  yttv:{name:'YouTube TV',url:'https://tv.youtube.com/'},
  hulu:{name:'Hulu + Live TV',url:'https://www.hulu.com/live'},
  sling:{name:'Sling',url:'https://watch.sling.com/'},
  fubo:{name:'Fubo',url:'https://www.fubo.tv/'},
  xfinity:{name:'Comcast/Xfinity',url:'https://www.xfinity.com/stream/'},
  spectrum:{name:'Spectrum',url:'https://watch.spectrum.net/'},
  dish:{name:'Dish',url:'https://www.dishanywhere.com/'},
  other:{name:'Other',url:''},
  none:{name:'None',url:''}
};
const ORDER=['none','directv','dtvstream','yttv','hulu','sling','fubo','xfinity','spectrum','dish','other'];
// Which providers normally carry a channel in their standard live-TV packages (conservative; packages and local markets vary).
const BCAST=['directv','dtvstream','yttv','hulu','fubo','xfinity','spectrum','dish'];
const CARRY={
  abc:BCAST,cbs:BCAST,fox:BCAST,nbc:BCAST,
  espn:['directv','dtvstream','yttv','hulu','sling','xfinity','spectrum','dish'],
  fs1:['directv','dtvstream','yttv','hulu','sling','fubo','xfinity','spectrum','dish'],
  nflnet:['directv','dtvstream','yttv','hulu','sling','fubo','xfinity','spectrum','dish'],
  wbd:['directv','dtvstream','yttv','hulu','sling','xfinity','spectrum','dish'],
  nbatv:['directv','dtvstream','yttv','sling','fubo','xfinity','spectrum','dish'],
  mlbnet:['directv','dtvstream','yttv','sling','fubo','xfinity','spectrum','dish'],
  cbssn:['directv','dtvstream','yttv','hulu','fubo','xfinity','spectrum','dish'],
  btn:['directv','dtvstream','yttv','hulu','fubo','xfinity','spectrum','dish']
};
const L=(label,url)=>({label,url});
const ESPNAPP=L('ESPN app','https://www.espn.com/watch/'),FOXS=L('Fox Sports','https://www.foxsports.com/live'),FOXONE=L('Fox One','https://www.fox.com/live'),
  MAX=L('HBO Max','https://www.hbomax.com/sports');
// [test, carriage key, network links]
const NETS=[
  [/^(espn2?|espnu|espnews|sec ?network|secn|acc ?network|accn|espn deportes)$/i,'espn',[ESPNAPP]],
  [/^espn\+$/i,'',[L('ESPN app','https://www.espn.com/watch/')]],
  [/^abc$/i,'abc',[ESPNAPP,L('ABC','https://abc.com/watch-live')]],
  [/^fox$/i,'fox',[FOXS,FOXONE]],
  [/^(fs1|fs2|fox sports ?1|fox sports ?2)$/i,'fs1',[FOXS,FOXONE]],
  [/^(btn|big ten network)$/i,'btn',[FOXS,FOXONE]],
  [/^fox deportes$/i,'',[FOXS]],
  [/^cbs$/i,'cbs',[L('Paramount+','https://www.paramountplus.com/live-tv/'),L('CBS Sports','https://www.cbssports.com/live/')]],
  [/^(cbssn|cbs sports network|cbs sports net)$/i,'cbssn',[L('CBS Sports','https://www.cbssports.com/live/')]],
  [/^paramount\+$/i,'',[L('Paramount+','https://www.paramountplus.com/live-tv/')]],
  [/^nbc$/i,'nbc',[L('Peacock','https://www.peacocktv.com/sports'),L('NBC Sports','https://www.nbcsports.com/watch')]],
  [/^peacock$/i,'',[L('Peacock','https://www.peacocktv.com/sports')]],
  [/^(prime video|amazon prime video|prime)$/i,'',[L('Prime Video','https://www.primevideo.com/')]],
  [/^netflix$/i,'',[L('Netflix','https://www.netflix.com/')]],
  [/^(nfl ?net|nfl network)$/i,'nflnet',[L('NFL app','https://www.nfl.com/network/watch')]],
  [/^nfl\+$/i,'',[L('NFL+','https://www.nfl.com/plus/')]],
  [/^nba ?tv$/i,'nbatv',[L('NBA app','https://www.nba.com/watch/nba-tv')]],
  [/^nba league pass$/i,'',[L('NBA app','https://www.nba.com/watch')]],
  [/^(mlb ?tv|mlb\.tv)$/i,'',[L('MLB app','https://www.mlb.com/tv')]],
  [/^(mlb ?net|mlb network)$/i,'mlbnet',[L('MLB Network','https://www.mlb.com/network/live')]],
  [/^tbs$/i,'wbd',[MAX,L('TBS','https://www.tbs.com/watchtbs')]],
  [/^trutv$/i,'wbd',[MAX,L('truTV','https://www.trutv.com/watchtrutv')]],
  [/^tnt$/i,'wbd',[MAX]],
  [/^(max|hbo max)$/i,'',[MAX]],
  [/^apple ?tv\+?$/i,'',[L('Apple TV','https://tv.apple.com/')]],
  [/^(youtube|youtube tv)$/i,'',[L('YouTube TV','https://tv.youtube.com/')]],
  // regional sports networks (network app only; carriage depends on where you live)
  [/^(fdsn|fanduel|bally|fd sports)/i,'',[L('FanDuel Sports Network','https://www.fanduelsportsnetwork.com/')]],
  [/^(mnmt|monumental)/i,'',[L('Monumental+','https://www.monumentalsportsnetwork.com/')]],
  [/^nesn/i,'',[L('NESN 360','https://nesn.com/')]],
  [/^yes( network)?$/i,'',[L('YES / Gotham','https://www.yesnetwork.com/')]],
  [/^msg/i,'',[L('MSG+','https://www.msgnetworks.com/')]],
  [/^marquee/i,'',[L('Marquee','https://www.marqueesportsnetwork.com/')]],
  [/^sny$/i,'',[L('SNY','https://sny.tv/')]],
  [/^root/i,'',[L('ROOT Sports','https://www.rootsports.com/')]],
  [/^nbcs/i,'',[L('NBC Sports','https://www.nbcsports.com/watch')]],
  [/^(snla|spectrum sportsnet|spectrum sn)/i,'',[L('Spectrum SportsNet','https://watch.spectrum.net/')]]
];
const provider=()=>{const p=localStorage.getItem('ir_tv_provider');return PROVIDERS[p]?p:null;};
function resolve(name){const n=String(name||'').trim();for(const [re,carry,links] of NETS)if(re.test(n))return{carry,links};return null;}
function optionsFor(g){
  const p=provider();const out=[];
  for(const w of (g.watch||[])){const r=resolve(w.name);const prov=p&&r&&r.carry&&(CARRY[r.carry]||[]).includes(p)&&PROVIDERS[p].url?PROVIDERS[p]:null;
    if(!r&&!prov)continue;out.push({ch:w,prov,links:r?r.links:[]});}
  return out;
}
const has=g=>g&&g.state!=='post'&&optionsFor(g).length>0;
const a=(label,url,cls)=>`<a class="w-btn ${cls||''}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;
function open(g){
  if(provider()===null)return openSettings(true,()=>open(g));
  const opts=optionsFor(g);const p=provider();
  const title=`${g.away.abbr||g.away.name} @ ${g.home.abbr||g.home.name}`;
  let h=shHead('Watch '+esc(title))+`<div class="note" style="margin:0 0 8px">ESPN lists ${opts.map(o=>`<b>${esc(o.ch.name)}</b>`).join(', ')}. Buttons open the app if you have it, or the website.</div>`;
  for(const o of opts){
    h+=`<div class="w-ch"><div class="w-cn">📺 ${esc(o.ch.name)}${o.ch.local?` <small>local${o.ch.team?' · '+esc(o.ch.team):''}</small>`:''}</div><div class="w-bs">`+
      (o.prov?a('Open '+o.prov.name,o.prov.url,'prov'):'')+o.links.map(l=>a(l.label,l.url)).join('')+`</div></div>`;
  }
  h+=`<div class="note">${p&&p!=='none'&&p!=='other'?`Your TV provider: <b>${esc(PROVIDERS[p].name)}</b>. Channels depend on your package and area, and most network apps ask you to sign in with your TV provider or a subscription.`:'Most network apps ask you to sign in with a TV provider or a subscription.'} <a href="#" id="wset">Change TV provider</a></div>`;
  openSheet(h);
  const s=$('wset');if(s)s.onclick=e=>{e.preventDefault();openSettings(false,()=>open(g));};
}
function openSettings(first,after){
  const cur=provider();
  openSheet(shHead(first?'Who\'s your TV provider?':'Settings')+
    `<label>My TV provider</label><div class="note" style="margin:0 0 8px">${first?'Pick one so Watch can open your provider\'s app for channels it carries. You can change it later with the ⚙️ button.':'Used by Watch on Scores to open your provider\'s app for channels it carries.'}</div>`+
    `<div class="w-provs">${ORDER.map(k=>`<button class="opt w-prov ${cur===k?'on':''}" data-prov="${k}">${esc(PROVIDERS[k].name)}${cur===k?' ✓':''}</button>`).join('')}</div>`+
    `<div class="note">Saved on this phone only.</div>`);
  $('shc').querySelectorAll('[data-prov]').forEach(b=>b.onclick=()=>{localStorage.setItem('ir_tv_provider',b.dataset.prov);toast('TV provider: '+PROVIDERS[b.dataset.prov].name);if(after)after();else closeSheet();});
}
window.Watch={open,openSettings,has,optionsFor,resolve,providers:PROVIDERS};
})();
