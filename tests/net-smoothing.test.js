// Online snapshot interpolation: smooth motion over a jittery line, no blending
// through a new point's reset, and nothing drawn ahead of what the server sent.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  let clock = 0, rafFn = null;
  const drawn = [];
  const c = {
    performance: { now: () => clock },
    Date: { now: () => clock },
    localStorage: { getItem: () => null, setItem() {} },
    requestAnimationFrame: (fn) => { rafFn = fn; return 1; },
    cancelAnimationFrame: () => { rafFn = null; },
    currentScreenOwner: () => 'online-match',
    replayInterval: null,
    drawOnlineState: (s) => drawn.push({ at: clock, x: s.ball.x, y: s.ball.y, sx: s.slimeLeft.x }),
    Math,
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/online/net-smoothing.js'), 'utf8'), c);
  return {
    c, drawn,
    setClock(t) { clock = t; },
    frame() { const fn = rafFn; rafFn = null; if (fn) fn(); },
  };
}

function snap(tick, x, round) {
  return { type: 'state', t: tick * 20, round: round || 0, ball: { x, y: 200, velocityX: 5 },
    slimeLeft: { x: 200, y: 0 }, slimeRight: { x: 800, y: 0 }, scoreLeft: 0, scoreRight: 0, phase: 'playing' };
}

// Simulate 3 s: ball moves 5 units per tick; packets arrive with 60ms latency plus
// 0-30ms random jitter (TCP keeps order); the screen draws at 60 Hz.
function simulate(jitterMs, seed) {
  const sim = load();
  let r = seed;
  const rand = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const arrivals = [];
  let lastArrive = 0;
  for (let tick = 0; tick < 150; tick++) {
    lastArrive = Math.max(lastArrive, tick * 20 + 60 + rand() * jitterMs);
    arrivals.push({ at: lastArrive, msg: snap(tick, 100 + tick * 5) });
  }
  // "Off": what the screen showed before, the newest packet at each 60 Hz frame.
  const raw = [];
  let ai = 0, rawX = null;
  for (let f = 0; f < 180; f++) {
    const now = f * (1000 / 60);
    while (ai < arrivals.length && arrivals[ai].at <= now) { rawX = arrivals[ai].msg.ball.x; ai++; }
    if (rawX !== null) raw.push(rawX);
  }
  ai = 0;
  for (let f = 0; f < 180; f++) {
    const now = f * (1000 / 60);
    sim.setClock(now);
    // Messages land between frames at their own arrival time, as in a browser.
    while (ai < arrivals.length && arrivals[ai].at <= now) { sim.setClock(arrivals[ai].at); sim.c.pushNetSnapshot(arrivals[ai].msg); ai++; }
    sim.setClock(now);
    sim.frame();
  }
  return { sim, raw };
}

// How uneven the per-frame movement is (0 = perfectly even).
function unevenness(xs) {
  const steps = [];
  for (let i = 1; i < xs.length; i++) steps.push(xs[i] - xs[i - 1]);
  const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
  return Math.sqrt(steps.reduce((a, s) => a + (s - mean) * (s - mean), 0) / steps.length);
}

{
  const { sim, raw } = simulate(30, 7);
  const xs = sim.drawn.slice(30).map((d) => d.x); // after the buffer has settled
  const smooth = unevenness(xs), before = unevenness(raw.slice(30));
  assert.ok(smooth < before / 3, `smoothed motion should be far more even (raw ${before.toFixed(2)}, smooth ${smooth.toFixed(2)})`);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] >= xs[i - 1], 'the ball never runs backwards');
  assert.ok(sim.c.netDelay < 120, 'auto mode keeps the buffer small: ' + sim.c.netDelay);
  console.log(`ok - jittery line: per-frame unevenness ${before.toFixed(2)} -> ${smooth.toFixed(2)}, buffer ${Math.round(sim.c.netDelay)}ms`);
}

{
  const { sim } = simulate(2, 3);
  assert.ok(sim.c.netDelay <= 30, 'a calm line gets a tiny buffer: ' + sim.c.netDelay);
  console.log(`ok - calm line keeps the added delay small (${Math.round(sim.c.netDelay)}ms)`);
}

{
  // Point scored at tick 10 (ball at 900), next point starts at tick 45 at x=200, new round.
  const sim = load();
  for (let t = 0; t <= 10; t++) { sim.setClock(t * 20); sim.c.pushNetSnapshot(snap(t, 850 + t * 5)); sim.frame(); }
  sim.setClock(45 * 20); sim.c.pushNetSnapshot(snap(45, 200, 1));
  for (let f = 0; f < 80; f++) { sim.setClock(45 * 20 + f * 10); sim.frame(); }
  const xs = sim.drawn.map((d) => d.x);
  assert.ok(xs.every((x) => x === 200 || x >= 850), 'the ball is never drawn sliding between the old and new point');
  assert.strictEqual(xs[xs.length - 1], 200, 'the new point is shown once reached');
  console.log('ok - a new point snaps instead of sweeping the ball across the court');
}

{
  const sim = load();
  sim.setClock(0); sim.c.pushNetSnapshot(snap(0, 100));
  sim.setClock(20); sim.c.pushNetSnapshot(snap(1, 105));
  for (let f = 0; f < 30; f++) { sim.setClock(20 + f * 16); sim.frame(); }
  assert.ok(sim.drawn.every((d) => d.x <= 105), 'never drawn past the newest snapshot (no prediction)');
  console.log('ok - an empty buffer holds the last snapshot instead of guessing ahead');
}

{
  const sim = load();
  sim.c.setNetSmoothingMode('off');
  assert.strictEqual(sim.c.netSmoothingWanted(snap(1, 100)), false);
  sim.c.setNetSmoothingMode('auto');
  assert.strictEqual(sim.c.netSmoothingWanted({ ball: {} }), false, 'an old server without t falls back to drawing on arrival');
  assert.strictEqual(sim.c.netSmoothingWanted(snap(1, 100)), true);
  console.log('ok - Off and old servers draw packets on arrival as before');
}
