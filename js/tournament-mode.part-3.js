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
