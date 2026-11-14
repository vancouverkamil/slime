// Online: smooth drawing of server snapshots (snapshot interpolation).
// The server sends one snapshot per 20ms tick, but over the internet they land
// unevenly: two at once, then a 40ms gap. Drawing each one as it arrived made
// online matches stutter even on a good ping. Instead we keep a small buffer and
// draw a few ms in the past, blending between the two snapshots around that
// moment at the screen's refresh rate.
// This is NOT prediction: both slimes and the ball come from the same server
// snapshots, so every hit looks exactly the way the server played it.
// The buffer adapts to the connection: it grows with measured jitter, shrinks
// back when the line is calm. Players can pick Auto / Max / Off in Display settings.

var NET_TICK_MS = 20;
var NET_SMOOTHING_MODES = {
  auto: { min: 24, max: 120, peak: 0.75, jitter: 2.5 }, // lowest delay that stays smooth
  max:  { min: 60, max: 220, peak: 1.0,  jitter: 3.5 }, // bad Wi-Fi: never stutter
};
var netSmoothingMode = 'auto';
try { var _nsm = localStorage.getItem('slime_netSmoothing'); if (_nsm === 'off' || NET_SMOOTHING_MODES[_nsm]) netSmoothingMode = _nsm; } catch(e) {}

var netSnaps = [];        // received snapshots, oldest first, by server time t
var netBase = null;       // local arrival time minus server time, for the fastest packets
var netJitter = 0;        // average lateness behind the fastest packets (ms)
var netPeak = 0;          // recent worst lateness, slowly decaying (ms)
var netDelay = null;      // how far behind the newest server time we draw (ms)
var netRenderT = null;    // server time currently on screen
var netRaf = null, netLastFrame = 0, netFxAcc = 0;
var netLastBallX = null;  // newest ball x received (rally counting uses real arrivals)

function setNetSmoothingMode(mode) {
  if (mode !== 'off' && !NET_SMOOTHING_MODES[mode]) mode = 'auto';
  netSmoothingMode = mode;
  try { localStorage.setItem('slime_netSmoothing', mode); } catch(e) {}
  syncNetSmoothingButtons();
}

function syncNetSmoothingButtons() {
  if (typeof document === 'undefined') return;
  ['auto', 'max', 'off'].forEach(function(m) {
    var b = document.getElementById('NetSmooth_' + m);
    if (b) b.classList.toggle('active', netSmoothingMode === m);
  });
}

// Old servers send no `t`; those snapshots are drawn on arrival as before.
function netSmoothingWanted(msg) { return netSmoothingMode !== 'off' && typeof msg.t === 'number'; }

function resetNetSmoothing() {
  netSnaps = []; netBase = null; netJitter = 0; netPeak = 0;
  netDelay = null; netRenderT = null; netFxAcc = 0; netLastBallX = null;
}

function stopNetSmoothing() {
  if (netRaf) { cancelAnimationFrame(netRaf); netRaf = null; }
  resetNetSmoothing();
}

function netNow() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

function pushNetSnapshot(msg) {
  var now = netNow();
  var sample = now - msg.t;
  var newest = netSnaps.length ? netSnaps[netSnaps.length - 1] : null;
  // A long pause (reconnect) or a restarted server clock: start the timeline over.
  if (netBase === null || sample - netBase > 1000 || (newest && msg.t < newest.t - 1000)) {
    resetNetSmoothing();
    netBase = sample;
  } else if (sample < netBase) {
    netBase = sample;                       // a faster packet: that is the true latency floor
  } else {
    netBase += (sample - netBase) * 0.01;   // follow slow clock drift between machines
  }
  var late = sample - netBase;
  netJitter += (late - netJitter) * 0.05;
  netPeak = Math.max(late, netPeak * 0.995);

  var snap = { t: msg.t, msg: msg };
  var i = netSnaps.length;
  while (i > 0 && netSnaps[i - 1].t > msg.t) i--;
  if (i > 0 && netSnaps[i - 1].t === msg.t) netSnaps[i - 1] = snap; // same tick (e.g. point restart)
  else netSnaps.splice(i, 0, snap);
  netLastBallX = msg.ball.x;

  if (!netRaf) { netLastFrame = now; netRaf = requestAnimationFrame(netFrame); }
}

function netTargetDelay() {
  var m = NET_SMOOTHING_MODES[netSmoothingMode] || NET_SMOOTHING_MODES.auto;
  // A snapshot must have arrived before we need it: one tick of spacing plus its lateness.
  var d = NET_TICK_MS + Math.max(netJitter * m.jitter, netPeak * m.peak) + 3;
  return Math.max(m.min, Math.min(m.max, d));
}

function lerpNet(a, b, k) { return a + (b - a) * k; }

// The blended state for server time t.
function netStateAt(t) {
  var s = netSnaps, n = s.length;
  if (t <= s[0].t) return s[0].msg;
  if (t >= s[n - 1].t) return s[n - 1].msg; // buffer ran dry: hold, never guess ahead
  var i = 0;
  while (i < n - 2 && s[i + 1].t <= t) i++;
  var a = s[i].msg, b = s[i + 1].msg;
  // Hold across a new point's reset or a pause (no blending through a teleport).
  if (a.round !== b.round || s[i + 1].t - s[i].t > NET_TICK_MS * 3) return a;
  var k = (t - s[i].t) / (s[i + 1].t - s[i].t);
  return {
    ball: { x: lerpNet(a.ball.x, b.ball.x, k), y: lerpNet(a.ball.y, b.ball.y, k), velocityX: b.ball.velocityX },
    slimeLeft:  { x: lerpNet(a.slimeLeft.x,  b.slimeLeft.x,  k), y: lerpNet(a.slimeLeft.y,  b.slimeLeft.y,  k) },
    slimeRight: { x: lerpNet(a.slimeRight.x, b.slimeRight.x, k), y: lerpNet(a.slimeRight.y, b.slimeRight.y, k) },
    scoreLeft: a.scoreLeft, scoreRight: a.scoreRight, phase: a.phase,
  };
}

function netFrame() {
  netRaf = null;
  // Another screen took over, or the player switched smoothing Off mid-match.
  if (currentScreenOwner() !== 'online-match' || netSmoothingMode === 'off') { stopNetSmoothing(); return; }
  netRaf = requestAnimationFrame(netFrame);
  if (!netSnaps.length || netBase === null) return;
  var now = netNow();
  var dt = Math.min(100, now - netLastFrame); netLastFrame = now;

  var target = netTargetDelay();
  if (netDelay === null) netDelay = target;
  // Grow quickly when the line gets worse, shrink gently so the game never visibly speeds up.
  netDelay += (target - netDelay) * (target > netDelay ? 0.15 : 0.01);

  var t = now - netBase - netDelay;
  if (netRenderT !== null && t < netRenderT && netRenderT - t < 100) t = netRenderT; // never run backwards
  netRenderT = t;
  while (netSnaps.length > 2 && netSnaps[1].t <= t - 500) netSnaps.shift();

  // Particles and shake step at the game's 50/s rate whatever the monitor's refresh rate.
  netFxAcc += dt;
  var fxSteps = 0;
  while (netFxAcc >= NET_TICK_MS) { netFxAcc -= NET_TICK_MS; fxSteps++; }
  if (typeof replayInterval !== 'undefined' && replayInterval) return;
  drawOnlineState(netStateAt(t), fxSteps);
}

// For the perf overlay (Ctrl+Shift+P).
function netSmoothingStatus() {
  if (netSmoothingMode === 'off') return 'Smooth off';
  if (netDelay === null) return 'Smooth ' + netSmoothingMode;
  return 'Smooth ' + netSmoothingMode + ' / ' + Math.round(netDelay) + 'ms (jit ' + Math.round(netJitter) + ')';
}
