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
      // No saved name — still send wins/rank under server-assigned name
      if (lobbySocket && lobbySocket.readyState === 1)
        lobbySocket.send(JSON.stringify({ type: 'set_name', name: msg.name, wins: totalWins, rank: getPlayerRank() }));
    }
    addChatMessage(null, 'Connected as ' + myPlayerName);
    if (msg.playerList) updateOnlineList(msg.playerList);
    // Auto-rejoin if we were mid-game when connection dropped
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

  } else if (msg.type === 'ranked_queued') {
    showRankedQueueUI();

  } else if (msg.type === 'ranked_queue_left') {
    stopRankedQueueUI();

  } else if (msg.type === 'ranked_error') {
    stopRankedQueueUI();
    addChatMessage(null, msg.message || 'Ranked error.');

  } else if (msg.type === 'ranked_result') {
    // Update local ranked data after a ranked match
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
    addChatMessage(msg.name, msg.message);

  } else if (msg.type === 'player_count') {
    updatePlayerCount(msg.count);

  } else if (msg.type === 'room_joined') {
    currentRoomId = msg.roomId;
    if (msg.rejoinToken) try { localStorage.setItem('slime_rejoinToken', msg.rejoinToken); } catch(e) {}
    if (msg.ranked) try { localStorage.setItem('slime_inRanked', '1'); } catch(e) {}
    else try { localStorage.removeItem('slime_inRanked'); } catch(e) {}
    showLeaveBtn(true);
    if (msg.role === 'spectator') {
      isSpectator = true; onlineMode = false;
      canvas.style.display = 'none'; menuDiv.style.display = 'block';
      menuDiv.innerHTML =
        '<div style="text-align:center;padding-top:80px;">' +
        '<div style="font-size:32px;margin-bottom:12px;">👁</div>' +
        '<div style="color:#00ffcc;letter-spacing:4px;font-size:13px;margin-bottom:8px;">SPECTATING</div>' +
        '<div style="color:#444;font-size:11px;letter-spacing:1px;">Waiting for game to start...</div>' +
        '</div>';
    } else {
      isSpectator = false; onlinePointText = null;
      if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
      launchWaitingMode(msg.side);
    }

  } else if (msg.type === 'start') {
    mySide = msg.side;
    playerNameLeft  = msg.nameLeft  || 'Player 1';
    playerNameRight = msg.nameRight || 'Player 2';
    leftStreak = 0; rightStreak = 0; rallyCount = 0;
    launchOnlineGame();

  } else if (msg.type === 'game_started') {
    playerNameLeft  = msg.nameLeft  || 'Player 1';
    playerNameRight = msg.nameRight || 'Player 2';
    leftStreak = 0; rightStreak = 0; rallyCount = 0;
    launchSpectatorMode();

  } else if (msg.type === 'spectator_waiting') {
    // already showing spectator waiting screen

  } else if (msg.type === 'state') {
    // track rally from ball crossing net
    var prevRally = rallyCount;
    if (ball && msg.ball) {
      var crossed = (ball.x < 500 && msg.ball.x >= 500) || (ball.x >= 500 && msg.ball.x < 500);
      if (crossed) rallyCount++;
    }
    applyServerState(msg);

  } else if (msg.type === 'point') {
    rallyCount = 0;
    if (screenFxEnabled) { shakeFrames = 8; shakeAmt = 5; }
    playSfx('score');
    if (msg.scorer === 'left') {
      leftStreak++; rightStreak = 0;
      if (screenFxEnabled) spawnParticles(slimeLeft.x, slimeLeft.y + 80, '#66ffcc');
    } else {
      rightStreak++; leftStreak = 0;
      if (screenFxEnabled) spawnParticles(slimeRight.x, slimeRight.y + 80, '#ff66aa');
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
    // Store their token so WE can rejoin if we disconnect
    if (msg.rejoinToken) try { localStorage.setItem('slime_rejoinToken', msg.rejoinToken); } catch(e) {}
    addChatMessage(null, 'Opponent disconnected — waiting 30s for reconnect…');

  } else if (msg.type === 'opponent_reconnected') {
    hideReconnectOverlay();
    addChatMessage(null, 'Opponent reconnected!');

  } else if (msg.type === 'reconnected') {
    // We reconnected to our own game
    hideReconnectOverlay();
    mySide = msg.side;
    currentRoomId = msg.roomId;
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

  } else if (msg.type === 'tournament_start') {
    if (typeof loadOnlineTournament === 'function') loadOnlineTournament(msg);

  } else if (msg.type === 'tournament_error') {
    addChatMessage(null, 'Tournament: ' + (msg.error || 'Unknown error'));
    if (typeof onlineTournamentBracketId !== 'undefined' && onlineTournamentBracketId) {
      if (typeof showOnlineBrackets === 'function') showOnlineBrackets();
    }
  }
}

// ── online game (player) ──────────────────────────────────
function launchOnlineGame() {
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  replayBuffer = [];
  // Seed own side's config from local settings
  hatConfigs[mySide] = { hat: playerHat, anim: playerHatAnim, color: playerBodyColor, drawing: playerHatDrawing, trail: playerTrail };
  slimeLeft  = newLegacySlime(true,  100, '#0f0');
  slimeRight = newLegacySlime(false, 100, '#f00');
  slimeLeft.tintColor   = hatConfigs.left.color;  slimeLeft._trailType  = hatConfigs.left.trail;
  slimeRight.tintColor  = hatConfigs.right.color; slimeRight._trailType = hatConfigs.right.trail;
  ball       = newLegacyBall(25, '#ff0');
  slimeLeftScore = 0; slimeRightScore = 0;
  slimeLeft.img = greenSlimeImage; slimeRight.img = redSlimeImage;
  legacyGraphics = false;
  canvas.style.display = 'block'; menuDiv.style.display = 'none';

  onlineInputInterval = setInterval(function() {
    if (!lobbySocket || lobbySocket.readyState !== 1) return;
    var goLeft  = keysDown[KEY_A]    || keysDown[KEY_LEFT];
    var goRight = keysDown[KEY_D]    || keysDown[KEY_RIGHT];
    var doJump  = keysDown[KEY_W]    || keysDown[KEY_UP];
    var mv = 0;
    if (goLeft && !goRight) mv = 1;
    else if (goRight && !goLeft) mv = 2;
    // number keys 1-4 send emotes
    [49,50,51,52].forEach(function(k,i) {
      if (keysDown[k]) { sendEmote(i); keysDown[k] = false; }
    });
    lobbySocket.send(JSON.stringify({ movement: mv, jump: !!doJump }));
  }, 20);
}

// ── waiting mode (1 player in room, opponent not yet joined) ─
function launchWaitingMode(side) {
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  onlineMode = true; mySide = side;
  slimeLeft  = newLegacySlime(true,  100, '#0f0');
  slimeRight = newLegacySlime(false, 100, '#f00');
  ball       = newLegacyBall(25, '#ff0');
  slimeLeft.img  = greenSlimeImage; slimeRight.img  = redSlimeImage;
  slimeLeft.tintColor  = hatConfigs.left.color;
  slimeRight.tintColor = hatConfigs.right.color;
  legacyGraphics = false;
  slimeLeftScore = 0; slimeRightScore = 0;
  // Ball starts on player's side with a gentle serve
  ball.x = side === 'left' ? 250 : 750;
  ball.y = 300; ball.velocityX = (side === 'left' ? 1 : -1) * (2 + Math.random() * 2); ball.velocityY = 8;
  canvas.style.display = 'block'; menuDiv.style.display = 'none';
  sendCustomization();

  var mySlime  = side === 'left' ? slimeLeft  : slimeRight;
  var myLLimit = side === 'left' ? 50  : 555;
  var myRLimit = side === 'left' ? 445 : 950;

  function waitRender() {
    if (currentRoomId !== null) drawMapBackground(currentRoomId);
    else { ctx.fillStyle = '#88ccff'; ctx.fillRect(0, 0, viewWidth, courtYPix); ctx.fillStyle = '#ca6'; ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix); }
    ctx.fillStyle = '#fff'; ctx.fillRect(viewWidth/2 - 2, 7*viewHeight/10, 4, viewHeight/10 + 5);
    ball.render(); mySlime.render();
    drawHat(mySlime, hatConfigs[side]);
    ctx.textAlign = 'center'; ctx.font = 'bold 13px Courier New';
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(viewWidth/2 - 140, courtYPix + 8, 280, 22);
    ctx.fillStyle = '#00ffcc'; ctx.fillText('WAITING FOR OPPONENT...', viewWidth/2, courtYPix + 23);
    ctx.textAlign = 'left';
  }

  waitingInterval = setInterval(function() {
    if (!waitingInterval) return;
    updateSlimeVelocitiesWithDoubleKeys(mySlime, KEY_A, KEY_LEFT, KEY_D, KEY_RIGHT, KEY_W, KEY_UP);
    updateSlime(mySlime, myLLimit, myRLimit);
    ball.velocityY = Math.max(ball.velocityY - 1, -22);
    ball.x += ball.velocityX; ball.y += ball.velocityY;
    collisionBallSlime(mySlime);
    if (ball.x < 15)  { ball.x = 15;  ball.velocityX = -ball.velocityX; }
    if (ball.x > 985) { ball.x = 985; ball.velocityX = -ball.velocityX; }
    if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
      if (ball.velocityY < 0 && ball.y > 130) { ball.velocityY *= -1; ball.y = 130; }
      else if (ball.x < 500) { ball.x = 480; ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX; }
      else                   { ball.x = 520; ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX; }
    }
    if (ball.y < 0) {
      ball.x = side === 'left' ? 250 : 750; ball.y = 300;
      ball.velocityX = (side === 'left' ? 1 : -1) * (2 + Math.random() * 2); ball.velocityY = 8;
    }
    requestAnimationFrame(waitRender);
  }, 20);
}

// ── spectator mode ────────────────────────────────────────
function launchSpectatorMode() {
  replayBuffer = [];
  slimeLeft  = newLegacySlime(true,  100, '#0f0');
  slimeRight = newLegacySlime(false, 100, '#f00');
  ball       = newLegacyBall(25, '#ff0');
  slimeLeft.img = greenSlimeImage; slimeRight.img = redSlimeImage;
  legacyGraphics = false;
  canvas.style.display = 'block'; menuDiv.style.display = 'none';
  showSpecBadge();
}

function applyServerState(msg) {
  if (isSpectator && canvas.style.display !== 'block') launchSpectatorMode();
  if (!replayInterval) recordReplayFrame(msg);

  ball.x = msg.ball.x; ball.y = msg.ball.y; ball.velocityX = msg.ball.velocityX;
  slimeLeft.x  = msg.slimeLeft.x;  slimeLeft.y  = msg.slimeLeft.y;
  slimeRight.x = msg.slimeRight.x; slimeRight.y = msg.slimeRight.y;
  slimeLeftScore = msg.scoreLeft; slimeRightScore = msg.scoreRight;

  if (screenFxEnabled) tickParticles();

  // screen shake offset
  var sx = 0, sy = 0;
  if (screenFxEnabled && shakeFrames > 0) {
    sx = (Math.random()-.5)*shakeAmt*2; sy = (Math.random()-.5)*shakeAmt*2;
    shakeFrames--;
  }
  if (sx || sy) { ctx.save(); ctx.translate(sx, sy); }
  renderBackground();
  ball.render(); slimeLeft.render(); slimeRight.render();
  drawHat(slimeLeft, hatConfigs.left); drawHat(slimeRight, hatConfigs.right);
  if (screenFxEnabled) drawParticles();
  drawOnlineHUD();
  if (sx || sy) ctx.restore();

  if (onlinePointText) {
    ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(viewWidth/2-90, courtYPix+8, 180, 22);
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(onlinePointText, viewWidth/2, courtYPix+23);
    ctx.textAlign = 'left';
  }
}

function finishOnlineGame(winner) {
  onlineMode = false; showLeaveBtn(false); particles = [];
  var iWon = (mySide === winner);
  if (iWon) { sessionWins++; recordWin(); } else sessionLosses++;
  var wName = winner === 'left' ? playerNameLeft : playerNameRight;
  var lName = winner === 'left' ? playerNameRight : playerNameLeft;
  var col   = iWon ? '#66ffcc' : '#ff66aa';
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div style="text-align:center;padding-top:42px;background:#05000f;height:100%;position:relative;">' +
    '<div style="font-size:11px;color:#444;letter-spacing:3px;margin-bottom:10px;">MATCH OVER</div>' +
    '<div style="font-size:44px;font-weight:bold;color:' + col + ';letter-spacing:3px;' +
    'text-shadow:0 0 24px ' + col + ';margin-bottom:6px;">' + (iWon ? 'VICTORY' : 'DEFEAT') + '</div>' +
    '<div style="font-size:11px;color:#555;letter-spacing:2px;margin-bottom:20px;">' + escHtml(wName) + ' defeats ' + escHtml(lName) + '</div>' +
    '<div style="font-size:10px;color:#333;letter-spacing:2px;margin-bottom:22px;">' +
    'SESSION &nbsp; <span style="color:#66ffcc;">' + sessionWins + 'W</span> / <span style="color:#ff66aa;">' + sessionLosses + 'L</span></div>' +
    '<span onclick="showLobbySelect()" class="btn" style="margin:6px 10px;">PLAY AGAIN</span>' +
    '<span onclick="toInitialMenu()" class="btn pink" style="margin:6px 10px;">MENU</span>' +
    '</div>';
  showBottomBar();
}

function finishSpectating(winner) {
  isSpectator = false; hideSpecBadge(); showLeaveBtn(false); particles = [];
  var wName = winner === 'left' ? playerNameLeft : playerNameRight;
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div style="text-align:center;padding-top:60px;background:#05000f;height:100%;">' +
    '<div style="font-size:10px;color:#444;letter-spacing:3px;margin-bottom:10px;">MATCH OVER</div>' +
    '<div style="font-size:36px;font-weight:bold;color:#00ffcc;letter-spacing:2px;' +
    'text-shadow:0 0 20px rgba(0,255,200,.7);margin-bottom:8px;">' + escHtml(wName) + '</div>' +
    '<div style="font-size:11px;color:#555;letter-spacing:3px;margin-bottom:28px;">WINS THE MATCH</div>' +
    '<span onclick="showLobbySelect()" class="btn" style="margin:6px 10px;">BACK TO LOBBIES</span>' +
    '</div>';
  showBottomBar();
}

// ── reconnect overlay ─────────────────────────────────────
var _rcOverlay = null, _rcTimer = null;

function showReconnectOverlay(seconds) {
  hideReconnectOverlay();
  _rcOverlay = document.createElement('div');
  _rcOverlay.id = 'ReconnectOverlay';
  var remaining = seconds;
  _rcOverlay.innerHTML =
    '<div class="rco-icon">&#9203;</div>' +
    '<div class="rco-title">OPPONENT DISCONNECTED</div>' +
    '<div class="rco-sub">Waiting for them to reconnect&hellip;</div>' +
    '<div class="rco-timer" id="RcoTimer">' + remaining + 's</div>';
  var parent = document.getElementById('ContentDiv') || document.getElementById('GameContentDiv') || document.body;
  parent.appendChild(_rcOverlay);
  _rcTimer = setInterval(function() {
    remaining = Math.max(0, remaining - 1);
    var el = document.getElementById('RcoTimer');
    if (el) el.textContent = remaining + 's';
    if (remaining <= 0) { clearInterval(_rcTimer); _rcTimer = null; }
  }, 1000);
}

function hideReconnectOverlay() {
  if (_rcTimer) { clearInterval(_rcTimer); _rcTimer = null; }
  if (_rcOverlay) {
    if (_rcOverlay.parentNode) _rcOverlay.parentNode.removeChild(_rcOverlay);
    _rcOverlay = null;
  }
}


