function uiScale() {
  var sx = (viewWidth || 750) / 750;
  var sy = (viewHeight || 375) / 375;
  return Math.max(1, Math.min(2.25, Math.min(sx, sy)));
}
function uiPx(n) { return Math.round(n * uiScale()); }

function renderPoints(score, x0, dx) {
  var s = uiScale();
  var r = 12 * s;
  var y = 25 * s;
  var step = dx * s;
  ctx.fillStyle = '#ff0';
  for (var i = 0, x = x0 < viewWidth / 2 ? 30 * s : viewWidth - 30 * s; i < score; i++, x += step) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TWO_PI); ctx.fill();
  }
  ctx.strokeStyle = backTextColor; ctx.lineWidth = Math.max(2, 2 * s);
  for (var j = 0, x2 = x0 < viewWidth / 2 ? 30 * s : viewWidth - 30 * s; j < WIN_AMOUNT; j++, x2 += step) {
    ctx.beginPath(); ctx.arc(x2, y, r, 0, TWO_PI); ctx.stroke();
  }
}
function renderBackground() {
  if (legacyGraphics) {
    ctx.fillStyle = legacySkyColor; ctx.fillRect(0, 0, viewWidth, courtYPix);
    ctx.fillStyle = legacyGroundColor;
    ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
  } else if (currentRoomId !== null) {
    drawMapBackground(currentRoomId);
  } else if (localMapId !== null) {
    drawMapBackground(localMapId);
  } else if (backImage) {
    ctx.drawImage(backImage, 0, 0, viewWidth, courtYPix);
    ctx.fillStyle = newGroundColor;
    ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
  } else {
    ctx.fillStyle = '#88ccff'; ctx.fillRect(0, 0, viewWidth, courtYPix);
    ctx.fillStyle = '#ca6'; ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
  }
  ctx.fillStyle = '#fff';
  var netW = Math.max(4, uiPx(4));
  ctx.fillRect(viewWidth/2 - netW/2, 7*viewHeight/10, netW, viewHeight/10 + uiPx(5));
  renderPoints(slimeLeftScore, 30, 40);
  renderPoints(slimeRightScore, viewWidth-30, -40);
}
function drawLocalHUD() {
  if (onlineMode || isSpectator) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + uiPx(12) + 'px Courier New';

  if (localRallyCount >= 5) {
    var col = localRallyCount >= 15 ? '#ff0066' : localRallyCount >= 10 ? '#ff6600' : '#ffcc00';
    var rt = 'RALLY ' + localRallyCount;
    var rw = ctx.measureText(rt).width + uiPx(18);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(viewWidth/2 - rw/2, uiPx(10), rw, uiPx(20));
    ctx.fillStyle = col;
    ctx.fillText(rt, viewWidth/2, uiPx(25));
  }

  if (localPointFlash && Date.now() < localPointFlashEnd) {
    ctx.font = 'bold ' + uiPx(22) + 'px Courier New';
    var fw = ctx.measureText(localPointFlash).width + uiPx(34);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(viewWidth/2 - fw/2, courtYPix + uiPx(12), fw, uiPx(32));
    ctx.fillStyle = leftWon ? '#66ffcc' : '#ff66aa';
    ctx.fillText(localPointFlash, viewWidth/2, courtYPix + uiPx(36));
  }

  ctx.restore();
}
function renderGame() {
  if (updatesToPaint === 0) return;
  var sx = 0, sy = 0;
  if (!onlineMode && !isSpectator && screenFxEnabled && shakeFrames > 0) {
    sx = (Math.random()-.5)*shakeAmt*2; sy = (Math.random()-.5)*shakeAmt*2;
    shakeFrames--;
  }
  if (sx || sy) { ctx.save(); ctx.translate(sx, sy); }
  renderBackground(); ball.render(); slimeLeft.render(); slimeRight.render();
  drawHat(slimeLeft, { hat: playerHat, drawing: playerHatDrawing });
  if (screenFxEnabled) {
    tickParticles();
    drawParticles();
  }
  drawLocalHUD();
  if (final4Mode && slimeAI) {
    var boss = final4AIs[final4Index] || {};
    var bname = slimeAI.name.toUpperCase();
    ctx.save();
    ctx.font = 'bold ' + uiPx(13) + 'px Courier New';
    var bw = ctx.measureText('BOSS ' + (final4Index+1) + '/4: ' + bname).width + uiPx(18);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(viewWidth/2 - bw/2, uiPx(46), bw, uiPx(24));
    ctx.fillStyle = boss.backTextColor || '#ff4400';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS ' + (final4Index+1) + '/4: ' + bname, viewWidth/2, uiPx(63));
    ctx.textAlign = 'left';
    ctx.restore();
  }
  if (sx || sy) ctx.restore();
  updatesToPaint = 0;
}
function renderEndOfPoint() {
  renderGame();
  ctx.font = 'bold ' + uiPx(20) + 'px Courier New';
  var w = ctx.measureText(endOfPointText).width;
  ctx.fillStyle = '#000';
  ctx.fillText(endOfPointText, (viewWidth-w)/2, courtYPix + (viewHeight-courtYPix)/2);
}

function gameIteration() {
  if (gameState !== GAME_STATE_RUNNING) return;
  updateCount++;
  if (slowMotion && updateCount % 2 === 0) return;
  updateFrame();
  updatesToPaint++;
  if (updatesToPaint === 1) requestAnimationFrame(renderGame);
}

// ── local game flow ───────────────────────────────────────
