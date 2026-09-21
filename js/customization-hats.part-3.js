function updateSlimePreview() {
  var pc = document.getElementById('SlimePreview');
  if (!pc) return;
  var pw = pc.width, ph = pc.height;
  var pctx = pc.getContext('2d');
  pctx.clearRect(0, 0, pw, ph);
  pctx.fillStyle = '#080018'; pctx.fillRect(0, 0, pw, ph);
  var cx = pw / 2;
  var r  = PREV_R;
  var cy = ph - 22;      // slime base sits here
  var topY = cy - r;     // top of slime arc = hat anchor
  // court floor
  pctx.strokeStyle = 'rgba(0,255,200,0.18)'; pctx.lineWidth = 1;
  pctx.beginPath(); pctx.moveTo(0, cy); pctx.lineTo(pw, cy); pctx.stroke();
  // slime body
  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, playerBodyColor);
    var sc2 = (r * 2) / tc.width;
    pctx.drawImage(tc, cx - r, cy - tc.height * sc2 * 0.72, tc.width * sc2, tc.height * sc2);
  } else {
    pctx.fillStyle = playerBodyColor;
    pctx.beginPath(); pctx.arc(cx, cy, r, Math.PI, 0); pctx.fill();
  }
  // body overlay
  drawBodyOverlay(pctx, cx, cy, r, playerBodyOverlay);
  // eye
  var eyeX = cx + r*0.26, eyeY = cy - r*0.38;
  pctx.fillStyle = '#fff'; pctx.beginPath(); pctx.arc(eyeX, eyeY, r*0.19, 0, TWO_PI); pctx.fill();
  pctx.fillStyle = '#000'; pctx.beginPath(); pctx.arc(eyeX+r*0.05, eyeY, r*0.095, 0, TWO_PI); pctx.fill();
  // hat — topY is the exact same anchor drawHatAt uses in-game
  drawHatAt(pctx, cx, topY, r, { hat: playerHat, anim: playerHatAnim, drawing: playerHatDrawing });
}

// ── custom hat drawing ────────────────────────────────────
