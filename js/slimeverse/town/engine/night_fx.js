// night_fx.js -- Light that has to survive the night colour grade, drawn
// after it with additive blending:
// - pools under street lamps and lanterns, the glowing lamp heads, and the
//   bloom of neon props (sign poles, billboards, bridge posts, glow pods);
// - the neon strips baked into ground tiles (kerbs, lane dashes), with every
//   entity standing on them cut OUT of the light layer first, so the road
//   neon glows under the player, cars and props, never over them.

// ground tile -> [x, y, w, h, colour] of the neon strip it carries (tile px).
const NEON_TILES = {
  pave_curb: [0, 13, 16, 1, '#4ff2ff'], pave_curb_top: [0, 1, 16, 1, '#ff3fa4'], road_dash: [2, 7, 8, 2, '#4ff2ff'],
  road_dash_n: [2, 15, 8, 1, '#4ff2ff'], road_dash_s: [2, 0, 8, 1, '#4ff2ff'],
  bridge: [0, 7, 16, 1, '#4ff2ff'],
};
// sprite -> [x, y, radius] of the light pool it throws (sprite px).
const GLOW_POOLS = {
  streetlight: [8, 44, 30], lab_streetlight: [8, 44, 30], stone_lantern: [8, 26, 20], paper_lantern: [10, 30, 22],
  bridge_post: [8, 28, 18],
};
// sprite -> [[x, y, radius, 'r, g, b'], ...] glowing parts (the grade dims the sprite).
const PROP_GLOWS = {
  streetlight: [[10, 11, 9, '255, 190, 120']],
  stone_lantern: [[8, 12, 8, '255, 190, 120']],
  paper_lantern: [[10, 14, 9, '255, 170, 100']],
  bridge_post: [[8, 5, 9, '79, 242, 255']],
  neon_pole: [[10, 11, 9, '255, 63, 164'], [10, 28, 9, '79, 242, 255'], [10, 45, 9, '180, 107, 255']],
  holo_billboard: [[32, 19, 26, '255, 90, 180'], [32, 36, 14, '79, 242, 255']],
  glow_shroom: [[9, 9, 9, '120, 230, 255']],
  jungle_tree_glow: [[20, 36, 10, '79, 242, 255'], [46, 32, 10, '79, 242, 255']],
};

function radial(ctx, x, y, r, rgb, a0, a1 = 0) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(' + rgb + ', ' + a0 + ')');
  g.addColorStop(0.35, 'rgba(' + rgb + ', ' + a0 * 0.45 + ')');
  g.addColorStop(1, 'rgba(' + rgb + ', ' + a1 + ')');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function lampGlow(ctx, scene, view, look) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of scene.entities) {
    const pool = GLOW_POOLS[e.sprite];
    const parts = PROP_GLOWS[e.sprite];
    if (!pool && !parts) continue;
    if (e.x + (e.w || 16) < view.x - 40 || e.x > view.x + view.w + 40) continue;
    if (pool) radial(ctx, e.x + pool[0], e.y + pool[1], pool[2], '255, 196, 120', 0.3 * look.glow);
    for (const [x, y, r, rgb] of parts || []) radial(ctx, e.x + x, e.y + y, r, rgb, 0.6 * look.glow);
  }
  ctx.restore();
}

function strips(map) {
  if (map.neonStrips && map.neonStripsFor === map.tiles) return map.neonStrips;
  const out = [];
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const s = NEON_TILES[map.get(x, y)];
      if (s) out.push([x * 16 + s[0], y * 16 + s[1], s[2], s[3], s[4]]);
    }
  }
  map.neonStrips = out;
  map.neonStripsFor = map.tiles;
  return out;
}

// Does this entity's drawn body span one of the strip rows (world y)?
export function coversStrip(e, rows) {
  if (e.flat || !Number.isFinite(e.sortY) || e.sortY > 1e5) return false;
  const top = e.sortY - Math.max(e.h || 0, 32);
  for (const y of rows) if (y >= top - 2 && y <= e.sortY + 3) return true;
  return false;
}

let layer = null;

export function groundNeon(ctx, scene, view, look, drawn, assets, t) {
  const visible = strips(scene.map).filter(([x, y, w, h]) => x < view.x + view.w && x + w > view.x && y < view.y + view.h && y + h > view.y);
  if (!visible.length) return;
  const ox = Math.floor(view.x);
  const oy = Math.floor(view.y);
  const w = Math.ceil(view.w) + 2;
  const h = Math.ceil(view.h) + 2;
  if (!layer) layer = document.createElement('canvas');
  if (layer.width !== w || layer.height !== h) { layer.width = w; layer.height = h; }
  const g = layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, -ox, -oy);
  const rows = new Set();
  for (const [x, y, sw, sh, color] of visible) {
    g.fillStyle = color;
    g.globalAlpha = 0.3;
    g.fillRect(x, y - 1, sw, sh + 2);
    g.globalAlpha = 1;
    g.fillRect(x, y, sw, sh);
    rows.add(y);
  }
  // Cut out everything standing over a strip (exact sprite pixels).
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-out';
  // Entities are matched by their base line (sortY) and drawn height, not by
  // x/y: characters' x/y are their FEET (no w/h), so a box test missed the
  // body standing over a kerb. Erasing more than needed is harmless (only
  // the entity's own pixels are cut).
  for (const e of drawn) if (coversStrip(e, rows)) e.draw(g, assets, t, look);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.8 * look.lights;
  ctx.drawImage(layer, ox, oy);
  ctx.restore();
}
