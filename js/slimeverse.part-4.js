function drawSlimeverseWorld() {
  var cx = ctx, w = viewWidth, h = viewHeight;
  var hY     = h * SV_HORIZ_FRAC;
  var floorFY = h * SV_FLOOR_FRAC;
  var vp = w / 2, camX = slimeverseCamera.x;
  var t = svRenderTime;

  // ── Deep night sky ───────────────────────────────────────────────────
  var skyG = cx.createLinearGradient(0, 0, 0, hY + 55);
  skyG.addColorStop(0,    '#000d1a');
  skyG.addColorStop(0.25, '#001226');
  skyG.addColorStop(0.62, '#011b38');
  skyG.addColorStop(0.88, '#012640');
  skyG.addColorStop(1,    '#021c2c');
  cx.fillStyle = skyG; cx.fillRect(0, 0, w, hY + 55);

  // ── Moon (parallax-scrolls slowly) ───────────────────────────────────
  var moonX = w * 0.74 - camX * 0.007;
  var moonY = hY * 0.30;
  var moonR = 28;
  var mg = cx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 5);
  mg.addColorStop(0, 'rgba(210,240,165,.20)'); mg.addColorStop(1, 'rgba(210,240,165,0)');
  cx.fillStyle = mg; cx.fillRect(moonX - moonR * 5, moonY - moonR * 5, moonR * 10, moonR * 10);
  cx.fillStyle = '#cce89e';
  cx.beginPath(); cx.arc(moonX, moonY, moonR, 0, TWO_PI); cx.fill();
  cx.fillStyle = '#011b38'; // crescent bite
  cx.beginPath(); cx.arc(moonX + 9, moonY - 4, moonR * 0.82, 0, TWO_PI); cx.fill();

  // ── Stars (twinkling, parallax) ───────────────────────────────────────
  for (var s = 0; s < 120; s++) {
    var sx = (((s * 317 - camX * 0.018) % (w * 2.4)) + w * 2.4) % (w * 2.4) - w * 0.7;
    var sy2 = (s * 193) % (hY * 0.88);
    var twinkle = 0.42 + 0.58 * Math.sin(t * 0.00185 * (0.4 + (s % 7) * 0.25) + s * 1.9);
    cx.fillStyle = 'rgba(210,240,255,' + ((0.04 + (s % 6) * 0.016) * twinkle).toFixed(3) + ')';
    cx.beginPath(); cx.arc(sx, sy2, 0.45 + (s % 4) * 0.38, 0, TWO_PI); cx.fill();
  }

  // ── Atmospheric horizon glow ──────────────────────────────────────────
  var hazeG = cx.createLinearGradient(0, hY - 80, 0, hY + 120);
  hazeG.addColorStop(0,    'rgba(0,50,28,0)');
  hazeG.addColorStop(0.35, 'rgba(0,90,48,.09)');
  hazeG.addColorStop(0.60, 'rgba(0,140,72,.22)');
  hazeG.addColorStop(0.80, 'rgba(0,110,58,.14)');
  hazeG.addColorStop(1,    'rgba(0,50,28,0)');
  cx.fillStyle = hazeG; cx.fillRect(0, hY - 80, w, 200);

  // ── Grass ground trapezoid ────────────────────────────────────────────
  var gndG = cx.createLinearGradient(0, floorFY, 0, hY);
  gndG.addColorStop(0,    '#236630');
  gndG.addColorStop(0.20, '#1d5828');
  gndG.addColorStop(0.52, '#144022');
  gndG.addColorStop(0.80, '#0c2c18');
  gndG.addColorStop(1,    '#071c10');
  cx.fillStyle = gndG;
  cx.beginPath();
  cx.moveTo(0, floorFY); cx.lineTo(w, floorFY);
  cx.lineTo(vp + w * 0.72, hY); cx.lineTo(vp - w * 0.72, hY);
  cx.closePath(); cx.fill();

  // Near-ground continuation below the frame
  cx.fillStyle = '#236630'; cx.fillRect(0, floorFY, w, h - floorFY);

  // ── Horizon fog band ──────────────────────────────────────────────────
  var fogG = cx.createLinearGradient(0, hY - 6, 0, hY + 95);
  fogG.addColorStop(0, 'rgba(18,68,34,.72)');
  fogG.addColorStop(0.45, 'rgba(18,68,34,.40)');
  fogG.addColorStop(1, 'rgba(18,68,34,0)');
  cx.fillStyle = fogG; cx.fillRect(0, hY - 6, w, 101);

  // ── Depth grid — subtle dark-green horizontal lines ───────────────────
  cx.lineWidth = 1;
  for (var d = 0; d <= 22; d++) {
    var frac = d / 22;
    var ly = floorFY + (hY - floorFY) * frac;
    cx.strokeStyle = 'rgba(0,100,40,' + (0.03 + (1 - frac) * 0.07) + ')';
    cx.beginPath();
    cx.moveTo(vp + (0 - vp) * frac, ly);
    cx.lineTo(vp + (w - vp) * frac, ly);
    cx.stroke();
  }

  // ── Convergence lines (world-tiled, scroll with camera) ──────────────
  var floorTile = 200, floorOff = camX % floorTile;
  cx.strokeStyle = 'rgba(0,80,30,.05)';
  for (var vl = -1; vl <= Math.ceil(w / floorTile) + 1; vl++) {
    var clineX = vl * floorTile - floorOff;
    cx.beginPath(); cx.moveTo(clineX, floorFY); cx.lineTo(vp, hY); cx.stroke();
  }

  // ── Animated grass blades along near edge ────────────────────────────
  var bladeTile = 13, bladeOff = (camX * 0.994) % bladeTile;
  for (var gi = -2; gi <= Math.ceil(w / bladeTile) + 2; gi++) {
    var gx = gi * bladeTile - bladeOff;
    var bh2 = 7 + ((gi * 7 + 3) % 5) * 2.4;
    var lean = Math.sin(t * 0.0016 + gi * 0.85) * 3.8;
    cx.strokeStyle = gi % 3 === 0 ? 'rgba(55,210,85,.30)' : 'rgba(40,165,62,.22)';
    cx.lineWidth = gi % 4 === 0 ? 1.5 : 1;
    cx.beginPath();
    cx.moveTo(gx, floorFY);
    cx.quadraticCurveTo(gx + lean * 0.55, floorFY - bh2 * 0.6, gx + lean, floorFY - bh2);
    cx.stroke();
  }
  cx.lineWidth = 1;

  // ── Near-edge highlight ───────────────────────────────────────────────
  cx.strokeStyle = 'rgba(72,235,112,.42)'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(0, floorFY); cx.lineTo(w, floorFY); cx.stroke();
  cx.lineWidth = 1;

  // ── Depth-sorted bushes (far → near for correct occlusion) ───────────
  SV_BUSHES.forEach(function(b) {
    var bsc = svScaleAt(b.z);
    if (bsc < 0.055) return;
    var bsx = svSX(b.x, b.z);
    var bsy = svGroundY(b.z);
    if (bsx < -280 || bsx > w + 280) return;
    drawSVBush(cx, b, bsx, bsy, bsc, t);
  });

  // ── Fireflies ─────────────────────────────────────────────────────────
  drawSVFireflies(cx, t, w, hY);
  drawSVLanterns(cx, t, w);
  drawSVColiseum(cx, svSX(SV_COLISEUM_X, SV_COLISEUM_Z), svGroundY(SV_COLISEUM_Z), svScaleAt(SV_COLISEUM_Z) * SV_LANDMARK_SCALE, t);

  // ── Final 4 grounds and tower ─────────────────────────────────────────
  drawFinal4MysticGround(cx, w, h, hY, floorFY, vp, camX, t);

  // ── Store building ─────────────────────────────────────────────────────
  drawSlimeverseStoreBuilding(svSX(SV_STORE_X, SV_STORE_Z), svGroundY(SV_STORE_Z), svScaleAt(SV_STORE_Z) * SV_LANDMARK_SCALE);
  drawFinal4Tower(svSX(SV_FINAL4_X, SV_FINAL4_Z), svGroundY(SV_FINAL4_Z), svScaleAt(SV_FINAL4_Z) * SV_LANDMARK_SCALE, t);
}

// ── Bush decorator ─────────────────────────────────────────────────────────
function drawSVBush(cx, b, sx, groundY, sc, t) {
  var r = b.r * sc;
  if (r < 1.5) return;
  var sway = Math.sin(t * 0.0009 * b.speed + b.phase) * r * 0.07;
  var hue  = 112 + ((b.phase * 18) | 0) % 20;
  var lBase = Math.round(14 + sc * 11);

  cx.save();
  // Ground shadow
  cx.fillStyle = 'rgba(0,0,0,.17)';
  cx.beginPath(); cx.ellipse(sx + sway * 0.3, groundY + sc * 1.5, r * 0.88, r * 0.19, 0, 0, TWO_PI); cx.fill();
  // Dark base sphere
  cx.fillStyle = 'hsl(' + hue + ',54%,' + lBase + '%)';
  cx.beginPath(); cx.arc(sx + sway, groundY - r * 0.48, r, 0, TWO_PI); cx.fill();
  // Right lobe (lighter)
  cx.fillStyle = 'hsl(' + hue + ',62%,' + (lBase + 8) + '%)';
  cx.beginPath(); cx.arc(sx + sway + r * 0.30, groundY - r * 0.59, r * 0.70, 0, TWO_PI); cx.fill();
  // Left lobe
  cx.fillStyle = 'hsl(' + hue + ',57%,' + (lBase + 5) + '%)';
  cx.beginPath(); cx.arc(sx + sway - r * 0.28, groundY - r * 0.55, r * 0.60, 0, TWO_PI); cx.fill();
  // Top specular highlight
  cx.fillStyle = 'hsl(' + (hue + 5) + ',68%,' + (lBase + 15) + '%)';
  cx.beginPath(); cx.arc(sx + sway + r * 0.07, groundY - r * 0.73, r * 0.38, 0, TWO_PI); cx.fill();
  cx.restore();
}

// ── Firefly particles ──────────────────────────────────────────────────────
