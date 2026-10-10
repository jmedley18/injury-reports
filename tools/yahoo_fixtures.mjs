// Builds realistic Yahoo Fantasy API fixtures (format=json shapes as documented / returned by fantasysports.yahooapis.com)
// for unit tests and the fixture-driven screenshot. Names are real players; all league/team/score data is FAKE.
import fs from 'fs';
const out = new URL('./fixtures/yahoo/', import.meta.url);
const coll = (items, key) => { const o = {}; items.forEach((x, i) => o[i] = { [key]: x }); o.count = items.length; return o; };
const wrap = c => ({ fantasy_content: { 'xml:lang': 'en-US', 'yahoo:uri': '/fantasy/v2/...', ...c, time: '41.2ms', copyright: 'Data provided by Yahoo! and STATS, LLC', refresh_rate: '60' } });
const LK = '461.l.81234', NBALK = '466.l.5521';
const leagueMeta = (key, name, code, season, extra = {}) => ({ league_key: key, league_id: key.split('.').pop(), name, url: 'https://football.fantasysports.yahoo.com/f1/' + key.split('.').pop(),
  logo_url: '', password: '', draft_status: 'postdraft', num_teams: 10, edit_key: '6', weekly_deadline: '', league_update_timestamp: '1791000000', scoring_type: 'head',
  league_type: 'private', renew: '449_12345', renewed: '', felo_tier: 'gold', iris_group_chat_id: '', short_invitation_url: '', allow_add_to_dl_extra_pos: 1,
  is_pro_league: '0', is_cash_league: '0', current_week: 6, start_week: '1', start_date: '2026-09-10', end_week: '17', end_date: '2026-12-28', is_finished: 0,
  is_plus_league: '0', game_code: code, season, ...extra });
const MGR = ['Joe', 'Mike', 'Sarah', 'Dave', 'Chris', 'Tony', 'Jess', 'Ray', 'Kim', 'Ben'];
const TN = ['Medley Mayhem', 'Gridiron Gurus', 'End Zone Elite', 'Blitz Brigade', 'Hail Mary Heroes', 'Fourth & Long', 'Pigskin Pirates', 'The Replacements', 'Sunday Funday', 'Taco Corp'];
const LOGOS = ['nfl_4_c', 'nfl_1_a', 'nfl_12_p', 'nfl_7_g', 'nfl_3_b', 'nfl_9_f', 'nfl_2_y', 'nfl_10_e', 'nfl_5_d', 'nfl_8_h'];
function teamMeta(lk, i) {
  const id = String(i + 1);
  return [{ team_key: `${lk}.t.${id}` }, { team_id: id }, { name: TN[i] }, i === 0 ? { is_owned_by_current_login: 1 } : [], { url: 'https://football.fantasysports.yahoo.com/f1/81234/' + id },
    { team_logos: [{ team_logo: { size: 'large', url: `https://s.yimg.com/cv/apiv2/default/nfl/${LOGOS[i]}.png` } }] }, [], { waiver_priority: 10 - i }, { number_of_moves: String(3 + i) },
    { number_of_trades: i % 3 }, { roster_adds: { coverage_type: 'week', coverage_value: 6, value: '1' } }, [], { league_scoring_type: 'head' }, [], [], { has_draft_grade: 0 }, [], [],
    { managers: [{ manager: { manager_id: id, nickname: MGR[i], guid: 'GUID' + id, ...(i === 0 ? { is_current_login: '1', is_commissioner: '1' } : {}), felo_score: '700', felo_tier: 'gold' } }] }];
}
// leagues: one NFL league, MLB game with no leagues (empty array, as Yahoo returns), one NBA league
const leagues = wrap({ users: { 0: { user: [{ guid: 'GUID1' }, { games: {
  0: { game: [{ game_key: '461', game_id: '461', name: 'Football', code: 'nfl', type: 'full', url: 'https://football.fantasysports.yahoo.com/f1', season: '2026', is_registration_over: 0, is_game_over: 0, is_offseason: 0 },
    { leagues: coll([leagueMeta(LK, 'Medley Family League', 'nfl', '2026', { logo_url: '' })], 'league') }] },
  1: { game: [{ game_key: '458', game_id: '458', name: 'Baseball', code: 'mlb', type: 'full', season: '2026', is_game_over: 0, is_offseason: 1 }, { leagues: [] }] },
  2: { game: [{ game_key: '466', game_id: '466', name: 'Basketball', code: 'nba', type: 'full', season: '2026', is_game_over: 0, is_offseason: 0 },
    { leagues: coll([leagueMeta(NBALK, 'Work Hoops', 'nba', '2026', { current_week: 1, num_teams: 12, draft_status: 'predraft', end_week: '20' })], 'league') }] },
  count: 3 } }] }, count: 1 } });
// standings
const rec = [[5, 0], [4, 1], [4, 1], [3, 2], [3, 2], [2, 3], [2, 3], [1, 4], [1, 4], [0, 5]];
const order = [1, 0, 2, 3, 4, 5, 6, 7, 8, 9]; // Joe is 2nd
const standings = wrap({ league: [leagueMeta(LK, 'Medley Family League', 'nfl', '2026'), { standings: [{ teams: coll(order.map((ti, r) => [teamMeta(LK, ti),
  { team_points: { coverage_type: 'season', season: '2026', total: (640 - r * 21.37).toFixed(2) } },
  { team_standings: { rank: String(r + 1), playoff_seed: String(r + 1), outcome_totals: { wins: String(rec[r][0]), losses: String(rec[r][1]), ties: 0, percentage: (rec[r][0] / 5).toFixed(3).replace(/^0/, '') },
    streak: { type: r < 3 ? 'win' : 'loss', value: String(1 + (r % 3)) }, points_for: (640 - r * 21.37).toFixed(2), points_against: (520 + r * 9.11).toFixed(2) } }]), 'team') }] }] });
// scoreboard (week 6, mid-event)
const pairs = [[0, 3], [1, 2], [4, 5], [6, 7], [8, 9]];
const sbTeam = (ti, p, pr, wp) => [teamMeta(LK, ti), { team_points: { coverage_type: 'week', week: '6', total: p }, team_projected_points: { coverage_type: 'week', week: '6', total: pr }, win_probability: wp, team_live_projected_points: { coverage_type: 'week', week: '6', total: pr } }];
const scores = [['98.42', '121.30', 0.64, '87.10', '109.85', 0.36], ['112.06', '118.90', 0.58, '95.24', '112.40', 0.42], ['76.50', '101.20', 0.41, '83.12', '106.75', 0.59], ['64.88', '97.60', 0.47, '70.02', '99.10', 0.53], ['101.36', '115.00', 0.71, '58.94', '96.20', 0.29]];
const scoreboard = wrap({ league: [leagueMeta(LK, 'Medley Family League', 'nfl', '2026'), { scoreboard: { 0: { matchups: coll(pairs.map(([a, b], i) => {
  const s = scores[i];
  return { week: '6', week_start: '2026-10-15', week_end: '2026-10-19', status: 'midevent', is_playoffs: '0', is_consolation: '0', is_matchup_recap_available: 0,
    0: { teams: { 0: { team: sbTeam(a, s[0], s[1], s[2]) }, 1: { team: sbTeam(b, s[3], s[4], s[5]) }, count: 2 } } };
}), 'matchup') }, week: '6' } }] });
// rosters (all teams; Joe's is detailed with real players so the ESPN overlay has something to match)
let pid = 30000;
const P = (name, abbr, full, pos, slot, ptype = 'O', inj = null) => {
  const [first, ...rest] = name.split(' '); pid++;
  const meta = [{ player_key: `461.p.${pid}` }, { player_id: String(pid) }, { name: { full: name, first, last: rest.join(' '), ascii_first: first, ascii_last: rest.join(' ') } },
    { url: `https://sports.yahoo.com/nfl/players/${pid}` }, { editorial_player_key: `nfl.p.${pid}` }, { editorial_team_key: 'nfl.t.1' }, { editorial_team_full_name: full }, { editorial_team_abbr: abbr },
    { editorial_team_url: '' }, { is_keeper: { status: false, cost: false, kept: false } }, { uniform_number: '1' }, { display_position: pos },
    { headshot: { url: 'https://s.yimg.com/dh/ap/default/140828/silhouette@2x.png', size: 'small' } }, { image_url: 'https://s.yimg.com/dh/ap/default/140828/silhouette@2x.png' },
    { is_undroppable: '0' }, { position_type: ptype }, { primary_position: pos }, { eligible_positions: [{ position: pos }] }, { eligible_positions_to_add: [] }, { has_player_notes: 1 }];
  if (inj) meta.splice(4, 0, { status: inj[0] }, { status_full: inj[1] }, { injury_note: inj[2] });
  meta.splice(8, 0, { bye_weeks: { week: '9' } });
  return [meta, { selected_position: [{ coverage_type: 'week', week: '6' }, { position: slot }, { is_flex: slot === 'W/R/T' ? 1 : 0 }] }];
};
const joe = [
  P('Baker Mayfield', 'TB', 'Tampa Bay Buccaneers', 'QB', 'QB', 'O', ['O', 'Out', 'Knee']),
  P('Saquon Barkley', 'Phi', 'Philadelphia Eagles', 'RB', 'RB'),
  P('Jaylen Wright', 'Mia', 'Miami Dolphins', 'RB', 'RB'),
  P('CeeDee Lamb', 'Dal', 'Dallas Cowboys', 'WR', 'WR', 'O', ['Q', 'Questionable', 'Ankle']),
  P('Terry McLaurin', 'Was', 'Washington Commanders', 'WR', 'WR', 'O', ['Q', 'Questionable', 'Quadriceps']),
  P('Cade Otton', 'TB', 'Tampa Bay Buccaneers', 'TE', 'TE'),
  P('Zay Flowers', 'Bal', 'Baltimore Ravens', 'WR', 'W/R/T'),
  P('Brandon Aubrey', 'Dal', 'Dallas Cowboys', 'K', 'K', 'K'),
  P('Pittsburgh', 'Pit', 'Pittsburgh Steelers', 'DEF', 'DEF', 'DT'),
  P('Jordan Addison', 'Min', 'Minnesota Vikings', 'WR', 'BN', 'O', ['Q', 'Questionable', 'Hamstring']),
  P('Mike Evans', 'SF', 'San Francisco 49ers', 'WR', 'BN'),
  P('Darius Slayton', 'Ind', 'Indianapolis Colts', 'WR', 'BN'),
  P('Trey Lance', 'LAC', 'Los Angeles Chargers', 'QB', 'BN', 'O', ['D', 'Doubtful', 'Shoulder']),
  P('Puka Nacua', 'LAR', 'Los Angeles Rams', 'WR', 'BN'),
  P('Dillon Gabriel', 'Cle', 'Cleveland Browns', 'QB', 'IR', 'O', ['IR', 'Injured Reserve', 'Concussion']),
];
const other = i => [P('Josh Allen', 'Buf', 'Buffalo Bills', 'QB', 'QB'), P('Bijan Robinson', 'Atl', 'Atlanta Falcons', 'RB', 'RB'), P("Ja'Marr Chase", 'Cin', 'Cincinnati Bengals', 'WR', 'WR'),
  P('DJ Moore', 'Buf', 'Buffalo Bills', 'WR', 'WR', 'O', ['Q', 'Questionable', 'Back']), P('Jake Ferguson', 'Dal', 'Dallas Cowboys', 'TE', 'TE'), P('Chris Brooks', 'GB', 'Green Bay Packers', 'RB', 'BN')].slice(0, 3 + (i % 4));
const rosters = wrap({ league: [leagueMeta(LK, 'Medley Family League', 'nfl', '2026'), { teams: coll(TN.map((_, i) => [teamMeta(LK, i),
  { roster: { coverage_type: 'week', week: '6', is_prescoring: 0, is_editable: i === 0 ? 1 : 0, 0: { players: coll(i === 0 ? joe : other(i), 'player') }, outs_of_range: [] } }]), 'team') }] });
// error shape Yahoo returns for e.g. a league you're not in
const error = { error: { 'xml:lang': 'en-us', 'yahoo:uri': '/fantasy/v2/league/461.l.1/standings?format=json', description: 'You are not allowed to view this page because you are not in this league.', detail: '' } };
for (const [n, d] of Object.entries({ leagues, standings, scoreboard, rosters, error })) fs.writeFileSync(new URL(n + '.json', out), JSON.stringify(d));
console.log('fixtures written');
