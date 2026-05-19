function renderPoints(score, x0, dx) {
  ctx.fillStyle = '#ff0';
  for (var i = 0, x = x0; i < score; i++, x += dx) {
    ctx.beginPath(); ctx.arc(x, 25, 12, 0, TWO_PI); ctx.fill();
  }
  ctx.strokeStyle = backTextColor; ctx.lineWidth = 2;
  for (var i = 0, x = x0; i < WIN_AMOUNT; i++, x += dx) {
    ctx.beginPath(); ctx.arc(x, 25, 12, 0, TWO_PI); ctx.stroke();
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
    ctx.drawImage(backImage, 0, 0);
    ctx.fillStyle = newGroundColor;
    ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
  } else {
    ctx.fillStyle = '#88ccff'; ctx.fillRect(0, 0, viewWidth, courtYPix);
    ctx.fillStyle = '#ca6'; ctx.fillRect(0, courtYPix, viewWidth, viewHeight - courtYPix);
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(viewWidth/2-2, 7*viewHeight/10, 4, viewHeight/10+5);
  renderPoints(slimeLeftScore, 30, 40);
  renderPoints(slimeRightScore, viewWidth-30, -40);
}
function drawLocalHUD() {
  if (onlineMode || isSpectator) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px Courier New';

  function drawTag(slime, label, color) {
    var xp = slime.x * pixelsPerUnitX;
    var yp = courtYPix + 8;
    var tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.fillRect(xp - tw/2, yp, tw, 14);
    ctx.fillStyle = color;
    ctx.fillText(label, xp, yp + 10);
  }

  drawTag(slimeLeft, 'P1', '#66ffcc');
  drawTag(slimeRight, onePlayer && slimeAI ? slimeAI.name.toUpperCase() : 'P2', onePlayer ? '#ffcc66' : '#ff66aa');

  if (localRallyCount >= 5) {
    var col = localRallyCount >= 15 ? '#ff0066' : localRallyCount >= 10 ? '#ff6600' : '#ffcc00';
    var rt = 'RALLY ' + localRallyCount;
    var rw = ctx.measureText(rt).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(viewWidth/2 - rw/2, courtYPix - 36, rw, 16);
    ctx.fillStyle = col;
    ctx.fillText(rt, viewWidth/2, courtYPix - 24);
  }

  if (localPointFlash && Date.now() < localPointFlashEnd) {
    ctx.font = 'bold 16px Courier New';
    var fw = ctx.measureText(localPointFlash).width + 28;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(viewWidth/2 - fw/2, courtYPix + 9, fw, 23);
    ctx.fillStyle = leftWon ? '#66ffcc' : '#ff66aa';
    ctx.fillText(localPointFlash, viewWidth/2, courtYPix + 26);
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
    ctx.font = 'bold 10px Courier New';
    var bw = ctx.measureText('BOSS ' + (final4Index+1) + '/4: ' + bname).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(viewWidth/2 - bw/2, 40, bw, 18);
    ctx.fillStyle = boss.backTextColor || '#ff4400';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS ' + (final4Index+1) + '/4: ' + bname, viewWidth/2, 53);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  if (sx || sy) ctx.restore();
  updatesToPaint = 0;
}
function renderEndOfPoint() {
  renderGame();
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
