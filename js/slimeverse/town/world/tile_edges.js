// tile_edges.js -- Soft transitions baked into the static tile cache, so
// areas melt into each other instead of meeting on a hard 16 px grid line:
// - lawn next to paving/planks spills little grass tufts over the edge (with
//   a faint contact shadow on the paving side);
// - two different lawns (Westpoint's dusk grass and the town moss) dither
//   into each other over a few pixels.
// Deterministic (hashed), drawn once per bake. Water and animated tiles are
// left alone (they redraw over the cache every frame).

const LAWNS = [
  { re: /^(grass|grass_alt|grass_flowers|stepping|pave_petals_lawn)$/, tones: ['#21504f', '#2f7064', '#3f8d73', '#6fbf8e'] },
  { re: /^grass_dusk/, tones: ['#1d6a66', '#278a80', '#3cbf98', '#8eebc6'] },
];
const RECEIVES = /^(pave|tech_pave|plaza|lab_plaza|path|gravel|boardwalk|bridge_end|tech_line|road_end)/;

function lawnOf(tile) {
  if (!tile) return -1;
  return LAWNS.findIndex((l) => l.re.test(tile));
}

function hash(x, y, k) {
  let n = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) & 0xff;
}

// Tufts from a lawn tile into the neighbour at (dx, dy).
function tufts(ctx, px, py, dx, dy, tones, seed) {
  ctx.fillStyle = 'rgba(20, 10, 40, 0.22)';
  for (let i = 0; i < 16; i += 1) {
    const [x, y] = dx ? [dx > 0 ? px + 16 : px - 1, py + i] : [px + i, dy > 0 ? py + 16 : py - 1];
    ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 16; i += 1) {
    const h = hash(px + i, py + i, seed);
    if (h % 3 === 0) continue;
    const len = 1 + (h % 3);
    for (let d = 0; d < len; d += 1) {
      ctx.fillStyle = tones[d === len - 1 ? 3 - (h % 2) : 1 + (h % 2)];
      const along = i;
      const into = d;
      const x = dx ? (dx > 0 ? px + 16 + into : px - 1 - into) : px + along;
      const y = dx ? py + along : (dy > 0 ? py + 16 + into : py - 1 - into);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// Dither lawn a's colours a few px into neighbour lawn tile at (dx, dy).
function dither(ctx, px, py, dx, dy, tones, seed) {
  for (let i = 0; i < 16; i += 1) {
    for (let d = 0; d < 4; d += 1) {
      const h = hash(px + i * 3, py + d * 7, seed);
      if (h > 200 - d * 45) continue;
      const x = dx ? (dx > 0 ? px + 16 + d : px - 1 - d) : px + i;
      const y = dx ? py + i : (dy > 0 ? py + 16 + d : py - 1 - d);
      ctx.fillStyle = tones[1 + (h % 3)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function drawEdges(ctx, map, ts = 16) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const a = lawnOf(map.get(x, y));
      if (a < 0) continue;
      for (const [dx, dy] of dirs) {
        const nb = map.get(x + dx, y + dy);
        if (!nb) continue;
        const b = lawnOf(nb);
        if (b >= 0 && b !== a) dither(ctx, x * ts, y * ts, dx, dy, LAWNS[a].tones, 5 + a);
        else if (b < 0 && RECEIVES.test(nb)) tufts(ctx, x * ts, y * ts, dx, dy, LAWNS[a].tones, 9);
      }
    }
  }
}
