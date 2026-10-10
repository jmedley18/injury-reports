/* Fantasy hub: provider list (Sleeper, ESPN, Yahoo) + Sleeper and ESPN Fantasy league views
   (Matchups / Standings / Rosters with ESPN injury overlay, Import to My Players, my-team highlight).
   Yahoo lives in yahoo.js (route #yahoo). Routes here: #fantasy, #fantasy/sl/<leagueId>, #fantasy/espn/<season>-<leagueId>.
   Uses globals from index.html at call time (LEAGUES, TEAMS, DATA, findEntry, isInj, colOf, esc, $, sj, sleeperDB, TEAMFIX,
   rosters, roster, uid, addPlayers, curRoster, openSheet, closeSheet, onClose, shHead, toast, render, initials, state) and window.Yahoo.
   Saved on this device only: ir_ff_sleeper (usernames), ir_ff_espn (league ids + optional private-league cookies). */
(function(root){
const WORKER='https://injury-push.jmedley.workers.dev';
const ESPN_READS='https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons';
const LSg=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
const LSs=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const F={sub:localStorage.getItem('ir_ff_sub')||'matchups',week:{},team:{},data:{},mu:{},err:{},hub:null,hubErr:null,loading:{},slState:null};
const curSeason=()=>{const d=new Date();return d.getMonth()>=6?d.getFullYear():d.getFullYear()-1;};
const sleeperUsers=()=>LSg('ir_ff_sleeper',[]);
const espnLeagues=()=>LSg('ir_ff_espn',[]);
const route=()=>{const p=location.hash.replace(/^#/,'').split('/');return p[0]==='fantasy'&&p[1]?{prov:p[1],id:decodeURIComponent(p[2]||'')}:null;};
const fmt=v=>v==null?'–':Number.isInteger(v)?String(v):(+v).toFixed(2);
const fx1=v=>v==null?'–':(+v).toFixed(1);
const tlogo=t=>t.logo?`<img class="y-tl" src="${esc(t.logo)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;y-tl ph&quot;>${esc(initials(t.name))}</span>'">`:`<span class="y-tl ph">${esc(initials(t.name))}</span>`;
const nflTeam=id=>TEAMS&&TEAMS.nfl&&TEAMS.nfl.find(t=>t.id===String(id));
const shortSt=s=>{const l=String(s||'').toLowerCase().replace(/_/g,' ');
  return({out:'Out',o:'Out',questionable:'Q',q:'Q',doubtful:'D',d:'D',probable:'P','injured reserve':'IR','injury reserve':'IR',ir:'IR','day to day':'DTD','day-to-day':'DTD',suspension:'SUSP',sus:'SUSP',pup:'PUP',na:'NA',cov:'COV'})[l]||String(s).slice(0,6);};
const FULL={Q:'Questionable',D:'Doubtful',Out:'Out',IR:'Injured Reserve',P:'Probable',DTD:'Day-To-Day',SUSP:'Suspension',PUP:'PUP',NA:'Not active',COV:'Illness'};

/* ================= Sleeper ================= */
async function slState(){if(F.slState&&Date.now()-F.slState.t<600000)return F.slState.d;const d=await sj('/state/nfl');F.slState={t:Date.now(),d};return d;}
async function slLeagues(){
  const st=await slState();const season=st.league_season||st.season||String(curSeason());const out=[];
  await Promise.all(sleeperUsers().map(async u=>{const ls=await sj(`/user/${u.id}/leagues/nfl/${season}`)||[];
    for(const l of ls)out.push({prov:'sl',id:l.league_id,name:l.name,season:l.season,teams:l.total_rosters,status:l.status,avatar:l.avatar,viewer:u.id,user:u.name});}));
  const seen=new Set();return out.filter(l=>!seen.has(l.id)&&seen.add(l.id));
}
async function slLoad(lid){
  const [lg,rs,us,st]=await Promise.all([sj(`/league/${lid}`),sj(`/league/${lid}/rosters`),sj(`/league/${lid}/users`),slState()]);
  if(!lg)throw new Error('League not found');
  const db=await sleeperDB(t=>{F.loadMsg=t;draw();});
  const viewers=new Set(sleeperUsers().map(u=>u.id));
  const um={};(us||[]).forEach(u=>um[u.user_id]=u);
  const slots=(lg.roster_positions||[]).filter(p=>p!=='BN');
  const pl=(id,slot,group)=>{
    if(!id||id==='0')return{name:'Empty',team:'',pos:'',slot,group,empty:true};
    const p=db[id];
    if(!p){if(/^[A-Z]{2,3}$/.test(id))return{name:id+' D/ST',team:TEAMFIX[id]||id,pos:'DEF',slot,group,def:true,img:`https://sleepercdn.com/images/team_logos/nfl/${id.toLowerCase()}.png`};return{name:'Player #'+id,team:'',pos:'',slot,group};}
    const def=p[2]==='DEF';const team=TEAMFIX[p[1]]||p[1];
    return{name:p[0],team,pos:p[2],slot,group,espnId:p[3]||'',def,status:p[4]?shortSt(p[4]):'',statusFull:p[4]||'',injury:p[5]||'',
      img:def?`https://sleepercdn.com/images/team_logos/nfl/${String(p[1]).toLowerCase()}.png`:p[3]?`https://a.espncdn.com/i/headshots/nfl/players/full/${p[3]}.png`:`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`};};
  const teams=(rs||[]).map(r=>{const u=um[r.owner_id]||{};const s=r.settings||{};const md=u.metadata||{};
    const starters=r.starters||[],res=r.reserve||[],taxi=r.taxi||[];const used=new Set([...starters,...res,...taxi]);
    const players=[...starters.map((id,i)=>pl(id,slotName(slots[i]),'start')),...(r.players||[]).filter(id=>!used.has(id)).map(id=>pl(id,'BN','bench')),
      ...res.map(id=>pl(id,'IR','reserve')),...taxi.map(id=>pl(id,'TAXI','reserve'))];
    return{key:String(r.roster_id),name:md.team_name||u.display_name||('Team '+r.roster_id),manager:u.display_name||'',
      logo:/^https?:/.test(md.avatar||'')?md.avatar:u.avatar?`https://sleepercdn.com/avatars/thumbs/${u.avatar}`:'',
      mine:viewers.has(r.owner_id)||(r.co_owners||[]).some(x=>viewers.has(x)),w:s.wins||0,l:s.losses||0,t:s.ties||0,
      pf:(s.fpts||0)+(s.fpts_decimal||0)/100,pa:(s.fpts_against||0)+(s.fpts_against_decimal||0)/100,players,owner:r.owner_id};});
  teams.sort((a,b)=>b.w-a.w||a.l-b.l||b.pf-a.pf).forEach((t,i)=>t.rank=i+1);
  const curW=Number(st.display_week||st.week)||1;const ps=Number((lg.settings||{}).playoff_week_start)||15;
  return{league:{prov:'sl',id:lid,name:lg.name,season:lg.season,logo:lg.avatar?`https://sleepercdn.com/avatars/thumbs/${lg.avatar}`:'',numTeams:lg.total_rosters,
    status:lg.status,week:lg.season===String(st.league_season||st.season)?curW:null,startWeek:Number((lg.settings||{}).start_week)||1,endWeek:Math.max(ps+2,17),predraft:lg.status==='pre_draft'||lg.status==='drafting'},teams};
}
const slotName=s=>({SUPER_FLEX:'SF',REC_FLEX:'W/T',WRRB_FLEX:'W/R',IDP_FLEX:'IDP',FLEX:'FLX'})[s]||s||'';
async function slMatchups(d,w){
  const ms=await sj(`/league/${d.league.id}/matchups/${w}`)||[];const by={};
  const tk=Object.fromEntries(d.teams.map(t=>[t.key,t]));
  for(const m of ms){if(m.matchup_id==null)continue;(by[m.matchup_id]=by[m.matchup_id]||[]).push(m);}
  const cur=d.league.week;
  return Object.values(by).map(arr=>{const teams=arr.map(m=>({...tk[String(m.roster_id)]||{name:'Team '+m.roster_id,key:String(m.roster_id)},pts:m.points==null?null:+m.points,proj:null}));
    const st=cur==null||w<cur?'final':w===cur?'live':'pre';
    const winner=st==='final'&&teams.length===2&&teams[0].pts!==teams[1].pts?(teams[0].pts>teams[1].pts?teams[0].key:teams[1].key):'';
    return{teams,status:st,winner};});
}

/* ================= ESPN Fantasy ================= */
const POS={1:'QB',2:'RB',3:'WR',4:'TE',5:'K',16:'D/ST',7:'P',9:'DT',10:'DE',11:'LB',12:'CB',13:'S',14:'HC'};
const SLOT={0:'QB',1:'TQB',2:'RB',3:'R/W',4:'WR',5:'W/T',6:'TE',7:'OP',8:'DT',9:'DE',10:'LB',11:'DL',12:'CB',13:'S',14:'DB',15:'DP',16:'D/ST',17:'K',18:'P',19:'HC',20:'BN',21:'IR',23:'FLX',24:'ER'};
const VIEWS=['mTeam','mRoster','mMatchup','mMatchupScore','mStandings','mSettings'];
const normSwid=s=>String(s||'').replace(/[{}]/g,'').toUpperCase();
async function espnFetch(e){
  let r;
  if(e.s2||e.swid)r=await fetch(`${WORKER}/espnff`,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({game:'ffl',season:e.season,league:e.id,views:VIEWS,s2:e.s2||'',swid:e.swid||''})});
  else r=await fetch(`${ESPN_READS}/${e.season}/segments/0/leagues/${e.id}?${VIEWS.map(v=>'view='+v).join('&')}`,{cache:'no-store'});
  const t=await r.text();let d=null;try{d=JSON.parse(t);}catch(x){}
  if(r.status===401){const err=new Error(e.s2?'ESPN rejected the espn_s2/SWID values (they may have expired). Update them for this league.':'This league is private. Add your espn_s2 and SWID to view it.');err.priv=true;throw err;}
  if(r.status===404)throw new Error(`League ${e.id} wasn't found for the ${e.season} season.`);
  if(!r.ok||!d)throw new Error('ESPN HTTP '+r.status);
  return Array.isArray(d)?d[0]:d;
}
function espnParse(e,d){
  const mem={};(d.members||[]).forEach(m=>mem[m.id]=m);
  const sw=normSwid(e.swid);const cur=(d.status||{}).currentMatchupPeriod||d.scoringPeriodId||1;
  const teams=(d.teams||[]).map(t=>{const rec=(t.record||{}).overall||{};const o=mem[t.primaryOwner]||{};
    const players=((t.roster||{}).entries||[]).map(en=>{const p=(en.playerPoolEntry||{}).player||{};const pos=POS[p.defaultPositionId]||'';
      const nt=nflTeam(p.proTeamId);const def=pos==='D/ST';const st=p.injuryStatus&&!/^(ACTIVE|NORMAL)$/.test(p.injuryStatus)?p.injuryStatus:'';
      const slot=SLOT[en.lineupSlotId]||'';
      return{name:p.fullName||'Player',team:nt?nt.abbr:'',pos,slot,group:en.lineupSlotId===20?'bench':en.lineupSlotId===21?'reserve':'start',
        espnId:def?'':String(p.id||''),def,status:st?shortSt(st):'',statusFull:st?st.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):'',injury:'',
        img:def?(nt?nt.logo:''):`https://a.espncdn.com/i/headshots/nfl/players/full/${p.id}.png`};});
    return{key:String(t.id),name:(t.name||[t.location,t.nickname].filter(Boolean).join(' ')||t.abbrev||'Team '+t.id).trim(),manager:o.displayName||[o.firstName,o.lastName].filter(Boolean).join(' ')||t.abbrev||'',
      logo:t.logo||'',mine:sw?(t.owners||[]).some(x=>normSwid(x)===sw):String(e.mine||'')===String(t.id),w:rec.wins||0,l:rec.losses||0,t:rec.ties||0,pf:rec.pointsFor??t.points??null,pa:rec.pointsAgainst??null,
      streak:rec.streakType&&rec.streakLength?rec.streakType[0]+rec.streakLength:'',seed:t.playoffSeed||null,players};});
  teams.sort((a,b)=>(a.seed||99)-(b.seed||99)||b.w-a.w||(b.pf||0)-(a.pf||0)).forEach((t,i)=>t.rank=i+1);
  const tk=Object.fromEntries(teams.map(t=>[t.key,t]));
  const maxW=Math.max(1,...(d.schedule||[]).map(m=>m.matchupPeriodId||0));
  const schedule={};
  for(const m of d.schedule||[]){const w=m.matchupPeriodId;const side=s=>s?{...(tk[String(s.teamId)]||{name:'Team '+s.teamId,key:String(s.teamId)}),
      pts:w===cur&&s.totalPointsLive!=null?s.totalPointsLive:s.totalPoints,proj:w>=cur?(s.totalProjectedPointsLive??s.totalProjectedPoints??null):null,winProb:s.winProbability??null}:null;
    const ts=[side(m.home),side(m.away)].filter(Boolean);
    const st=m.winner&&m.winner!=='UNDECIDED'?'final':w===cur?'live':w<cur?'final':'pre';
    (schedule[w]=schedule[w]||[]).push({teams:ts,status:st,playoffs:m.playoffTierType&&m.playoffTierType!=='NONE',winner:m.winner==='HOME'?ts[0].key:m.winner==='AWAY'&&ts[1]?ts[1].key:''});}
  const s=d.settings||{};
  return{league:{prov:'espn',id:e.season+'-'+e.id,lid:e.id,name:s.name||'ESPN league',season:String(d.seasonId||e.season),logo:'',numTeams:teams.length,week:cur,startWeek:1,endWeek:maxW,
    predraft:d.draftDetail&&!d.draftDetail.drafted,isPublic:!!s.isPublic},teams,schedule,mineKnown:teams.some(t=>t.mine)};
}

/* ================= shared views ================= */
const espnFor=p=>p.def||p.empty?undefined:findEntry({lg:'nfl',id:p.espnId||'',n:p.name,team:p.team});
function badges(p,prov){
  let h='';const e=espnFor(p);
  if(p.status){const [c,b,tx]=colOf(p.statusFull||FULL[p.status]||p.status);h+=`<span class="y-st" style="--s:${c};--sb:${b};--st:${tx}" title="${prov==='espn'?'ESPN Fantasy':'Sleeper'} status: ${esc(p.statusFull||p.status)}">${esc(p.status)}</span>`;}
  if(isInj(e)&&!(prov==='espn'&&p.status)&&!(p.status&&p.status===shortSt(e.st))){const [c,b,tx]=colOf(e.st);h+=`<span class="y-st espn" style="--s:${c};--sb:${b};--st:${tx}" title="ESPN injury report: ${esc(e.st)}">ESPN ${esc(shortSt(e.st))}</span>`;}
  return h;}
const spin=t=>`<div class="glass empty"><div class="spinner"></div>${esc(t)}</div>`;
const msg=(i,t,b)=>`<div class="glass empty"><div class="big">${i}</div><b>${t}</b>${b?`<small>${b}</small>`:''}</div>`;
function header(L){
  const PV={sl:'🌙 Sleeper',espn:'🅴 ESPN Fantasy'}[L.prov];
  return `<div class="y-lh"><button class="icon-btn" id="fback" aria-label="Back">‹</button>${L.logo?`<img src="${esc(L.logo)}" alt="" onerror="this.remove()">`:''}<div><b>${esc(L.name)}</b><small>${PV} · ${esc(L.season)}${L.numTeams?' · '+L.numTeams+' teams':''}</small></div></div>
    <div class="y-subs">${['matchups','standings','rosters'].map(s=>`<button class="y-sub ${F.sub===s?'on':''}" data-sub="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div>`;}
function vMatchups(d,w,list){
  const L=d.league;
  let h=`<div class="y-wk"><button class="icon-btn" id="fwprev" ${w<=L.startWeek?'disabled':''} aria-label="Previous week">‹</button><b>Week ${w}</b>${w===L.week?'<span class="y-cur">Current</span>':''}<button class="icon-btn" id="fwnext" ${w>=L.endWeek?'disabled':''} aria-label="Next week">›</button></div>`;
  if(!list)return h+spin('Loading matchups…');
  if(!list.length)return h+msg('📅','No matchups this week',L.predraft?'The draft hasn\'t happened yet.':'');
  const showProj=list.some(m=>m.teams.some(t=>t.proj!=null));
  for(const m of list){const mine=m.teams.some(t=>t.mine);
    const st=m.status==='live'?'<span class="sc-st live">Live</span>':m.status==='final'?'<span class="sc-st final">Final</span>':'<span class="sc-st">Upcoming</span>';
    h+=`<div class="glass y-mu ${mine?'mine':''}"><div class="y-muh">${m.playoffs?'🏆 Playoffs':'Week '+w}${st}</div>`;
    for(const t of m.teams){const lose=m.status==='final'&&m.winner&&m.winner!==t.key;
      h+=`<div class="y-mt ${lose?'lose':''}" data-team="${esc(t.key)}">${tlogo(t)}<div class="y-mn"><b>${esc(t.name)}${t.mine?' <span class="y-you">You</span>':''}</b><small>${esc(t.manager)}${showProj&&t.proj!=null?` · Proj ${(+t.proj).toFixed(1)}`:''}${t.w!=null?` · ${t.w}-${t.l}${t.t?'-'+t.t:''}`:''}</small></div><div class="y-pts">${t.pts==null?'–':(+t.pts).toFixed(2)}</div></div>`;}
    if(m.teams.length===1)h+=`<div class="note" style="margin:2px 0 0">Bye week</div>`;
    const wp=m.teams[0]&&m.teams[0].winProb;
    if(wp!=null&&m.status!=='final'&&m.teams.length===2){const p=Math.round((wp>1?wp/100:wp)*100);h+=`<div class="y-wp"><span style="width:${p}%"></span></div><div class="y-wpl"><span>${p}%</span><span>Win probability</span><span>${100-p}%</span></div>`;}
    h+=`</div>`;}
  return h;}
function vStandings(d){
  const ties=d.teams.some(t=>t.t);
  return `<div class="glass y-tbl"><div class="y-tr y-th"><span>#</span><span>Team</span><span>${ties?'W-L-T':'W-L'}</span><span>PF</span><span>PA</span></div>`+
    d.teams.map(t=>`<div class="y-tr ${t.mine?'me':''}" data-team="${esc(t.key)}"><span class="rk">${t.rank}</span><span class="tm">${tlogo(t)}<span><b>${esc(t.name)}</b><small>${esc(t.manager)}${t.streak?' · '+esc(t.streak):''}</small></span></span><span>${t.w}-${t.l}${ties?'-'+t.t:''}</span><span>${fx1(t.pf)}</span><span>${fx1(t.pa)}</span></div>`).join('')+`</div>`+
    (d.league.prov==='sl'?`<div class="note">Sleeper standings are sorted by wins, then points for.</div>`:'');}
function vRosters(d,lk){
  const teams=d.teams;if(!teams.length)return msg('📋','No teams yet','');
  const sel=teams.find(t=>t.key===F.team[lk])||teams.find(t=>t.mine)||teams[0];
  let h=`<div class="y-pick">${teams.slice().sort((a,b)=>b.mine-a.mine).map(t=>`<button class="y-chip ${t.key===sel.key?'on':''}" data-pick="${esc(t.key)}">${t.mine?'⭐ ':''}${esc(t.name)}</button>`).join('')}</div>`;
  const ps=sel.players.filter(p=>!p.empty||p.group==='start');
  const inj=ps.filter(p=>p.status||isInj(espnFor(p))).length;
  h+=`<div class="glass y-rh ${sel.mine?'mine':''}">${tlogo(sel)}<div><b>${esc(sel.name)}</b><small>${esc(sel.manager)} · ${ps.filter(p=>!p.empty).length} players${inj?` · <span style="color:#fca5a5">${inj} with injury status</span>`:''}</small></div></div>`;
  if(d.league.prov==='espn'&&!d.mineKnown)h+=`<button class="btn sec" id="fmine" style="margin:0 0 10px">⭐ This is my team</button>`;
  if(ps.some(p=>!p.empty&&!p.def))h+=`<button class="btn y-imp" id="fimp">★ Import ${sel.mine?'my team':'this team'} to My Players</button>`;
  if(!ps.length)return h+msg('📋','No players yet',d.league.predraft?'The draft hasn\'t happened yet.':'');
  const G={start:'Starters',bench:'Bench',reserve:'IR / Taxi'};
  for(const g of ['start','bench','reserve']){const list=ps.filter(p=>p.group===g);if(!list.length)continue;
    h+=`<div class="section">${G[g]} (${list.length})</div><div class="glass y-ros">`+list.map(p=>{const e=espnFor(p);
      const note=p.injury||(isInj(e)?[e.type,e.det].filter(x=>x&&!/not specified/i.test(x)).join(' '):'');
      return `<div class="y-pr"><span class="y-slot ${g}">${esc(p.slot||'–')}</span>${p.img?`<img class="y-hs" src="${esc(p.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:'<span class="y-hs"></span>'}<div class="y-pb"><b>${esc(p.name)}</b><small>${p.empty?'Empty slot':`${esc(p.team||'FA')} · ${esc(p.pos)}${note?` · <span class="y-inj">${esc(note)}</span>`:''}`}</small></div><div class="y-sts">${badges(p,d.league.prov)}</div></div>`;}).join('')+`</div>`;}
  return h;}
function openImport(d,t){
  const players=t.players.filter(p=>!p.empty&&!p.def).map(p=>{const e=p.espnId?null:espnFor(p);const aid=p.espnId||(e&&e.aid?String(e.aid):'');
    return{lg:'nfl',id:aid,n:p.name,team:p.team,pos:p.pos,hs:!p.espnId&&aid?`https://a.espncdn.com/i/headshots/nfl/players/full/${aid}.png`:(p.img||''),src:d.league.prov==='sl'?'sleeper':'espnff'};});
  const skipped=t.players.filter(p=>p.def).length;const r=roster();
  openSheet(shHead('Import '+esc(t.name))+`<div class="note" style="margin:0 0 6px">${players.length} players from ${esc(d.league.name)}</div>`+
    players.map(p=>{const e=findEntry({...p});return `<div class="ri">${p.hs?`<img class="h" src="${esc(p.hs)}" alt="" onerror="this.style.visibility='hidden'">`:`<div class="ph">${esc(initials(p.n))}</div>`}<div class="rb">${esc(p.n)}<small>${esc(p.pos)} · ${esc(p.team||'Free agent')}</small></div>${isInj(e)?`<span class="st" style="--s:${colOf(e.st)[0]};--sb:${colOf(e.st)[1]};--st:${colOf(e.st)[2]}">${esc(e.st)}</span>`:''}</div>`;}).join('')+
    (skipped?`<div class="warnbox">Skipped ${skipped} team defense${skipped>1?'s':''}. Team defenses don't have injury reports.</div>`:'')+
    `<label for="fin">Save as list</label><input id="fin" maxlength="30" value="${esc(d.league.name)}"><button class="btn" id="finew">Save as new list</button>${r?`<button class="btn sec" id="fiadd">Add to "${esc(r.name)}" instead</button>`:''}`);
  onClose(render);
  $('finew').onclick=()=>{const nr={id:uid(),name:$('fin').value.trim()||d.league.name,players:[],[d.league.prov==='sl'?'sleeper':'espnff']:{league:d.league.id,team:t.key}};rosters.push(nr);curRoster=nr.id;const n=addPlayers(players,nr);closeSheet();toast(`Imported ${n} players`);location.hash='mine';};
  if(r)$('fiadd').onclick=()=>{const n=addPlayers(players,r);closeSheet();toast(`Added ${n} players`);location.hash='mine';};
}

/* ================= hub ================= */
function vHub(){
  const su=sleeperUsers(),el=espnLeagues();const H=F.hub;
  let h=`<div class="ff-intro">Follow your fantasy leagues next to the injury reports. Pick a platform:</div>`;
  // Sleeper
  h+=`<div class="glass ff-prov"><div class="ff-ph"><span class="ff-ic sl">🌙</span><div><b>Sleeper</b><small>Enter your username. No password needed.</small></div></div>`;
  if(su.length)h+=`<div class="ff-users">${su.map(u=>`<span class="ff-user">@${esc(u.name)}<button data-rmsl="${esc(u.id)}" aria-label="Remove">✕</button></span>`).join('')}</div>`;
  const sl=H?H.filter(l=>l.prov==='sl'):null;
  if(su.length&&!sl&&!F.hubErr)h+=`<div class="note">Loading leagues…</div>`;
  if(sl&&su.length&&!sl.length)h+=`<div class="note">No Sleeper NFL leagues found for this season.</div>`;
  for(const l of sl||[])h+=lrow(`sl/${l.id}`,l.avatar?`https://sleepercdn.com/avatars/thumbs/${l.avatar}`:'',l.name,`${l.season} · ${l.teams} teams · ${({pre_draft:'Pre-draft',drafting:'Drafting',in_season:'In season',complete:'Complete'})[l.status]||esc(l.status)}`);
  h+=`<div class="ff-add"><input id="fslu" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Sleeper username"><button class="ff-btn" id="fsladd">Add</button></div></div>`;
  // ESPN
  h+=`<div class="glass ff-prov"><div class="ff-ph"><span class="ff-ic espn">E</span><div><b>ESPN Fantasy Football</b><small>Add a league by its League ID.</small></div></div>`;
  for(const e of el)h+=lrow(`espn/${e.season}-${e.id}`,'',e.name||('League '+e.id),`${e.season} · League ${e.id}${e.s2?' · 🔒 private':''}`);
  h+=`<button class="ff-btn wide" id="fespnadd">＋ Add ESPN league</button></div>`;
  // Yahoo
  const yc=root.Yahoo&&root.Yahoo.connected();
  h+=`<button class="glass ff-prov ff-ya" id="fyahoo"><div class="ff-ph"><span class="ff-ic ya">Y!</span><div><b>Yahoo Fantasy</b><small>${yc?'Connected · waiting on Yahoo to approve Fantasy access':'Sign in with Yahoo'}</small></div><span class="y-chev">›</span></div></button>`;
  if(F.hubErr)h+=`<div class="errbox">⚠️ ${esc(F.hubErr)}</div>`;
  return h;}
const lrow=(href,logo,name,sub)=>`<button class="y-lg ff-lg" data-go="fantasy/${esc(href)}">${logo?`<img src="${esc(logo)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;y-tl ph big&quot;>${esc(initials(name))}</span>'">`:`<span class="y-tl ph big">${esc(initials(name))}</span>`}<span class="y-lgb"><b>${esc(name)}</b><small>${sub}</small></span><span class="y-chev">›</span></button>`;
async function addSleeper(){
  const u=$('fslu').value.trim().replace(/^@/,'');if(!u)return;
  $('fsladd').disabled=true;
  try{const x=await sj('/user/'+encodeURIComponent(u));if(!x||!x.user_id)throw new Error(`No Sleeper user "${u}"`);
    const list=sleeperUsers().filter(v=>v.id!==x.user_id);list.push({id:x.user_id,name:x.display_name||x.username||u});LSs('ir_ff_sleeper',list);
    localStorage.setItem('ir_sleeper_user',u);F.hub=null;F.hubErr=null;toast('Added @'+(x.display_name||u));draw();refresh(true);
  }catch(e){toast(e.message);$('fsladd').disabled=false;}
}
function openEspnAdd(existing){
  const e=existing||{};
  openSheet(shHead(existing?'Update ESPN league':'Add ESPN league')+`
    <label for="fel">League ID (or paste the league's web address)</label><input id="fel" inputmode="numeric" autocomplete="off" placeholder="e.g. 899513" value="${esc(e.id||'')}">
    <label for="fes">Season</label><input id="fes" inputmode="numeric" value="${esc(e.season||curSeason())}">
    <div class="note">Find the League ID in the ESPN app under League → League Info, or in the league's web address after <b>leagueId=</b>.</div>
    <label class="ff-chk"><input type="checkbox" id="fep" ${e.s2?'checked':''}> Private league (needs two ESPN cookies)</label>
    <div id="fepx" style="${e.s2?'':'display:none'}">
      <div class="warnbox">🔒 <b>Treat these like a password.</b> espn_s2 and SWID let anyone who has them read your ESPN account. They're saved only on this phone and sent only to Sideline Status's secure relay to read this league. They're never stored on our server or shared. Signing out of ESPN on all devices makes them stop working.</div>
      <div class="note"><b>How to find them</b> (on a computer):<br>1. Sign in at fantasy.espn.com and open your league.<br>2. Open the browser's developer tools (Chrome: ⋮ → More tools → Developer tools → <b>Application</b> → Cookies; Safari/Firefox: <b>Storage</b> → Cookies).<br>3. Pick <b>https://fantasy.espn.com</b> and copy the values of <b>espn_s2</b> (a long string) and <b>SWID</b> (looks like {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}).<br>Public leagues don't need these.</div>
      <label for="fe2">espn_s2</label><input id="fe2" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(e.s2||'')}">
      <label for="fesw">SWID</label><input id="fesw" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}" value="${esc(e.swid||'')}">
    </div>
    <div id="feerr"></div><button class="btn" id="fesave">${existing?'Save':'Add league'}</button>${existing?`<button class="btn danger" id="ferm">Remove this league</button>`:''}`);
  onClose(render);
  $('fep').onchange=()=>{$('fepx').style.display=$('fep').checked?'':'none';};
  $('fesave').onclick=async()=>{
    const raw=$('fel').value.trim();const id=(raw.match(/leagueId=(\d+)/i)||raw.match(/^(\d{1,12})$/)||[])[1];
    const season=($('fes').value.trim().match(/^20\d\d$/)||[])[0];
    const priv=$('fep').checked;const s2=priv?$('fe2').value.trim().replace(/^espn_s2=/,''):'';const swid=priv?$('fesw').value.trim().replace(/^SWID=/,''):'';
    const err=m=>{$('feerr').innerHTML=`<div class="errbox">${esc(m)}</div>`;$('fesave').disabled=false;};
    if(!id)return err('Enter a numeric League ID.');if(!season)return err('Enter a season like 2026.');
    if(priv&&(!s2||!/^\{?[0-9A-Fa-f-]{36}\}?$/.test(swid)))return err('Enter both espn_s2 and SWID (SWID looks like {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}).');
    $('fesave').disabled=true;$('feerr').innerHTML='<div class="note">Checking with ESPN…</div>';
    const entry={id,season,s2,swid,mine:e.id===id?e.mine:undefined};
    try{const d=espnParse(entry,await espnFetch(entry));entry.name=d.league.name;
      const list=espnLeagues().filter(x=>!(x.id===e.id&&String(x.season)===String(e.season))&&!(x.id===id&&String(x.season)===season));list.push(entry);LSs('ir_ff_espn',list);
      F.data['espn/'+season+'-'+id]={t:Date.now(),d};closeSheet();toast('Added '+entry.name);location.hash='fantasy/espn/'+season+'-'+id;
    }catch(x){err(x.priv&&!priv?'This league is private. Turn on "Private league" and add espn_s2 and SWID, or ask the commissioner to make the league viewable to the public.':x.message);}
  };
  if(existing)$('ferm').onclick=()=>{if(!confirm('Remove this ESPN league from Sideline Status?'))return;LSs('ir_ff_espn',espnLeagues().filter(x=>!(x.id===e.id&&String(x.season)===String(e.season))));closeSheet();location.hash='fantasy';};
}

/* ================= load / draw ================= */
const lkOf=r=>r.prov+'/'+r.id;
function espnEntry(id){const [season,lid]=id.split('-');return espnLeagues().find(e=>e.id===lid&&String(e.season)===season)||{id:lid,season};}
async function loadLeague(r,force){
  const lk=lkOf(r);const c=F.data[lk];
  if(!force&&c&&Date.now()-c.t<60000)return c.d;
  if(F.loading[lk])return F.loading[lk];
  F.loading[lk]=(async()=>{const d=r.prov==='sl'?await slLoad(r.id):espnParse(espnEntry(r.id),await espnFetch(espnEntry(r.id)));F.data[lk]={t:Date.now(),d};return d;})();
  try{return await F.loading[lk];}finally{delete F.loading[lk];}
}
async function loadMatchups(r,d,w,force){
  const k=lkOf(r)+'@'+w;
  if(d.league.prov==='espn'){F.mu[k]=d.schedule[w]||[];return;}
  if(!force&&F.mu[k]&&Date.now()-F.mu[k].t<60000)return;
  const list=await slMatchups(d,w);list.t=Date.now();F.mu[k]=list;
}
let busy=false;
async function refresh(force){
  if(busy)return;busy=true;
  const r=route();
  try{
    if(!r){if(!F.hub||force){try{F.hub=sleeperUsers().length?await slLeagues():[];F.hubErr=null;}catch(e){F.hubErr="Couldn't load Sleeper leagues ("+e.message+')';}}}
    else{const lk=lkOf(r);
      try{const d=await loadLeague(r,force);F.err[lk]=null;
        if(F.sub==='matchups'){const w=F.week[lk]||d.league.week||1;await loadMatchups(r,d,w,force);}
      }catch(e){F.err[lk]=e;}}
  }finally{busy=false;}
  if(state.league==='fantasy'&&$('sheet').classList.contains('hidden'))draw();
}
function draw(){
  const v=$('view');const r=route();
  if(!r){v.innerHTML=vHub();
    v.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.go;});
    v.querySelectorAll('[data-rmsl]').forEach(b=>b.onclick=()=>{LSs('ir_ff_sleeper',sleeperUsers().filter(u=>u.id!==b.dataset.rmsl));F.hub=null;draw();refresh(true);});
    $('fsladd').onclick=addSleeper;$('fslu').onkeydown=e=>{if(e.key==='Enter')addSleeper();};
    $('fespnadd').onclick=()=>openEspnAdd(null);$('fyahoo').onclick=()=>{location.hash='yahoo';};
    return;}
  const lk=lkOf(r);const c=F.data[lk];const err=F.err[lk];
  if(!c){v.innerHTML=`<div class="y-lh"><button class="icon-btn" id="fback" aria-label="Back">‹</button><div><b>${r.prov==='sl'?'Sleeper league':'ESPN league'}</b></div></div>`+
      (err?`<div class="errbox">⚠️ ${esc(err.message)}</div>${r.prov==='espn'?'<button class="btn sec" id="fedit">Update league settings</button>':''}`:spin(F.loadMsg||'Loading league…'));
    $('fback').onclick=()=>{location.hash='fantasy';};const fe=$('fedit');if(fe)fe.onclick=()=>openEspnAdd(espnEntry(r.id));return;}
  const d=c.d;const L=d.league;const w=F.week[lk]||L.week||1;
  let h=header(L)+(err?`<div class="errbox" style="margin:0 0 12px">⚠️ ${esc(err.message)} Tap ↻ to try again.</div>`:'');
  if(F.sub==='matchups')h+=vMatchups(d,w,F.mu[lk+'@'+w]);else if(F.sub==='standings')h+=vStandings(d);else h+=vRosters(d,lk);
  if(L.prov==='espn')h+=`<button class="btn sec" id="fedit" style="margin-top:14px">ESPN league settings</button>`;
  v.innerHTML=h;
  $('fback').onclick=()=>{location.hash='fantasy';};
  v.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{F.sub=b.dataset.sub;localStorage.setItem('ir_ff_sub',F.sub);draw();refresh(false);});
  const step=dx=>{F.week[lk]=Math.max(L.startWeek,Math.min(L.endWeek,w+dx));draw();refresh(false);};
  const p=$('fwprev'),n=$('fwnext');if(p)p.onclick=()=>step(-1);if(n)n.onclick=()=>step(1);
  v.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{F.team[lk]=b.dataset.pick;draw();});
  v.querySelectorAll('.y-mt[data-team],.y-tr[data-team]').forEach(b=>b.onclick=()=>{F.team[lk]=b.dataset.team;F.sub='rosters';localStorage.setItem('ir_ff_sub',F.sub);draw();});
  const sel=()=>d.teams.find(t=>t.key===F.team[lk])||d.teams.find(t=>t.mine)||d.teams[0];
  const im=$('fimp');if(im)im.onclick=()=>openImport(d,sel());
  const fm=$('fmine');if(fm)fm.onclick=()=>{const t=sel();const e=espnEntry(r.id);const list=espnLeagues().map(x=>x.id===e.id&&String(x.season)===String(e.season)?{...x,mine:t.key}:x);LSs('ir_ff_espn',list);
    d.teams.forEach(x=>x.mine=x.key===t.key);d.mineKnown=true;toast('Marked '+t.name+' as your team');draw();};
  const fe=$('fedit');if(fe)fe.onclick=()=>openEspnAdd(espnEntry(r.id));
  const pk=v.querySelector('.y-chip.on');if(pk)pk.scrollIntoView({block:'nearest',inline:'center'});
}
function renderFantasy(){draw();refresh(false);}
function renderMeta(){
  $('season').textContent='Fantasy';$('season').className='pill y-pill';
  const r=route();const c=r&&F.data[lkOf(r)];
  $('upd').textContent=c?(c.d.league.week?'Week '+(F.week[lkOf(r)]||c.d.league.week):c.d.league.season):'Sleeper · ESPN · Yahoo';
}
root.Fantasy={render:renderFantasy,renderMeta,refresh,_F:F,_espnParse:espnParse};
})(window);
