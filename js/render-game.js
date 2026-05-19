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
function renderGame() {
  if (updatesToPaint === 0) return;
  renderBackground(); ball.render(); slimeLeft.render(); slimeRight.render();
  drawHat(slimeLeft, { hat: playerHat, drawing: playerHatDrawing });
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
