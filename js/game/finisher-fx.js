// Game: Finisher Cam visual effects (anime speed lines, wavy screen, manga
// impact frame, title cards). Pure drawing helpers used by js/game/replay.js.
// Nothing here strobes: speed lines re-roll at most ~12 times a second and the
// impact frame happens once, on the final hit.

// Concentration lines: white wedges from the screen edge toward a focus point.
function fxSpeedLines(g, w, h, cx, cy, intensity, seed) {
  if (intensity <= 0.01) return;
  var R = Math.hypot(w, h), n = 84, s = seed | 0;
  function rnd() { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; }
  g.save();
  g.fillStyle = '#fff';
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2 + rnd() * 0.07;
    var spread = 0.004 + rnd() * 0.012;
    var inner = Math.min(w, h) * (0.3 + rnd() * 0.22) * (1.25 - intensity * 0.35);
    g.globalAlpha = Math.min(0.85, intensity * (0.35 + rnd() * 0.5));
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    g.lineTo(cx + Math.cos(a - spread) * R, cy + Math.sin(a - spread) * R);
    g.lineTo(cx + Math.cos(a + spread) * R, cy + Math.sin(a + spread) * R);
    g.closePath(); g.fill();
  }
  g.restore();
}

// Wavy screen: redraw the rendered frame in thin rows, each pushed sideways
// on two slow sine waves (the anime "heat ripple" shake).
function fxWave(g, src, w, h, amp, phase) {
  if (amp < 0.3) { g.drawImage(src, 0, 0, w, h); return; }
  var step = 4;
  for (var y = 0; y < h; y += step) {
    var off = amp * Math.sin(y * 0.032 + phase) + amp * 0.45 * Math.sin(y * 0.105 - phase * 1.7);
    g.drawImage(src, 0, y, w, step, off, y, w, step);
  }
}

// Manga impact frame: the moment frozen in stark black and white.
function fxImpactFrame(g, src, w, h, cx, cy, seed) {
  g.save();
  g.filter = 'grayscale(1) contrast(5) invert(1)';
  g.drawImage(src, 0, 0, w, h);
  g.restore();
  g.save();
  g.globalCompositeOperation = 'multiply';
  fxSpeedLines(g, w, h, cx, cy, 1, seed);
  g.restore();
}

function fxLetterbox(g, w, h, k) {
  var bar = Math.round(h * 0.11 * k);
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, bar); g.fillRect(0, h - bar, w, bar);
  return bar;
}

// "決着 // FINAL POINT": a slash banner that cuts in when slow motion starts.
function fxTitleCard(g, w, h, k) {
  if (k <= 0 || k >= 1) return;
  var inK = Math.min(1, k / 0.18), outK = k > 0.8 ? (1 - k) / 0.2 : 1;
  var a = Math.max(0, Math.min(inK, outK));
  var y = h * 0.3, slide = (1 - inK) * w * 0.6;
  g.save();
  g.globalAlpha = a;
  g.translate(slide, 0);
  g.fillStyle = 'rgba(255,0,90,.85)';
  g.beginPath(); g.moveTo(-20, y - 34); g.lineTo(w + 20, y - 52); g.lineTo(w + 20, y + 8); g.lineTo(-20, y + 26); g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.font = 'bold ' + Math.round(h * 0.085) + 'px "Yu Gothic", "Meiryo", "Hiragino Sans", sans-serif';
  g.fillText('決着', w / 2 - h * 0.17, y + 10);
  g.font = 'italic bold ' + Math.round(h * 0.05) + 'px "Courier New", monospace';
  g.fillText('FINAL POINT', w / 2 + h * 0.13, y + 2);
  g.restore();
}

// Victory card: two slashed banners in the winner's colour and the name.
function fxVictoryCard(g, w, h, k, name, color) {
  if (k <= 0) return;
  var e = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3);
  g.save();
  g.fillStyle = 'rgba(0,0,0,' + (0.45 * e) + ')';
  g.fillRect(0, 0, w, h);
  var y = h * 0.5;
  g.fillStyle = color;
  g.globalAlpha = 0.9;
  g.beginPath(); g.moveTo(-w + e * w, y - 70); g.lineTo(e * w * 1.2, y - 92); g.lineTo(e * w * 1.2, y - 52); g.lineTo(-w + e * w, y - 30); g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(w * 2 - e * w * 1.2, y + 58); g.lineTo(w - e * w * 1.2, y + 70); g.lineTo(w - e * w * 1.2, y + 78); g.lineTo(w * 2 - e * w * 1.2, y + 66); g.closePath(); g.fill();
  g.globalAlpha = e;
  g.textAlign = 'center';
  g.shadowColor = color; g.shadowBlur = 26;
  g.font = 'bold ' + Math.round(h * 0.09) + 'px "Courier New", monospace';
  g.fillStyle = '#fff';
  g.fillText(name, w / 2, y + 6);
  g.shadowBlur = 12;
  g.font = 'bold ' + Math.round(h * 0.038) + 'px "Yu Gothic", "Meiryo", sans-serif';
  g.fillStyle = color;
  g.fillText('勝利  V I C T O R Y', w / 2, y + 40);
  g.restore();
}
