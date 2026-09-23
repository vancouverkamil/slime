function launchOnlineGame() {
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  hidePregameOverlay();
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
    if (currentRoomId !== null) drawMapBackground(currentRoomMapId !== null ? currentRoomMapId : currentRoomId);
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
  hidePregameOverlay();
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
  hidePregameOverlay();
  onlineMode = false; showLeaveBtn(false); particles = [];
  var iWon = (mySide === winner);
  if (iWon) { sessionWins++; recordWin(); } else sessionLosses++;
  var wName = winner === 'left' ? playerNameLeft : playerNameRight;
  var lName = winner === 'left' ? playerNameRight : playerNameLeft;
  var col   = iWon ? '#66ffcc' : '#ff66aa';
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div style="text-align:center;padding-top:42px;background:var(--bg);height:100%;position:relative;">' +
    '<div style="font-size:var(--fs-xs);color:#444;letter-spacing:3px;margin-bottom:10px;">MATCH OVER</div>' +
    '<div style="font-size:44px;font-weight:bold;color:' + col + ';letter-spacing:3px;' +
    'text-shadow:0 0 24px ' + col + ';margin-bottom:6px;">' + (iWon ? 'VICTORY' : 'DEFEAT') + '</div>' +
    '<div style="font-size:var(--fs-xs);color:var(--text-faint);letter-spacing:2px;margin-bottom:20px;">' + escHtml(wName) + ' defeats ' + escHtml(lName) + '</div>' +
    '<div style="font-size:var(--fs-2xs);color:#333;letter-spacing:2px;margin-bottom:22px;">' +
    'SESSION &nbsp; <span style="color:var(--accent-soft);">' + sessionWins + 'W</span> / <span style="color:var(--danger);">' + sessionLosses + 'L</span></div>' +
    (onlineTournamentRoom && tournamentState
      ? '<span onclick="showTournamentHub()" class="btn" style="margin:6px 10px;">BACK TO BRACKET</span>'
      : '<span onclick="showLobbySelect()" class="btn" style="margin:6px 10px;">PLAY AGAIN</span>' +
        '<span onclick="toInitialMenu()" class="btn pink" style="margin:6px 10px;">MENU</span>') +
    '</div>';
  showBottomBar();
  onlineTournamentRoom = null;
}

function finishSpectating(winner) {
  if (tournamentSpectateMatchId && typeof exitTournamentSpectate === 'function') { exitTournamentSpectate(); return; }
  hidePregameOverlay();
  isSpectator = false; hideSpecBadge(); showLeaveBtn(false); particles = [];
  var wName = winner === 'left' ? playerNameLeft : playerNameRight;
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div style="text-align:center;padding-top:60px;background:var(--bg);height:100%;">' +
    '<div style="font-size:var(--fs-2xs);color:#444;letter-spacing:2px;margin-bottom:10px;">MATCH OVER</div>' +
    '<div style="font-size:36px;font-weight:bold;color:var(--accent);letter-spacing:2px;' +
    'text-shadow:0 0 20px rgba(var(--accent-rgb),.7);margin-bottom:8px;">' + escHtml(wName) + '</div>' +
    '<div style="font-size:var(--fs-xs);color:var(--text-faint);letter-spacing:3px;margin-bottom:28px;">WINS THE MATCH</div>' +
    '<span onclick="showLobbySelect()" class="btn" style="margin:6px 10px;">BACK TO LOBBIES</span>' +
    '</div>';
  showBottomBar();
}

// ── reconnect overlay ─────────────────────────────────────
var _rcOverlay = null, _rcTimer = null;
