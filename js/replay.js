var replayBuffer = [];
var replayInterval = null;
var replayOnComplete = null;

function recordReplayFrame(msg) {
  if (replayBuffer.length >= 300) replayBuffer.shift();
  replayBuffer.push({
    bx:msg.ball.x, by:msg.ball.y, bvx:msg.ball.velocityX,
    lx:msg.slimeLeft.x, ly:msg.slimeLeft.y,
    rx:msg.slimeRight.x, ry:msg.slimeRight.y,
    sl:msg.scoreLeft, sr:msg.scoreRight
  });
}

function stopReplay() {
  if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
  stopDrop();
}

function confirmReplayExit() {
  var rc = document.getElementById('ReplayContinue');
  if (rc) { rc.className = ''; rc.style.display = 'none'; }
  var ro = document.getElementById('ReplayOverlay');
  if (ro) ro.className = '';
  stopReplay();
  document.removeEventListener('keydown', onReplayKey);
  if (replayOnComplete) { var cb = replayOnComplete; replayOnComplete = null; cb(); }
}
function onReplayKey(e) { if (e.key !== 'Escape') confirmReplayExit(); }

function playHighlights(winner, onComplete) {
  var clip = replayBuffer.slice(-250); // last 5 seconds at 50fps
  replayOnComplete = onComplete;
  if (clip.length < 20) { onComplete(); return; }

  canvas.style.display = 'block'; menuDiv.style.display = 'none'; hideBottomBar();
  var ro = document.getElementById('ReplayOverlay');
  if (ro) ro.className = 'active';

  playDrop(selectedDrop);

  var fi = 0, rpt = 0, slow = 2; // 2x slow motion — shows both players clearly
  var total = clip.length * slow;
  var lbH = Math.round(viewHeight * 0.13);

  replayInterval = setInterval(function() {
    if (fi >= clip.length) {
      clearInterval(replayInterval); replayInterval = null;
      var rc = document.getElementById('ReplayContinue');
      if (rc) rc.className = 'visible';
      document.addEventListener('keydown', onReplayKey);
      return;
    }
    var f = clip[fi];
    var progress = (fi * slow + rpt) / total;
    var zoom = 1 + progress * 0.8; // gentler zoom — keeps both players visible

    // Focus midpoint between both slimes so both are always in view
    var midSlimeX = ((f.lx + f.rx) / 2) * pixelsPerUnitX;
    var ballPX = f.bx * pixelsPerUnitX;
    var focX = midSlimeX * 0.55 + ballPX * 0.45; // weighted toward midpoint
    var focY = courtYPix - f.by * pixelsPerUnitY * 0.5 + viewHeight * 0.08;
    focX = Math.max(viewWidth/(2*zoom), Math.min(viewWidth - viewWidth/(2*zoom), focX));
    focY = Math.max(viewHeight/(2*zoom), Math.min(viewHeight - viewHeight/(2*zoom), focY));

    ball.x = f.bx; ball.y = f.by; ball.velocityX = f.bvx;
    slimeLeft.x  = f.lx; slimeLeft.y  = f.ly;
    slimeRight.x = f.rx; slimeRight.y = f.ry;
    slimeLeftScore = f.sl; slimeRightScore = f.sr;

    ctx.save();
    ctx.translate(viewWidth/2, viewHeight/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-focX, -focY);
    renderBackground();
    ball.render(); slimeLeft.render(); slimeRight.render();
    drawHat(slimeLeft, hatConfigs.left); drawHat(slimeRight, hatConfigs.right);
    ctx.restore();

    // vignette
    var vg = ctx.createRadialGradient(viewWidth/2, viewHeight/2, viewWidth*0.22, viewWidth/2, viewHeight/2, viewWidth*0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.65)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, viewWidth, viewHeight);

    // chromatic aberration flash on score
    if (progress > 0.96) {
      ctx.fillStyle = 'rgba(0,255,200,.04)'; ctx.fillRect(0,0,viewWidth,viewHeight);
      ctx.fillStyle = 'rgba(255,0,204,.04)'; ctx.fillRect(2,0,viewWidth,viewHeight);
    }

    // letterbox
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, viewWidth, lbH);
    ctx.fillRect(0, viewHeight - lbH, viewWidth, lbH);

    // text
    ctx.textAlign = 'center';
    // top bar label
    ctx.globalAlpha = Math.min(1, progress * 8);
    ctx.font = 'bold 9px Courier New'; ctx.fillStyle = 'rgba(0,255,200,.6)';
    ctx.fillText('// MATCH HIGHLIGHT //', viewWidth/2, lbH - 8);
    ctx.font = '8px Courier New'; ctx.fillStyle = 'rgba(0,255,200,.3)';
    ctx.fillText('SLOW MOTION  ' + Math.round(zoom*10)/10 + 'x ZOOM', viewWidth/2, lbH - 18);

    // winner reveal at 72% progress
    if (progress > 0.72) {
      var revAlpha = Math.min(1, (progress - 0.72) / 0.12);
      var wName = winner === 'left' ? playerNameLeft : playerNameRight;
      var wCol  = winner === 'left' ? '#66ffcc' : '#ff66aa';
      ctx.globalAlpha = revAlpha;
      ctx.shadowColor = wCol; ctx.shadowBlur = 30;
      ctx.font = 'bold 28px Courier New'; ctx.fillStyle = '#fff';
      ctx.fillText(wName, viewWidth/2, viewHeight/2 - 10);
      ctx.font = 'bold 11px Courier New'; ctx.fillStyle = wCol; ctx.shadowBlur = 12;
      ctx.fillText('V I C T O R Y', viewWidth/2, viewHeight/2 + 16);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';

    rpt++;
    if (rpt >= slow) { rpt = 0; fi++; }
  }, 20);
}

// ── customization ─────────────────────────────────────────
