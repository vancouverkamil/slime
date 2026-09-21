function drawFinal4MysticGround(cx, w, h, hY, floorFY, vp, camX, t) {
  var sx = svSX(SV_FINAL4_X, SV_FINAL4_Z);
  var sy = svGroundY(SV_FINAL4_Z);
  var sc = svScaleAt(SV_FINAL4_Z) * SV_LANDMARK_SCALE;
  if (sx < -640 || sx > w + 640) return;

  cx.save();

  // Grass gives way to a black-rock island around the tower.
  var islandW = 420 * sc, islandH = 68 * sc;
  var rg = cx.createRadialGradient(sx, sy - 8 * sc, 10 * sc, sx, sy, islandW * 0.62);
  rg.addColorStop(0, 'rgba(90,70,130,.62)');
  rg.addColorStop(0.42, 'rgba(28,24,42,.92)');
  rg.addColorStop(0.72, 'rgba(12,12,18,.96)');
  rg.addColorStop(1, 'rgba(10,30,16,0)');
  cx.fillStyle = rg;
  cx.beginPath(); cx.ellipse(sx, sy + 3 * sc, islandW * 0.62, islandH, 0, 0, TWO_PI); cx.fill();

  // Shining pathway from the mystical stones toward the camera.
  var nearY = floorFY + (h - floorFY) * 0.68;
  var pathTopW = 42 * sc, pathBotW = 210;
  var pg = cx.createLinearGradient(sx, sy, sx, nearY);
  pg.addColorStop(0, 'rgba(180,125,255,.62)');
  pg.addColorStop(0.48, 'rgba(82,255,222,.26)');
  pg.addColorStop(1, 'rgba(180,125,255,.04)');
  cx.fillStyle = pg;
  cx.beginPath();
  cx.moveTo(sx - pathTopW, sy + 2 * sc);
  cx.lineTo(sx + pathTopW, sy + 2 * sc);
  cx.lineTo(vp + pathBotW * 0.5, nearY);
  cx.lineTo(vp - pathBotW * 0.5, nearY);
  cx.closePath(); cx.fill();

  cx.strokeStyle = 'rgba(190,255,235,.32)';
  cx.lineWidth = 1.2;
  cx.beginPath(); cx.moveTo(sx - pathTopW, sy + 2 * sc); cx.lineTo(vp - pathBotW * 0.5, nearY); cx.stroke();
  cx.beginPath(); cx.moveTo(sx + pathTopW, sy + 2 * sc); cx.lineTo(vp + pathBotW * 0.5, nearY); cx.stroke();

  // Floating rune stones along the path.
  for (var i = 0; i < 14; i++) {
    var p = i / 13;
    var wob = Math.sin(t * 0.0014 + i * 1.7) * 3;
    var px = sx + (vp - sx) * p + (i % 2 ? -1 : 1) * (28 + p * 80) + Math.sin(i * 2.3) * 9;
    var py = sy + (nearY - sy) * p + wob;
    var rr = (5 + (i % 4) * 2) * (0.85 - p * 0.32);
    cx.fillStyle = i % 3 === 0 ? 'rgba(82,255,222,.72)' : 'rgba(182,126,255,.66)';
    cx.beginPath();
    cx.moveTo(px, py - rr);
    cx.lineTo(px + rr * 0.82, py);
    cx.lineTo(px, py + rr);
    cx.lineTo(px - rr * 0.82, py);
    cx.closePath(); cx.fill();
    cx.shadowColor = 'rgba(130,255,230,.45)'; cx.shadowBlur = 10;
    cx.strokeStyle = 'rgba(230,255,245,.3)'; cx.stroke();
    cx.shadowBlur = 0;
  }

  cx.restore();
}

function drawFinal4Tower(bx, by, sc, t) {
  var cx = ctx;
  var bw = 138 * sc;
  var floorH = 78 * sc;
  var floors = 4;
  var baseH = floorH * floors;
  var topY = by - baseH - 10 * sc;

  cx.save();

  // Shadow and energy plume.
  cx.fillStyle = 'rgba(0,0,0,.38)';
  cx.beginPath(); cx.ellipse(bx, by + 6 * sc, bw * 0.72, 11 * sc, 0, 0, TWO_PI); cx.fill();
  var aura = cx.createRadialGradient(bx, by - baseH * 0.55, 8 * sc, bx, by - baseH * 0.55, 185 * sc);
  aura.addColorStop(0, 'rgba(160,90,255,.20)');
  aura.addColorStop(0.55, 'rgba(60,255,230,.08)');
  aura.addColorStop(1, 'rgba(60,255,230,0)');
  cx.fillStyle = aura;
  cx.fillRect(bx - 205 * sc, topY - 130 * sc, 410 * sc, baseH + 175 * sc);

  // Galaxy projection cast into the sky from the top platform.
  drawFinal4SkyProjection(cx, bx, topY, sc, t);
  drawFinal4OuterFrame(cx, bx, by, bw, floorH, sc, t);

  // Stepped pyramid shell backing.
  var shell = cx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
  shell.addColorStop(0, '#08070d');
  shell.addColorStop(0.35, '#1b1428');
  shell.addColorStop(0.65, '#07070d');
  shell.addColorStop(1, '#241433');
  cx.fillStyle = shell;
  cx.strokeStyle = 'rgba(190,130,255,.55)';
  cx.lineWidth = Math.max(1, 1.7 * sc);
  cx.beginPath();
  cx.moveTo(bx - bw * 0.56, by);
  cx.lineTo(bx - bw * 0.49, by - floorH);
  cx.lineTo(bx - bw * 0.42, by - floorH * 2);
  cx.lineTo(bx - bw * 0.34, by - floorH * 3);
  cx.lineTo(bx - bw * 0.25, by - floorH * 4);
  cx.lineTo(bx + bw * 0.25, by - floorH * 4);
  cx.lineTo(bx + bw * 0.34, by - floorH * 3);
  cx.lineTo(bx + bw * 0.42, by - floorH * 2);
  cx.lineTo(bx + bw * 0.49, by - floorH);
  cx.lineTo(bx + bw * 0.56, by);
  cx.closePath(); cx.fill(); cx.stroke();

  for (var i = 0; i < floors; i++) {
    var y = by - floorH * (i + 1);
    drawFinal4Floor(cx, bx, y, bw, floorH, sc, i + 1, t, topY);
  }

  // Vertical ribs.
  cx.strokeStyle = 'rgba(230,210,255,.22)';
  cx.lineWidth = Math.max(1, sc);
  [-0.36, -0.16, 0.16, 0.36].forEach(function(k) {
    cx.beginPath();
    cx.moveTo(bx + bw * k * 0.68, by - baseH + 4 * sc);
    cx.lineTo(bx + bw * k, by - 6 * sc);
    cx.stroke();
  });

  // Door / gate.
  var doorW = 42 * sc, doorH = 48 * sc;
  var dg = cx.createLinearGradient(0, by - doorH, 0, by);
  dg.addColorStop(0, '#0b0712');
  dg.addColorStop(0.58, '#1b0f2d');
  dg.addColorStop(1, '#030204');
  cx.fillStyle = dg;
  cx.strokeStyle = 'rgba(210,155,255,.8)';
  cx.fillRect(bx - doorW / 2, by - doorH, doorW, doorH);
  cx.strokeRect(bx - doorW / 2, by - doorH, doorW, doorH);
  cx.fillStyle = 'rgba(255,220,120,.82)';
  cx.beginPath(); cx.arc(bx + doorW * 0.28, by - doorH * 0.45, 2.2 * sc, 0, TWO_PI); cx.fill();

  // Sign.
  var signW = bw * 0.76, signH = 16 * sc;
  cx.fillStyle = '#050409';
  cx.strokeStyle = 'rgba(255,80,35,.72)';
  cx.fillRect(bx - signW / 2, by - baseH - 2 * sc, signW, signH);
  cx.strokeRect(bx - signW / 2, by - baseH - 2 * sc, signW, signH);
  cx.fillStyle = '#ff5b2d';
  cx.textAlign = 'center';
  cx.font = 'bold ' + Math.max(7, Math.round(10 * sc)) + 'px Courier New';
  cx.fillText('THE FINAL 4', bx, by - baseH + 10 * sc);

  cx.textAlign = 'left';
  cx.shadowBlur = 0;
  cx.lineWidth = 1;
  cx.restore();
}
