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
