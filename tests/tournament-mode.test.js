const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

function loadTournament() {
  const storage = new Map();
  const context = {
    console,
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    playerBodyColor: '#00ff00',
    canvas: { style: {} },
    menuDiv: { style: {}, innerHTML: '' },
    currentAccount: null,
    lobbySocket: null,
    showBottomBar() {},
    escHtml: String,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/tournament-mode.js', 'utf8'), context);
  return context;
}

test('solo tournament advances through three winning series', () => {
  const t = loadTournament();
  t.startSoloTournament();
  for (let round = 0; round < 3; round++) {
    const match = t.activePlayerMatch();
    assert.ok(match);
    t.tournamentState.currentSeries = match;
    t.finishTournamentSet(true);
    t.tournamentState.currentSeries = match;
    t.finishTournamentSet(true);
  }
  assert.strictEqual(t.tournamentState.champion.id, 'player');
  assert.strictEqual(t.tournamentState.phase, 'champion');
});

test('solo tournament save restores an interrupted live series as upcoming', () => {
  const t = loadTournament();
  t.startSoloTournament();
  const match = t.activePlayerMatch();
  match.status = 'live';
  t.tournamentState.currentSeries = match;
  t.tournamentState.phase = 'active_match';
  t.saveSoloTournament();
  t.tournamentState = null;
  t.resumeSoloTournament();
  assert.strictEqual(t.tournamentState.currentSeries, null);
  assert.strictEqual(t.activePlayerMatch().status, 'upcoming');
  assert.strictEqual(t.tournamentState.phase, 'bracket');
});

test('cpu tournament resolution is deterministic', () => {
  const a = loadTournament();
  const b = loadTournament();
  a.startSoloTournament();
  b.startSoloTournament();
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(a.tournamentState.rounds)),
    JSON.parse(JSON.stringify(b.tournamentState.rounds))
  );
});

test('escape from a tournament intro returns to a resumable bracket', () => {
  const t = loadTournament();
  t.startSoloTournament();
  const match = t.activePlayerMatch();
  match.status = 'live';
  t.tournamentState.currentSeries = match;
  t.tournamentState.phase = 'active_match';
  t.pendingMatchIntro = function noop() {};
  assert.strictEqual(t.cancelMatchIntro(), true);
  assert.strictEqual(t.tournamentState.currentSeries, null);
  assert.strictEqual(match.status, 'upcoming');
  assert.strictEqual(t.tournamentState.phase, 'bracket');
});

test('losing a solo tournament resolves an opposing champion', () => {
  const t = loadTournament();
  t.startSoloTournament();
  const match = t.activePlayerMatch();
  t.tournamentState.currentSeries = match;
  t.finishTournamentSet(false);
  t.tournamentState.currentSeries = match;
  t.finishTournamentSet(false);
  assert.ok(t.tournamentState.champion);
  assert.notStrictEqual(t.tournamentState.champion.id, 'player');
  assert.strictEqual(t.tournamentState.phase, 'eliminated');
});

test('duplicate completion events do not advance a finalized series twice', () => {
  const t = loadTournament();
  t.startSoloTournament();
  const match = t.activePlayerMatch();
  t.tournamentState.currentSeries = match;
  t.finishTournamentSet(true);
  t.tournamentState.currentSeries = match;
  t.finishTournamentSet(true);
  const semifinal = t.activePlayerMatch();
  t.tournamentState.currentSeries = match;
  assert.strictEqual(t.finishTournamentSet(true), false);
  assert.strictEqual(t.activePlayerMatch(), semifinal);
  assert.strictEqual(semifinal.winsA + semifinal.winsB, 0);
});

test('starting solo mode resumes saved progress instead of clearing it', () => {
  const t = loadTournament();
  t.startSoloTournament();
  const match = t.activePlayerMatch();
  match.winsA = 1;
  t.saveSoloTournament();
  t.tournamentState = null;
  t.tournamentMode = false;
  t.startSoloTournament();
  assert.strictEqual(t.activePlayerMatch().winsA, 1);
});

test('tournament hub exposes progress status and protects saved-run discard', () => {
  const t = loadTournament();
  t.startSoloTournament();
  assert.match(t.menuDiv.innerHTML, /class="tourn-progress" role="status" aria-live="polite"/);
  assert.match(t.menuDiv.innerHTML, /SAVE &amp; EXIT/);
  t.window = { confirm: () => false };
  t.discardSoloTournament();
  assert.strictEqual(t.hasSavedSoloTournament(), true);
  t.window.confirm = () => true;
  t.discardSoloTournament();
  assert.strictEqual(t.hasSavedSoloTournament(), false);
});
