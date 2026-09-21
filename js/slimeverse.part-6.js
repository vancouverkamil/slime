function drawSVChaseLights(cx, x, y, w, h, sc, t) {
  var step = Math.max(7, 12 * sc);
  var dots = [];
  for (var px = x; px <= x + w; px += step) dots.push({ x: px, y: y });
  for (var py = y + step; py <= y + h; py += step) dots.push({ x: x + w, y: py });
  for (var px2 = x + w - step; px2 >= x; px2 -= step) dots.push({ x: px2, y: y + h });
  for (var py2 = y + h - step; py2 > y; py2 -= step) dots.push({ x: x, y: py2 });
  var chase = Math.floor(t / 75) % Math.max(1, dots.length);
  dots.forEach(function(dot, i) {
    var distance = (i - chase + dots.length) % dots.length;
    var hot = distance < 5;
    cx.fillStyle = hot ? '#f9ffb8' : 'rgba(70,255,225,.42)';
    cx.shadowColor = hot ? 'rgba(255,255,170,.9)' : 'rgba(0,255,220,.36)';
    cx.shadowBlur = hot ? 10 * sc : 4 * sc;
    cx.beginPath(); cx.arc(dot.x, dot.y, Math.max(1, (hot ? 2.4 : 1.5) * sc), 0, TWO_PI); cx.fill();
  });
  cx.shadowBlur = 0;
}

function drawSVRadioTower(cx, x, groundY, sc, t, side) {
  var towerH = 255 * sc;
  var baseW = 68 * sc;
  var topY = groundY - towerH;
  cx.save();

  // Concrete plinth and cyan service strip.
  cx.fillStyle = '#d9d4c8'; cx.strokeStyle = 'rgba(220,255,248,.76)';
  cx.fillRect(x - baseW * 0.62, groundY - 14 * sc, baseW * 1.24, 16 * sc);
  cx.strokeRect(x - baseW * 0.62, groundY - 14 * sc, baseW * 1.24, 16 * sc);
  cx.fillStyle = 'rgba(0,255,220,.54)';
  cx.fillRect(x - baseW * 0.62, groundY - 4 * sc, baseW * 1.24, 4 * sc);

  // Tapered lattice radio mast.
  cx.strokeStyle = 'rgba(196,245,238,.88)';
  cx.lineWidth = Math.max(1, 3 * sc);
  cx.beginPath();
  cx.moveTo(x - baseW * 0.42, groundY - 14 * sc);
  cx.lineTo(x - 10 * sc, topY);
  cx.moveTo(x + baseW * 0.42, groundY - 14 * sc);
  cx.lineTo(x + 10 * sc, topY);
  cx.stroke();
  cx.lineWidth = Math.max(1, 1.5 * sc);
  for (var rung = 0; rung < 8; rung++) {
    var p = rung / 7;
    var y = groundY - 22 * sc - p * (towerH - 34 * sc);
    var half = (baseW * 0.38) * (1 - p) + 10 * sc * p;
    cx.beginPath(); cx.moveTo(x - half, y); cx.lineTo(x + half, y); cx.stroke();
    if (rung < 7) {
      var nextY = groundY - 22 * sc - (rung + 1) / 7 * (towerH - 34 * sc);
      cx.beginPath();
      cx.moveTo(x - half, y); cx.lineTo(x + half * 0.84, nextY);
      cx.moveTo(x + half, y); cx.lineTo(x - half * 0.84, nextY);
      cx.stroke();
    }
  }

  // Antenna dishes and pulsing aviation beacon.
  var dishY = topY + 72 * sc;
  cx.strokeStyle = 'rgba(122,255,225,.72)';
  cx.beginPath(); cx.arc(x + side * 16 * sc, dishY, 18 * sc, side < 0 ? -1.1 : 2.05, side < 0 ? 1.1 : 4.2); cx.stroke();
  cx.beginPath(); cx.moveTo(x, dishY); cx.lineTo(x + side * 26 * sc, dishY); cx.stroke();
  var blink = 0.48 + 0.52 * Math.sin(t * 0.006 + (side < 0 ? 0 : Math.PI));
  cx.shadowColor = 'rgba(255,92,92,.9)'; cx.shadowBlur = 15 * sc;
  cx.fillStyle = 'rgba(255,100,100,' + Math.max(0.22, blink).toFixed(3) + ')';
  cx.beginPath(); cx.arc(x, topY - 4 * sc, Math.max(2, 4.5 * sc), 0, TWO_PI); cx.fill();
  cx.shadowBlur = 0;

  // Vertical data lights give the towers a futuristic edge.
  for (var light = 0; light < 5; light++) {
    var ly = topY + (38 + light * 30) * sc;
    var hot = (Math.floor(t / 180) + light + (side < 0 ? 0 : 2)) % 5 === 0;
    cx.fillStyle = hot ? '#d9ff9b' : 'rgba(0,255,220,.48)';
    cx.beginPath(); cx.arc(x, ly, Math.max(1, (hot ? 3 : 2) * sc), 0, TWO_PI); cx.fill();
  }
  cx.restore();
}

function drawSlimeverseStoreBuilding(bx, by, sc) {
  var cx = ctx;
  var bw = 145 * sc, bh = 115 * sc, roofH = 38 * sc;

  // Shadow
  cx.fillStyle = 'rgba(0,0,0,.22)';
  cx.beginPath();
  cx.ellipse(bx, by + 3 * sc, bw * 0.52, 7 * sc, 0, 0, TWO_PI);
  cx.fill();

  // Body
  cx.fillStyle = '#1a0a35';
  cx.strokeStyle = 'rgba(180,100,255,.5)';
  cx.lineWidth = 1.5 * sc;
  cx.fillRect(bx - bw / 2, by - bh, bw, bh);
  cx.strokeRect(bx - bw / 2, by - bh, bw, bh);

  // Roof
  cx.fillStyle = '#280a50'; cx.strokeStyle = 'rgba(200,120,255,.6)';
  cx.beginPath();
  cx.moveTo(bx - bw / 2 - 10 * sc, by - bh);
  cx.lineTo(bx, by - bh - roofH);
  cx.lineTo(bx + bw / 2 + 10 * sc, by - bh);
  cx.closePath(); cx.fill(); cx.stroke();

  // Sign
  var sgW = bw * 0.86, sgH = 18 * sc;
  cx.fillStyle = '#0d0022'; cx.strokeStyle = 'rgba(255,180,0,.55)';
  cx.fillRect(bx - sgW / 2, by - bh + 8 * sc, sgW, sgH);
  cx.strokeRect(bx - sgW / 2, by - bh + 8 * sc, sgW, sgH);
  cx.fillStyle = '#ffcc00'; cx.textAlign = 'center';
  cx.font = 'bold ' + Math.max(7, Math.round(11 * sc)) + 'px Courier New';
  cx.fillText('GOY SLOP HAT SHOP', bx, by - bh + 8 * sc + sgH * 0.72);

  // Door
  var dw = 30 * sc, dh = 46 * sc;
  cx.fillStyle = '#080015'; cx.strokeStyle = 'rgba(140,80,255,.45)';
  cx.fillRect(bx - dw / 2, by - dh, dw, dh);
  cx.strokeRect(bx - dw / 2, by - dh, dw, dh);
  cx.fillStyle = 'rgba(255,180,0,.7)';
  cx.beginPath(); cx.arc(bx + dw * 0.28, by - dh * 0.42, 2 * sc, 0, TWO_PI); cx.fill();

  // Windows
  [-0.31, 0.31].forEach(function(side) {
    var wx = bx + side * bw, wy = by - bh + 40 * sc, ww = 24 * sc, wh = 22 * sc;
    cx.fillStyle = 'rgba(180,100,255,.1)'; cx.strokeStyle = 'rgba(180,100,255,.4)';
    cx.fillRect(wx - ww / 2, wy, ww, wh); cx.strokeRect(wx - ww / 2, wy, ww, wh);
    cx.strokeStyle = 'rgba(180,100,255,.18)';
    cx.beginPath();
    cx.moveTo(wx, wy); cx.lineTo(wx, wy + wh);
    cx.moveTo(wx - ww / 2, wy + wh / 2); cx.lineTo(wx + ww / 2, wy + wh / 2);
    cx.stroke();
  });

  // Glow
  cx.shadowColor = 'rgba(160,80,255,.3)'; cx.shadowBlur = 16 * sc;
  cx.strokeStyle = 'rgba(180,100,255,.0)'; cx.strokeRect(bx - bw / 2, by - bh, bw, bh);
  cx.shadowBlur = 0; cx.textAlign = 'left'; cx.lineWidth = 1;
}

// ── Final 4 tower exterior ────────────────────────────────────────────────
