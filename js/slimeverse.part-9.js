function drawFinal4Floor(cx, bx, y, bw, floorH, sc, floorNum, t, topY) {
  var widthScale = [1.00, 0.86, 0.70, 0.50][floorNum - 1];
  var depth = (15 - floorNum * 2) * sc;
  var w = bw * widthScale;
  var h = floorH * (floorNum === 4 ? 0.78 : 0.86);
  var x = bx - w / 2;
  var yy = y + (floorH - h) * 0.42;
  var skew = depth * 0.62;

  drawFinal4LayerShell(cx, x, yy, w, h, depth, skew, sc, floorNum);
  drawFinal4Balconies(cx, bx, x, yy, w, h, sc, floorNum, t);

  cx.save();
  cx.beginPath();
  drawFinal4FloorPath(cx, x, yy, w, h, sc, floorNum);
  cx.clip();

  if (floorNum === 1) {
    // Obsidian manor.
    var g1 = cx.createLinearGradient(0, yy, 0, yy + h);
    g1.addColorStop(0, '#18101d'); g1.addColorStop(0.55, '#0b0710'); g1.addColorStop(1, '#020203');
    cx.fillStyle = g1; cx.fillRect(x, yy, w, h);
    cx.fillStyle = 'rgba(120,95,160,.22)';
    for (var c = 0; c < 5; c++) {
      var colX = x + 12 * sc + c * w / 5;
      cx.fillRect(colX, yy + 10 * sc, 9 * sc, h - 14 * sc);
      cx.strokeStyle = 'rgba(220,210,255,.16)';
      cx.strokeRect(colX, yy + 10 * sc, 9 * sc, h - 14 * sc);
    }
    cx.fillStyle = 'rgba(255,230,160,.18)';
    for (var win = 0; win < 3; win++) cx.fillRect(x + 27 * sc + win * 43 * sc, yy + 20 * sc, 18 * sc, 24 * sc);
    drawFinal4RecessedWindows(cx, x, yy, w, h, sc, 4, 'rgba(255,230,160,.22)');
  } else if (floorNum === 2) {
    // Hell titan.
    var g2 = cx.createLinearGradient(0, yy, 0, yy + h);
    g2.addColorStop(0, '#3d0700'); g2.addColorStop(0.52, '#180000'); g2.addColorStop(1, '#050000');
    cx.fillStyle = g2; cx.fillRect(x, yy, w, h);
    for (var flame = 0; flame < 8; flame++) {
      var fx = x + 10 * sc + flame * 18 * sc;
      var fh = (18 + Math.sin(t * 0.006 + flame) * 8) * sc;
      cx.fillStyle = flame % 2 ? 'rgba(255,190,40,.82)' : 'rgba(255,70,12,.72)';
      cx.beginPath();
      cx.moveTo(fx, yy + h);
      cx.quadraticCurveTo(fx + 8 * sc, yy + h - fh, fx + 15 * sc, yy + h);
      cx.closePath(); cx.fill();
    }
    cx.fillStyle = 'rgba(230,215,190,.60)';
    for (var skull = 0; skull < 5; skull++) {
      var skx = x + 20 * sc + skull * 31 * sc, sky = yy + 19 * sc;
      cx.beginPath(); cx.arc(skx, sky, 7 * sc, 0, TWO_PI); cx.fill();
      cx.fillStyle = '#160000';
      cx.beginPath(); cx.arc(skx - 2 * sc, sky, 1.7 * sc, 0, TWO_PI); cx.arc(skx + 2 * sc, sky, 1.7 * sc, 0, TWO_PI); cx.fill();
      cx.fillStyle = 'rgba(230,215,190,.60)';
      cx.fillRect(skx - 4 * sc, sky + 5 * sc, 8 * sc, 5 * sc);
    }
    drawFinal4RecessedWindows(cx, x, yy, w, h, sc, 3, 'rgba(255,72,18,.24)');
  } else if (floorNum === 3) {
    // AI light ascended.
    var g3 = cx.createLinearGradient(x, yy, x + w, yy + h);
    g3.addColorStop(0, '#021019'); g3.addColorStop(0.45, '#dfffff'); g3.addColorStop(0.56, '#70f7ff'); g3.addColorStop(1, '#05081a');
    cx.fillStyle = g3; cx.fillRect(x, yy, w, h);
    cx.strokeStyle = 'rgba(255,255,255,.72)';
    cx.lineWidth = Math.max(1, sc);
    for (var beam = 0; beam < 9; beam++) {
      var by1 = yy + (beam * 13 + t * 0.018) % h;
      cx.beginPath(); cx.moveTo(x, by1); cx.lineTo(x + w, yy + h - by1 + yy); cx.stroke();
    }
    var core = cx.createRadialGradient(bx, yy + h * 0.45, 0, bx, yy + h * 0.45, 54 * sc);
    core.addColorStop(0, 'rgba(255,255,255,.95)');
    core.addColorStop(0.3, 'rgba(130,255,255,.45)');
    core.addColorStop(1, 'rgba(130,255,255,0)');
    cx.fillStyle = core; cx.fillRect(x, yy, w, h);
    drawFinal4RecessedWindows(cx, x, yy, w, h, sc, 5, 'rgba(235,255,255,.52)');
  } else {
    // Projector room: the galaxy lives in the sky above, not on the wall.
    var g4 = cx.createLinearGradient(0, yy, 0, yy + h);
    g4.addColorStop(0, '#16122b'); g4.addColorStop(0.48, '#080713'); g4.addColorStop(1, '#020207');
    cx.fillStyle = g4; cx.fillRect(x, yy, w, h);
    cx.fillStyle = '#090711';
    cx.fillRect(bx - 16 * sc, yy + h - 22 * sc, 32 * sc, 16 * sc);
    cx.strokeStyle = 'rgba(160,255,245,.58)';
    cx.strokeRect(bx - 16 * sc, yy + h - 22 * sc, 32 * sc, 16 * sc);
    cx.fillStyle = 'rgba(130,255,245,.72)';
    cx.beginPath(); cx.arc(bx, yy + h - 23 * sc, 5 * sc, 0, TWO_PI); cx.fill();
    cx.strokeStyle = 'rgba(130,255,245,.35)';
    cx.beginPath(); cx.moveTo(bx, yy + h - 28 * sc); cx.lineTo(bx, yy - 8 * sc); cx.stroke();
    // Open arches show this is a portal chamber, not a screen.
    cx.strokeStyle = 'rgba(180,255,245,.45)';
    [-0.24, 0.24].forEach(function(k) {
      var ax = bx + w * k;
      cx.beginPath();
      cx.moveTo(ax - 8 * sc, yy + h * 0.72);
      cx.lineTo(ax - 8 * sc, yy + h * 0.40);
      cx.quadraticCurveTo(ax, yy + h * 0.24, ax + 8 * sc, yy + h * 0.40);
      cx.lineTo(ax + 8 * sc, yy + h * 0.72);
      cx.stroke();
    });
  }

  cx.restore();

  // Face frame.
  cx.strokeStyle = 'rgba(210,155,255,.46)';
  cx.beginPath(); drawFinal4FloorPath(cx, x, yy, w, h, sc, floorNum); cx.stroke();
}

function drawFinal4FloorPath(cx, x, yy, w, h, sc, floorNum) {
  if (floorNum === 1) {
    cx.moveTo(x, yy + h);
    cx.lineTo(x, yy + 13 * sc);
    cx.quadraticCurveTo(x + w * 0.5, yy - 8 * sc, x + w, yy + 13 * sc);
    cx.lineTo(x + w, yy + h);
    cx.closePath();
  } else if (floorNum === 2) {
    cx.moveTo(x - 4 * sc, yy + h);
    cx.lineTo(x, yy + 9 * sc);
    cx.lineTo(x + w * 0.18, yy);
    cx.lineTo(x + w * 0.82, yy);
    cx.lineTo(x + w, yy + 9 * sc);
    cx.lineTo(x + w + 4 * sc, yy + h);
    cx.closePath();
  } else if (floorNum === 3) {
    cx.moveTo(x + w * 0.08, yy + h);
    cx.lineTo(x, yy + h * 0.30);
    cx.lineTo(x + w * 0.17, yy);
    cx.lineTo(x + w * 0.83, yy);
    cx.lineTo(x + w, yy + h * 0.30);
    cx.lineTo(x + w * 0.92, yy + h);
    cx.closePath();
  } else {
    cx.moveTo(x + w * 0.10, yy + h);
    cx.lineTo(x, yy + h * 0.50);
    cx.lineTo(x + w * 0.5, yy - 10 * sc);
    cx.lineTo(x + w, yy + h * 0.50);
    cx.lineTo(x + w * 0.90, yy + h);
    cx.closePath();
  }
}

function drawFinal4LayerShell(cx, x, yy, w, h, depth, skew, sc, floorNum) {
  cx.save();
  // Rear side face.
  var sideG = cx.createLinearGradient(x + w, yy, x + w + depth, yy + h);
  sideG.addColorStop(0, floorNum === 2 ? '#230300' : '#100a18');
  sideG.addColorStop(1, '#030306');
  cx.fillStyle = sideG;
  cx.strokeStyle = 'rgba(0,0,0,.34)';
  cx.beginPath();
  cx.moveTo(x + w, yy + 10 * sc);
  cx.lineTo(x + w + depth, yy + 10 * sc - skew);
  cx.lineTo(x + w + depth, yy + h - skew);
  cx.lineTo(x + w, yy + h);
  cx.closePath(); cx.fill(); cx.stroke();

  // Upper cap creates a physical ledge.
  var capG = cx.createLinearGradient(0, yy - skew, 0, yy + 8 * sc);
  capG.addColorStop(0, floorNum === 3 ? '#cfffff' : '#362b49');
  capG.addColorStop(1, '#07060a');
  cx.fillStyle = capG;
  cx.beginPath();
  cx.moveTo(x, yy + 10 * sc);
  cx.lineTo(x + depth, yy + 10 * sc - skew);
  cx.lineTo(x + w + depth, yy + 10 * sc - skew);
  cx.lineTo(x + w, yy + 10 * sc);
  cx.closePath(); cx.fill();

  // Ledge slab and lower shadow.
  cx.fillStyle = floorNum === 2 ? '#270500' : '#09070d';
  cx.fillRect(x - 8 * sc, yy + h - 5 * sc, w + depth + 16 * sc, 7 * sc);
  cx.fillStyle = 'rgba(0,0,0,.35)';
  cx.fillRect(x - 7 * sc, yy + h + 2 * sc, w + depth + 13 * sc, 5 * sc);
  cx.restore();
}
