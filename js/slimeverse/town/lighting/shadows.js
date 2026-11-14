// shadows.js -- Real Lighting, Canvas2D half (works without WebGL):
// - silhouettes: each sprite source rect turned into a dark silhouette that
//   fades toward the sprite's top (= the far end of its shadow), cached;
// - the SHADOW layer: every caster's silhouettes projected onto the ground
//   away from the moon (params.projection), drawn at 1x world pixels into
//   ONE buffer (overlaps never double-darken), tinted, blurred once;
// - the CASTER layer: the same sprites drawn plainly at 1x -- the alpha the
//   rim light reads (moon_gl.js, or rimFallback below).
// layers.js composes these into the per-frame layers.

import { apply, cappedSlope, footprintOf, mul, ontoOf, projection, shadowStrength } from './params.js';

const FADE_TOP = 0.3;   // shadow alpha left at its far end

const silhouettes = new WeakMap();   // image -> Map(rectKey -> canvas)

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

export function silhouette(img, sx, sy, sw, sh, solid = false) {
  let byRect = silhouettes.get(img);
  if (!byRect) { byRect = new Map(); silhouettes.set(img, byRect); }
  const key = sx + ',' + sy + ',' + sw + ',' + sh + (solid ? 's' : '');
  let c = byRect.get(key);
  if (c) return c;
  c = makeCanvas(sw, sh);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#000';
  g.fillRect(0, 0, sw, sh);
  if (solid) { byRect.set(key, c); return c; }
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, sh);
  fade.addColorStop(0, 'rgba(0,0,0,' + FADE_TOP + ')');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fade;
  g.fillRect(0, 0, sw, sh);
  byRect.set(key, c);
  return c;
}

// A caster: its recorded draws, base line and drawn height.
export function recordCaster(rec, e, assets, t, look) {
  rec.begin();
  try { e.draw(rec, assets, t, look); } catch (_err) { return null; }
  if (!rec.calls.length) return null;
  const base = e.kind === 'prop' ? e.y + e.h : e.sortY;
  let top = Infinity; let left = Infinity; let right = -Infinity;
  for (const c of rec.calls) {
    for (const [u, v] of [[0, 0], [c.sw, 0], [0, c.sh], [c.sw, c.sh]]) {
      const [x, y] = apply(c.m, u, v);
      if (y < top) top = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  const foot = footprintOf(e);
  return { calls: rec.calls.slice(), base, height: foot ? foot.height : Math.max(1, base - top), left, right, top,
    small: e.kind !== 'building', sortY: e.sortY, kind: e.kind, foot, onto: ontoOf(e), strength: shadowStrength(e) };
}

export function inView(cast, view, margin) {
  return cast.right > view.x - margin && cast.left < view.x + view.w + 4 && cast.base > view.y - 4 && cast.top < view.y + view.h + 4;
}

// Draw a caster's projected silhouettes (+ a contact shadow) into g, whose
// origin is world (ox, oy).
export function drawShadow(g, cast, light, ox, oy, solid = false, contact = true) {
  const k = cast.strength === undefined ? 1 : cast.strength;
  if (cast.foot) { g.globalAlpha = k; drawFootprint(g, cast.foot, light, ox, oy); g.globalAlpha = 1; return; }
  const { sx, sy } = cappedSlope(light, cast.height);
  const p = mul([1, 0, 0, 1, -ox, -oy], projection(cast.base, sx, sy));
  g.globalAlpha = k;
  for (const c of cast.calls) {
    const m = mul(p, c.m);
    g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    g.drawImage(silhouette(c.img, c.sx, c.sy, c.sw, c.sh, solid), 0, 0);
  }
  g.globalAlpha = 1;
  if (cast.small && contact) {
    // A soft contact shadow where it meets the ground (ambient occlusion).
    const w = Math.min(cast.right - cast.left, 26);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.55 * k;
    g.beginPath();
    g.ellipse((cast.left + cast.right) / 2 - ox + 1, cast.base - oy, w * 0.42, Math.max(1.5, w * 0.14), 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
}

// The part of a caster's shadow that lies on its `onto` surface, drawn into
// g (origin world ox, oy) clipped to that ellipse, with the same far-end
// fade as every other shadow.
export function drawOnto(g, cast, light, ox, oy) {
  const o = cast.onto;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.beginPath();
  g.ellipse(o.cx - ox, o.cy - oy, o.rx, o.ry, 0, 0, Math.PI * 2);
  g.clip();
  drawShadow(g, cast, light, ox, oy);
  g.restore();
}

// A low round solid (a fountain basin): its ground ellipse swept away from
// the light by its height, as ONE solid shape (overlapping sweeps must not
// stack up into black), then faded along the light like a projected
// sprite's shadow: full at the basin wall, FADE_END at the far edge.
const FADE_END = 0.12;
let sweep = null;

function drawFootprint(g, f, light, ox, oy) {
  const dx = f.height * light.sx;
  const dy = f.height * light.sy;
  const w = Math.ceil(f.rx * 2 + Math.abs(dx) + 4);
  const h = Math.ceil(f.ry * 2 + Math.abs(dy) + 4);
  if (!sweep) sweep = makeCanvas(w, h);
  if (sweep.width < w || sweep.height < h) { sweep.width = Math.max(sweep.width, w); sweep.height = Math.max(sweep.height, h); }
  const s = sweep.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-over';
  s.globalAlpha = 1;
  s.clearRect(0, 0, sweep.width, sweep.height);
  const x0 = f.cx - f.rx - 2 + Math.min(0, dx);   // sweep canvas origin, in world px
  const y0 = f.cy - f.ry - 2 + Math.min(0, dy);
  s.fillStyle = '#000';
  const steps = Math.max(1, Math.ceil(f.height));
  for (let k = 0; k <= steps; k += 1) {
    const t = k / steps;
    s.beginPath();
    s.ellipse(f.cx - x0 + dx * t, f.cy - y0 + dy * t, f.rx, f.ry, 0, 0, Math.PI * 2);
    s.fill();
  }
  // Fade along the light, from the wall (where the light leaves the basin) out.
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const edge = 1 / Math.sqrt((ux / f.rx) ** 2 + (uy / f.ry) ** 2);   // basin radius along the light
  const ax = f.cx - x0 + ux * edge * 0.6;
  const ay = f.cy - y0 + uy * edge * 0.6;
  const fade = s.createLinearGradient(ax, ay, ax + ux * (edge * 0.4 + len), ay + uy * (edge * 0.4 + len));
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,' + FADE_END + ')');
  s.globalCompositeOperation = 'destination-in';
  s.fillStyle = fade;
  s.fillRect(0, 0, w, h);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(sweep, 0, 0, w, h, x0 - ox, y0 - oy, w, h);   // at the caller's alpha (strength)
}

export function drawCaster(g, cast, ox, oy, solid = false) {
  for (const c of cast.calls) {
    const m = mul([1, 0, 0, 1, -ox, -oy], c.m);
    g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    if (solid) g.drawImage(silhouette(c.img, c.sx, c.sy, c.sw, c.sh, true), 0, 0);
    else g.drawImage(c.img, c.sx, c.sy, c.sw, c.sh, 0, 0, c.sw, c.sh);
  }
}

export function clear(c, w, h) {
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.filter = 'none';
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#000';
  return g;
}

// No-WebGL rim light: caster pixels whose up-left neighbour is empty.
export function rimFallback(target, caster, w, h, light) {
  const g = clear(target, w, h);
  g.drawImage(caster, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  g.drawImage(caster, 1, 1);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = 'rgb(' + light.light + ')';
  g.fillRect(0, 0, w, h);
  return target;
}
