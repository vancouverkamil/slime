function activePlayerMatch() {
  if (!tournamentState) return null;
  var mine = currentAccount && currentAccount.username;
  for (var r = 0; r < tournamentState.rounds.length; r++) {
    for (var m = 0; m < tournamentState.rounds[r].length; m++) {
      var match = tournamentState.rounds[r][m];
      var aMe = match.a && (match.a.player || (mine && match.a.username === mine));
      var bMe = match.b && (match.b.player || (mine && match.b.username === mine));
      if (match.status !== 'final' && match.a && match.b && (aMe || bMe)) return match;
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

// Two real players: the server runs the game in a real room, never a local CPU game.
function isHeadToHeadMatch(match) {
  return !!(tournamentState && tournamentState.kind === 'online' && match && match.a && match.b && match.a.username && match.b.username);
}

function myTournamentAccepted(match) {
  var mine = currentAccount && currentAccount.username;
  return !!(match && ((match.a && match.a.username === mine && match.acceptedA) || (match.b && match.b.username === mine && match.acceptedB)));
}

function startTournamentMatch() {
  if (pendingMatchIntro && document.querySelector('.match-intro')) return;
  pendingMatchIntro = null;
  var match = activePlayerMatch();
  if (!match) {
    showTournamentHub();
    return;
  }
  if (isHeadToHeadMatch(match)) {
    var h2hPop = document.getElementById('TournamentAccept');
    if (h2hPop) h2hPop.style.display = 'none';
    if (match.status === 'awaiting' && lobbySocket && lobbySocket.readyState === 1)
      lobbySocket.send(JSON.stringify({ type:'tournament_accept', matchId:match.id }));
    showTournamentHub();
    return;
  }
  if (tournamentState.kind === 'online' && match.status === 'awaiting') {
    onlineTournamentAcceptedMatchId = match.id;
    if (lobbySocket && lobbySocket.readyState === 1) {
      lobbySocket.send(JSON.stringify({ type:'tournament_accept', matchId:match.id }));
    }
    showTournamentHub();
    return;
  }
  match.status = 'live';
  var pop = document.getElementById('TournamentAccept');
  if (pop) pop.style.display = 'none';
  onlineTournamentMatchId = tournamentState.kind === 'online' ? match.id : null;
  tournamentState.currentSeries = match;
  tournamentState.phase = 'active_match';
  saveSoloTournament();
  launchTournamentSet(match);
}

function launchTournamentSet(match) {
  var opponent = getMatchOpponent(match);
  currentRoomId = null; currentRoomMapId = null;
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

function sendTournamentScoreUpdate() {
  var match = tournamentState && (tournamentState.currentSeries || tournamentMatchById(onlineTournamentMatchId));
  if (!match || tournamentState.kind !== 'online' || !lobbySocket || lobbySocket.readyState !== 1) return;
  lobbySocket.send(JSON.stringify({ type:'tournament_score', matchId:match.id, scoreFor:slimeLeftScore, scoreAgainst:slimeRightScore }));
}

var lastTournamentStateSent = 0;
function sendTournamentStateUpdate() {
  var match = tournamentState && (tournamentState.currentSeries || tournamentMatchById(onlineTournamentMatchId));
  if (!match || tournamentState.kind !== 'online' || !lobbySocket || lobbySocket.readyState !== 1) return;
  var now = Date.now();
  if (now - lastTournamentStateSent < 38 || !ball || !slimeLeft || !slimeRight) return;
  lastTournamentStateSent = now;
  lobbySocket.send(JSON.stringify({
    type:'tournament_state', matchId:match.id,
    ball:{ x:ball.x, y:ball.y, velocityX:ball.velocityX },
    slimeLeft:{ x:slimeLeft.x, y:slimeLeft.y },
    slimeRight:{ x:slimeRight.x, y:slimeRight.y },
    scoreLeft:slimeLeftScore, scoreRight:slimeRightScore
  }));
}
