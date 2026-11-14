// renderer.js -- Draws one frame of a scene: tiles, y-sorted entities,
// the time-of-day grade, night lights, and crisp screen-space labels.
// Pixel art is drawn at 1x world pixels under an integer scale with
// smoothing off; labels are drawn after, at device resolution, so text is
// sharp at any scale. A fractional scale (the one-screen town fitted
// exactly to the monitor) renders the world at the next integer scale into
// a buffer and smooths it down once: crisp pixels, no uneven 2/3 px columns.

import { phaseLook } from './timeofday.js';
import { groundNeon, lampGlow } from './night_fx.js';
import { seaWaves } from '../world/sea_waves.js';
import { riverFlow } from '../world/river_flow.js';

const LABEL_TONES = { default: '#fff4e3', gold: '#ffd36b', purple: '#c7a8ff' };

// Things drawn IN FRONT of a building (base line below its base) and near
// enough to overlap it. Building lights are drawn after the colour grade, so
// without this the lit doors/windows painted over a player standing at the door.
export function inFront(building, drawn) {
  const out = [];
  for (const e of drawn) {
    if (e === building || e.kind === 'building' || e.flat || !(e.sortY > building.sortY)) continue;
    const x = e.x || 0;
    const y = e.y || 0;
    if (x < building.x - 48 || x > building.x + building.w + 48 || y < building.y - 16 || y > building.y + building.h + 64) continue;
    out.push(e);
  }
  return out;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.screen = canvas.getContext('2d', { alpha: false });
    this.ctx = this.screen;
    this.scale = 4;
    this.dpr = 1;
    this.buffer = null;
  }

  resize(cssW, cssH, scale, dpr) {
    this.dpr = dpr;
    this.scale = scale;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    return { viewW: w / scale, viewH: h / scale };
  }

  // The integer scale the world is drawn at, and the buffer for it (or null).
  worldTarget(scale) {
    const k = Math.ceil(scale - 1e-6);
    if (k - scale < 1e-6) return { k: scale, ctx: this.screen };
    const w = Math.ceil(this.canvas.width * k / scale);
    const h = Math.ceil(this.canvas.height * k / scale);
    if (!this.buffer) this.buffer = document.createElement('canvas');
    if (this.buffer.width !== w || this.buffer.height !== h) { this.buffer.width = w; this.buffer.height = h; }
    return { k, ctx: this.buffer.getContext('2d', { alpha: false }) };
  }

  render(scene, camera, assets, t, opts) {
    const scale = this.scale;
    const look = phaseLook(scene.look, opts.phase, opts.reducedMotion);
    const camX = Math.round(camera.x * scale) / scale;
    const camY = Math.round(camera.y * scale) / scale;
    const { k, ctx } = this.worldTarget(scale);
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = scene.look === 'interior' ? '#1a1030' : '#183f80';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(k, 0, 0, k, -camX * k, -camY * k);
    const view = { x: camX, y: camY, w: camera.viewW, h: camera.viewH };
    scene.map.draw(ctx, assets, view, t, !look.still);
    seaWaves(ctx, scene, view, t, look);   // depth gradient + random surf over the flat sea tiles
    riverFlow(ctx, scene, view, t, look);  // calm river shading, slow ripples, the plume into the sea

    const margin = 64;
    const drawn = scene.drawList(opts.player, opts.radar, opts.ambient);
    const lighting = opts.lighting || null;   // optional Real Lighting layer (lighting/index.js)
    // Cast shadows go on the ground AFTER flat props (rugs, the fountain's
    // paved apron) -- they sort first -- so a shadow is never hidden under one.
    let grounded = !lighting;
    for (const e of drawn) {
      if (!grounded && !e.flat) { lighting.ground(ctx, scene, view, look, drawn, assets, t); grounded = true; }
      const ex = e.x !== undefined ? e.x : 0;
      const ey = e.y !== undefined ? e.y : 0;
      if (ex > view.x + view.w + margin || ex + (e.w || 32) < view.x - margin
        || ey > view.y + view.h + margin || ey + (e.h || 32) < view.y - margin) continue;
      e.draw(ctx, assets, t, look);
    }
    if (!grounded) lighting.ground(ctx, scene, view, look, drawn, assets, t);

    if (look.grade) this.grade(view, look);
    if (lighting) lighting.light(ctx, view, look, t);
    if (look.lights > 0) groundNeon(ctx, scene, view, look, drawn, assets, t);
    // Building lights and neon cut out whatever stands in front of them; the
    // airborne glows (fireflies, holo koi) fly over everything, so they come after.
    for (const b of Object.values(scene.buildings)) b.drawLights(ctx, assets, t, look, inFront(b, drawn));
    for (const e of drawn) if (e.drawGlow) e.drawGlow(ctx, look);   // fireflies, holo koi glow through the grade
    if (look.glow) lampGlow(ctx, scene, view, look);
    if (opts.overlay) opts.overlay(ctx, view, k);

    this.ctx = this.screen;
    if (ctx !== this.screen) {
      const s = this.screen;
      s.setTransform(1, 0, 0, 1, 0, 0);
      s.imageSmoothingEnabled = true;
      s.imageSmoothingQuality = 'high';
      s.drawImage(this.buffer, 0, 0, this.buffer.width * scale / k, this.buffer.height * scale / k);
    }
    this.screen.setTransform(1, 0, 0, 1, 0, 0);
    this.labels(scene, camX, camY);
    if (opts.focus) this.focusMarker(opts.focus, camX, camY, t, look);
  }

  // Colour grade for sunset/night. Multiply tints the whole frame; the
  // sunset adds a warm haze that fades toward the water.
  grade(view, look) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = look.grade;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    if (look.haze) {
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createLinearGradient(0, view.y, 0, view.y + view.h);
      g.addColorStop(0, look.haze[0]);
      g.addColorStop(1, look.haze[1]);
      ctx.fillStyle = g;
      ctx.fillRect(view.x, view.y, view.w, view.h);
    }
    ctx.restore();
  }

  labels(scene, camX, camY) {
    if (!scene.labels.length) return;
    const { ctx, scale } = this;
    const size = Math.max(12, Math.round(scale * 3.4));
    ctx.font = '700 ' + size + 'px "Cascadia Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const label of scene.labels) {
      const sx = Math.round((label.x - camX) * scale);
      const sy = Math.round((label.y - camY) * scale);
      const w = ctx.measureText(label.text).width + size;
      ctx.fillStyle = 'rgba(26, 16, 48, 0.82)';
      ctx.fillRect(Math.round(sx - w / 2), Math.round(sy - size * 0.75), Math.round(w), Math.round(size * 1.5));
      ctx.fillStyle = LABEL_TONES[label.tone] || LABEL_TONES.default;
      ctx.fillText(label.text, sx, sy + 1);
    }
  }

  // A small bobbing arrow over whatever the player can interact with.
  focusMarker(rect, camX, camY, t, look) {
    const { ctx, scale } = this;
    const bob = look.still ? 0 : Math.round(Math.sin(t * 6) * 1.5);
    const x = Math.round((rect.x + rect.w / 2 - camX) * scale);
    const y = Math.round((rect.y - 10 + bob - camY) * scale);
    const s = scale;
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 3 * s); ctx.lineTo(x + 4 * s, y - 3 * s); ctx.lineTo(x, y + 2 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36b';
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y - 2.5 * s); ctx.lineTo(x + 3 * s, y - 2.5 * s); ctx.lineTo(x, y + 1 * s);
    ctx.closePath(); ctx.fill();
  }
}
