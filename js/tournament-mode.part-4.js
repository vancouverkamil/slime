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
      var winner = conv(match.winner);
      return {
        id: 'r' + ri + 'm' + match.slot, round: ri, slot: match.slot,
        a: conv(match.a), b: conv(match.b),
        winsA: match.winsA || 0, winsB: match.winsB || 0, winner: winner,
        status: match.status || (match.a && match.b ? 'upcoming' : 'bye'),
        acceptDeadline: match.acceptDeadline || 0, resolveAt: match.resolveAt || 0,
        acceptedA: !!match.acceptedA, acceptedB: !!match.acceptedB,
      };
    });
  });

  onlineTournamentBracketId = data.bracketId || onlineTournamentBracketId;
  tournamentMode = true;
  tournamentWinPending = false;
  tournamentState = { rounds: rounds, currentRound: 0, currentSeries: null, champion: data.champion ? data.champion : null, bracketName: data.bracketName, phase: 'bracket', kind: 'online' };
  var active = onlineTournamentMatchId && tournamentMatchById(onlineTournamentMatchId);
  if (active && active.status !== 'final') tournamentState.currentSeries = active;
  var ready = onlineTournamentAcceptedMatchId && tournamentMatchById(onlineTournamentAcceptedMatchId);
  if (ready && ready.status === 'live' && !pendingMatchIntro && gameState !== GAME_STATE_RUNNING) {
    onlineTournamentAcceptedMatchId = null;
    var pop = document.getElementById('TournamentAccept');
    if (pop) pop.style.display = 'none';
    setTimeout(startTournamentMatch, 0);
    return;
  }
  if (menuDiv && menuDiv.style.display !== 'none' && !onlineMode && !isSpectator) showTournamentHub();
}

function showTournamentAccept(data) {
  loadOnlineTournament(data);
  var match = activePlayerMatch();
  if (!match) return;
  var el = document.getElementById('TournamentAccept');
  if (!el) {
    el = document.createElement('div');
    el.id = 'TournamentAccept';
    document.body.appendChild(el);
  }
  var end = data.deadline || Date.now() + 60000;
  el.innerHTML = '<b>TOURNAMENT MATCH READY</b><span id="TournamentAcceptTimer"></span>' +
    '<button onclick="startTournamentMatch()">ACCEPT</button><button onclick="showTournamentHub()">VIEW BRACKET</button>';
  el.style.display = 'block';
  clearInterval(el._timer);
  el._timer = setInterval(function() {
    var left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    var t = document.getElementById('TournamentAcceptTimer');
    if (t) t.textContent = left + 's to accept';
    if (left <= 0) { clearInterval(el._timer); el.style.display = 'none'; }
  }, 250);
}

function spectateTournamentMatch(matchId) {
  var match = tournamentMatchById(matchId);
  if (!match) return;
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  menuDiv.innerHTML =
    '<div class="match-intro">' +
      '<div class="match-intro-eyebrow">Tournament live feed</div>' +
      '<div class="match-intro-cards">' +
        '<div>' + playerCardHtml({ name: match.a ? match.a.name : 'TBD' }) + '</div>' +
        '<div class="versus-stamp">LIVE</div>' +
        '<div>' + playerCardHtml({ name: match.b ? match.b.name : 'TBD' }) + '</div>' +
      '</div>' +
      '<div class="result-copy">Best of 3 (current score: ' + (match.winsA || 0) + '-' + (match.winsB || 0) + ')</div>' +
      '<button class="feature-primary" onclick="showTournamentHub()">BACK TO BRACKET</button>' +
    '</div>';
}
