// Unit tests for the Yahoo Fantasy JSON parsers (yahoo.js -> YParse). Run: node tools/test_yahoo.cjs
const assert = require('assert');
const Y = require('../yahoo.js');
const fx = n => require('./fixtures/yahoo/' + n + '.json');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('yc/ym helpers', () => {
  assert.deepStrictEqual(Y.yc({ 0: { a: 1 }, 1: { a: 2 }, count: 2 }), [{ a: 1 }, { a: 2 }]);
  assert.deepStrictEqual(Y.yc([]), []); assert.deepStrictEqual(Y.yc(undefined), []);
  assert.deepStrictEqual(Y.ym([[{ a: 1 }, [], { b: 2 }], { c: 3 }]), { a: 1, b: 2, c: 3 });
});
t('leagues: NFL first, empty MLB game skipped, NBA included', () => {
  const ls = Y.parseLeagues(fx('leagues'));
  assert.strictEqual(ls.length, 2);
  assert.deepStrictEqual(ls.map(l => l.code), ['nfl', 'nba']);
  const l = ls[0];
  assert.strictEqual(l.key, '461.l.81234'); assert.strictEqual(l.name, 'Medley Family League'); assert.strictEqual(l.season, '2026');
  assert.strictEqual(l.week, 6); assert.strictEqual(l.startWeek, 1); assert.strictEqual(l.endWeek, 17); assert.strictEqual(l.numTeams, 10); assert.strictEqual(l.finished, false);
  assert.strictEqual(ls[1].draft, 'predraft'); assert.strictEqual(ls[1].numTeams, 12);
});
t('leagues: account with no games / no users', () => {
  assert.deepStrictEqual(Y.parseLeagues({ fantasy_content: { users: { 0: { user: [{ guid: 'X' }, { games: [] }] }, count: 1 } } }), []);
  assert.deepStrictEqual(Y.parseLeagues({ fantasy_content: { users: [] } }), []);
});
t('standings: rank order, record, PF/PA, my team flagged', () => {
  const s = Y.parseStandings(fx('standings'));
  assert.strictEqual(s.teams.length, 10);
  assert.deepStrictEqual(s.teams.map(x => x.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const me = s.teams.find(x => x.mine);
  assert.strictEqual(me.name, 'Medley Mayhem'); assert.strictEqual(me.rank, 2); assert.strictEqual(me.w, 4); assert.strictEqual(me.l, 1); assert.strictEqual(me.t, 0);
  assert.strictEqual(me.manager, 'Joe'); assert.ok(me.logo.startsWith('https://s.yimg.com/'));
  assert.strictEqual(s.teams[0].pf, 640); assert.strictEqual(s.teams[0].pa, 520); assert.strictEqual(s.teams[0].streak, 'W1');
  assert.strictEqual(s.teams.filter(x => x.mine).length, 1);
});
t('scoreboard: 5 matchups, points + projections + win probability', () => {
  const sb = Y.parseScoreboard(fx('scoreboard'));
  assert.strictEqual(sb.week, 6); assert.strictEqual(sb.matchups.length, 5);
  const m = sb.matchups[0];
  assert.strictEqual(m.status, 'midevent'); assert.strictEqual(m.teams.length, 2); assert.strictEqual(m.playoffs, false);
  assert.strictEqual(m.teams[0].mine, true); assert.strictEqual(m.teams[0].pts, 98.42); assert.strictEqual(m.teams[0].proj, 121.3); assert.strictEqual(m.teams[0].winProb, 0.64);
  assert.strictEqual(m.teams[1].name, 'Blitz Brigade'); assert.strictEqual(sb.league.week, 6);
});
t('rosters: all teams, players, slots, Yahoo injury fields', () => {
  const r = Y.parseRosters(fx('rosters'));
  assert.strictEqual(r.teams.length, 10);
  const me = r.teams.find(x => x.mine);
  assert.strictEqual(me.players.length, 15);
  const bm = me.players[0];
  assert.deepStrictEqual([bm.name, bm.team, bm.pos, bm.slot, bm.status, bm.statusFull, bm.injury, bm.bye], ['Baker Mayfield', 'TB', 'QB', 'QB', 'O', 'Out', 'Knee', '9']);
  const tm = me.players.find(p => p.name === 'Terry McLaurin');
  assert.strictEqual(tm.team, 'WAS'); assert.strictEqual(Y.espnAbbr(tm.team), 'WSH');
  assert.strictEqual(me.players.find(p => p.name === 'Saquon Barkley').status, '');
  assert.strictEqual(me.players.find(p => p.pos === 'DEF').ptype, 'DT');
  const g = { start: 0, bench: 0, reserve: 0 }; me.players.forEach(p => g[Y.slotGroup(p.slot)]++);
  assert.deepStrictEqual(g, { start: 9, bench: 5, reserve: 1 });
  assert.ok(me.players.every(p => p.key && p.key.startsWith('461.p.')));
});
t('team roster resource (team/{key}/roster)', () => {
  const lr = fx('rosters').fantasy_content.league[1].teams[0].team;
  const r = Y.parseRosters({ fantasy_content: { team: lr } });
  assert.strictEqual(r.teams.length, 1); assert.strictEqual(r.teams[0].players.length, 15);
});
t('slot groups + abbreviation fixes', () => {
  for (const s of ['IR', 'IL', 'IL10', 'IL60', 'NA', 'IR+', 'IL+']) assert.strictEqual(Y.slotGroup(s), 'reserve', s);
  assert.strictEqual(Y.slotGroup('BN'), 'bench'); assert.strictEqual(Y.slotGroup('W/R/T'), 'start'); assert.strictEqual(Y.slotGroup('Util'), 'start');
  assert.deepStrictEqual(['CWS', 'Pho', 'Uta', 'Oak', 'KC'].map(Y.espnAbbr), ['CHW', 'PHX', 'UTAH', 'ATH', 'KC']);
});
t('Yahoo error responses throw with Yahoo\'s description', () => {
  assert.throws(() => Y.parseStandings(fx('error')), /not in this league/);
});
console.log(`\n${n} tests passed`);
