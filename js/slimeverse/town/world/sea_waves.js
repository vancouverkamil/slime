// sea_waves.js -- The open sea's look over the flat sea tiles: a smooth depth
// gradient (shallow at the shore, deep at the bottom) and three surf effects
// that turn up at random places and times:
//   roller   -- a long curling crest that rolls in toward the beach and
//               washes up as a fan of foam;
//   whitecap -- a small crest that rises, curls over and bursts into spray;
//   swell    -- a set of three faint parallel lines drifting sideways.
// Drawn right after the ground tiles (so boats, birds and the grade go over
// it), in whole world pixels. Frozen (gradient only) under reduced motion.

const TILE = 16;
const SEA_TILES = new Set(['sea', 'sea_deep']);
const KINDS = {
  roller: { every: [2.2, 4.5], life: 4.6, max: 3 },
  whitecap: { every: [0.5, 1.4], life: 1.6, max: 6 },
  swell: { every: [1.4, 3.0], life: 3.2, max: 3 },
};

const states = new WeakMap();   // scene -> { region, waves, next, last }

// The sea rows of a scene's map, in world px: { top, bottom, shore, w }, or null.
export function seaRegion(map) {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < map.height; y += 1) {
    if (SEA_TILES.has(map.get(Math.floor(map.width / 2), y))) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) return null;
  return { top: top * TILE, bottom: (bottom + 1) * TILE, shore: top * TILE - 7, w: map.width * TILE };
}

function rand(a, b) { return a + Math.random() * (b - a); }

function spawn(kind, region) {
  const span = region.bottom - region.top;
  if (kind === 'roller') {
    return { kind, born: 0, x: rand(0, region.w - 80), len: Math.round(rand(60, 110)), y0: region.bottom - rand(4, 10) };
  }
  if (kind === 'whitecap') {
    return { kind, born: 0, x: Math.round(rand(8, region.w - 20)), y: Math.round(region.top + rand(8, span - 6)), len: Math.round(rand(10, 18)) };
  }
  return { kind, born: 0, x: rand(0, region.w - 40), y: Math.round(region.top + rand(6, span - 14)), len: Math.round(rand(26, 44)), dir: Math.random() < 0.5 ? -1 : 1 };
}

// Advance the random schedule to time t (s): retire old waves, spawn new ones.
export function step(state, t) {
  if (state.last === null || t < state.last || t - state.last > 5) {   // first frame, scene re-entry or a long pause
    state.waves = [];
    state.next = {};
    for (const k of Object.keys(KINDS)) state.next[k] = t + rand(0, KINDS[k].every[1]);
  }
  state.last = t;
  state.waves = state.waves.filter((w) => t - w.born < KINDS[w.kind].life);
  for (const [kind, spec] of Object.entries(KINDS)) {
    if (t < state.next[kind]) continue;
    state.next[kind] = t + rand(spec.every[0], spec.every[1]);
    if (state.waves.filter((w) => w.kind === kind).length >= spec.max) continue;
    const w = spawn(kind, state.region);
    w.born = t;
    state.waves.push(w);
  }
}

function px(ctx, x, y, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

function line(ctx, x, y, len, color, alpha, arch = 0) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let k = 0; k < len; k += 1) {
    const lift = Math.round(Math.sin((k / Math.max(1, len - 1)) * Math.PI) * arch);
    ctx.fillRect(Math.round(x + k), Math.round(y - lift), 1, 1);
  }
}

const fade = (u, a = 0.15, b = 0.8) => (u < a ? u / a : u > b ? Math.max(0, (1 - u) / (1 - b)) : 1);

function drawRoller(ctx, w, u, region) {
  const travel = Math.min(1, u / 0.78);                  // rolls in, then washes up
  const y = w.y0 + (region.shore + 3 - w.y0) * travel * travel;
  if (u < 0.78) {
    const a = fade(u, 0.2, 2);
    line(ctx, w.x, y + 2, w.len, '#183f80', 0.4 * a, 2);  // the darker face under the crest
    line(ctx, w.x, y + 1, w.len, '#33c6dc', 0.8 * a, 2);
    line(ctx, w.x + 1, y, w.len - 2, '#9ff6ff', 0.95 * a, 2);
    line(ctx, w.x + 4, y - 1, w.len - 8, '#ffffff', 1.0 * a, 2);
    const curl = Math.round(w.x + w.len * (0.25 + 0.5 * travel));   // the breaking curl travels along it
    px(ctx, curl, y - 3, '#ffffff', 0.9 * a), px(ctx, curl + 1, y - 3, '#ffffff', 0.7 * a), px(ctx, curl + 2, y - 2, '#9ff6ff', 0.6 * a);
  } else {                                                // the wash: foam fanning out and sinking in
    const v = (u - 0.78) / 0.22;
    const spread = Math.round(4 + v * 8);
    for (let k = -spread; k < w.len + spread; k += 1) {
      if ((k * 7 + Math.round(v * 10)) % 5 === 0) continue;   // lace gaps
      px(ctx, w.x + k, region.shore + 4 + Math.round(v * 2), '#ffffff', 0.85 * (1 - v));
      if (k % 3 === 0) px(ctx, w.x + k, region.shore + 5 + Math.round(v * 3), '#9ff6ff', 0.6 * (1 - v));
    }
  }
}

function drawWhitecap(ctx, w, u) {
  if (u < 0.45) {                                          // rises and curls over
    const g = u / 0.45;
    const len = Math.max(2, Math.round(w.len * g));
    line(ctx, w.x, w.y + 1, len, '#183f80', 0.4 * g);
    line(ctx, w.x, w.y, len, '#9ff6ff', 0.95 * g, 1);
    line(ctx, w.x + 2, w.y - 1, Math.max(1, len - 4), '#ffffff', 0.9 * g, 1);
    px(ctx, w.x + len, w.y - 1, '#ffffff', 0.9 * g);
    if (g > 0.6) px(ctx, w.x + len + 1, w.y, '#ffffff', 0.8 * g);
  } else {                                                 // bursts into spray and fades
    const v = (u - 0.45) / 0.55;
    line(ctx, w.x + 1, w.y, w.len - 1, '#ffffff', 0.6 * (1 - v));
    for (let k = 0; k < 5; k += 1) {
      const sx = w.x + (k / 4) * w.len + (k % 2 ? 1 : -1) * v * 3;
      px(ctx, sx, w.y - 1 - Math.round(Math.sin(v * Math.PI) * (2 + (k % 3))), '#ffffff', 0.75 * (1 - v));
    }
  }
}

function drawSwell(ctx, w, u) {
  const a = 0.5 * fade(u, 0.3, 0.65);
  const dx = w.dir * u * 14;
  for (let i = 0; i < 3; i += 1) line(ctx, w.x + dx + i * 3, w.y + i * 4, w.len - i * 4, '#9ff6ff', a * (1 - i * 0.2), 1);
}

export function seaWaves(ctx, scene, view, t, look) {
  let state = states.get(scene);
  if (!state || state.map !== scene.map.tiles) {
    state = { map: scene.map.tiles, region: seaRegion(scene.map), waves: [], next: {}, last: null };
    states.set(scene, state);
  }
  const r = state.region;
  if (!r || r.bottom < view.y || r.top - 8 > view.y + view.h) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, r.top, 0, r.bottom);   // smooth depth: shallow -> deep
  g.addColorStop(0, 'rgba(51, 198, 220, 0.18)');
  g.addColorStop(0.35, 'rgba(34, 150, 192, 0)');
  g.addColorStop(1, 'rgba(24, 63, 128, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.max(view.x, 0), r.top, Math.min(view.w, r.w), r.bottom - r.top);
  if (!look.still) {
    step(state, t);
    for (const w of state.waves) {
      const u = (t - w.born) / KINDS[w.kind].life;
      if (w.kind === 'roller') drawRoller(ctx, w, u, r);
      else if (w.kind === 'whitecap') drawWhitecap(ctx, w, u);
      else drawSwell(ctx, w, u);
    }
  }
  ctx.restore();
}
