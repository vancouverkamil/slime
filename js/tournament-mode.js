var tournamentMode = false;
var tournamentState = null;
var tournamentWinPending = false;

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
  };
}

function startTournament() {
  tournamentMode = true;
  tournamentWinPending = false;
  tournamentState = buildTournamentState();
  autoResolveTournamentRound(0);
  showTournamentHub();
}

function activePlayerMatch() {
  if (!tournamentState) return null;
  for (var r = 0; r < tournamentState.rounds.length; r++) {
    for (var m = 0; m < tournamentState.rounds[r].length; m++) {
      var match = tournamentState.rounds[r][m];
      if (match.status !== 'final' && match.a && match.b && (match.a.player || match.b.player)) return match;
    }
  }
  return null;
}

function getMatchOpponent(match) {
  if (!match) return null;
  return match.a && match.a.player ? match.b : match.a;
}

function autoWinner(match) {
  var aScore = (match.a.level || 1) * 2 + Math.random();
  var bScore = (match.b.level || 1) * 2 + Math.random();
  return aScore >= bScore ? match.a : match.b;
}

function autoResolveTournamentRound(roundIdx) {
  if (!tournamentState || !tournamentState.rounds[roundIdx]) return;
  tournamentState.rounds[roundIdx].forEach(function(match) {
    if (match.status === 'final') return;
    if (!match.a || !match.b) return;
    if (match.a.player || match.b.player) return;
    match.winner = autoWinner(match);
    match.status = 'final';
    match.winsA = match.winner === match.a ? 2 : Math.floor(Math.random() * 2);
    match.winsB = match.winner === match.b ? 2 : Math.floor(Math.random() * 2);
    advanceTournamentWinner(match);
  });
}

function advanceTournamentWinner(match) {
  var nextRound = tournamentState.rounds[match.round + 1];
  if (!nextRound) {
    tournamentState.champion = match.winner;
    tournamentWinPending = !!(match.winner && match.winner.player);
    return;
  }
  var next = nextRound[Math.floor(match.slot / 2)];
  if (match.slot % 2 === 0) next.a = match.winner;
  else next.b = match.winner;
  next.status = next.a && next.b ? 'upcoming' : 'waiting';
  autoResolveTournamentRound(match.round + 1);
}

function startTournamentMatch() {
  var match = activePlayerMatch();
  if (!match) {
    showTournamentHub();
    return;
  }
  match.status = 'live';
  tournamentState.currentSeries = match;
  launchTournamentSet(match);
}

function launchTournamentSet(match) {
  var opponent = getMatchOpponent(match);
  currentRoomId = null;
  localMapId = 2 + Math.min(7, (opponent.level || 1) * 2);
  final4Mode = false;
  onePlayer = true;
  slimeLeftScore = 0;
  slimeRightScore = 0;
  localRallyCount = 0;
  localLastBallSide = null;
  localPointFlash = null;
  particles = [];
  shakeFrames = 0;
  shakeAmt = 0;
  slimeLeft.img = greenSlimeImage;
  slimeLeft.color = playerBodyColor;
  slimeLeft.tintColor = playerBodyColor;
  slimeRight.color = opponent.color;
  slimeRight.img = null;
  slimeRight.tintColor = null;
  legacySkyColor = '#101010';
  legacyGroundColor = '#171717';
  legacyBallColor = '#fff';
  newGroundColor = '#232323';
  backTextColor = '#f3d36a';
  slimeAI = newSlimeAI(false, opponent.name);
  setMentalSlime(slimeAI, opponent.level);
  showMatchIntro({
    left: playerCardHtml({ name: currentAccount ? currentAccount.displayName : myPlayerName }),
    right: opponentCardHtml(opponent.name, opponent.color, opponent.level),
    eyebrow: 'Best of 3 / ' + tournamentRoundName(match.round),
    onDone: function() {
      initRound(true);
      updatesToPaint = 0;
      updateCount = 0;
      loadOptions();
      gameState = GAME_STATE_RUNNING;
      renderBackground();
      canvas.style.display = 'block';
      menuDiv.style.display = 'none';
      hideBottomBar();
      if (gameIntervalObject) clearInterval(gameIntervalObject);
      gameIntervalObject = setInterval(gameIteration, 20);
    },
  });
}

function showMatchIntro(opts) {
  opts = opts || {};
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  hideBottomBar();
  menuDiv.innerHTML =
    '<div class="match-intro">' +
      '<div class="match-intro-eyebrow">' + escHtml(opts.eyebrow || 'Matchup') + '</div>' +
      '<div class="match-intro-cards">' +
        '<div>' + (opts.left || '') + '</div>' +
        '<div class="versus-stamp">VS</div>' +
        '<div>' + (opts.right || '') + '</div>' +
      '</div>' +
      '<button class="feature-primary" onclick="confirmMatchIntro()">DEPLOY</button>' +
    '</div>';
  pendingMatchIntro = opts.onDone || null;
}

var pendingMatchIntro = null;
function confirmMatchIntro() {
  var fn = pendingMatchIntro;
  pendingMatchIntro = null;
  if (fn) fn();
}

function tournamentRoundName(round) {
  return round === 0 ? 'Quarterfinal' : round === 1 ? 'Semifinal' : 'Final';
}

function finishTournamentSet(playerWon) {
  var match = tournamentState && tournamentState.currentSeries;
  if (!match) return false;
  if (match.a.player) {
    if (playerWon) match.winsA++;
    else match.winsB++;
  } else {
    if (playerWon) match.winsB++;
    else match.winsA++;
  }
  if (match.winsA >= 2 || match.winsB >= 2) {
    match.winner = match.winsA >= 2 ? match.a : match.b;
    match.status = 'final';
    tournamentState.currentSeries = null;
    advanceTournamentWinner(match);
  } else {
    match.status = 'upcoming';
  }
  return true;
}

function tournamentContinueAfterMatch() {
  if (!tournamentState) { toInitialMenu(); return; }
  var active = activePlayerMatch();
  if (active) {
    if (active === tournamentState.currentSeries || active.status !== 'final') {
      showTournamentHub();
      return;
    }
  }
  showTournamentHub();
}

function tournamentEntrantHtml(e, winner) {
  if (!e) return '<div class="bracket-player empty">TBD</div>';
  return '<div class="bracket-player' + (winner ? ' winner' : '') + (e.player ? ' mine' : '') + '">' +
    '<span class="seed">' + escHtml(e.seed || '-') + '</span>' +
    '<span class="swab" style="background:' + escHtml(e.color || '#777') + ';"></span>' +
    '<b>' + escHtml(e.name) + '</b>' +
    '<i>L' + escHtml(e.level || 1) + '</i>' +
  '</div>';
}

function tournamentMatchHtml(match) {
  var aWin = match.winner && match.a && match.winner.id === match.a.id;
  var bWin = match.winner && match.b && match.winner.id === match.b.id;
  var active = match === activePlayerMatch();
  return '<div class="bracket-match' + (active ? ' active' : '') + '">' +
    '<div class="bracket-status">' + escHtml(match.status || 'waiting') + '</div>' +
    tournamentEntrantHtml(match.a, aWin) +
    tournamentEntrantHtml(match.b, bWin) +
    '<div class="series-score">BO3 ' + (match.winsA || 0) + '-' + (match.winsB || 0) + '</div>' +
  '</div>';
}

function showTournamentHub() {
  if (!tournamentState) {
    startTournament();
    return;
  }
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  var match = activePlayerMatch();
  var opponent = getMatchOpponent(match);
  var champion = tournamentState.champion;
  menuDiv.innerHTML =
    '<div class="feature-screen tournament-screen">' +
      '<div class="feature-header">' +
        '<div><span>Tournament</span><b>Slime Cup Bracket</b></div>' +
        '<button class="feature-back" onclick="toInitialMenu()">BACK</button>' +
      '</div>' +
      '<div class="bracket-board">' +
        tournamentState.rounds.map(function(round, i) {
          return '<div class="bracket-round">' +
            '<div class="round-title">' + escHtml(tournamentRoundName(i)) + '</div>' +
            round.map(tournamentMatchHtml).join('') +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="tournament-action">' +
        (champion
          ? '<div class="champion-line">' + escHtml(champion.name) + ' CLAIMS THE CUP</div>'
          : '<div><b>Next target:</b> ' + escHtml(opponent ? opponent.name : 'TBD') + '</div>') +
        (champion ? '<button class="feature-primary" onclick="startTournament()">NEW BRACKET</button>'
          : '<button class="feature-primary" onclick="startTournamentMatch()">START SERIES</button>') +
      '</div>' +
    '</div>';
}
