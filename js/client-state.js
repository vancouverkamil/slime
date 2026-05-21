var physicsLog = 0;
var TWO_PI = Math.PI * 2;
var WIN_AMOUNT = 7;

function newLegacyBall(radius, color) {
  return {
    radius:radius, color:color, x:0, y:0, velocityX:0, velocityY:0, rotation:0,
    render: function() {
      var xPix = this.x * pixelsPerUnitX;
      var yPix = courtYPix - (this.y * pixelsPerUnitY);
      var rPix = this.radius * pixelsPerUnitY + 2;
      if (ballImage && !legacyGraphics) {
        this.rotation = (this.rotation + this.velocityX / 100) % TWO_PI;
        ctx.translate(xPix, yPix); ctx.rotate(this.rotation);
        var ballArtScale = Math.max(1, Math.min(2.75, (viewHeight || 375) / 375));
        var bw = ballImage.width * ballArtScale;
        var bh = ballImage.height * ballArtScale;
        ctx.drawImage(ballImage, -bw / 2, -bh / 2, bw, bh);
        ctx.setTransform(1,0,0,1,0,0);
      } else {
        ctx.fillStyle = legacyBallColor;
        ctx.beginPath(); ctx.arc(xPix, yPix, rPix, 0, TWO_PI); ctx.fill();
      }
    }
  };
}

function newLegacySlime(onLeft, radius, color) {
  return {
    onLeft:onLeft, radius:radius, color:color, img:null, x:0, y:0, velocityX:0, velocityY:0,
    render: function() {
      var xPix = this.x * pixelsPerUnitX;
      var yPix = courtYPix - (this.y * pixelsPerUnitY);
      var rPix = this.radius * pixelsPerUnitY;
      if (this.img && !legacyGraphics) {
        var drawSrc = this.tintColor ? getTintedCanvas(this.img, this.tintColor) : this.img;
        var artScale = (rPix * 2) / drawSrc.width;
        var dw = drawSrc.width * artScale;
        var dh = drawSrc.height * artScale;
        ctx.drawImage(drawSrc, xPix - dw / 2, yPix - dh, dw, dh);
      } else {
        ctx.fillStyle = this.tintColor || this.color;
        ctx.beginPath(); ctx.arc(xPix, yPix, rPix, Math.PI, TWO_PI); ctx.fill();
      }
      var eyeX = this.x + (this.onLeft ? 1 : -1) * this.radius / 4;
      var eyeY = this.y + this.radius / 2;
      ctx.translate(eyeX * pixelsPerUnitX, courtYPix - eyeY * pixelsPerUnitY);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, rPix/4, 0, TWO_PI); ctx.fill();
      var dx = ball.x - eyeX, dy = eyeY - ball.y;
      var dist = Math.sqrt(dx*dx + dy*dy) || 1;
      var r8 = rPix / 8;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(r8*dx/dist, r8*dy/dist, r8, 0, TWO_PI); ctx.fill();
      ctx.setTransform(1,0,0,1,0,0);
    }
  };
}

var GAME_STATE_RUNNING = 1, GAME_STATE_POINT_PAUSE = 2,
    GAME_STATE_MENU_PAUSE = 3, GAME_STATE_MENU_PAUSE_BETWEEN_POINTS = 4,
    GAME_STATE_SHOW_WINNER = 5;

var menuDiv, smallMenuDiv, onePlayer, nextSlimeIndex, gameState;
var ctx, canvas, viewWidth, viewHeight, courtYPix, pixelsPerUnitX, pixelsPerUnitY;
var updatesToPaint, legacySkyColor, legacyGroundColor, legacyBallColor, newGroundColor;
var backImage, backTextColor, backImages = {}, ballImage, gameIntervalObject, endOfPointText;
var greenSlimeImage, redSlimeImage, legacyGraphics;
var gameWidth, gameHeight, ball, slimeLeft, slimeRight, slimeLeftScore, slimeRightScore;
var slimeAI, updateCount, leftWon, slowMotion, logString;
var final4Mode = false, final4Index = 0, final4WinPending = false;
var localMapId = null;
var gameScale = (typeof localStorage !== 'undefined' && localStorage.getItem('slime_scale')) || 'compact';
var gameSfxEnabled = (typeof localStorage === 'undefined' || localStorage.getItem('slime_sfx') !== 'off');
var screenFxEnabled = (typeof localStorage === 'undefined' || localStorage.getItem('slime_screenFx') !== 'off');
var localRallyCount = 0, localLastBallSide = null, localPointFlash = null, localPointFlashEnd = 0;

// ── barrier physics (client-side, local modes only) ───────
var MAP_BARRIERS_CLIENT = {
  11: [{x1:160, y1:214, x2:840, y2:232}],
  12: [{x1:50,  y1:196, x2:400, y2:214}, {x1:600, y1:196, x2:950, y2:214}],
  13: [{x1:150, y1:208, x2:850, y2:226}, {x1:488, y1:226, x2:512, y2:344}],
  14: [{x1:80,  y1:244, x2:370, y2:262}, {x1:630, y1:244, x2:920, y2:262}, {x1:388, y1:162, x2:612, y2:180}],
};
var totalWins = 0;
try { totalWins = parseInt(localStorage.getItem('slime_totalWins') || '0') || 0; } catch(e) {}
function recordWin() {
  totalWins++;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
}
function getPlayerRank() {
  if (totalWins >= 10) return 'LIEUTENANT';
  if (totalWins >= 6)  return 'SERGEANT';
  if (totalWins >= 3)  return 'CORPORAL';
  return 'PRIVATE';
}
function applyBarrierClient(b) {
  var r = ball.radius;
  if (ball.x + r <= b.x1 || ball.x - r >= b.x2) return;
  if (ball.y + r <= b.y1 || ball.y - r >= b.y2) return;
  if (b.x2 - b.x1 >= b.y2 - b.y1) {
    if (ball.velocityY > 0) { ball.velocityY = -ball.velocityY; ball.y = b.y1 - r; }
    else                    { ball.velocityY = -ball.velocityY; ball.y = b.y2 + r; }
  } else {
    if (ball.velocityX > 0) { ball.velocityX = -ball.velocityX; ball.x = b.x1 - r; }
    else                    { ball.velocityX = -ball.velocityX; ball.x = b.x2 + r; }
  }
}
function showLockedNotice(need) {
  addChatMessage(null, 'Classified court — earn ' + need + ' more win' + (need !== 1 ? 's' : '') + ' to reach Lieutenant rank.');
}

function log(msg) { logString += msg + '\n'; }

// ── local game physics ────────────────────────────────────
function updateSlimeVelocities(s, movement, jump) {
  s.velocityX = movement === 1 ? -8 : movement === 2 ? 8 : 0;
  if (jump && s.y === 0) s.velocityY = 31;
}
function updateSlimeVelocitiesWithKeys(s, left, right, up) {
  if (keysDown[left])       s.velocityX = keysDown[right] ? 0 : -8;
  else if (keysDown[right]) s.velocityX = 8;
  else                      s.velocityX = 0;
  if (s.y === 0 && keysDown[up]) s.velocityY = 31;
}
function updateSlimeVelocitiesWithDoubleKeys(s, l1, l2, r1, r2, u1, u2) {
  if (keysDown[l1] || keysDown[l2])       s.velocityX = (keysDown[r1] || keysDown[r2]) ? 0 : -8;
  else if (keysDown[r1] || keysDown[r2])  s.velocityX = 8;
  else                                     s.velocityX = 0;
  if (s.y === 0 && (keysDown[u1] || keysDown[u2])) s.velocityY = 31;
}
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
    if (screenFxEnabled) {
      shakeFrames = 8; shakeAmt = 4;
      spawnParticles(leftWon ? slimeLeft.x : slimeRight.x, 90, leftWon ? '#66ffcc' : '#ff66aa', 12);
    }
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
}

// ── rendering ─────────────────────────────────────────────
// deterministic pseudo-random for stable window/texture patterns
