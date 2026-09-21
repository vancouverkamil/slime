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

function drawSlimeTrail(trailCtx, trail, type, color, rPix) {
  if (!trail || trail.length < 2) return;
  trailCtx.save();
  if (type === 'comet' || type === 'neon') {
    var glow = type === 'neon' ? 14 : 6;
    trailCtx.shadowColor = color; trailCtx.shadowBlur = glow;
    for (var i = 1; i < trail.length; i++) {
      var a = (1 - i / trail.length) * (type === 'neon' ? 0.7 : 0.5);
      var w = (1 - i / trail.length) * rPix * (type === 'neon' ? 0.22 : 0.38);
      trailCtx.globalAlpha = a; trailCtx.strokeStyle = color; trailCtx.lineWidth = Math.max(1, w);
      trailCtx.beginPath(); trailCtx.moveTo(trail[i-1].x, trail[i-1].y); trailCtx.lineTo(trail[i].x, trail[i].y); trailCtx.stroke();
    }
  } else if (type === 'sparkle') {
    trailCtx.shadowColor = color; trailCtx.shadowBlur = 7; trailCtx.fillStyle = color;
    for (var i = 0; i < trail.length; i++) {
      var a = (1 - i / trail.length) * 0.7;
      var r = (1 - i / trail.length) * rPix * 0.16;
      var ox = Math.sin(i * 1.7 + trail[i].x * 0.08) * rPix * 0.45;
      var oy = Math.cos(i * 2.3 + trail[i].y * 0.08) * rPix * 0.35;
      trailCtx.globalAlpha = a;
      trailCtx.beginPath(); trailCtx.arc(trail[i].x + ox, trail[i].y + oy, Math.max(1, r), 0, TWO_PI); trailCtx.fill();
    }
  } else if (type === 'pulse') {
    trailCtx.shadowColor = color; trailCtx.shadowBlur = 10; trailCtx.strokeStyle = color; trailCtx.lineWidth = 1.5;
    for (var i = 0; i < trail.length; i += 4) {
      var a = (1 - i / trail.length) * 0.55;
      var r = (i / trail.length) * rPix * 0.7 + rPix * 0.12;
      trailCtx.globalAlpha = a;
      trailCtx.beginPath(); trailCtx.arc(trail[i].x, trail[i].y, r, Math.PI, TWO_PI); trailCtx.stroke();
    }
  }
  trailCtx.globalAlpha = 1; trailCtx.shadowBlur = 0; trailCtx.restore();
}

function newLegacySlime(onLeft, radius, color) {
  return {
    onLeft:onLeft, radius:radius, color:color, img:null, x:0, y:0, velocityX:0, velocityY:0,
    _trail: [], _trailType: 'none',
    render: function() {
      var xPix = this.x * pixelsPerUnitX;
      var yPix = courtYPix - (this.y * pixelsPerUnitY);
      var rPix = this.radius * pixelsPerUnitY;
      // Trail: push position, draw before body
      this._trail.unshift({ x: xPix, y: yPix });
      if (this._trail.length > 18) this._trail.pop();
      if (this._trailType && this._trailType !== 'none')
        drawSlimeTrail(ctx, this._trail, this._trailType, this.tintColor || this.color, rPix);
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
      if (this.onLeft) drawBodyOverlay(ctx, xPix, yPix, rPix, playerBodyOverlay);
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
