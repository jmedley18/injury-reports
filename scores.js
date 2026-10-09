/* Scores tab: live / final / upcoming games from ESPN's public scoreboard.
   Self-contained module. It relies on globals from index.html (LEAGUES, TEAMS, DATA, favs, rosters,
   findEntry, teamByAbbr, isInj, esc, LS, $) only at call time, and exposes window.Scores. */
(()=>{
const HOST='https://site.web.api.espn.com';
const DAYS_AHEAD=7;
const S={lg:localStorage.getItem('ir_sc_lg')||'nfl',mine:localStorage.getItem('ir_sc_mine')==='1',data:{},loading:{},err:null,timer:null};
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
const dayKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;};

function norm(ev,lg){
  const c=(ev.competitions||[])[0]||{};const st=ev.status||c.status||{};const ty=st.type||{};
  const team=x=>{const t=x.team||{};const rec=(x.records||[]).find(r=>r.type==='total'||r.name==='overall');
    return{id:String(t.id||x.id||''),abbr:t.abbreviation||'',name:t.shortDisplayName||t.displayName||t.name||'TBD',logo:t.logo||'',score:x.score,winner:!!x.winner,rec:rec?rec.summary:''};};
  const comps=c.competitors||[];
  const home=team(comps.find(x=>x.homeAway==='home')||comps[0]||{}),away=team(comps.find(x=>x.homeAway==='away')||comps[1]||{});
  const bc=[...new Set([...(c.broadcasts||[]).flatMap(b=>b.names||[]),...(c.geoBroadcasts||[]).map(g=>(g.media||{}).shortName).filter(Boolean)])];
  const od=(c.odds||[])[0];
  const series=c.series&&c.series.summary?c.series.summary:'';
  const note=[((c.notes||[])[0]||{}).headline,series].filter(Boolean).join(' · ');
  const sit=c.situation||null;
  return{id:ev.id,lg,date:Date.parse(ev.date||c.date),state:ty.state||'pre',completed:!!ty.completed,detail:ty.shortDetail||ty.detail||'',desc:ty.description||'',
    home,away,tv:bc.slice(0,3).join(', '),odds:od?[od.details,od.overUnder!=null?'O/U '+od.overUnder:''].filter(Boolean).join(' · '):'',note,sit,venue:(c.venue||{}).fullName||''};
}
async function fetchBoard(lg,date){
  const u=`${HOST}/apis/site/v2/sports/${LEAGUES[lg].path}/scoreboard?${date?'dates='+date+'&':''}limit=100&_=${Date.now()}`;
  const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
  return((await r.json()).events||[]).map(e=>norm(e,lg));
}
// full: default board + today..today+7 (ESPN ignores date ranges, so one request per day). quick: default + today only.
async function load(lg,full){
  if(S.loading[lg])return S.loading[lg];
  S.loading[lg]=(async()=>{
    const now=new Date();const dates=[null];
    const n=full||!S.data[lg]?DAYS_AHEAD:0;
    for(let i=0;i<=n;i++){const d=new Date(now);d.setDate(d.getDate()+i);dates.push(ymd(d));}
    const res=await Promise.allSettled(dates.map(d=>fetchBoard(lg,d)));
    if(res.every(r=>r.status==='rejected'))throw res[0].reason;
    const m=new Map(S.data[lg]&&!full?S.data[lg].events.map(e=>[e.id,e]):[]);
    res.forEach(r=>{if(r.status==='fulfilled')r.value.forEach(e=>m.set(e.id,e));});
    S.data[lg]={events:[...m.values()],fetched:Date.now()};
    return S.data[lg];
  })();
  try{return await S.loading[lg];}finally{S.loading[lg]=null;}
}
function myTeamIds(lg){
  const s=new Set();
  for(const f of (typeof favs!=='undefined'?favs:[])){const [l,id]=f.split(':');if(l===lg)s.add(id);}
  for(const r of (typeof rosters!=='undefined'?rosters:[]))for(const p of r.players){if(p.lg!==lg)continue;
    const e=findEntry(p);const ab=(e&&e.abbr)||p.team;const t=ab&&teamByAbbr(lg,ab);if(t)s.add(t.id);}
  return s;
}
const hasLive=lg=>!!S.data[lg]&&S.data[lg].events.some(e=>e.state==='in'||(e.state==='pre'&&e.date<=Date.now()&&Date.now()-e.date<6*3600e3));
const fmtTime=d=>new Date(d).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
function dayLabel(d){const k=dayKey(d),t=new Date(),tm=new Date();tm.setDate(t.getDate()+1);
  if(k===dayKey(t))return'Today';if(k===dayKey(tm))return'Tomorrow';
  return new Date(d).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});}
function sitText(g){
  const s=g.sit;if(!s||g.state!=='in')return'';
  if(g.lg==='nfl')return[s.downDistanceText||s.shortDownDistanceText||'',s.isRedZone?'🔴 Red zone':''].filter(Boolean).join(' · ');
  if(g.lg==='mlb'){const parts=[];if(s.outs!=null)parts.push(`${s.outs} out${s.outs===1?'':'s'}`);
    if(s.balls!=null&&s.strikes!=null)parts.push(`${s.balls}-${s.strikes} count`);
    const on=[s.onFirst&&'1st',s.onSecond&&'2nd',s.onThird&&'3rd'].filter(Boolean);parts.push(on.length?(on.length===3?'Bases loaded':'On '+on.join(', ')):'Bases empty');
    return parts.join(' · ');}
  return'';
}
function teamRow(g,t,other,mine){
  const lg=g.lg;const known=typeof teamBy==='function'&&teamBy(lg,t.id);
  const d=DATA[lg];const n=known&&d?(d.teams[t.id]||[]).filter(isInj).length:0;
  const showScore=g.state!=='pre'&&t.score!=null&&t.score!=='';
  const lose=g.state==='post'&&g.completed&&showScore&&other.score!=null&&+t.score<+other.score;
  const poss=g.state==='in'&&g.sit&&g.sit.possession&&String(g.sit.possession)===t.id;
  return `<div class="sc-t ${lose?'lose':''}" ${known?`data-team="${lg}/${t.id}"`:''}>
    ${t.logo?`<img src="${esc(t.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:'<span style="width:30px"></span>'}
    <div class="nm">${esc(t.name)}${mine.has(t.id)?'<span class="fav">★</span>':''}${t.rec?`<small>${esc(t.rec)}</small>`:''}</div>
    ${poss?'<span class="pos" title="Possession">🏈</span>':''}
    ${n?`<span class="inj" title="On injury report">🩹${n}</span>`:''}
    ${showScore?`<span class="sc">${esc(t.score)}</span>`:''}</div>`;
}
function card(g,mine){
  const isMine=mine.has(g.home.id)||mine.has(g.away.id);
  let st;
  if(g.state==='in')st=`<span class="sc-st live">${esc(g.detail||'Live')}</span>`;
  else if(g.state==='post')st=`<span class="sc-st final">${esc(g.completed?(g.detail||'Final'):(g.desc||g.detail))}</span>`;
  else st=`<span class="sc-st"><span class="sc-time">${/TBD|TBA/i.test(g.detail)?'TBD':esc(fmtTime(g.date))}</span></span>`;
  const sit=sitText(g);const last=g.state==='in'&&g.sit&&g.sit.lastPlay&&g.sit.lastPlay.text;
  const foot=[g.tv?'📺 '+esc(g.tv):'',g.state==='pre'&&g.odds?'📈 '+esc(g.odds):'',g.state==='pre'&&g.venue?'📍 '+esc(g.venue):''].filter(Boolean);
  return `<div class="glass sc-g ${isMine?'mine':''} ${g.state==='in'?'live':''}">
    <div class="sc-head"><span class="note">${esc(g.note||(g.state==='pre'?dayLabel(g.date):''))}</span>${st}</div>
    ${teamRow(g,g.away,g.home,mine)}${teamRow(g,g.home,g.away,mine)}
    ${sit?`<div class="sc-sit">${esc(sit)}</div>`:''}${last?`<div class="sc-last">${esc(last)}</div>`:''}
    ${foot.length?`<div class="sc-foot">${foot.map(f=>`<span>${f}</span>`).join('')}</div>`:''}</div>`;
}
function render(){
  const v=$('view');const lg=S.lg;const d=S.data[lg];const mine=myTeamIds(lg);
  let h=`<div class="sc-top"><div class="sc-lgs">${Object.entries(LEAGUES).map(([k,x])=>`<button class="sc-lg ${k===lg?'on':''}" data-sl="${k}">${x.label}${hasLive(k)?'<span class="lv"></span>':''}</button>`).join('')}</div>
    <button class="sc-mine ${S.mine?'on':''}" id="scMine">★ My teams</button></div>`;
  if(!d){h+=S.err?`<div class="glass err">⚠️ Couldn't load ${LEAGUES[lg].label} scores (${esc(S.err)}). Tap ↻ to retry.</div>`:'<div class="skel"></div><div class="skel"></div><div class="skel"></div>';v.innerHTML=h;wire();return;}
  let evs=d.events.slice();
  if(S.mine)evs=evs.filter(g=>mine.has(g.home.id)||mine.has(g.away.id));
  const today=dayKey(Date.now());const horizon=Date.now()+(DAYS_AHEAD+1)*864e5;
  const live=evs.filter(g=>g.state==='in').sort((a,b)=>a.date-b.date);
  const finals=evs.filter(g=>g.state==='post'&&dayKey(g.date)===today).sort((a,b)=>b.date-a.date);
  const up=evs.filter(g=>g.state==='pre'&&g.date<horizon).sort((a,b)=>a.date-b.date);
  const sortMine=a=>a.sort((x,y)=>((mine.has(y.home.id)||mine.has(y.away.id))-(mine.has(x.home.id)||mine.has(x.away.id))));
  if(live.length)h+=`<div class="section">🔴 Live now (${live.length})</div>`+sortMine(live).map(g=>card(g,mine)).join('');
  if(finals.length)h+=`<div class="section">Final today (${finals.length})</div>`+finals.map(g=>card(g,mine)).join('');
  const groups=new Map();up.forEach(g=>{const k=dayKey(g.date);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(g);});
  for(const [k,gs] of groups)h+=`<div class="section">${esc(dayLabel(gs[0].date))} · ${gs.length} game${gs.length>1?'s':''}</div>`+gs.map(g=>card(g,mine)).join('');
  if(!live.length&&!finals.length&&!up.length){
    h+=`<div class="glass empty"><div class="big">${S.mine?'⭐':'📅'}</div><b>${S.mine?`None of your ${LEAGUES[lg].label} teams play in the next week`:`No ${LEAGUES[lg].label} games in the next week`}</b><small>${S.mine?(mine.size?'Turn off "My teams" to see every game.':'Star a team or add players on ★ Mine to use this filter.'):'The league may be between seasons or on a break.'}</small></div>`;
  }
  v.innerHTML=h;wire();
}
function wire(){
  const v=$('view');
  v.querySelectorAll('[data-sl]').forEach(b=>b.onclick=()=>{S.lg=b.dataset.sl;localStorage.setItem('ir_sc_lg',S.lg);S.err=null;render();renderMetaScores();refresh(false);});
  $('scMine').onclick=()=>{S.mine=!S.mine;localStorage.setItem('ir_sc_mine',S.mine?'1':'0');render();};
  v.querySelectorAll('[data-team]').forEach(r=>r.onclick=()=>{location.hash=r.dataset.team;});
}
const active=()=>typeof state!=='undefined'&&state.league==='scores';
function renderMetaScores(){
  if(!active())return;const d=S.data[S.lg];
  $('season').textContent=`${LEAGUES[S.lg].label} scores`;$('season').className='pill'+(hasLive(S.lg)?' warn':'');
  $('upd').textContent=d?`Updated ${ago(d.fetched)}${hasLive(S.lg)?' · live, every 30s':''}`:'';
}
async function refresh(force){
  const lg=S.lg;
  try{const d=S.data[lg];const full=force||!d||Date.now()-d.fetched>15*60e3;
    if(!full&&d&&Date.now()-d.fetched<20e3)return;
    await load(lg,full);S.err=null;}
  catch(e){S.err=e.message;}
  if(active()&&lg===S.lg&&$('sheet').classList.contains('hidden')){render();renderMetaScores();}
}
// 30s auto-refresh while live games exist and the tab is visible
setInterval(()=>{if(active()&&!document.hidden&&hasLive(S.lg))load(S.lg,false).then(()=>{if(active()&&$('sheet').classList.contains('hidden')){render();renderMetaScores();}}).catch(()=>{});},30e3);
window.Scores={render:()=>{render();renderMetaScores();},refresh,renderMeta:renderMetaScores,_state:S};
})();
