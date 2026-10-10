/* Yahoo Fantasy tab: leagues, matchups, standings, rosters (with ESPN injury overlay), import to My Players.
   OAuth + API proxy live in the injury-push Worker (/yahoo/*). Only the session id is stored here (localStorage ir_yahoo_sid).
   Self-contained module. At call time it uses globals from index.html (LEAGUES, DATA, findEntry, isInj, colOf, sev, esc, $,
   rosters, roster, uid, addPlayers, curRoster, saveRosters, openSheet, closeSheet, onClose, shHead, toast, render, initials).
   YParse (pure JSON parsers for Yahoo's response shapes) is also exported for Node unit tests. */
(function(root){
/* ================= parsers (no DOM) ================= */
// Yahoo JSON: collections are {"0":{...},"1":{...},"count":N}; resources are arrays of single-key objects (sometimes nested / with [] gaps).
const yc=o=>{if(!o||typeof o!=='object')return[];if(Array.isArray(o))return o;const out=[];const n=Number(o.count);
  if(n>=0){for(let i=0;i<n;i++)if(o[i]!=null)out.push(o[i]);}else for(const k of Object.keys(o))if(/^\d+$/.test(k))out.push(o[k]);return out;};
const ym=a=>{const r={};const w=x=>{if(Array.isArray(x))x.forEach(w);else if(x&&typeof x==='object')Object.assign(r,x);};w(a);return r;};
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:null;};
const fc=j=>{if(!j||!j.fantasy_content){const e=j&&j.error;throw new Error(e?(e.description||String(e)):'Unexpected Yahoo response');}return j.fantasy_content;};
const CODE_ORDER={nfl:0,mlb:1,nba:2,nhl:3};
function league(m){m=ym(m);return{key:m.league_key,id:String(m.league_id||''),name:m.name||'League',code:m.game_code||'',season:String(m.season||''),
  logo:m.logo_url||'',url:m.url||'',numTeams:+m.num_teams||0,scoring:m.scoring_type||'',draft:m.draft_status||'',
  week:+m.current_week||null,startWeek:+m.start_week||1,endWeek:+m.end_week||null,finished:!!+m.is_finished,startDate:m.start_date||'',endDate:m.end_date||''};}
function parseLeagues(j){
  const users=yc(fc(j).users);const out=[];
  for(const u of users){const um=ym(u.user);
    for(const g of yc(um.games)){const gm=ym(g.game);
      for(const l of yc(gm.leagues)){if(!l||!l.league)continue;const x=league(l.league);x.code=x.code||gm.code||'';x.gameName=gm.name||'';if(!x.season)x.season=String(gm.season||'');out.push(x);}}}
  return out.sort((a,b)=>(CODE_ORDER[a.code]??9)-(CODE_ORDER[b.code]??9)||a.name.localeCompare(b.name));
}
function logoOf(m){const l=yc(m.team_logos)[0];return l&&l.team_logo?l.team_logo.url:'';}
function team(arr){const m=ym(arr);const ts=m.team_standings||{};const ot=ts.outcome_totals||{};const mg=(yc(m.managers)[0]||{}).manager||{};
  const t={key:m.team_key,id:String(m.team_id||''),name:m.name||'Team',logo:logoOf(m),mine:!!+m.is_owned_by_current_login,manager:mg.nickname||'',
    pts:num((m.team_points||{}).total),proj:num((m.team_projected_points||{}).total),winProb:num(m.win_probability),
    rank:num(ts.rank),seed:num(ts.playoff_seed),w:+ot.wins||0,l:+ot.losses||0,t:+ot.ties||0,pct:ot.percentage||'',
    pf:num(ts.points_for),pa:num(ts.points_against),streak:ts.streak?((ts.streak.type||'')[0]||'').toUpperCase()+(ts.streak.value||''):'',
    gamesBack:ts.games_back||''};
  if(m.roster)t.players=rosterPlayers(m.roster);
  return t;}
function player(arr){const m=ym(arr);const sp=ym(m.selected_position);const nm=m.name||{};
  return{key:m.player_key,name:nm.full||[nm.first,nm.last].filter(Boolean).join(' ')||'Player',first:nm.first||'',last:nm.last||'',
    team:String(m.editorial_team_abbr||'').toUpperCase(),teamName:m.editorial_team_full_name||'',pos:m.display_position||m.primary_position||'',
    ptype:m.position_type||'',slot:sp.position||'',status:m.status||'',statusFull:m.status_full||'',injury:m.injury_note||'',
    img:(m.headshot&&m.headshot.url)||m.image_url||'',bye:(m.bye_weeks&&m.bye_weeks.week)||'',pts:num((m.player_points||{}).total)};}
function rosterPlayers(r){const inner=r&&(r[0]||r['0'])||{};return yc(inner.players).map(p=>player(p.player));}
function parseStandings(j){const lm=ym(fc(j).league);const st=ym(lm.standings);
  return{league:league(lm),teams:yc(st.teams).map(t=>team(t.team)).sort((a,b)=>(a.rank??99)-(b.rank??99))};}
function parseScoreboard(j){const lm=ym(fc(j).league);const sb=lm.scoreboard||{};const inner=sb[0]||sb['0']||sb;
  const matchups=yc(inner.matchups).map(x=>{const m=x.matchup||{};const ti=m[0]||m['0']||{};
    return{week:+m.week||null,status:m.status||'',playoffs:!!+m.is_playoffs,consolation:!!+m.is_consolation,tied:!!+m.is_tied,winner:m.winner_team_key||'',
      start:m.week_start||'',end:m.week_end||'',teams:yc(ti.teams).map(t=>team(t.team))};});
  return{league:league(lm),week:+sb.week||(matchups[0]&&matchups[0].week)||null,matchups};}
function parseRosters(j){const c=fc(j);
  if(c.team)return{teams:[team(c.team)]};
  const lm=ym(c.league);return{league:league(lm),teams:yc(lm.teams).map(t=>team(t.team))};}
const RESERVE=/^(IR|IR\+|IL|IL\+|IL10|IL15|IL60|NA|DL)$/i;
const slotGroup=s=>s==='BN'?'bench':RESERVE.test(s)?'reserve':'start';
// Yahoo editorial team abbreviation -> ESPN abbreviation used by teams.json
const YFIX={WAS:'WSH',CWS:'CHW',OAK:'ATH',PHO:'PHX',UTA:'UTAH',GSW:'GS',NOP:'NO',NYK:'NY',SAS:'SA',JAC:'JAX'};
const espnAbbr=a=>{a=String(a||'').toUpperCase();return YFIX[a]||a;};
const YParse={yc,ym,parseLeagues,parseStandings,parseScoreboard,parseRosters,team,player,slotGroup,espnAbbr};
root.YParse=YParse;
if(typeof module!=='undefined'&&module.exports){module.exports=YParse;return;}

/* ================= UI ================= */
const API='https://injury-push.jmedley.workers.dev';
const SPORT={nfl:'🏈 Football',mlb:'⚾ Baseball',nba:'🏀 Basketball',nhl:'🏒 Hockey'};
const Y={sid:localStorage.getItem('ir_yahoo_sid')||'',leagues:null,cache:{},loading:{},err:null,notice:'',sub:localStorage.getItem('ir_y_sub')||'matchups',week:{},team:{},pollT:null};
const saveSid=s=>{Y.sid=s||'';if(s)localStorage.setItem('ir_yahoo_sid',s);else localStorage.removeItem('ir_yahoo_sid');};
// OAuth return: #yahoo?sid=... or #yahoo?error=...  (strip it from the URL right away)
(function(){const m=location.hash.match(/^#yahoo\?(.*)$/);if(!m)return;const q=new URLSearchParams(m[1]);
  if(q.get('sid')){saveSid(q.get('sid'));localStorage.removeItem('ir_yahoo_pair');Y.notice='connected';}
  else if(q.get('error'))Y.notice=q.get('error')==='access_denied'?'denied':'error:'+q.get('error');
  history.replaceState(null,'',location.pathname+location.search+'#yahoo');})();
class Reauth extends Error{}
async function api(path,force){
  if(!Y.sid)throw new Reauth('not connected');
  const c=Y.cache[path];if(!force&&c&&Date.now()-c.t<90000)return c.d;
  if(Y.loading[path])return Y.loading[path];
  Y.loading[path]=(async()=>{
    const r=await fetch(`${API}/yahoo/api?path=${encodeURIComponent(path)}`,{headers:{Authorization:'Bearer '+Y.sid},cache:'no-store'});
    const txt=await r.text();let d=null;try{d=JSON.parse(txt);}catch(e){}
    if(r.status===401&&d&&d.error==='reauth'){saveSid('');Y.cache={};Y.leagues=null;Y.notice='expired';Y.noticeT=0;throw new Reauth(d.detail||'expired');}
    if(!r.ok||!d||d.error){const e=d&&d.error;throw new Error((e&&(e.description||(typeof e==='string'?e:'')))||('Yahoo HTTP '+r.status));}
    Y.cache[path]={t:Date.now(),d};return d;})();
  try{return await Y.loading[path];}finally{delete Y.loading[path];}
}
const P={
  leagues:'users;use_login=1/games;game_keys=nfl,mlb,nba,nhl/leagues',
  standings:k=>`league/${k}/standings`,
  scoreboard:(k,w)=>`league/${k}/scoreboard${w?';week='+w:''}`,
  rosters:k=>`league/${k}/teams/roster`,
};
/* ---- connect / disconnect ---- */
function connect(){
  const pair=Array.from(crypto.getRandomValues(new Uint8Array(18)),b=>b.toString(16).padStart(2,'0')).join('');
  localStorage.setItem('ir_yahoo_pair',JSON.stringify({p:pair,t:Date.now()}));
  const u=`${API}/yahoo/login?ret=${encodeURIComponent(location.origin+location.pathname)}&pair=${pair}`;
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(standalone){window.open(u,'_blank');startPoll();}else location.href=u;
}
// Home Screen apps finish sign-in in a separate browser sheet with its own storage, so pick the session up from the Worker.
async function claim(){
  let pr=null;try{pr=JSON.parse(localStorage.getItem('ir_yahoo_pair')||'null');}catch(e){}
  if(!pr||Y.sid){stopPoll();return;}
  if(Date.now()-pr.t>10*60000){localStorage.removeItem('ir_yahoo_pair');stopPoll();return;}
  try{const r=await fetch(`${API}/yahoo/claim`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pair:pr.p})});
    if(r.ok){const d=await r.json();if(d.sid){saveSid(d.sid);localStorage.removeItem('ir_yahoo_pair');stopPoll();Y.notice='connected';Y.noticeT=0;if(state.league==='yahoo')render();}}}catch(e){}
}
function startPoll(){stopPoll();Y.pollT=setInterval(claim,3000);}
function stopPoll(){if(Y.pollT){clearInterval(Y.pollT);Y.pollT=null;}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)claim();});
if(!Y.sid&&localStorage.getItem('ir_yahoo_pair'))setTimeout(()=>{claim();startPoll();},500);
async function disconnect(){
  if(!confirm('Disconnect Yahoo Fantasy from Sideline Status?'))return;
  const sid=Y.sid;saveSid('');Y.cache={};Y.leagues=null;
  try{await fetch(`${API}/yahoo/logout`,{method:'POST',headers:{Authorization:'Bearer '+sid}});}catch(e){}
  toast('Yahoo disconnected');location.hash='yahoo';render();
}
/* ---- helpers ---- */
const route=()=>{const p=location.hash.replace(/^#/,'').split('/');return{lk:p[0]==='yahoo'&&p[1]?decodeURIComponent(p[1]):null};};
const fmt=v=>v==null?'–':Number.isInteger(v)?String(v):v.toFixed(2);
const fx1=v=>v==null?'–':Number(v).toFixed(1);
const pts=v=>v==null?'–':Number(v).toFixed(2);
const tlogo=t=>t.logo?`<img class="y-tl" src="${esc(t.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:`<span class="y-tl ph">${esc(initials(t.name))}</span>`;
const findL=k=>(Y.leagues||[]).find(l=>l.key===k);
const espnFor=(p,code)=>LEAGUES[code]?findEntry({lg:code,n:p.name,team:espnAbbr(p.team)}):undefined;
const shortSt=s=>{const l=String(s||'').toLowerCase();const m=l.match(/(\d+)-day/);if(m&&/il|injured list/.test(l))return'IL'+m[1];
  return({out:'Out',questionable:'Q',doubtful:'D',probable:'P','injured reserve':'IR','day-to-day':'DTD',suspension:'SUSP'})[l]||(s.length>8?s.slice(0,8)+'…':s);};
function statusBadges(p,code){
  let h='';const e=espnFor(p,code);
  if(p.status){const [c,b,tx]=colOf(p.statusFull||p.status);h+=`<span class="y-st" style="--s:${c};--sb:${b};--st:${tx}" title="Yahoo status">${esc(p.status)}</span>`;}
  if(isInj(e)){const [c,b,tx]=colOf(e.st);h+=`<span class="y-st espn" style="--s:${c};--sb:${b};--st:${tx}" title="ESPN injury report: ${esc(e.st)}">ESPN ${esc(shortSt(e.st))}</span>`;}
  return h;}
function msgCard(icon,title,body){return `<div class="glass empty"><div class="big">${icon}</div><b>${title}</b>${body?`<small>${body}</small>`:''}</div>`;}
function noticeHtml(){ // shown for ~10s (the view re-renders several times while data loads)
  if(Y.notice&&!Y.noticeT)Y.noticeT=Date.now();if(Y.notice&&Date.now()-Y.noticeT>10000){Y.notice='';Y.noticeT=0;}
  const n=Y.notice;if(!n)return'';if(n==='connected')return`<div class="y-ok">✅ Yahoo connected</div>`;
  if(n==='denied')return`<div class="warnbox" style="margin:0 0 12px">Yahoo sign-in was cancelled. Nothing was connected.</div>`;
  if(n==='expired')return`<div class="warnbox" style="margin:0 0 12px">Your Yahoo connection expired or was revoked. Connect again to keep using the Fantasy tab.</div>`;
  return`<div class="errbox" style="margin:0 0 12px">Yahoo sign-in didn't finish (${esc(n.replace(/^error:/,''))}). Please try again.</div>`;}
function errHtml(e){return e instanceof Reauth?'':`<div class="errbox" style="margin:0 0 12px">⚠️ Couldn't load from Yahoo (${esc(e.message)}). Tap ↻ to try again.</div>`;}

/* ---- views ---- */
function viewConnect(){
  return noticeHtml()+`<div class="glass y-hero"><div class="y-logo">Y!</div><h2>Yahoo Fantasy</h2>
    <p>Connect your Yahoo account to see your fantasy leagues right here, next to the injury reports.</p>
    <ul><li>📅 Weekly matchups with live and projected points</li><li>🏆 League standings</li><li>📋 Every roster, with ESPN injury statuses overlaid</li><li>★ Import your team into My Players for injury alerts</li></ul>
    <button class="btn y-btn" id="yconnect">Connect Yahoo</button>
    <div class="note">Read-only access. You sign in on Yahoo's own page; Sideline Status never sees your password and can't make moves in your leagues. Disconnect any time.</div></div>`;
}
function viewLeagues(){
  let h=noticeHtml();
  if(Y.err)h+=errHtml(Y.err);
  if(!Y.leagues)return h+(Y.err?`<button class="btn sec" id="ydisc">Disconnect Yahoo</button>`:`<div class="glass empty"><div class="spinner"></div>Loading your Yahoo leagues…</div>`);
  if(!Y.leagues.length)h+=msgCard('🤷','No current-season leagues found','Your Yahoo account has no NFL, MLB, NBA or NHL leagues this season yet. Join or create one on Yahoo, then tap ↻.');
  let last='';
  for(const l of Y.leagues){
    if(l.code!==last){h+=`<div class="section">${SPORT[l.code]||esc(l.gameName||l.code)}</div>`;last=l.code;}
    h+=`<button class="glass y-lg" data-lk="${esc(l.key)}">${l.logo?`<img src="${esc(l.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:`<span class="y-tl ph big">${esc(initials(l.name))}</span>`}
      <span class="y-lgb"><b>${esc(l.name)}</b><small>${esc(l.season)} · ${l.numTeams} teams${l.week&&!l.finished?` · Week ${l.week}`:''}${l.finished?' · Final':''}${l.draft==='predraft'?' · Pre-draft':''}</small></span><span class="y-chev">›</span></button>`;
  }
  h+=`<button class="btn sec" id="ydisc">Disconnect Yahoo</button>`;
  return h;
}
function leagueHeader(l){
  return `<div class="y-lh"><button class="icon-btn" id="yback" aria-label="Back">‹</button>${l.logo?`<img src="${esc(l.logo)}" alt="">`:''}<div><b>${esc(l.name)}</b><small>${SPORT[l.code]||''} · ${esc(l.season)}</small></div></div>
    <div class="y-subs">${['matchups','standings','rosters'].map(s=>`<button class="y-sub ${Y.sub===s?'on':''}" data-sub="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div>`;
}
function viewMatchups(l,d){
  const w=Y.week[l.key]||d&&d.week||l.week;
  let h=`<div class="y-wk"><button class="icon-btn" id="ywprev" ${w<=l.startWeek?'disabled':''} aria-label="Previous week">‹</button><b>Week ${w||'–'}</b>${w&&w===l.week?'<span class="y-cur">Current</span>':''}<button class="icon-btn" id="ywnext" ${l.endWeek&&w>=l.endWeek?'disabled':''} aria-label="Next week">›</button></div>`;
  if(!d)return h+`<div class="glass empty"><div class="spinner"></div>Loading matchups…</div>`;
  if(!d.matchups.length)return h+msgCard('📅','No matchups this week',l.scoring==='roto'?'This is a rotisserie league, so there are no head-to-head matchups. Check Standings.':'');
  const showProj=d.matchups.some(m=>m.teams.some(t=>t.proj!=null));
  for(const m of d.matchups){
    const mine=m.teams.some(t=>t.mine);const done=m.status==='postevent';
    const st=m.status==='midevent'?'<span class="sc-st live">Live</span>':done?'<span class="sc-st final">Final</span>':'<span class="sc-st">Upcoming</span>';
    h+=`<div class="glass y-mu ${mine?'mine':''}"><div class="y-muh">${m.playoffs?'🏆 Playoffs':m.consolation?'Consolation':'Week '+(m.week||w)}${st}</div>`;
    for(const t of m.teams){const lose=done&&m.winner&&m.winner!==t.key;
      h+=`<div class="y-mt ${lose?'lose':''} ${t.mine?'me':''}" data-team="${esc(t.key)}">${tlogo(t)}<div class="y-mn"><b>${esc(t.name)}${t.mine?' <span class="y-you">You</span>':''}</b><small>${esc(t.manager)}${showProj&&t.proj!=null?` · Proj ${pts(t.proj)}`:''}</small></div><div class="y-pts">${t.pts==null?'–':fmt(t.pts)}</div></div>`;}
    const wp=m.teams[0]&&m.teams[0].winProb;
    if(wp!=null&&!done&&m.teams.length===2)h+=`<div class="y-wp" title="Win probability"><span style="width:${Math.round(wp*100)}%"></span></div><div class="y-wpl"><span>${Math.round(wp*100)}%</span><span>Win probability</span><span>${100-Math.round(wp*100)}%</span></div>`;
    h+=`</div>`;
  }
  return h;
}
function viewStandings(l,d){
  if(!d)return`<div class="glass empty"><div class="spinner"></div>Loading standings…</div>`;
  const ties=d.teams.some(t=>t.t);const hasPts=d.teams.some(t=>t.pf!=null);
  return `<div class="glass y-tbl"><div class="y-tr y-th"><span>#</span><span>Team</span><span>${ties?'W-L-T':'W-L'}</span>${hasPts?'<span>PF</span><span>PA</span>':''}</div>`+
    d.teams.map(t=>`<div class="y-tr ${t.mine?'me':''}" data-team="${esc(t.key)}"><span class="rk">${t.rank??''}</span><span class="tm">${tlogo(t)}<span><b>${esc(t.name)}</b><small>${esc(t.manager)}${t.streak?' · '+esc(t.streak):''}</small></span></span><span>${t.w}-${t.l}${ties?'-'+t.t:''}</span>${hasPts?`<span>${fx1(t.pf)}</span><span>${fx1(t.pa)}</span>`:''}</div>`).join('')+`</div>`;
}
function viewRosters(l,d){
  if(!d)return`<div class="glass empty"><div class="spinner"></div>Loading rosters…</div>`;
  const teams=d.teams;if(!teams.length)return msgCard('📋','No rosters yet','');
  const sel=teams.find(t=>t.key===Y.team[l.key])||teams.find(t=>t.mine)||teams[0];
  let h=`<div class="y-pick">${teams.slice().sort((a,b)=>b.mine-a.mine).map(t=>`<button class="y-chip ${t.key===sel.key?'on':''} ${t.mine?'me':''}" data-pick="${esc(t.key)}">${t.mine?'⭐ ':''}${esc(t.name)}</button>`).join('')}</div>`;
  const ps=sel.players||[];
  const inj=ps.filter(p=>p.status||isInj(espnFor(p,l.code))).length;
  h+=`<div class="glass y-rh ${sel.mine?'mine':''}">${tlogo(sel)}<div><b>${esc(sel.name)}</b><small>${esc(sel.manager)} · ${ps.length} players${inj?` · <span style="color:#fca5a5">${inj} with injury status</span>`:''}</small></div></div>`;
  if(LEAGUES[l.code]&&ps.length)h+=`<button class="btn y-imp" id="yimp">★ Import ${sel.mine?'my team':'this team'} to My Players</button>`;
  const groups={start:'Starters',bench:'Bench',reserve:'Injured reserve / NA'};
  for(const g of ['start','bench','reserve']){
    const list=ps.filter(p=>slotGroup(p.slot)===g);if(!list.length)continue;
    h+=`<div class="section">${groups[g]} (${list.length})</div><div class="glass y-ros">`+list.map(p=>{
      const e=espnFor(p,l.code);const note=[p.injury,isInj(e)?[e.type,e.det].filter(x=>x&&!/not specified/i.test(x)).join(' '):''].filter(Boolean)[0]||'';
      return `<div class="y-pr"><span class="y-slot ${g}">${esc(p.slot||'–')}</span>${p.img?`<img class="y-hs" src="${esc(p.img)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:''}<div class="y-pb"><b>${esc(p.name)}</b><small>${esc(p.team||'FA')} · ${esc(p.pos)}${p.bye&&l.code==='nfl'?` · Bye ${esc(p.bye)}`:''}${note?` · <span class="y-inj">${esc(note)}</span>`:''}</small></div><div class="y-sts">${statusBadges(p,l.code)}</div></div>`;}).join('')+`</div>`;
  }
  if(!LEAGUES[l.code])h+=`<div class="note">ESPN injury overlay and My Players import cover NFL, MLB and NBA. Yahoo's own status is shown for ${esc(l.code.toUpperCase())}.</div>`;
  return h;
}
function openImport(l,t){
  const players=(t.players||[]).filter(p=>p.ptype!=='DT'&&p.pos!=='DEF').map(p=>({lg:l.code,id:'',n:p.name,team:espnAbbr(p.team),pos:p.pos,hs:p.img,src:'yahoo'}));
  const skipped=(t.players||[]).length-players.length;const r=roster();
  openSheet(shHead('Import '+esc(t.name))+`<div class="note" style="margin:0 0 6px">${players.length} players from ${esc(l.name)}</div>`+
    players.map(p=>{const e=findEntry({...p});return `<div class="ri">${p.hs?`<img class="h" src="${esc(p.hs)}" alt="" onerror="this.style.visibility='hidden'">`:`<div class="ph">${esc(initials(p.n))}</div>`}<div class="rb">${esc(p.n)}<small>${esc(p.pos)} · ${esc(p.team||'Free agent')}</small></div>${isInj(e)?`<span class="st" style="--s:${colOf(e.st)[0]};--sb:${colOf(e.st)[1]};--st:${colOf(e.st)[2]}">${esc(e.st)}</span>`:''}</div>`;}).join('')+
    (skipped?`<div class="warnbox">Skipped ${skipped} team defense${skipped>1?'s':''}. Team defenses don't have injury reports.</div>`:'')+
    `<label for="yn">Save as list</label><input id="yn" maxlength="30" value="${esc(l.name)}"><button class="btn" id="ynew">Save as new list</button>${r?`<button class="btn sec" id="yadd">Add to "${esc(r.name)}" instead</button>`:''}`);
  onClose(render);
  $('ynew').onclick=()=>{const nr={id:uid(),name:$('yn').value.trim()||l.name,players:[],yahoo:{league:l.key,team:t.key}};rosters.push(nr);curRoster=nr.id;const n=addPlayers(players,nr);closeSheet();toast(`Imported ${n} players`);location.hash='mine';};
  if(r)$('yadd').onclick=()=>{const n=addPlayers(players,r);closeSheet();toast(`Added ${n} players`);location.hash='mine';};
}
/* ---- data loading ---- */
async function loadLeagues(force){
  try{Y.leagues=parseLeagues(await api(P.leagues,force));Y.err=null;}catch(e){Y.err=e;if(!(e instanceof Reauth)&&!Y.leagues)Y.leagues=null;}
}
async function loadView(force){
  const {lk}=route();if(!lk)return;
  const l=findL(lk);if(!l)return;
  try{
    if(Y.sub==='matchups'){const w=Y.week[lk]||l.week;Y.cache['_sb:'+lk+':'+w]=parseScoreboard(await api(P.scoreboard(lk,w),force));}
    else if(Y.sub==='standings')Y.cache['_st:'+lk]=parseStandings(await api(P.standings(lk),force));
    else Y.cache['_ro:'+lk]=parseRosters(await api(P.rosters(lk),force));
    Y.err=null;
  }catch(e){Y.err=e;}
}
let busy=false;
async function refresh(force){
  if(!Y.sid||busy)return;busy=true;
  try{if(!Y.leagues||force)await loadLeagues(force);await loadView(force);}finally{busy=false;}
  if(state.league==='yahoo'&&$('sheet').classList.contains('hidden'))draw();
}
/* ---- render ---- */
function draw(){
  const v=$('view');
  if(!Y.sid){v.innerHTML=viewConnect();$('yconnect').onclick=connect;return;}
  const {lk}=route();const l=lk&&findL(lk);
  if(!l){v.innerHTML=viewLeagues();
    v.querySelectorAll('[data-lk]').forEach(b=>b.onclick=()=>{location.hash='yahoo/'+encodeURIComponent(b.dataset.lk);});
    const d=$('ydisc');if(d)d.onclick=disconnect;
    if(lk&&Y.leagues)location.hash='yahoo';return;}
  let h=noticeHtml()+leagueHeader(l)+(Y.err?errHtml(Y.err):'');
  const w=Y.week[l.key]||l.week;
  if(Y.sub==='matchups')h+=viewMatchups(l,Y.cache['_sb:'+l.key+':'+w]);
  else if(Y.sub==='standings')h+=viewStandings(l,Y.cache['_st:'+l.key]);
  else h+=viewRosters(l,Y.cache['_ro:'+l.key]);
  v.innerHTML=h;
  $('yback').onclick=()=>{location.hash='yahoo';};
  v.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{Y.sub=b.dataset.sub;localStorage.setItem('ir_y_sub',Y.sub);Y.err=null;draw();refresh(false);});
  const step=dx=>{Y.week[l.key]=Math.max(l.startWeek,Math.min(l.endWeek||99,(Y.week[l.key]||l.week||1)+dx));Y.err=null;draw();refresh(false);};
  const p=$('ywprev'),n=$('ywnext');if(p)p.onclick=()=>step(-1);if(n)n.onclick=()=>step(1);
  v.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{Y.team[l.key]=b.dataset.pick;draw();});
  v.querySelectorAll('.y-mt[data-team],.y-tr[data-team]').forEach(b=>b.onclick=()=>{Y.team[l.key]=b.dataset.team;Y.sub='rosters';localStorage.setItem('ir_y_sub',Y.sub);draw();refresh(false);});
  const im=$('yimp');if(im)im.onclick=()=>{const d=Y.cache['_ro:'+l.key];const t=d&&(d.teams.find(x=>x.key===Y.team[l.key])||d.teams.find(x=>x.mine)||d.teams[0]);if(t)openImport(l,t);};
  const pk=v.querySelector('.y-chip.on');if(pk)pk.scrollIntoView({block:'nearest',inline:'center'});
}
function renderYahoo(){draw();if(Y.sid)refresh(false);}
function renderMeta(){
  $('season').textContent='Yahoo Fantasy';$('season').className='pill y-pill';
  const {lk}=route();const l=lk&&findL(lk);
  $('upd').textContent=!Y.sid?'Not connected':l?(l.week&&!l.finished?'Week '+l.week:l.season):(Y.leagues?Y.leagues.length+' league'+(Y.leagues.length===1?'':'s'):'');
}
root.Yahoo={render:renderYahoo,renderMeta,refresh,connected:()=>!!Y.sid,_Y:Y};
})(typeof window!=='undefined'?window:globalThis);
