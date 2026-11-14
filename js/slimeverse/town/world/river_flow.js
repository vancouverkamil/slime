// river_flow.js -- The river's look over its flat tiles, calm like the sea:
// - a smooth shading across the channel (deeper in the middle);
// - small waves: faint ripple lines drifting slowly downstream;
// - a few bubbles drifting and popping;
// - one koi that drifts slowly and smoothly in looping paths in the open
//   water between the two bridges -- always in view, never under a deck,
//   never down by the mouth;
// The mouth row itself is the beach's foam wave (tiles.py river_mouth).
// Everything is clipped to the open water: bridge decks hide what is under
// them. Drawn right after the sea layer, in world px. Under reduced motion
// only the shading is drawn.

const TILE = 16;
const BANK = 4;                         // px of stone bank inside the edge tiles
const WATER_TILES = new Set(['river', 'river_l', 'river_r', 'river_t']);   // the mouth row is the beach's wave
const RIPPLE = { every: [1.0, 2.2], life: 4.5, max: 4, speed: 5 };      // speed: px/s downstream
const BUBBLE = { every: [0.5, 1.3], life: [1.6, 2.8], max: 6, speed: 7 };
const KOI_MARGIN = 10;                  // px the koi keeps from the banks
const KOI_RAIL = 24;                    // px it keeps from each bridge deck: the rails hang ~15 px over the water

const states = new WeakMap();

// The channel between the banks, its open-water row spans (bridges cut
// them) and its mouth, in world px; or null.
export function riverRegion(map) {
  let mouthRow = -1;
  let c0 = Infinity;
  let c1 = -1;
  for (let y = 0; y < map.height && mouthRow < 0; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (String(map.get(x, y)).startsWith('river_mouth')) { mouthRow = y; c0 = Math.min(c0, x); c1 = Math.max(c1, x); }
    }
  }
  if (mouthRow < 0) return null;
  const col = c0 + 1;
  const wet = (y) => { const tile = map.get(col, y); return WATER_TILES.has(tile) || String(tile).startsWith('river_mouth') || String(tile).startsWith('bridge'); };
  let head = mouthRow;
  while (head > 0 && wet(head - 1)) head -= 1;
  const water = [];
  for (let y = head; y <= mouthRow; y += 1) {
    if (!WATER_TILES.has(map.get(col, y))) continue;
    const last = water[water.length - 1];
    if (last && last[1] === y * TILE) last[1] = (y + 1) * TILE;
    else water.push([y * TILE, (y + 1) * TILE]);
  }
  return { x0: c0 * TILE + BANK, x1: (c1 + 1) * TILE - BANK, top: head * TILE, mouth: mouthRow * TILE, water };
}

export const inWater = (g, y) => g.water.some(([a, b]) => y >= a && y < b);

function rand(a, b) { return a + Math.random() * (b - a); }

export function step(state, t) {
  const g = state.region;
  if (state.last === null || t < state.last || t - state.last > 5) {
    state.ripples = [];
    state.bubbles = [];
    state.nextRipple = t + rand(0, RIPPLE.every[1]);
    state.nextBubble = t + rand(0, BUBBLE.every[1]);
    if (!state.koi) state.koi = { seed: rand(0, 100) };
  }
  state.last = t;
  state.ripples = state.ripples.filter((r) => t - r.born < RIPPLE.life);
  state.bubbles = state.bubbles.filter((b) => t - b.born < b.life);
  if (t >= state.nextRipple) {
    state.nextRipple = t + rand(RIPPLE.every[0], RIPPLE.every[1]);
    if (state.ripples.length < RIPPLE.max) {
      state.ripples.push({ born: t, x: rand(g.x0 + 4, g.x1 - 12), y: rand(g.top + 20, g.mouth - 24), len: Math.round(rand(5, 9)) });
    }
  }
  if (t >= state.nextBubble) {
    state.nextBubble = t + rand(BUBBLE.every[0], BUBBLE.every[1]);
    if (state.bubbles.length < BUBBLE.max) {
      state.bubbles.push({ born: t, x: rand(g.x0 + 3, g.x1 - 4), y: rand(g.top + 18, g.mouth - 10), life: rand(BUBBLE.life[0], BUBBLE.life[1]), r: Math.random() < 0.3 ? 2 : 1 });
    }
  }
}

// The koi's pond: the open-water stretch between the bridges (the water
// span with a bridge both above and below it -- the largest otherwise).
export function koiPond(g) {
  const inner = g.water.filter(([a, b]) => a > g.top && b < g.mouth);
  const spans = inner.length ? inner : g.water;
  const [a, b] = spans.reduce((best, s) => (s[1] - s[0] > best[1] - best[0] ? s : best));
  return { x0: g.x0 + KOI_MARGIN, x1: g.x1 - KOI_MARGIN, y0: a + KOI_RAIL, y1: b - KOI_RAIL };
}

// Where the koi is at time t (s): two slow, incommensurate sine pairs make a
// smooth path that loops without ever quite repeating, inside the pond.
// Speed stays around 2-4 px/s: a very slow, smooth swimmer.
export function koiAt(pond, koi, t) {
  const cx = (pond.x0 + pond.x1) / 2;
  const cy = (pond.y0 + pond.y1) / 2;
  const ax = (pond.x1 - pond.x0) / 2;
  const ay = (pond.y1 - pond.y0) / 2;
  const k = koi.seed;
  const fx = (u) => 0.62 * Math.sin(0.11 * u + k) + 0.38 * Math.sin(0.23 * u + 2 * k);
  const fy = (u) => 0.6 * Math.sin(0.083 * u + 1.7 * k) + 0.4 * Math.sin(0.19 * u + 0.5 * k);
  const x = cx + ax * fx(t);
  const y = cy + ay * fy(t);
  const dx = ax * (fx(t + 0.2) - fx(t - 0.2));
  const dy = ay * (fy(t + 0.2) - fy(t - 0.2));
  return { x, y, a: t, angle: Math.atan2(dy, dx) };
}

// A koi seen from above, drawn along its heading: a white body with orange
// and red patches, an orange head cap, small pectoral fins and a soft fan
// tail that sways slowly as it swims.
function drawKoi(ctx, f) {
  const ux = Math.cos(f.angle);
  const uy = Math.sin(f.angle);
  const sway = Math.sin(f.a * 2.2);
  const P = (u, v, col, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(f.x + u * ux - v * uy), Math.round(f.y + u * uy + v * ux), 1, 1);
  };
  for (let u = -9; u <= -5; u += 0.5) {                    // tail fan, swaying
    const spread = (-5 - u) * 0.75 + 0.5;
    const bend = sway * (-5 - u) * 0.35;
    for (let v = -spread; v <= spread; v += 0.5) P(u, v + bend, Math.abs(v) > spread - 0.6 ? '#ffd2a8' : '#fff4e3', 0.75);
  }
  for (const side of [-1, 1]) {                            // pectoral fins
    P(2, side * 3, '#fff4e3', 0.8); P(1.5, side * 3.5, '#ffd2a8', 0.6);
  }
  for (let u = -5; u <= 5; u += 0.5) {                     // body
    const w = u > 3 ? 1.6 - (u - 3) * 0.4 : u > 0 ? 2.4 : 2.4 - (-u) * 0.3;
    for (let v = -w; v <= w; v += 0.5) {
      let col = '#fff4e3';
      if (u > 2.5) col = '#ff7a2e';                        // orange head cap
      else if ((u > -1 && u < 1.5 && v > -0.5) || (u > -4 && u < -2.5 && v < 0.5)) col = '#ff6a1a';
      if (Math.abs(v) > w - 0.6) col = col === '#fff4e3' ? '#e8dcc8' : '#e5482a';   // a darker edge
      P(u, v, col);
    }
  }
  P(4, -1, '#1a1030', 0.9); P(4, 1, '#1a1030', 0.9);       // eyes
  ctx.globalAlpha = 1;
}

export function riverFlow(ctx, scene, view, t, look) {
  let state = states.get(scene);
  if (!state || state.map !== scene.map.tiles) {
    state = { map: scene.map.tiles, region: riverRegion(scene.map), ripples: [], bubbles: [], last: null };
    states.set(scene, state);
  }
  const g = state.region;
  if (!g || g.x1 < view.x || g.x0 > view.x + view.w) return;
  ctx.save();
  ctx.beginPath();                                   // open water only: bridge decks hide what is under them
  for (const [a, b] of g.water) ctx.rect(g.x0, a, g.x1 - g.x0, b - a);
  ctx.clip();
  const across = ctx.createLinearGradient(g.x0, 0, g.x1, 0);   // calm shading: deeper mid-channel
  across.addColorStop(0, 'rgba(158, 234, 255, 0.10)');
  across.addColorStop(0.5, 'rgba(31, 79, 140, 0.18)');
  across.addColorStop(1, 'rgba(158, 234, 255, 0.06)');
  ctx.fillStyle = across;
  ctx.fillRect(g.x0, g.top, g.x1 - g.x0, g.mouth - g.top);
  if (!look.still) {
    step(state, t);
    ctx.fillStyle = '#9eeaff';
    for (const r of state.ripples) {                 // small waves drifting downstream
      const age = t - r.born;
      const u = age / RIPPLE.life;
      const y = Math.round(r.y + age * RIPPLE.speed);
      const a = 0.4 * (u < 0.25 ? u / 0.25 : u > 0.7 ? (1 - u) / 0.3 : 1);
      ctx.globalAlpha = a;
      ctx.fillRect(Math.round(r.x), y, r.len, 1);
      ctx.globalAlpha = a * 0.5;
      ctx.fillRect(Math.round(r.x) - 1, y + 1, 1, 1);
      ctx.fillRect(Math.round(r.x) + r.len, y + 1, 1, 1);
    }
    ctx.fillStyle = '#c9f6ff';
    for (const b of state.bubbles) {                 // bubbles: drift, wobble, pop
      const age = t - b.born;
      const u = age / b.life;
      const x = Math.round(b.x + Math.sin(age * 3 + b.x) * 1.2);
      const y = Math.round(b.y + age * BUBBLE.speed);
      ctx.globalAlpha = 0.7 * (u > 0.85 ? (1 - u) / 0.15 : Math.min(1, u * 4));
      if (b.r === 1) ctx.fillRect(x, y, 1, 1);
      else { ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
      if (u > 0.9) { ctx.globalAlpha = 0.5; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); }   // the pop
    }
    drawKoi(ctx, koiAt(koiPond(g), state.koi, t));   // always in open water: it never disappears
  }
  ctx.restore();
}
