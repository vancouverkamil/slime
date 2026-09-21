function drawSVFireflies(cx, t, w, hY) {
  SV_FIREFLIES.forEach(function(f) {
    var fsc = svScaleAt(f.z);
    if (fsc < 0.10) return;
    // Organic Lissajous drift
    var wx  = f.x + Math.sin(t * 0.00048 * f.speed + f.phase) * 95
                  + Math.sin(t * 0.00079 * f.speed + f.phase * 2.1) * 38;
    var fsx = svSX(wx, f.z);
    if (fsx < -40 || fsx > w + 40) return;
    var gndY = svGroundY(f.z);
    var fsy  = gndY - (26 + Math.sin(t * 0.00062 * f.speed + f.phase * 3.1) * 15) * fsc;
    if (fsy < hY) return;
    // Pulsing brightness
    var pulse  = 0.5 + 0.5 * Math.sin(t * 0.00275 * f.speed + f.phase);
    var alpha  = Math.max(0.05, pulse);
    var dotR   = (1.6 + fsc * 1.8) * (0.55 + pulse * 0.45);
    var glowR  = dotR * 7;
    // Outer glow (radial gradient)
    var grd = cx.createRadialGradient(fsx, fsy, 0, fsx, fsy, glowR);
    grd.addColorStop(0,   'rgba(155,255,75,'  + (alpha * 0.62).toFixed(3) + ')');
    grd.addColorStop(0.38,'rgba(90,255,45,'   + (alpha * 0.24).toFixed(3) + ')');
    grd.addColorStop(1,   'rgba(30,200,20,0)');
    cx.fillStyle = grd; cx.fillRect(fsx - glowR, fsy - glowR, glowR * 2, glowR * 2);
    // Bright core
    cx.fillStyle = 'rgba(215,255,140,' + Math.min(1, alpha * 1.5).toFixed(3) + ')';
    cx.beginPath(); cx.arc(fsx, fsy, dotR, 0, TWO_PI); cx.fill();
  });
}

// ── Store building (exterior) ─────────────────────────────────────────────
function drawSVLanterns(cx, t, w) {
  SV_LANTERNS.forEach(function(lantern, i) {
    var sc = svScaleAt(lantern.z);
    var sx = svSX(lantern.x, lantern.z);
    var sy = svGroundY(lantern.z);
    if (sx < -60 || sx > w + 60 || sc < 0.08) return;
    var pulse = 0.72 + Math.sin(t * 0.002 + i) * 0.16;
    var glow = cx.createRadialGradient(sx, sy - 28 * sc, 0, sx, sy - 28 * sc, 48 * sc);
    glow.addColorStop(0, 'rgba(190,255,95,' + (0.34 * pulse).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(90,255,45,0)');
    cx.fillStyle = glow;
    cx.fillRect(sx - 48 * sc, sy - 76 * sc, 96 * sc, 96 * sc);
    cx.strokeStyle = 'rgba(20,28,24,.82)';
    cx.lineWidth = Math.max(1, 3 * sc);
    cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(sx, sy - 30 * sc); cx.stroke();
    cx.fillStyle = 'rgba(214,255,128,' + pulse.toFixed(3) + ')';
    cx.beginPath(); cx.arc(sx, sy - 31 * sc, Math.max(1.4, 3.6 * sc), 0, TWO_PI); cx.fill();
  });
}

function drawSVColiseum(cx, bx, by, sc, t) {
  if (bx < -760 || bx > viewWidth + 760 || sc < 0.08) return;
  var bw = 570 * sc, bh = 270 * sc;
  var screenW = 350 * sc, screenH = 160 * sc;
  cx.save();

  var plazaGlow = cx.createRadialGradient(bx, by, 12 * sc, bx, by, bw * 0.74);
  plazaGlow.addColorStop(0, 'rgba(0,255,200,.18)');
  plazaGlow.addColorStop(0.58, 'rgba(0,80,68,.12)');
  plazaGlow.addColorStop(1, 'rgba(0,40,24,0)');
  cx.fillStyle = plazaGlow;
  cx.beginPath(); cx.ellipse(bx, by + 3 * sc, bw * 0.76, 48 * sc, 0, 0, TWO_PI); cx.fill();

  cx.fillStyle = '#e7e2d6'; cx.strokeStyle = 'rgba(188,255,242,.84)'; cx.lineWidth = Math.max(1, 2 * sc);
  cx.beginPath();
  cx.moveTo(bx - bw * 0.58, by);
  cx.lineTo(bx - bw * 0.48, by - bh * 0.74);
  cx.lineTo(bx - bw * 0.28, by - bh);
  cx.lineTo(bx + bw * 0.28, by - bh);
  cx.lineTo(bx + bw * 0.48, by - bh * 0.74);
  cx.lineTo(bx + bw * 0.58, by);
  cx.closePath(); cx.fill(); cx.stroke();

  // Neo-Roman colonnade: pale stone columns with cyan-lit bases.
  for (var col = -5; col <= 5; col++) {
    var colX = bx + col * 47 * sc;
    var colY = by - 102 * sc;
    var colW = 18 * sc, colH = 112 * sc;
    cx.fillStyle = col % 2 ? '#f7f4ea' : '#ded9cb';
    cx.fillRect(colX - colW / 2, colY, colW, colH);
    cx.strokeStyle = 'rgba(255,255,255,.88)';
    cx.strokeRect(colX - colW / 2, colY, colW, colH);
    cx.fillStyle = '#c9c4b8';
    cx.fillRect(colX - colW * 0.72, colY - 7 * sc, colW * 1.44, 8 * sc);
    cx.fillRect(colX - colW * 0.84, by - 5 * sc, colW * 1.68, 7 * sc);
    cx.fillStyle = 'rgba(0,255,220,.28)';
    cx.fillRect(colX - colW * 0.84, by + 2 * sc, colW * 1.68, 3 * sc);
  }

  // Dark arch portals break up the white facade.
  for (var arch = -4; arch <= 4; arch++) {
    var archX = bx + arch * 52 * sc;
    cx.fillStyle = '#10222c';
    cx.beginPath();
    cx.arc(archX, by - 56 * sc, 14 * sc, Math.PI, TWO_PI);
    cx.lineTo(archX + 14 * sc, by - 8 * sc);
    cx.lineTo(archX - 14 * sc, by - 8 * sc);
    cx.closePath(); cx.fill();
  }

  for (var tier = 0; tier < 3; tier++) {
    var ty = by - (46 + tier * 34) * sc;
    var tw = (548 - tier * 66) * sc;
    cx.fillStyle = tier % 2 ? 'rgba(242,239,228,.96)' : 'rgba(207,204,194,.96)';
    cx.fillRect(bx - tw / 2, ty, tw, 20 * sc);
    cx.strokeStyle = 'rgba(100,255,230,' + (0.28 + tier * 0.08) + ')';
    cx.strokeRect(bx - tw / 2, ty, tw, 20 * sc);
  }

  // Flanking ticker screens make the arena visible from across the commons.
  [-1, 1].forEach(function(side) {
    var tickerW = 82 * sc, tickerH = 76 * sc;
    var tickerX = bx + side * 232 * sc - tickerW / 2;
    var tickerY = by - 177 * sc;
    cx.fillStyle = '#03131d'; cx.strokeStyle = 'rgba(122,255,220,.5)';
    cx.fillRect(tickerX, tickerY, tickerW, tickerH); cx.strokeRect(tickerX, tickerY, tickerW, tickerH);
    cx.fillStyle = 'rgba(0,255,200,.09)';
    cx.fillRect(tickerX + 5 * sc, tickerY + 5 * sc, tickerW - 10 * sc, tickerH - 10 * sc);
    cx.fillStyle = '#7affdf'; cx.textAlign = 'center';
    cx.font = 'bold ' + Math.max(6, Math.round(8 * sc)) + 'px Courier New';
    cx.fillText(side < 0 ? 'TOP 10' : 'LIVE XP', tickerX + tickerW / 2, tickerY + 18 * sc);
    cx.fillStyle = side < 0 ? '#ffdc72' : '#a8ffe6';
    cx.font = 'bold ' + Math.max(7, Math.round(11 * sc)) + 'px Courier New';
    cx.fillText(side < 0 ? '#1' : 'ONLINE', tickerX + tickerW / 2, tickerY + 42 * sc);
    cx.fillStyle = 'rgba(122,255,223,.52)';
    cx.font = Math.max(6, Math.round(7 * sc)) + 'px Courier New';
    cx.fillText('SCROLLING', tickerX + tickerW / 2, tickerY + 61 * sc);
  });

  drawSVRadioTower(cx, bx - bw * 0.72, by, sc, t, -1);
  drawSVRadioTower(cx, bx + bw * 0.72, by, sc, t, 1);

  var screenX = bx - screenW / 2, screenY = by - bh * 0.90;
  cx.fillStyle = '#020e18'; cx.strokeStyle = 'rgba(96,255,224,.68)';
  cx.fillRect(screenX, screenY, screenW, screenH); cx.strokeRect(screenX, screenY, screenW, screenH);
  drawSVChaseLights(cx, screenX, screenY, screenW, screenH, sc, t);
  cx.fillStyle = 'rgba(0,255,200,.06)';
  for (var scan = 0; scan < screenH; scan += Math.max(2, 5 * sc)) cx.fillRect(screenX, screenY + scan, screenW, Math.max(1, sc));
  cx.fillStyle = '#7affdf'; cx.textAlign = 'center';
  cx.font = 'bold ' + Math.max(7, Math.round(14 * sc)) + 'px Courier New';
  cx.fillText('SLIMEVERSE TOP 10', bx, screenY + 18 * sc);

  var rows = svLeaderboard.length ? svLeaderboard : [{ username: 'waiting-for-scores', stats: { xp: 0 } }];
  var shift = Math.floor(t / 1750) % rows.length;
  cx.textAlign = 'left';
  cx.font = 'bold ' + Math.max(6, Math.round(10 * sc)) + 'px Courier New';
  for (var r = 0; r < Math.min(10, rows.length); r++) {
    var player = rows[(r + shift) % rows.length];
    var rank = ((r + shift) % rows.length) + 1;
    var stats = player.stats || {};
    var ry = screenY + (34 + r * 9) * sc;
    cx.fillStyle = r === 0 ? '#ffdc72' : 'rgba(168,255,230,.82)';
    cx.fillText(rank + '. @' + String(player.username || 'guest').slice(0, 16), screenX + 12 * sc, ry);
    cx.textAlign = 'right';
    cx.fillText((stats.xp || 0) + ' XP', screenX + screenW - 10 * sc, ry);
    cx.textAlign = 'left';
  }
  cx.fillStyle = 'rgba(0,255,200,.64)'; cx.textAlign = 'center';
  cx.font = 'bold ' + Math.max(6, Math.round(9 * sc)) + 'px Courier New';
  cx.fillText('// MOONLIGHT COLISEUM //', bx, by - 8 * sc);
  cx.restore();
}
