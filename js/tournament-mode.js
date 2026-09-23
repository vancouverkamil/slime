var tournamentMode = false;
var tournamentState = null;
var tournamentWinPending = false;
var onlineTournamentBracketId = null;
var onlineTournamentMatchId = null;
var onlineTournamentAcceptedMatchId = null;
var TOURNAMENT_STORAGE_KEY = 'slime_soloTournament';

var TOURNAMENT_FIELD = [
  { id: 'player', name: 'YOU', color: '#00ff00', level: 1, seed: 1, player: true },
  { id: 'rust', name: 'Rust Belly', color: '#a95522', level: 1, seed: 8 },
  { id: 'static', name: 'Static Slime', color: '#55ccff', level: 2, seed: 4 },
  { id: 'mire', name: 'Mire Unit', color: '#5b7f2a', level: 2, seed: 5 },
  { id: 'scarlet', name: 'Scarlet Vex', color: '#ff335f', level: 3, seed: 2 },
  { id: 'tar', name: 'Tar Pit', color: '#363036', level: 3, seed: 7 },
  { id: 'hazard', name: 'Hazard King', color: '#ffb000', level: 4, seed: 3 },
  { id: 'ghost', name: 'Ghost Gel', color: '#eeeeff', level: 4, seed: 6 },
];

function cloneEntrant(e) {
  return {
    id: e.id,
    name: e.name,
    color: e.id === 'player' ? playerBodyColor : e.color,
    level: e.level,
    seed: e.seed,
    player: !!e.player,
  };
}

function makeTournamentMatch(a, b, round, slot) {
  return {
    id: 'r' + round + 'm' + slot,
    round: round,
    slot: slot,
    a: a || null,
    b: b || null,
    winsA: 0,
    winsB: 0,
    winner: null,
    status: a && b ? 'upcoming' : 'bye',
  };
}

function buildTournamentState() {
  var entrants = TOURNAMENT_FIELD.map(cloneEntrant);
  var rounds = [
    [
      makeTournamentMatch(entrants[0], entrants[1], 0, 0),
      makeTournamentMatch(entrants[2], entrants[3], 0, 1),
      makeTournamentMatch(entrants[4], entrants[5], 0, 2),
      makeTournamentMatch(entrants[6], entrants[7], 0, 3),
    ],
    [makeTournamentMatch(null, null, 1, 0), makeTournamentMatch(null, null, 1, 1)],
    [makeTournamentMatch(null, null, 2, 0)],
  ];
  return {
    rounds: rounds,
    currentRound: 0,
    currentSeries: null,
    champion: null,
    phase: 'bracket',
    kind: 'solo',
  };
}

function tournamentMatchById(id) {
  if (!tournamentState || !id) return null;
  for (var r = 0; r < tournamentState.rounds.length; r++) {
    for (var m = 0; m < tournamentState.rounds[r].length; m++) {
      if (tournamentState.rounds[r][m].id === id) return tournamentState.rounds[r][m];
    }
  }
  return null;
}

function saveSoloTournament() {
  if (!tournamentState || tournamentState.kind !== 'solo') return;
  try {
    localStorage.setItem(TOURNAMENT_STORAGE_KEY, JSON.stringify({
      rounds: tournamentState.rounds,
      currentRound: tournamentState.currentRound,
      currentSeriesId: tournamentState.currentSeries && tournamentState.currentSeries.id,
      champion: tournamentState.champion,
      phase: tournamentState.phase,
      kind: 'solo',
    }));
  } catch (e) {}
}

function clearSoloTournament() {
  try { localStorage.removeItem(TOURNAMENT_STORAGE_KEY); } catch (e) {}
}

function discardSoloTournament() {
  if (typeof window !== 'undefined' && window.confirm && !window.confirm('Discard the saved solo tournament run?')) return;
  clearSoloTournament();
  startTournament();
}

function hasSavedSoloTournament() {
  try { return !!localStorage.getItem(TOURNAMENT_STORAGE_KEY); } catch (e) { return false; }
}

function resumeSoloTournament() {
  var saved;
  try { saved = JSON.parse(localStorage.getItem(TOURNAMENT_STORAGE_KEY) || 'null'); } catch (e) {}
  if (!saved || !Array.isArray(saved.rounds) || saved.rounds.length !== 3) {
    clearSoloTournament();
    startSoloTournament();
    return;
  }
  tournamentMode = true;
  tournamentWinPending = !!(saved.champion && saved.champion.player);
  tournamentState = saved;
  tournamentState.kind = 'solo';
  tournamentState.phase = saved.phase || 'bracket';
  tournamentState.currentSeries = tournamentMatchById(saved.currentSeriesId);
  if (tournamentState.currentSeries && tournamentState.currentSeries.status === 'live') {
    tournamentState.currentSeries.status = 'upcoming';
    tournamentState.currentSeries = null;
    tournamentState.phase = 'bracket';
  }
  showTournamentHub();
}

function exitTournamentToMenu() {
  pendingMatchIntro = null;
  if (tournamentState && tournamentState.kind === 'online') { toInitialMenu(); return; }
  tournamentMode = false;
  tournamentState = null;
  tournamentWinPending = false;
  toInitialMenu();
}

function startTournament() {
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  var canOnline = !!(currentAccount && lobbySocket && lobbySocket.readyState === 1);
  menuDiv.innerHTML =
    '<div class="feature-screen tournament-screen">' +
      '<div class="feature-header">' +
        '<div><span>Tournament</span><b>Choose Mode</b></div>' +
        '<button class="feature-back" onclick="toInitialMenu()">BACK</button>' +
      '</div>' +
      '<div class="tourn-mode-select">' +
        '<div class="tourn-mode-card' + (canOnline ? '' : ' tourn-mode-locked') + '" onclick="' + (canOnline ? 'showOnlineBrackets()' : '') + '">' +
          '<div class="tourn-mode-icon">&#127760;</div>' +
          '<div class="tourn-mode-title">ONLINE TOURNAMENT</div>' +
          '<div class="tourn-mode-desc">Join a live bracket with real players. Up to 8 entrants — empty slots fill with CPU bots. Seeded by XP.</div>' +
          (!currentAccount ? '<div class="tourn-mode-warn">Sign in required</div>' : !canOnline ? '<div class="tourn-mode-warn">Not connected</div>' : '') +
        '</div>' +
        '<div class="tourn-mode-card" onclick="startSoloTournament()">' +
          '<div class="tourn-mode-icon">&#9876;&#65039;</div>' +
          '<div class="tourn-mode-title">SOLO BRACKET</div>' +
          '<div class="tourn-mode-desc">Private 8-player bracket vs CPU opponents. No account needed.</div>' +
        '</div>' +
      '</div>' +
      (hasSavedSoloTournament()
        ? '<div class="tourn-resume"><b>SOLO RUN IN PROGRESS</b><span>Your bracket is saved locally.</span><button class="feature-primary" onclick="resumeSoloTournament()">RESUME BRACKET</button><button class="feature-back" onclick="discardSoloTournament()">DISCARD</button></div>'
        : '') +
    '</div>';
}

function startSoloTournament(forceNew) {
  if (!forceNew && hasSavedSoloTournament()) {
    resumeSoloTournament();
    return;
  }
  clearSoloTournament();
  tournamentMode = true;
  tournamentWinPending = false;
  tournamentState = buildTournamentState();
  autoResolveTournamentRound(0);
  saveSoloTournament();
  showTournamentHub();
}
