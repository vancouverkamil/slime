// Slimeverse: Final 4 tower sky projection, frame, windows and balconies.
function drawFinal4SkyProjection(cx, bx, topY, sc, t) {
  var py = topY - 92 * sc;
  var coneTop = py + 60 * sc;
  cx.save();
  cx.beginPath();
  cx.moveTo(bx - 14 * sc, topY + 8 * sc);
  cx.lineTo(bx + 14 * sc, topY + 8 * sc);
  cx.lineTo(bx + 92 * sc, coneTop);
  cx.lineTo(bx - 92 * sc, coneTop);
  cx.closePath();
  var cone = cx.createLinearGradient(bx, topY, bx, coneTop);
  cone.addColorStop(0, 'rgba(150,255,245,.26)');
  cone.addColorStop(0.5, 'rgba(120,120,255,.10)');
  cone.addColorStop(1, 'rgba(90,60,255,0)');
  cx.fillStyle = cone; cx.fill();

  var rg = cx.createRadialGradient(bx, py, 2 * sc, bx, py, 88 * sc);
  rg.addColorStop(0, 'rgba(255,255,255,.88)');
  rg.addColorStop(0.14, 'rgba(110,255,244,.62)');
  rg.addColorStop(0.36, 'rgba(92,55,255,.38)');
  rg.addColorStop(0.70, 'rgba(12,6,60,.22)');
  rg.addColorStop(1, 'rgba(10,5,40,0)');
  cx.fillStyle = rg;
  cx.beginPath(); cx.ellipse(bx, py, 92 * sc, 48 * sc, Math.sin(t * 0.0007) * 0.18, 0, TWO_PI); cx.fill();

  cx.strokeStyle = 'rgba(190,230,255,.60)';
  cx.lineWidth = Math.max(1, sc);
  cx.beginPath(); cx.ellipse(bx, py, 72 * sc, 24 * sc, Math.sin(t * 0.001) * 0.35, 0, TWO_PI); cx.stroke();
  cx.beginPath(); cx.ellipse(bx, py, 38 * sc, 54 * sc, -0.8, 0, TWO_PI); cx.stroke();
  cx.strokeStyle = 'rgba(255,255,255,.38)';
  cx.beginPath(); cx.ellipse(bx, py, 26 * sc, 18 * sc, t * 0.0007, 0, TWO_PI); cx.stroke();
  for (var star = 0; star < 46; star++) {
    var a = star * 2.399 + t * 0.00035;
    var rr = (8 + (star * 11) % 72) * sc;
    var sx = bx + Math.cos(a) * rr;
    var sy = py + Math.sin(a * 0.73) * rr * 0.42;
    cx.fillStyle = star % 7 === 0 ? 'rgba(255,220,120,.95)' : 'rgba(220,240,255,.78)';
    cx.beginPath(); cx.arc(sx, sy, (0.8 + (star % 3) * 0.35) * sc, 0, TWO_PI); cx.fill();
  }
  cx.restore();
}

function drawFinal4OuterFrame(cx, bx, by, bw, floorH, sc, t) {
  cx.save();
  var baseY = by;
  var topY = by - floorH * 4 - 10 * sc;

  // Massive outside buttresses that make the tower feel built, not stacked.
  [-1, 1].forEach(function(side) {
    var outerX = bx + side * bw * 0.78;
    var innerX = bx + side * bw * 0.43;
    var footX = bx + side * bw * 0.95;
    var g = cx.createLinearGradient(innerX, topY, footX, baseY);
    g.addColorStop(0, '#170d27');
    g.addColorStop(0.48, side < 0 ? '#07050a' : '#231034');
    g.addColorStop(1, '#050306');
    cx.fillStyle = g;
    cx.strokeStyle = 'rgba(170,120,255,.35)';
    cx.beginPath();
    cx.moveTo(innerX, topY + 68 * sc);
    cx.lineTo(outerX, topY + 92 * sc);
    cx.lineTo(footX, baseY - 6 * sc);
    cx.lineTo(bx + side * bw * 0.56, baseY);
    cx.closePath(); cx.fill(); cx.stroke();

    // Embedded vertical glow seams.
    cx.strokeStyle = side < 0 ? 'rgba(255,80,35,.24)' : 'rgba(120,255,245,.24)';
    cx.beginPath();
    cx.moveTo(outerX + side * 4 * sc, topY + 105 * sc);
    cx.lineTo(footX - side * 13 * sc, baseY - 28 * sc);
    cx.stroke();
  });

  // Suspended chains/bridges between the outer structures and the tower.
  cx.strokeStyle = 'rgba(205,185,255,.25)';
  cx.lineWidth = Math.max(1, sc);
  [0.92, 1.75, 2.62].forEach(function(mult, idx) {
    var cy = by - floorH * mult;
    [-1, 1].forEach(function(side) {
      var startX = bx + side * bw * (0.37 - idx * 0.04);
      var endX = bx + side * bw * (0.72 + idx * 0.04);
      cx.beginPath();
      cx.moveTo(startX, cy);
      cx.quadraticCurveTo((startX + endX) / 2, cy + (8 + idx * 4) * sc, endX, cy + 2 * sc);
      cx.stroke();
      for (var link = 0; link < 5; link++) {
        var p = link / 4;
        var lx = startX + (endX - startX) * p;
        var ly = cy + Math.sin(p * Math.PI) * (8 + idx * 4) * sc;
        cx.strokeRect(lx - 2 * sc, ly - 3 * sc, 4 * sc, 6 * sc);
      }
    });
  });

  // Floating black stones orbit the upper portal.
  for (var i = 0; i < 10; i++) {
    var a = i * 0.628 + t * 0.00045;
    var rx = (72 + (i % 3) * 12) * sc;
    var ry = (26 + (i % 2) * 8) * sc;
    var sx = bx + Math.cos(a) * rx;
    var sy = topY - 4 * sc + Math.sin(a * 1.4) * ry;
    var r = (4 + (i % 4)) * sc;
    cx.fillStyle = '#08070c';
    cx.strokeStyle = 'rgba(160,255,245,.32)';
    cx.beginPath();
    cx.moveTo(sx, sy - r);
    cx.lineTo(sx + r * 0.9, sy - r * 0.1);
    cx.lineTo(sx + r * 0.4, sy + r);
    cx.lineTo(sx - r * 0.8, sy + r * 0.35);
    cx.closePath(); cx.fill(); cx.stroke();
  }

  cx.restore();
}

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
