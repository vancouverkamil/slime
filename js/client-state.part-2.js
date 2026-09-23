function updateSlime(s, lLimit, rLimit) {
  if (s.velocityX) {
    s.x = Math.min(Math.max(s.x + s.velocityX, lLimit), rLimit);
  }
  if (s.velocityY || s.y > 0) {
    s.velocityY -= 2; s.y += s.velocityY;
    if (s.y < 0) { s.y = 0; s.velocityY = 0; }
  }
}
var MAX_VELOCITY_X = 15, MAX_VELOCITY_Y = 22, FUDGE = 5;
function collisionBallSlime(s) {
  var dx = 2*(ball.x - s.x), dy = ball.y - s.y;
  var dist = Math.trunc(Math.sqrt(dx*dx + dy*dy));
  if (dy > 0 && dist < ball.radius + s.radius && dist > FUDGE) {
    ball.x = s.x + Math.trunc(Math.trunc((s.radius+ball.radius)/2)*dx/dist);
    ball.y = s.y + Math.trunc((s.radius+ball.radius)*dy/dist);
    var dot = Math.trunc((dx*(ball.velocityX-s.velocityX) + dy*(ball.velocityY-s.velocityY))/dist);
    if (dot <= 0) {
      ball.velocityX = Math.min(Math.max(ball.velocityX + Math.trunc(s.velocityX - 2*dx*dot/dist), -MAX_VELOCITY_X), MAX_VELOCITY_X);
      ball.velocityY = Math.min(Math.max(ball.velocityY + Math.trunc(s.velocityY - 2*dy*dot/dist), -MAX_VELOCITY_Y), MAX_VELOCITY_Y);
    }
    return true;
  }
  return false;
}
function updateBall() {
  ball.velocityY = Math.max(ball.velocityY - 1, -MAX_VELOCITY_Y);
  ball.x += ball.velocityX; ball.y += ball.velocityY;
  var hitLeft = collisionBallSlime(slimeLeft);
  var hitRight = collisionBallSlime(slimeRight);
  if (hitLeft || hitRight) {
    playSfx('hit');
    if (screenFxEnabled) {
      var hs = hitLeft ? slimeLeft : slimeRight;
      spawnParticles(hs.x, hs.y + 78, hitLeft ? '#66ffcc' : '#ff66aa', 6);
    }
  }
  var side = ball.x < 500 ? 'left' : 'right';
  if (localLastBallSide && localLastBallSide !== side) localRallyCount++;
  localLastBallSide = side;
  if (ball.x < 15)   { ball.x = 15;  ball.velocityX = -ball.velocityX; }
  else if (ball.x > 985) { ball.x = 985; ball.velocityX = -ball.velocityX; }
  if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
    if (ball.velocityY < 0 && ball.y > 130) { ball.velocityY *= -1; ball.y = 130; }
    else if (ball.x < 500) { ball.x = 480; ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX; }
    else                   { ball.x = 520; ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX; }
  }
  var _bars = MAP_BARRIERS_CLIENT[localMapId];
  if (_bars) for (var _bi = 0; _bi < _bars.length; _bi++) applyBarrierClient(_bars[_bi]);
  if (ball.y < 0) {
    leftWon = ball.x > 500; (leftWon ? slimeLeftScore++ : slimeRightScore++);
    localPointFlash = leftWon ? 'LEFT SCORES' : 'RIGHT SCORES';
    localPointFlashEnd = Date.now() + 700;
    localRallyCount = 0; localLastBallSide = null;
    playSfx('score');
    if (typeof sendTournamentScoreUpdate === 'function') sendTournamentScoreUpdate();
    endPoint(); return true;
  }
  return false;
}
function updateFrame() {
  if (onePlayer) {
    slimeAI.move(false);
    updateSlimeVelocitiesWithDoubleKeys(slimeLeft, KEY_A,KEY_LEFT, KEY_D,KEY_RIGHT, KEY_W,KEY_UP);
    updateSlimeVelocities(slimeRight, slimeAI.movement, slimeAI.jumpSet);
  } else {
    updateSlimeVelocitiesWithKeys(slimeLeft,  KEY_A,    KEY_D,     KEY_W);
    updateSlimeVelocitiesWithKeys(slimeRight, KEY_LEFT, KEY_RIGHT, KEY_UP);
  }
  updateSlime(slimeLeft, 50, 445); updateSlime(slimeRight, 555, 950);
  updateBall();
  if (typeof sendTournamentStateUpdate === 'function') sendTournamentStateUpdate();
}

// ── rendering ─────────────────────────────────────────────
// deterministic pseudo-random for stable window/texture patterns
