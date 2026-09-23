function finishTournamentSet(playerWon) {
  var match = tournamentState && (tournamentState.currentSeries || tournamentMatchById(onlineTournamentMatchId));
  if (!match || match.status === 'final') return false;
  tournamentState.currentSeries = match;
  if (tournamentState.kind === 'online') {
    if (lobbySocket && lobbySocket.readyState === 1)
      lobbySocket.send(JSON.stringify({ type:'tournament_result', matchId:match.id, won:!!playerWon }));
    match.status = 'reported';
    tournamentState.currentSeries = null;
    tournamentState.phase = 'bracket';
    return true;
  }
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
    '<span class="swab" style="background:' + escHtml(e.color || 'var(--text-mute)') + ';"></span>' +
    '<b>' + escHtml(e.name) + '</b>' +
  '</div>';
}

function tournamentMatchHtml(match) {
  var aWin = match.winner && match.a && match.winner.id === match.a.id;
  var bWin = match.winner && match.b && match.winner.id === match.b.id;
  var active = match === activePlayerMatch();
  var STATUS_LABELS = { final:'complete', upcoming:'up next', waiting:'waiting', bot_live:'cpu match live', live:'live', awaiting:'awaiting accept', reported:'syncing result', bye:'bye' };
  var status = STATUS_LABELS[match.status || 'waiting'] || match.status;
  var accept = match.status === 'awaiting'
    ? '<div class="series-accept">' + escHtml(match.a ? match.a.name : 'A') + (match.acceptedA ? ' ready' : ' waiting') + ' &middot; ' + escHtml(match.b ? match.b.name : 'B') + (match.acceptedB ? ' ready' : ' waiting') + '</div>'
    : '';
  var watch = (match.status === 'bot_live' || match.status === 'live') && match !== activePlayerMatch()
    ? '<button class="tourn-spectate-btn" onclick="event.stopPropagation();spectateTournamentMatch(\'' + escHtml(match.id) + '\')">Spectate</button>'
    : '';
  return '<div class="bracket-match' + (active ? ' active' : '') + '">' +
    watch +
    '<div class="bracket-status">' + escHtml(status) + '</div>' +
    tournamentEntrantHtml(match.a, aWin) +
    tournamentEntrantHtml(match.b, bWin) +
    (match.a && match.b
      ? '<div class="series-score">Series <b>' + (match.winsA || 0) + '-' + (match.winsB || 0) + '</b>' +
        (match.status === 'live' || match.status === 'awaiting' || match.status === 'reported' ? ' &middot; Game <b>' + (match.scoreA || 0) + '-' + (match.scoreB || 0) + '</b>' : '') + '</div>'
      : '') +
    accept +
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
        '<button class="feature-back" onclick="exitTournamentToMenu()">' + (tournamentState.kind === 'online' ? 'BACK TO SITE' : 'SAVE &amp; EXIT') + '</button>' +
      '</div>' +
      '<div class="tournament-action" role="status" aria-live="polite">' +
        (champion
          ? '<div class="champion-line">' + escHtml(champion.name) + ' CLAIMS THE CUP</div>'
          : '<div class="tourn-next"><b>' + escHtml(roundLabel) + '</b><span>Next opponent: <em>' + escHtml(opponent ? opponent.name : 'TBD') + '</em> &middot; best of 3</span></div>') +
        (champion ? '<button class="feature-primary" onclick="clearSoloTournament();startTournament()">NEW TOURNAMENT</button>'
          : match && isHeadToHeadMatch(match) && match.status === 'live' ? '<button class="feature-primary" disabled>MATCH STARTING...</button>'
          : match && isHeadToHeadMatch(match) && myTournamentAccepted(match) ? '<button class="feature-primary" disabled>WAITING FOR ' + escHtml(opponent ? opponent.name : 'OPPONENT').toUpperCase() + '</button>'
          : match ? '<button class="feature-primary" onclick="startTournamentMatch()">' + (tournamentState.kind === 'online' ? 'ACCEPT / PLAY' : 'START SERIES') + '</button>'
          : '<button class="feature-primary" disabled>BRACKET UPDATING</button>') +
      '</div>' +
      '<div class="bracket-board">' +
        tournamentState.rounds.map(function(round, i) {
          return '<div class="bracket-round">' +
            '<div class="round-title">' + escHtml(tournamentRoundName(i)) + '</div>' +
            '<div class="bracket-col">' + round.map(tournamentMatchHtml).join('') + '</div>' +
          '</div>';
        }).join('') +
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
      '<div style="text-align:center;padding-top:60px;color:var(--text-faint);font-size:var(--fs-2xs);letter-spacing:2px;">CONNECTING TO LOBBY...</div>' +
    '</div>';
}

function showOnlineTournamentLobby(data) {
  if (onlineTournamentBracketId !== data.bracketId) return;
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  renderTournamentLobby(data);
}
