function drawFinal4RecessedWindows(cx, x, yy, w, h, sc, count, glow) {
  for (var i = 0; i < count; i++) {
    var wx = x + w * (i + 1) / (count + 1);
    var ww = Math.max(5 * sc, w / (count + 3) * 0.42);
    var wh = h * 0.34;
    var wy = yy + h * 0.36;
    cx.fillStyle = 'rgba(0,0,0,.42)';
    cx.fillRect(wx - ww / 2 - 2 * sc, wy - 2 * sc, ww + 4 * sc, wh + 4 * sc);
    cx.fillStyle = glow;
    cx.fillRect(wx - ww / 2, wy, ww, wh);
    cx.strokeStyle = 'rgba(255,255,255,.14)';
    cx.strokeRect(wx - ww / 2, wy, ww, wh);
  }
}

function drawFinal4Balconies(cx, bx, x, yy, w, h, sc, floorNum, t) {
  cx.save();
  if (floorNum === 1) {
    // Manor porch and side wings.
    cx.fillStyle = '#07050b';
    cx.strokeStyle = 'rgba(210,190,255,.25)';
    cx.fillRect(x - 20 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.strokeRect(x - 20 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.fillRect(x + w - 2 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.strokeRect(x + w - 2 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.fillStyle = 'rgba(0,0,0,.5)';
    cx.fillRect(x - 13 * sc, yy + h - 8 * sc, w + 26 * sc, 8 * sc);
    // Oversized estate balconies and pillars.
    [-1, 1].forEach(function(side) {
      var px = side < 0 ? x - 42 * sc : x + w + 42 * sc;
      cx.fillStyle = '#09060d';
      cx.fillRect(px - 13 * sc, yy + h * 0.40, 26 * sc, h * 0.48);
      cx.strokeStyle = 'rgba(210,190,255,.28)';
      cx.strokeRect(px - 13 * sc, yy + h * 0.40, 26 * sc, h * 0.48);
      for (var p = 0; p < 3; p++) {
        cx.fillStyle = '#17101d';
        cx.fillRect(px - 10 * sc + p * 8 * sc, yy + h * 0.44, 3 * sc, h * 0.38);
      }
      cx.fillStyle = '#050306';
      cx.beginPath();
      cx.moveTo(px - 18 * sc, yy + h * 0.40);
      cx.lineTo(px, yy + h * 0.24);
      cx.lineTo(px + 18 * sc, yy + h * 0.40);
      cx.closePath(); cx.fill(); cx.stroke();
    });
  } else if (floorNum === 2) {
    // Horned hell balconies.
    cx.fillStyle = '#190000';
    cx.strokeStyle = 'rgba(255,90,25,.50)';
    [-1, 1].forEach(function(side) {
      cx.beginPath();
      cx.moveTo(side < 0 ? x : x + w, yy + h * 0.52);
      cx.lineTo(side < 0 ? x - 30 * sc : x + w + 30 * sc, yy + h * 0.60);
      cx.lineTo(side < 0 ? x - 18 * sc : x + w + 18 * sc, yy + h * 0.78);
      cx.lineTo(side < 0 ? x : x + w, yy + h * 0.74);
      cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = 'rgba(255,85,15,.82)';
      cx.beginPath();
      cx.moveTo(side < 0 ? x - 16 * sc : x + w + 16 * sc, yy + h * 0.58);
      cx.lineTo(side < 0 ? x - 27 * sc : x + w + 27 * sc, yy + h * 0.40);
      cx.lineTo(side < 0 ? x - 8 * sc : x + w + 8 * sc, yy + h * 0.54);
      cx.closePath(); cx.fill();
      cx.fillStyle = '#190000';
    });
    // Burning side towers.
    [-1, 1].forEach(function(side) {
      var tx = side < 0 ? x - 50 * sc : x + w + 50 * sc;
      cx.fillStyle = '#120000';
      cx.strokeStyle = 'rgba(255,90,25,.46)';
      cx.fillRect(tx - 9 * sc, yy + h * 0.18, 18 * sc, h * 0.66);
      cx.strokeRect(tx - 9 * sc, yy + h * 0.18, 18 * sc, h * 0.66);
      cx.fillStyle = 'rgba(255,90,20,.82)';
      cx.beginPath();
      cx.moveTo(tx - 8 * sc, yy + h * 0.18);
      cx.quadraticCurveTo(tx, yy - (10 + Math.sin(t * 0.004) * 6) * sc, tx + 8 * sc, yy + h * 0.18);
      cx.closePath(); cx.fill();
    });
  } else if (floorNum === 3) {
    // Floating AI light outriggers.
    [-1, 1].forEach(function(side) {
      var ox = side < 0 ? x - 25 * sc : x + w + 25 * sc;
      var oy = yy + h * 0.45 + Math.sin(t * 0.002 + side) * 2 * sc;
      cx.strokeStyle = 'rgba(210,255,255,.42)';
      cx.beginPath(); cx.moveTo(side < 0 ? x + 3 * sc : x + w - 3 * sc, yy + h * 0.45); cx.lineTo(ox, oy); cx.stroke();
      cx.fillStyle = 'rgba(210,255,255,.82)';
      cx.beginPath(); cx.rect(ox - 7 * sc, oy - 7 * sc, 14 * sc, 14 * sc); cx.fill();
      cx.strokeStyle = 'rgba(80,255,255,.85)'; cx.strokeRect(ox - 7 * sc, oy - 7 * sc, 14 * sc, 14 * sc);
    });
    // Wide luminous ring deck.
    cx.strokeStyle = 'rgba(210,255,255,.45)';
    cx.lineWidth = Math.max(1, sc);
    cx.beginPath();
    cx.ellipse(bx, yy + h * 0.58, w * 0.82, h * 0.20, 0, 0, TWO_PI);
    cx.stroke();
    cx.strokeStyle = 'rgba(120,255,255,.24)';
    cx.beginPath();
    cx.ellipse(bx, yy + h * 0.58, w * 1.03, h * 0.28, 0, 0, TWO_PI);
    cx.stroke();
  } else {
    // Small open roof deck around the projector.
    cx.fillStyle = 'rgba(5,4,12,.92)';
    cx.strokeStyle = 'rgba(140,255,245,.55)';
    cx.fillRect(x - 10 * sc, yy + h - 10 * sc, w + 20 * sc, 10 * sc);
    cx.strokeRect(x - 10 * sc, yy + h - 10 * sc, w + 20 * sc, 10 * sc);
    // Portal machinery arms reaching out from the roof.
    [-1, 1].forEach(function(side) {
      cx.strokeStyle = 'rgba(150,255,245,.52)';
      cx.lineWidth = Math.max(1, 2 * sc);
      cx.beginPath();
      cx.moveTo(bx + side * w * 0.24, yy + h - 10 * sc);
      cx.lineTo(bx + side * w * 0.72, yy + h * 0.36);
      cx.stroke();
      cx.fillStyle = 'rgba(160,255,245,.76)';
      cx.beginPath(); cx.arc(bx + side * w * 0.72, yy + h * 0.36, 5 * sc, 0, TWO_PI); cx.fill();
    });
  }
  cx.restore();
}

// ── Player (exterior) ─────────────────────────────────────────────────────
function drawSlimeversePlayer(p) {
  var z = p.z || 0, sc = svScaleAt(z);
  if (sc < 0.04) return; // sub-pixel at extreme depth — skip
  var sx = svSX(p.x || 0, z), sy = svSY(p.y || slimeverseWorld.floorY, z);
  if (sx < -100 || sx > viewWidth + 100 || sy < -150 || sy > viewHeight + 100) return;

  var r = 24 * sc * SV_PLAYER_SCALE, color = p.color || '#00ff00';
  ctx.save();
  ctx.globalAlpha = p.id === slimeverseSelfId ? 1 : 0.88;

  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, color);
    var imgSc = (r * 2) / tc.width;
    ctx.drawImage(tc, sx - r, sy - tc.height * imgSc * 0.72, tc.width * imgSc, tc.height * imgSc);
  } else {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx, sy, r, Math.PI, TWO_PI); ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx + r * 0.25, sy - r * 0.42, r * 0.18, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(sx + r * 0.30, sy - r * 0.42, r * 0.08, 0, TWO_PI); ctx.fill();
  drawHatAt(ctx, sx, sy - r + 1, r, { hat: p.hat || 'none', anim: p.hatAnim || 'none', drawing: p.hatDrawing || [] });

  var label = (p.name || 'Player') + '  L' + (p.level || 1);
  var fSz = Math.max(9, Math.round(12 * sc * SV_PLAYER_SCALE));
  ctx.font = 'bold ' + fSz + 'px Courier New';
  var tw = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(0,0,14,.52)';
  ctx.fillRect(sx - tw / 2, sy - r * 1.8 - fSz, tw, fSz + 4);
  ctx.fillStyle = p.id === slimeverseSelfId ? '#ffd966' : '#00ffcc';
  ctx.textAlign = 'center'; ctx.fillText(label, sx, sy - r * 1.8); ctx.textAlign = 'left';
  ctx.restore();
}

// ── Store enter prompt ────────────────────────────────────────────────────
function drawStoreEnterPrompt() {
  var cx = ctx, px = viewWidth / 2, py = viewHeight * SV_FLOOR_FRAC - 24;
  var msg = 'PRESS  E  TO  ENTER  SHOP';
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  cx.save(); cx.font = 'bold ' + Math.round(13 * s) + 'px Courier New';
  var tw = cx.measureText(msg).width + 24 * s;
  cx.fillStyle = 'rgba(0,0,20,.72)'; cx.strokeStyle = 'rgba(180,100,255,.65)'; cx.lineWidth = Math.max(1, s);
  cx.fillRect(px - tw / 2, py - 18 * s, tw, 24 * s); cx.strokeRect(px - tw / 2, py - 18 * s, tw, 24 * s);
  cx.fillStyle = '#cc88ff'; cx.textAlign = 'center'; cx.fillText(msg, px, py);
  cx.textAlign = 'left'; cx.restore();
}

function getSlimeversePlayerLevel() {
  if (currentAccount && currentAccount.progression && currentAccount.progression.level) {
    return currentAccount.progression.level || 1;
  }
  if (currentAccount && currentAccount.stats && window.SlimeProgression) {
    return window.SlimeProgression.getProgression(currentAccount.stats.xp || 0).level || 1;
  }
  return 1;
}
