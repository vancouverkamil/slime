// Game: the Finisher Cam (end-of-match replay).
// Records the last 15 seconds of an online match, then replays it: full speed
// with a camera that follows the ball while the music builds, then slow motion
// for the final point exactly when the drop hits, with anime speed lines, a
// wavy screen shake on the bass, a manga impact frame on the winning hit and
// a victory card. Effects follow the Screen Shake / Screen Effects settings.
var replayBuffer = [];
var replayInterval = null;   // non-null while a replay is running (online code checks it)
var replayOnComplete = null;
var FINISHER_CLIP_MS = 15000;
var FINISHER_SLOW_MS = 2000;  // the last 2 s of the clip play in slow motion
var FINISHER_SLOW = 0.35;     // slow-motion speed
var FINISHER_CARD_S = 3.2;    // victory card after the clip

function recordReplayFrame(msg) {
  var last = replayBuffer[replayBuffer.length - 1];
  var t = typeof msg.t === 'number' ? msg.t : (last ? last.t + 20 : 0);
  if (last && t <= last.t) return;   // repeated snapshot (e.g. a point restart on the same tick)
  replayBuffer.push({
    t: t, rd: msg.round || 0,
    bx: msg.ball.x, by: msg.ball.y, bvx: msg.ball.velocityX,
    lx: msg.slimeLeft.x, ly: msg.slimeLeft.y,
    rx: msg.slimeRight.x, ry: msg.slimeRight.y,
    sl: msg.scoreLeft, sr: msg.scoreRight,
  });
  while (replayBuffer.length > 2 && replayBuffer[0].t < t - FINISHER_CLIP_MS - 1000) replayBuffer.shift();
  if (replayBuffer.length > 1200) replayBuffer.shift();
}

function stopReplay() {
  if (replayInterval) { cancelAnimationFrame(replayInterval); replayInterval = null; }
  stopDrop();
  if (typeof stopAnnouncer === 'function') stopAnnouncer();
}

function hideReplayOverlay() {
  var rc = document.getElementById('ReplayContinue');
  if (rc) { rc.className = ''; rc.style.display = ''; }
  var ro = document.getElementById('ReplayOverlay');
  if (ro) ro.className = '';
}

// Continue from the replay. Only the replay that still owns the screen can
// continue: if something else took over (e.g. the next tournament game started),
// the old replay's overlay, key handler and callback are already gone.
function confirmReplayExit() {
  if (currentScreenOwner() !== 'replay') return;
  var cb = replayOnComplete;
  replayOnComplete = null;
  releaseScreen('replay');
  if (cb) cb();
}

// The clip on a playback timeline (ms): pauses between points shrink to a
// quick cut, and the ball's bounces off a slime are marked as hits.
function buildFinisherClip() {
  var lastT = replayBuffer.length ? replayBuffer[replayBuffer.length - 1].t : 0;
  var src = replayBuffer.filter(function(f) { return f.t >= lastT - FINISHER_CLIP_MS; });
  var clip = [], ct = 0;
  src.forEach(function(f, i) {
    if (i) ct += Math.min(f.t - src[i - 1].t, 220);
    clip.push(Object.assign({ ct: ct, hit: false }, f));
  });
  for (var i = 2; i < clip.length; i++) {
    var a = clip[i - 2], b = clip[i - 1], c = clip[i];
    var falling = b.by - a.by <= 0, rising = c.by - b.by > 0;
    var near = Math.min(Math.hypot(b.bx - b.lx, b.by - b.ly), Math.hypot(b.bx - b.rx, b.by - b.ry)) < 170;
    if (falling && rising && near && b.rd === c.rd) b.hit = true;
  }
  return clip;
}

function finisherFrameAt(clip, ct) {
  var i = 0;
  while (i < clip.length - 2 && clip[i + 1].ct <= ct) i++;
  var a = clip[i], b = clip[Math.min(i + 1, clip.length - 1)];
  if (a === b || a.rd !== b.rd || b.ct === a.ct) return { f: a, i: i };
  var k = Math.max(0, Math.min(1, (ct - a.ct) / (b.ct - a.ct)));
  function l(p) { return a[p] + (b[p] - a[p]) * k; }
  return { f: { bx: l('bx'), by: l('by'), bvx: b.bvx, lx: l('lx'), ly: l('ly'), rx: l('rx'), ry: l('ry'), sl: a.sl, sr: a.sr }, i: i };
}

function playHighlights(winner, onComplete) {
  var scene = claimScreen('replay');
  scene.onExit(function() { stopReplay(); hideReplayOverlay(); replayOnComplete = null; });
  replayOnComplete = onComplete;
  var clip = buildFinisherClip();
  if (clip.length < 20) { confirmReplayExit(); return; }

  canvas.style.display = 'block'; menuDiv.style.display = 'none'; hideBottomBar();
  var ro = document.getElementById('ReplayOverlay');
  if (ro) ro.className = 'active';

  var clipEnd = clip[clip.length - 1].ct;
  var slowFrom = Math.max(0, clipEnd - FINISHER_SLOW_MS);
  var buildS = slowFrom / 1000, slowS = (clipEnd - slowFrom) / 1000 / FINISHER_SLOW;
  var lastHit = -1;
  clip.forEach(function(f, i) { if (f.hit && f.ct <= clipEnd) lastHit = i; });

  // The music's own clock drives the replay, so slow motion starts on the drop.
  var music = victoryTrack >= 0 ? playMusicTrack(victoryTrack, Math.max(0.6, buildS), slowS + FINISHER_CARD_S) : null;
  var t0 = music ? music.start : null, wall0 = performance.now();
  var slowAt = music ? music.dropAt - music.start : buildS;   // seconds after start
  function clock() { return music ? initAC().currentTime - t0 : (performance.now() - wall0) / 1000; }

  var buf = document.createElement('canvas');
  var shakeOn = typeof screenShakeEnabled === 'undefined' || screenShakeEnabled;
  var fxOn = typeof screenFxEnabled === 'undefined' || screenFxEnabled;
  var cam = { x: viewWidth / 2, y: viewHeight / 2, zoom: 1.1 }, punch = 0, lastIdx = -1, impactUntil = -1, done = false;
  var wName = winner === 'left' ? playerNameLeft : playerNameRight;
  var lastF = clip[clip.length - 1];
  var perfect = Math.min(lastF.sl, lastF.sr) === 0;
  var calledFinisher = false, calledWinner = false;   // the announcer speaks once at each moment
  var wCol = winner === 'left' ? '#66ffcc' : '#ff66aa';

  function finish() {
    if (done) return;
    done = true;
    var rc = document.getElementById('ReplayContinue');
    if (rc) rc.className = 'visible';
    scene.listen(document, 'keydown', function(e) { if (e.key !== 'Escape') confirmReplayExit(); });
  }
  // Any key during the replay skips to the victory card.
  var skipped = false;
  scene.listen(document, 'keydown', function(e) {
    if (done || skipped || e.key === 'Escape') return;
    skipped = true; slowAt = clock() - slowS; e.preventDefault();
  });

  function frame() {
    replayInterval = null;
    if (!scene.isCurrent()) return;
    replayInterval = requestAnimationFrame(frame);
    var t = clock();
    var slow = t >= slowAt;
    var ct = slow ? slowFrom + (t - slowAt) * 1000 * FINISHER_SLOW : Math.min(slowFrom, (t / Math.max(0.001, slowAt)) * slowFrom);
    var cardK = slow ? (t - slowAt - slowS) / FINISHER_CARD_S : -1;
    var at = finisherFrameAt(clip, Math.min(ct, clipEnd));
    var f = at.f;
    for (var i = lastIdx + 1; i <= at.i; i++) {
      if (clip[i].hit) punch = 1;
      if (i === lastHit && slow && fxOn && impactUntil < 0) impactUntil = t + 0.14;
    }
    lastIdx = at.i;
    punch *= 0.9;

    // Camera: follow the ball (and the slimes), tighter in slow motion.
    var tx = (f.bx * 0.6 + (f.lx + f.rx) / 2 * 0.4) * pixelsPerUnitX;
    var ty = courtYPix - f.by * pixelsPerUnitY * 0.6;
    var tz = (slow ? 1.8 : 1.15) + punch * 0.2;
    cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; cam.zoom += (tz - cam.zoom) * 0.08;
    var z = cam.zoom;
    var fx = Math.max(viewWidth / (2 * z), Math.min(viewWidth - viewWidth / (2 * z), cam.x));
    var fy = Math.max(viewHeight / (2 * z), Math.min(viewHeight - viewHeight / (2 * z), cam.y));

    ball.x = f.bx; ball.y = f.by; ball.velocityX = f.bvx;
    slimeLeft.x = f.lx; slimeLeft.y = f.ly; slimeRight.x = f.rx; slimeRight.y = f.ry;
    slimeLeftScore = f.sl; slimeRightScore = f.sr;

    // Render the court into a buffer (the global ctx is pointed at it for the draw).
    if (buf.width !== canvas.width || buf.height !== canvas.height) { buf.width = canvas.width; buf.height = canvas.height; }
    var screenCtx = ctx, g = buf.getContext('2d');
    ctx = g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.save(); g.translate(viewWidth / 2, viewHeight / 2); g.scale(z, z); g.translate(-fx, -fy);
    renderBackground(); ball.render(); slimeLeft.render(); slimeRight.render();
    drawHat(slimeLeft, hatConfigs.left); drawHat(slimeRight, hatConfigs.right);
    g.restore();
    ctx = screenCtx;

    var pulse = musicPulse();
    var bx = (f.bx * pixelsPerUnitX - fx) * z + viewWidth / 2;
    var by = (courtYPix - f.by * pixelsPerUnitY - fy) * z + viewHeight / 2;
    ctx.save();
    if (shakeOn && slow && cardK < 0) ctx.translate((Math.sin(t * 37) * 3 + Math.sin(t * 23) * 2) * pulse, Math.cos(t * 31) * 3 * pulse);
    if (impactUntil > 0 && t < impactUntil) fxImpactFrame(ctx, buf, viewWidth, viewHeight, bx, by, 7);
    else fxWave(ctx, buf, viewWidth, viewHeight, shakeOn ? (slow ? 3 + pulse * 9 : pulse * 3 + punch * 4) : 0, t * 3.2);
    ctx.restore();
    if (fxOn) fxSpeedLines(ctx, viewWidth, viewHeight, bx, by, slow ? 0.55 + pulse * 0.4 : punch * 0.6, Math.floor(t * 12));

    var vg = ctx.createRadialGradient(viewWidth / 2, viewHeight / 2, viewWidth * 0.25, viewWidth / 2, viewHeight / 2, viewWidth * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, viewWidth, viewHeight);
    var bar = fxLetterbox(ctx, viewWidth, viewHeight, Math.min(1, t * 2));
    ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.max(10, Math.round(bar * 0.22)) + 'px Courier New';
    ctx.fillStyle = 'rgba(0,255,200,.75)';
    ctx.fillText(slow ? '// FINISHER CAM // SLOW MOTION' : '// FINISHER CAM // LAST 15 SECONDS', viewWidth / 2, bar - bar * 0.3);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillText(done ? '' : 'ANY KEY TO SKIP', viewWidth / 2, viewHeight - bar * 0.35);
    ctx.textAlign = 'left';
    if (slow) fxTitleCard(ctx, viewWidth, viewHeight, (t - slowAt) / Math.min(2.4, slowS));
    if (slow && !calledFinisher && !skipped) { calledFinisher = true; announceFinisher(); }
    if (cardK >= 0.05 && !calledWinner) { calledWinner = true; announceWinner(wName, perfect); }
    if (cardK >= 0) fxVictoryCard(ctx, viewWidth, viewHeight, cardK, wName, wCol);
    if (cardK >= 0.6) finish();
  }
  replayInterval = requestAnimationFrame(frame);
}
