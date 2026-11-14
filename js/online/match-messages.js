// Online: server messages for a match in a room (join, pregame, play, game over, reconnects).

onServerMessage('room_joined', function(msg) {
  claimScreen('online-match');
  currentGameId = null;
  currentRoomId = msg.roomId;
  currentRoomMapId = typeof msg.mapId === 'number' ? msg.mapId : null;
  if (msg.rejoinToken) try { localStorage.setItem('slime_rejoinToken', msg.rejoinToken); } catch(e) {}
  onlineTournamentRoom = msg.tournament || null;
  onlineMatchMode = msg.tournament ? 'TOURNAMENT' : msg.ranked ? 'RANKED' : 'QUICK PLAY';
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
    if (typeof forgetTournamentSpectate === 'function') forgetTournamentSpectate(); // we're playing now, not watching
    isSpectator = false; onlinePointText = null;
    if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
    launchWaitingMode(msg.side);
  }
});

onServerMessage('start', function(msg) {
  currentGameId = msg.gameId || null;
  mySide = msg.side;
  slimeLeftScore = 0; slimeRightScore = 0; // don't show a previous local game's score before the first state
  playerNameLeft  = msg.nameLeft  || 'Player 1';
  playerNameRight = msg.nameRight || 'Player 2';
  leftStreak = 0; rightStreak = 0; rallyCount = 0;
  launchOnlineGame();
});

onServerMessage('game_started', function(msg) {
  currentGameId = msg.gameId || null;
  playerNameLeft  = msg.nameLeft  || 'Player 1';
  playerNameRight = msg.nameRight || 'Player 2';
  leftStreak = 0; rightStreak = 0; rallyCount = 0;
  launchSpectatorMode();
});

onServerMessage('spectator_waiting', function(msg) {

});

onServerMessage('rps_start', function(msg) {
  showRpsOverlay(msg);
});

onServerMessage('rps_locked', function(msg) {
  updateRpsLocked(msg.side);
});

onServerMessage('rps_result', function(msg) {
  showRpsResult(msg);
});

onServerMessage('pregame_countdown', function(msg) {
  showPregameCountdown(msg.n);
});

onServerMessage('state', function(msg) {
  // Count rallies from real arrivals, not from the (slightly delayed) ball on screen.
  var prevX = netLastBallX !== null ? netLastBallX : (ball ? ball.x : null);
  if (prevX !== null && msg.ball) {
    var crossed = (prevX < 500 && msg.ball.x >= 500) || (prevX >= 500 && msg.ball.x < 500);
    if (crossed) rallyCount++;
  }
  if (netSmoothingWanted(msg)) {
    if (isSpectator && canvas.style.display !== 'block') launchSpectatorMode();
    if (!replayInterval) recordReplayFrame(msg);
    pushNetSnapshot(msg); // drawn by the smoothing loop at the screen's refresh rate
  } else {
    applyServerState(msg);
    netLastBallX = msg.ball ? msg.ball.x : null;
  }
  if (msg.phase === 'playing') hidePregameOverlay();
});

onServerMessage('point', function(msg) {
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
});

onServerMessage('customize', function(msg) {
  var side = msg.side === 'left' ? 'left' : 'right';
  hatConfigs[side] = { hat: msg.hat || 'none', anim: msg.hatAnim || 'none', color: msg.color || (side==='left'?'#00ff00':'#ff0000'), drawing: msg.hatDrawing || [], trail: msg.trail || 'none' };
  if (side === 'left'  && slimeLeft)  { slimeLeft.tintColor  = hatConfigs.left.color;  slimeLeft._trailType  = hatConfigs.left.trail;  }
  if (side === 'right' && slimeRight) { slimeRight.tintColor = hatConfigs.right.color; slimeRight._trailType = hatConfigs.right.trail; }
});

onServerMessage('emote', function(msg) {
  var now = Date.now();
  if (msg.side === 'left')  { emoteLeft  = msg.emoji; emoteLeftEnd  = now + 2200; }
  else                      { emoteRight = msg.emoji; emoteRightEnd = now + 2200; }
});

onServerMessage('game_over', function(msg) {
  showLeaveBtn(false); hideEscMenu();
  clearInterval(onlineInputInterval); onlineInputInterval = null;
  if (!isSpectator && currentAccount) loadAccount();
  playSfx(msg.winner === mySide ? 'win' : 'score');
  var _w = msg.winner, _sp = isSpectator;
  var result = _sp ? null : recordOnlineGameResult(_w);
  playHighlights(_w, function() {
    if (_sp) finishSpectating(_w);
    else     showOnlineGameResult(result);
  });
});

onServerMessage('opponent_reconnecting', function(msg) {
  showReconnectOverlay(Math.round((msg.timeoutMs || 30000) / 1000));
  if (msg.rejoinToken) try { localStorage.setItem('slime_rejoinToken', msg.rejoinToken); } catch(e) {}
  addChatMessage(null, 'Opponent disconnected — waiting 30s for reconnect…');
});

onServerMessage('opponent_reconnected', function(msg) {
  hideReconnectOverlay();
  addChatMessage(null, 'Opponent reconnected!');
});

onServerMessage('reconnected', function(msg) {
  currentGameId = msg.gameId || null;
  hideReconnectOverlay();
  mySide = msg.side;
  currentRoomId = msg.roomId;
  currentRoomMapId = typeof msg.mapId === 'number' ? msg.mapId : null;
  playerNameLeft  = msg.nameLeft  || 'Player 1';
  playerNameRight = msg.nameRight || 'Player 2';
  if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
  launchOnlineGame();
  addChatMessage(null, 'Reconnected to match!');
});

function onMatchEndedEarly(msg) {
  hideReconnectOverlay();
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  clearInterval(onlineInputInterval); onlineInputInterval = null;
  onlineMode = false; isSpectator = false;
  showLeaveBtn(false);
  hideSpecBadge(); canvas.style.display = 'none';
  menuDiv.style.display = 'none'; showBottomBar(); toInitialMenu();
  addChatMessage(null, msg.type === 'game_aborted' ? (msg.reason || 'The match was stopped.') : 'Opponent disconnected.');
}
onServerMessage('opponent_disconnected', onMatchEndedEarly);
onServerMessage('game_aborted', onMatchEndedEarly);
