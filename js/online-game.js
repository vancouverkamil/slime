function handleServerMessage(msg) {
  if (typeof handleSlimeverseMessage === 'function' && handleSlimeverseMessage(msg)) return;
  if (msg.type === 'connected') {
    currentLobbies = msg.lobbies || [];
    updatePlayerCount(msg.totalPlayers);
    if (msg.profile) applyAccount(msg.profile);
    var savedN = localStorage.getItem('slimeName');
    if (currentAccount) {
      myPlayerName = currentAccount.displayName || currentAccount.username;
    } else if (savedN) {
      myPlayerName = savedN;
      if (lobbySocket && lobbySocket.readyState === 1)
        lobbySocket.send(JSON.stringify({ type: 'set_name', name: savedN, wins: totalWins, rank: getPlayerRank() }));
    } else {
      myPlayerName = msg.name;
      if (lobbySocket && lobbySocket.readyState === 1)
        lobbySocket.send(JSON.stringify({ type: 'set_name', name: msg.name, wins: totalWins, rank: getPlayerRank() }));
    }
    addChatMessage(null, 'Connected as ' + myPlayerName);
    if (msg.playerList) updateOnlineList(msg.playerList);
    var rjRoom  = null, rjToken = null;
    try { rjRoom  = localStorage.getItem('slime_pendingRejoinRoom');  } catch(e) {}
    try { rjToken = localStorage.getItem('slime_pendingRejoinToken'); } catch(e) {}
    if (rjRoom !== null && rjToken) {
      try { localStorage.removeItem('slime_pendingRejoinRoom'); localStorage.removeItem('slime_pendingRejoinToken'); } catch(e) {}
      setTimeout(function() {
        if (lobbySocket && lobbySocket.readyState === 1)
          lobbySocket.send(JSON.stringify({ type: 'join_room', roomId: parseInt(rjRoom, 10), rejoinToken: rjToken }));
      }, 150);
    }
  } else if (msg.type === 'perf_pong') {
    if (typeof handlePerfPong === 'function') handlePerfPong(msg);
  } else if (msg.type === 'ranked_queued') {
    showRankedQueueUI();
  } else if (msg.type === 'ranked_queue_left') {
    stopRankedQueueUI();
  } else if (msg.type === 'ranked_error') {
    stopRankedQueueUI();
    addChatMessage(null, msg.message || 'Ranked error.');
  } else if (msg.type === 'ranked_result') {
    if (currentAccount && msg.ranked) {
      currentAccount.ranked = msg.ranked;
      try { localStorage.setItem('slime_rankedData', JSON.stringify(msg.ranked)); } catch(e) {}
    }
  } else if (msg.type === 'lobby_list') {
    currentLobbies = msg.lobbies || [];
    updatePlayerCount(msg.totalPlayers);
    if (msg.playerList) updateOnlineList(msg.playerList);
    if (showingLobbySelect) renderLobbySelect(currentLobbies);
  } else if (msg.type === 'chat') {
    if (chatJoined) {
      addChatMessage(msg.name, msg.message);
    } else if (msg.name) {
      chatUnreadCount++;
      updateChatUnreadNote();
    }
  } else if (msg.type === 'player_count') {
    updatePlayerCount(msg.count);
  } else if (msg.type === 'room_joined') {
    currentRoomId = msg.roomId;
    currentRoomMapId = typeof msg.mapId === 'number' ? msg.mapId : null;
    if (msg.rejoinToken) try { localStorage.setItem('slime_rejoinToken', msg.rejoinToken); } catch(e) {}
    onlineTournamentRoom = msg.tournament || null;
    if (onlineTournamentRoom) {
      var tPop = document.getElementById('TournamentAccept');
      if (tPop) tPop.style.display = 'none';
      pendingMatchIntro = null;
    }
    if (msg.ranked) try { localStorage.setItem('slime_inRanked', '1'); } catch(e) {}
    else try { localStorage.removeItem('slime_inRanked'); } catch(e) {}
    showLeaveBtn(true);
    if (msg.role === 'spectator') {
      isSpectator = true; onlineMode = false;
      canvas.style.display = 'none'; menuDiv.style.display = 'block';
      menuDiv.innerHTML =
        '<div style="text-align:center;padding-top:80px;">' +
        '<div style="font-size:32px;margin-bottom:12px;">👁</div>' +
        '<div style="color:var(--accent);letter-spacing:4px;font-size:var(--fs-sm);margin-bottom:8px;">SPECTATING</div>' +
        '<div style="color:#444;font-size:var(--fs-xs);letter-spacing:1px;">Waiting for game to start...</div>' +
        (tournamentSpectateMatchId ? '<button class="feature-back" style="margin-top:22px;" onclick="exitTournamentSpectate()">EXIT SPECTATING</button>' : '') +
        '</div>';
    } else {
      isSpectator = false; onlinePointText = null;
      if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
      launchWaitingMode(msg.side);
    }
  } else if (msg.type === 'start') {
    mySide = msg.side;
    slimeLeftScore = 0; slimeRightScore = 0; // don't show a previous local game's score before the first state
    playerNameLeft  = msg.nameLeft  || 'Player 1';
    playerNameRight = msg.nameRight || 'Player 2';
    leftStreak = 0; rightStreak = 0; rallyCount = 0;
    launchOnlineGame();
  } else if (msg.type === 'game_started') {
    playerNameLeft  = msg.nameLeft  || 'Player 1';
    playerNameRight = msg.nameRight || 'Player 2';
    leftStreak = 0; rightStreak = 0; rallyCount = 0;
    launchSpectatorMode();
  } else if (msg.type === 'tournament_spectating') {
    tournamentSpectateMatchId = msg.matchId;
    playerNameLeft = msg.nameLeft || 'Player 1';
    playerNameRight = msg.nameRight || 'Player 2';
    currentRoomId = null; currentRoomMapId = 15;
    isSpectator = true; onlineMode = false;
    if (!tournSpecRaf) startTournamentSpectateView();
    if (msg.state) pushTournamentSnapshot(msg.state);
  } else if (msg.type === 'spectator_waiting') {
  } else if (msg.type === 'rps_start') {
    showRpsOverlay(msg);
  } else if (msg.type === 'rps_locked') {
    updateRpsLocked(msg.side);
  } else if (msg.type === 'rps_result') {
    showRpsResult(msg);
  } else if (msg.type === 'pregame_countdown') {
    showPregameCountdown(msg.n);
  } else if (msg.type === 'state') {
    var prevRally = rallyCount;
    if (ball && msg.ball) {
      var crossed = (ball.x < 500 && msg.ball.x >= 500) || (ball.x >= 500 && msg.ball.x < 500);
      if (crossed) rallyCount++;
    }
    applyServerState(msg);
    if (msg.phase === 'playing') hidePregameOverlay();
  } else if (msg.type === 'tournament_state') {
    if (msg.matchId === tournamentSpectateMatchId) pushTournamentSnapshot(msg);
  } else if (msg.type === 'point') {
    rallyCount = 0;
    playSfx('score');
    if (msg.scorer === 'left') {
      leftStreak++; rightStreak = 0;
    } else {
      rightStreak++; leftStreak = 0;
    }
    if (!isSpectator) {
      onlinePointText = (mySide === msg.scorer) ? 'YOU SCORED' : 'OPPONENT SCORES';
    } else {
      onlinePointText = (msg.scorer === 'left' ? playerNameLeft : playerNameRight) + ' SCORES';
    }
    setTimeout(function() { onlinePointText = null; }, 700);
  } else if (msg.type === 'customize') {
    var side = msg.side === 'left' ? 'left' : 'right';
    hatConfigs[side] = { hat: msg.hat || 'none', anim: msg.hatAnim || 'none', color: msg.color || (side==='left'?'#00ff00':'#ff0000'), drawing: msg.hatDrawing || [], trail: msg.trail || 'none' };
    if (side === 'left'  && slimeLeft)  { slimeLeft.tintColor  = hatConfigs.left.color;  slimeLeft._trailType  = hatConfigs.left.trail;  }
    if (side === 'right' && slimeRight) { slimeRight.tintColor = hatConfigs.right.color; slimeRight._trailType = hatConfigs.right.trail; }
  } else if (msg.type === 'emote') {
    var now = Date.now();
    if (msg.side === 'left')  { emoteLeft  = msg.emoji; emoteLeftEnd  = now + 2200; }
    else                      { emoteRight = msg.emoji; emoteRightEnd = now + 2200; }
  } else if (msg.type === 'game_over') {
    showLeaveBtn(false); hideEscMenu();
    clearInterval(onlineInputInterval); onlineInputInterval = null;
    if (!isSpectator && currentAccount) loadAccount();
    playSfx(msg.winner === mySide ? 'win' : 'score');
    var _w = msg.winner, _sp = isSpectator;
    playHighlights(_w, function() {
      if (_sp) finishSpectating(_w);
      else     finishOnlineGame(_w);
    });
  } else if (msg.type === 'opponent_reconnecting') {
    showReconnectOverlay(Math.round((msg.timeoutMs || 30000) / 1000));
    if (msg.rejoinToken) try { localStorage.setItem('slime_rejoinToken', msg.rejoinToken); } catch(e) {}
    addChatMessage(null, 'Opponent disconnected — waiting 30s for reconnect…');
  } else if (msg.type === 'opponent_reconnected') {
    hideReconnectOverlay();
    addChatMessage(null, 'Opponent reconnected!');
  } else if (msg.type === 'reconnected') {
    hideReconnectOverlay();
    mySide = msg.side;
    currentRoomId = msg.roomId;
    currentRoomMapId = typeof msg.mapId === 'number' ? msg.mapId : null;
    playerNameLeft  = msg.nameLeft  || 'Player 1';
    playerNameRight = msg.nameRight || 'Player 2';
    if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
    launchOnlineGame();
    addChatMessage(null, 'Reconnected to match!');
  } else if (msg.type === 'opponent_disconnected') {
    hideReconnectOverlay();
    if (typeof slimeverseActive !== 'undefined' && slimeverseActive) leaveSlimeverse();
    if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
    clearInterval(onlineInputInterval); onlineInputInterval = null;
    onlineMode = false; isSpectator = false;
    showLeaveBtn(false);
    hideSpecBadge(); canvas.style.display = 'none';
    menuDiv.style.display = 'none'; showBottomBar(); toInitialMenu();
    addChatMessage(null, 'Opponent disconnected.');
  } else if (msg.type === 'tournament_lobby') {
    if (typeof onlineTournamentBracketId !== 'undefined' && onlineTournamentBracketId === msg.bracketId) {
      if (typeof showOnlineTournamentLobby === 'function') showOnlineTournamentLobby(msg);
    }
  } else if (msg.type === 'tournament_start' || msg.type === 'tournament_update') {
    if (typeof loadOnlineTournament === 'function') loadOnlineTournament(msg);
  } else if (msg.type === 'tournament_match_ready') {
    if (typeof showTournamentAccept === 'function') showTournamentAccept(msg);
  } else if (msg.type === 'tournament_error') {
    addChatMessage(null, 'Tournament: ' + (msg.error || 'Unknown error'));
    if (typeof onlineTournamentBracketId !== 'undefined' && onlineTournamentBracketId) {
      if (typeof showOnlineBrackets === 'function') showOnlineBrackets();
    }
  }
}
