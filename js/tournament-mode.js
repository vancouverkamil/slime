var tournamentMode = false;
var tournamentState = null;
var tournamentWinPending = false;
var onlineTournamentBracketId = null;
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
  var salt = String(match.id) + ':' + String(match.a.id) + ':' + String(match.b.id);
  var hash = 0;
  for (var i = 0; i < salt.length; i++) hash = ((hash << 5) - hash + salt.charCodeAt(i)) | 0;
  var roll = (Math.abs(hash) % 1000) / 1000;
  var aScore = (match.a.level || 1) * 2 + roll;
  var bScore = (match.b.level || 1) * 2 + (1 - roll);
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
    match.winsA = match.winner === match.a ? 2 : Math.abs(match.id.charCodeAt(0) + match.slot) % 2;
    match.winsB = match.winner === match.b ? 2 : Math.abs(match.id.charCodeAt(1) + match.slot) % 2;
    advanceTournamentWinner(match);
  });
  saveSoloTournament();
}

function advanceTournamentWinner(match) {
  var nextRound = tournamentState.rounds[match.round + 1];
  if (!nextRound) {
    tournamentState.champion = match.winner;
    tournamentWinPending = !!(match.winner && match.winner.player);
    tournamentState.phase = match.winner && match.winner.player ? 'champion' : 'eliminated';
    saveSoloTournament();
    return;
  }
  var next = nextRound[Math.floor(match.slot / 2)];
  if (match.slot % 2 === 0) next.a = match.winner;
  else next.b = match.winner;
  next.status = next.a && next.b ? 'upcoming' : 'waiting';
  autoResolveTournamentRound(match.round + 1);
  saveSoloTournament();
}

function startTournamentMatch() {
  if (pendingMatchIntro) return;
  var match = activePlayerMatch();
  if (!match) {
    showTournamentHub();
    return;
  }
  match.status = 'live';
  tournamentState.currentSeries = match;
  tournamentState.phase = 'active_match';
  saveSoloTournament();
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

function cancelMatchIntro() {
  if (!pendingMatchIntro) return false;
  pendingMatchIntro = null;
  if (tournamentState && tournamentState.currentSeries) {
    tournamentState.currentSeries.status = 'upcoming';
    tournamentState.currentSeries = null;
    tournamentState.phase = 'bracket';
    saveSoloTournament();
    showTournamentHub();
  } else {
    toInitialMenu();
  }
  return true;
}

function tournamentRoundName(round) {
  return round === 0 ? 'Quarterfinal' : round === 1 ? 'Semifinal' : 'Final';
}

function finishTournamentSet(playerWon) {
  var match = tournamentState && tournamentState.currentSeries;
  if (!match || match.status === 'final') return false;
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
  tournamentState.phase = tournamentState.champion ? tournamentState.phase : 'result_pending';
  saveSoloTournament();
  return true;
}

function tournamentContinueAfterMatch() {
  if (!tournamentState) { toInitialMenu(); return; }
  tournamentState.phase = tournamentState.champion ? tournamentState.phase : 'bracket';
  saveSoloTournament();
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
    startSoloTournament();
    return;
  }
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  var match = activePlayerMatch();
  var opponent = getMatchOpponent(match);
  var champion = tournamentState.champion;
  var roundLabel = match ? tournamentRoundName(match.round) : (champion ? 'Complete' : 'Awaiting bracket');
  menuDiv.innerHTML =
    '<div class="feature-screen tournament-screen">' +
      '<div class="feature-header">' +
        '<div><span>Tournament</span><b>' + escHtml(tournamentState.bracketName || 'Slime Cup Bracket') + '</b></div>' +
        '<button class="feature-back" onclick="exitTournamentToMenu()">SAVE &amp; EXIT</button>' +
      '</div>' +
      '<div class="tourn-progress" role="status" aria-live="polite"><b>' + escHtml(roundLabel) + '</b><span>' + (champion ? escHtml(champion.name) + ' claims the cup' : 'Best of 3 / first to 2 wins') + '</span></div>' +
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
        (champion ? '<button class="feature-primary" onclick="clearSoloTournament();startTournament()">NEW TOURNAMENT</button>'
          : match ? '<button class="feature-primary" onclick="startTournamentMatch()">START SERIES</button>'
          : '<button class="feature-primary" disabled>BRACKET UPDATING</button>') +
      '</div>' +
    '</div>';
}

// ── online tournament lobby ───────────────────────────────

var ONLINE_BRACKETS = [
  { id: 'rookie',     name: 'Rookie Cup',     minLevel: 1,  maxLevel: 15  },
  { id: 'challenger', name: 'Challenger Cup', minLevel: 16, maxLevel: 35  },
  { id: 'elite',      name: 'Elite Cup',      minLevel: 36, maxLevel: 60  },
  { id: 'master',     name: 'Master Cup',     minLevel: 61, maxLevel: 100 },
];

function showOnlineBrackets() {
  var myLevel = currentAccount && currentAccount.progression ? currentAccount.progression.level : 1;
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  menuDiv.innerHTML =
    '<div class="feature-screen tournament-screen">' +
      '<div class="feature-header">' +
        '<div><span>Tournament</span><b>Select Bracket</b></div>' +
        '<button class="feature-back" onclick="startTournament()">BACK</button>' +
      '</div>' +
      '<div class="tourn-bracket-list">' +
        ONLINE_BRACKETS.map(function(b) {
          var eligible = myLevel >= b.minLevel && myLevel <= b.maxLevel;
          var maxStr = b.maxLevel === 100 ? '100+' : String(b.maxLevel);
          return '<div class="tourn-bracket-row' + (eligible ? ' eligible' : '') + '"' +
            (eligible ? ' onclick="joinTournamentLobby(\'' + b.id + '\')"' : '') + '>' +
            '<div class="tourn-bracket-left">' +
              '<div class="tourn-bracket-name">' + escHtml(b.name) + '</div>' +
              '<div class="tourn-bracket-range">Level ' + b.minLevel + ' – ' + maxStr + '</div>' +
            '</div>' +
            '<div class="tourn-bracket-right">' +
              (eligible
                ? '<span class="tourn-bracket-join">JOIN ›</span>'
                : '<span class="tourn-bracket-lock">L' + b.minLevel + ' required</span>') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
}

function joinTournamentLobby(bracketId) {
  if (!lobbySocket || lobbySocket.readyState !== 1) { addChatMessage(null, 'Not connected.'); return; }
  onlineTournamentBracketId = bracketId;
  lobbySocket.send(JSON.stringify({ type: 'tournament_join', bracketId: bracketId }));
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  menuDiv.innerHTML =
    '<div class="feature-screen tournament-screen">' +
      '<div class="feature-header">' +
        '<div><span>Tournament</span><b>Joining...</b></div>' +
        '<button class="feature-back" onclick="leaveTournamentLobby()">LEAVE</button>' +
      '</div>' +
      '<div style="text-align:center;padding-top:60px;color:#555;font-size:10px;letter-spacing:3px;">CONNECTING TO LOBBY...</div>' +
    '</div>';
}

function showOnlineTournamentLobby(data) {
  if (onlineTournamentBracketId !== data.bracketId) return;
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  renderTournamentLobby(data);
}

function renderTournamentLobby(data) {
  var players = data.players || [];
  var totalSlots = data.totalSlots || 8;
  var myUsername = currentAccount ? currentAccount.username : null;
  var myReady = false;
  players.forEach(function(p) { if (p.username === myUsername) myReady = p.ready; });
  var emptySlots = Math.max(0, totalSlots - players.length);

  menuDiv.innerHTML =
    '<div class="feature-screen tournament-screen">' +
      '<div class="feature-header">' +
        '<div><span>Tournament</span><b>' + escHtml(data.bracketName || 'Waiting Room') + '</b></div>' +
        '<button class="feature-back" onclick="leaveTournamentLobby()">LEAVE</button>' +
      '</div>' +
      '<div class="tourn-lobby">' +
        '<div class="tourn-lobby-header">' +
          '<span>' + players.length + ' / ' + totalSlots + ' SIGNED UP</span>' +
          '<span class="tourn-ready-count">' + (data.readyCount || 0) + ' READY</span>' +
        '</div>' +
        '<div class="tourn-lobby-players">' +
          players.map(function(p) {
            var isMe = p.username === myUsername;
            return '<div class="tourn-lobby-player' + (isMe ? ' me' : '') + (p.ready ? ' ready' : '') + '">' +
              '<span class="tourn-dot" style="background:' + escHtml(p.color) + ';box-shadow:0 0 7px ' + escHtml(p.color) + ';"></span>' +
              '<span class="tourn-pname">' + escHtml(p.name) + (isMe ? ' <span class="tourn-you">(you)</span>' : '') + '</span>' +
              '<span class="tourn-plevel">L' + escHtml(String(p.level)) + '</span>' +
              '<span class="tourn-pxp">' + escHtml(String(p.xp)) + ' XP</span>' +
              '<span class="tourn-pready' + (p.ready ? ' yes' : '') + '">' + (p.ready ? 'READY' : 'WAITING') + '</span>' +
            '</div>';
          }).join('') +
          Array.from({length: emptySlots}, function() {
            return '<div class="tourn-lobby-player bot">' +
              '<span class="tourn-dot"></span>' +
              '<span class="tourn-pname">CPU Bot</span>' +
              '<span class="tourn-plevel"></span>' +
              '<span class="tourn-pxp"></span>' +
              '<span class="tourn-pready">-</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="tourn-lobby-info">Seeded by XP — highest XP gets seed 1. Empty slots fill with CPU bots. Min 2 players to start.</div>' +
        '<button class="feature-primary' + (myReady ? ' tourn-ready-on' : '') + '" onclick="toggleTournamentReady()">' +
          (myReady ? 'READY ✓' : 'READY UP') +
        '</button>' +
      '</div>' +
    '</div>';
}

function toggleTournamentReady() {
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  lobbySocket.send(JSON.stringify({ type: 'tournament_ready' }));
}

function leaveTournamentLobby() {
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'tournament_leave' }));
  }
  onlineTournamentBracketId = null;
  startTournament();
}

function loadOnlineTournament(data) {
  var myUsername = currentAccount ? currentAccount.username : null;
  var rounds = data.rounds.map(function(round, ri) {
    return round.map(function(match) {
      function conv(e) {
        if (!e) return null;
        var isMe = !e.bot && e.username === myUsername;
        var aiLevel = e.botLevel || (e.bot ? 2 : Math.min(4, Math.max(1, Math.round((e.level || 1) / 25) + 1)));
        return {
          id: e.bot ? e.id : (e.username || e.id),
          name: e.name, color: e.color || '#00ff00',
          hat: e.hat || 'none', hatAnim: e.hatAnim || 'none', hatDrawing: e.hatDrawing || [],
          level: aiLevel, seed: e.seed,
          player: isMe, bot: !!e.bot, username: e.username || null,
        };
      }
      return {
        id: 'r' + ri + 'm' + match.slot, round: ri, slot: match.slot,
        a: conv(match.a), b: conv(match.b),
        winsA: 0, winsB: 0, winner: null,
        status: match.a && match.b ? 'upcoming' : 'bye',
      };
    });
  });

  onlineTournamentBracketId = null;
  tournamentMode = true;
  tournamentWinPending = false;
  tournamentState = { rounds: rounds, currentRound: 0, currentSeries: null, champion: null, bracketName: data.bracketName, phase: 'bracket', kind: 'online' };
  autoResolveTournamentRound(0);
  showTournamentHub();
}
