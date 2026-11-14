// neon_glow.js -- The clean bloom around neon signs. Each building's
// `<name>_neon` mask (tube pixels only, from life_art/neon.py) is blown up
// and blurred ONCE into a cached glow texture, then drawn smoothly with
// additive blending after the colour grade. Cost per frame: one drawImage.

const UPSCALE = 4;       // glow texture resolution vs world pixels
const BLUR = [3, 9];     // tight halo + wide bloom (texture px)

export function buildNeonGlow(img) {
  if (!img || !img.width) return null;
  const w = img.width * UPSCALE;
  const h = img.height * UPSCALE;
  const sharp = document.createElement('canvas');
  sharp.width = w;
  sharp.height = h;
  const sctx = sharp.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0, w, h);
  const glow = document.createElement('canvas');
  glow.width = w;
  glow.height = h;
  const gctx = glow.getContext('2d');
  gctx.globalCompositeOperation = 'lighter';
  for (const radius of BLUR) {
    gctx.filter = `blur(${radius}px)`;
    gctx.drawImage(sharp, 0, 0);
  }
  gctx.filter = 'none';
  return glow;
}

// Strength of the bloom by time of day: neon is always on, but it only
// really throws light once the sun is down.
export function neonStrength(phase) {
  if (phase === 'night') return 1;
  if (phase === 'sunset') return 0.75;
  return 0.35;
}

// front: entities standing in front of the building (renderer.inFront). Their
// exact pixels are erased from the tubes AND the bloom first, so a walker,
// a car or a prop in front of a sign is never painted over by its neon.
export function drawNeon(ctx, building, assets, look, front = null, t = 0) {
  if (!assets.has(building.sprite + '_neon')) return;
  if (!building.neonGlow) building.neonGlow = buildNeonGlow(assets.images[building.sprite + '_neon']);
  const cut = front && front.length;
  // tubes at full brightness on top of the graded frame
  if (cut) ctx.drawImage(behind(building, 'neonTubes', 1, assets, t, look, front, (g) => assets.draw(g, building.sprite + '_neon', 0, 0)), building.x, building.y);
  else assets.draw(ctx, building.sprite + '_neon', building.x, building.y);
  if (!building.neonGlow) return;
  const glow = cut ? behind(building, 'neonBloom', UPSCALE, assets, t, look, front, (g) => g.drawImage(building.neonGlow, 0, 0, building.w, building.h)) : building.neonGlow;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = neonStrength(look.phase);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(glow, building.x, building.y, building.w, building.h);
  ctx.restore();
}

// A building-sized layer (at `k` x resolution) drawn by `paint` in building
// space, with every front entity's pixels erased (destination-out).
function behind(building, slot, k, assets, t, look, front, paint) {
  if (!building[slot]) building[slot] = document.createElement('canvas');
  const c = building[slot];
  const w = Math.round(building.w * k);
  const h = Math.round(building.h * k);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = k > 1;
  g.setTransform(k, 0, 0, k, 0, 0);
  paint(g);
  g.imageSmoothingEnabled = false;
  g.globalCompositeOperation = 'destination-out';
  g.setTransform(k, 0, 0, k, -building.x * k, -building.y * k);
  for (const e of front) e.draw(g, assets, t, look);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return c;
}
