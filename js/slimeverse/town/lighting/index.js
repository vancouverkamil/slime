// lighting/index.js -- Real Lighting: a SEPARATE, switchable layer over the
// existing renderer (System menu > Lighting). The stock renderer and its
// night lights are untouched: with this off, or if anything in here throws,
// frames are exactly what they were before.
//
// One directional light hangs in the top-left of the screen -- the moon at
// night, the sun by day/sunset (params.js). Each tool is its own switch
// (params.lightingOptions): cast shadows, shading (things standing in a
// shadow), moonlight (a broad pool over the whole town; indoors the room
// light, lighting/interior.js), edge highlights
// and light shafts (WebGL2, moon_gl.js; Canvas2D rim fallback), plus
// intensity / contrast / shadow-strength sliders.
//   ground(): cast shadows, drawn on the ground UNDER the sprites;
//   light():  after the colour grade -- shading, highlights, shafts,
//             moonlight, contrast.
// reset() drops every cache (statics bake, silhouettes, GL textures). The
// app calls it after each World Builder save/apply and any art change.

import { LIGHTING_DEFAULTS, lightFor, lightingOptions, needsLayers, tuneLight } from './params.js';
import { rimFallback } from './shadows.js';
import { ShadowLayers } from './layers.js';
import { MoonGL } from './moon_gl.js';
import { roomLight } from './interior.js';

export class Lighting {
  constructor() {
    this.opts = lightingOptions(LIGHTING_DEFAULTS);
    this.layers = new ShadowLayers();
    this.gl = null;            // created on first use
    this.rim = null;           // fallback rim canvas
    this.frame = null;
    this.failed = null;        // last error that switched a frame off
    this.ms = 0;               // smoothed cost per frame (ms)
    this.resets = 0;
  }

  get enabled() { return this.opts.enabled; }

  // What an agent/E2E test (or a curious human) can inspect: lifeApp.lighting.status().
  status() {
    return {
      enabled: this.enabled,
      backend: !this.enabled ? 'off' : (this.gl && this.gl.ok ? 'webgl2' : 'canvas2d'),
      options: { ...this.opts },
      gl_error: this.gl ? this.gl.error : null,
      failed: this.failed,
      ms: Math.round(this.ms * 100) / 100,
      resets: this.resets,
    };
  }

  // settings: the game save's settings object (see params.LIGHTING_DEFAULTS).
  configure(settings) {
    const was = this.opts.enabled;
    this.opts = lightingOptions(settings);
    this.frame = null;
    if (this.opts.enabled && !was) this.failed = null;
  }

  setEnabled(on) { this.configure({ ...this.settingsLike(), real_lighting: !!on }); }

  settingsLike() {
    const o = this.opts;
    return {
      real_lighting: o.enabled, light_shadows: o.shadows, light_shading: o.shading, light_moon: o.moon,
      light_rim: o.rim, light_shafts: o.shafts, light_intensity: Math.round(o.intensity * 100),
      light_contrast: Math.round(o.contrast * 100), light_shadow: Math.round(o.shadow * 100),
    };
  }

  reset() {
    this.layers.reset();
    if (this.gl) this.gl.dispose();
    this.frame = null;
    this.resets += 1;
  }

  // Renderer hook 1: after the tiles, before any sprite.
  ground(ctx, scene, view, look, drawn, assets, t) {
    this.frame = null;
    const o = this.opts;
    const light = o.enabled && !this.failed ? tuneLight(lightFor(look), o) : null;
    if (!light) return;
    const t0 = performance.now();
    const time = look.still ? 0 : t;
    const scenePx = { w: scene.pixelW, h: scene.pixelH };
    const sceneRef = scene;
    try {
      if (!needsLayers(o)) { this.frame = { light, t0, time, scenePx, scene: sceneRef }; return; }
      const f = this.layers.frame(scene, view, light, drawn, assets, time, look, o.shading);
      if (o.shadows) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = light.shadowAlpha;
        ctx.drawImage(f.shadow, f.ox, f.oy);
        ctx.restore();
      }
      this.frame = { ...f, light, t0, time, scenePx, scene: sceneRef, layered: true };
    } catch (err) {
      this.fail(err);
    }
  }

  // Renderer hook 2: after the colour grade, before neon and lamp glow.
  light(ctx, view, look, t) {
    const f = this.frame;
    if (!f) return;
    const o = this.opts;
    try {
      const { light } = f;
      if (f.layered) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (o.shadows && f.onto) {                       // shadows falling ON a sprite (the bonsai on its basin)
          ctx.imageSmoothingEnabled = true;
          ctx.globalAlpha = light.shadowAlpha;
          ctx.filter = 'blur(1px)';                       // as soft as the ground shadows
          ctx.drawImage(f.onto, f.ox, f.oy);
          ctx.filter = 'none';
          ctx.imageSmoothingEnabled = false;
        }
        if (o.shading) {
          ctx.globalAlpha = light.shadowAlpha;          // receivers standing in a shadow
          ctx.drawImage(f.dark, f.ox, f.oy);
        }
        if (o.rim || o.shafts) this.highlights(ctx, f, view, light);
        ctx.restore();
      }
      if (o.moon && light.interior) roomLight(ctx, f.scene, light);
      else if (o.moon) this.moonlight(ctx, f, light);
      if (Math.abs(o.contrast - 1) > 0.004) this.contrast(ctx, o.contrast);
      this.ms = this.ms * 0.9 + (performance.now() - f.t0) * 0.1;
    } catch (err) {
      this.fail(err);
    }
    this.frame = null;
  }

  // Additive edge highlights and/or light shafts.
  highlights(ctx, f, view, light) {
    const o = this.opts;
    const tuned = { ...light, rim: o.rim ? light.rim : 0, shafts: o.shafts ? light.shafts : 0 };
    if (!this.gl) this.gl = new MoonGL();
    const lit = this.gl.ok ? this.gl.render(f, view, tuned, f.time) : null;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    if (lit) ctx.drawImage(lit, f.ox, f.oy);
    else if (o.rim) {
      if (!this.rim) this.rim = document.createElement('canvas');
      ctx.globalAlpha = Math.min(1, tuned.rim * 0.45);
      ctx.drawImage(rimFallback(this.rim, f.caster, f.w, f.h, light), f.ox, f.oy);
    }
  }

  // The moon as one broad spotlight over the whole town (world space, so it
  // stays on the town as the camera moves), drifting very slowly.
  moonlight(ctx, f, light) {
    const { w, h } = f.scenePx;
    if (!(w > 0 && h > 0)) return;
    const drift = f.time ? Math.sin(f.time * 0.035) : 0;
    const cx = w * (0.45 + drift * 0.08);
    const cy = h * (0.38 + Math.cos(f.time * 0.027) * (f.time ? 0.05 : 0));
    const r = Math.max(w, h) * 0.7;
    const a = Math.min(0.6, light.wash);
    const stop = (k) => 'rgba(' + light.light + ', ' + Math.min(1, k) + ')';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, stop(a * 1.3));
    g.addColorStop(0.5, stop(a * 0.7));
    g.addColorStop(1, stop(0));
    // The pool's edge: the town falls gently back into the night around it.
    const edge = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.15);
    edge.addColorStop(0, 'rgba(' + light.shadow + ', 0)');
    edge.addColorStop(1, 'rgba(' + light.shadow + ', ' + Math.min(0.6, a * 1.3) + ')');
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Contrast over the lit frame (neon and lamp glow are drawn after this).
  contrast(ctx, amount) {
    const src = ctx.canvas;
    if (!this.copy) this.copy = document.createElement('canvas');
    const c = this.copy;
    if (c.width !== src.width || c.height !== src.height) { c.width = src.width; c.height = src.height; }
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'copy';
    g.drawImage(src, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'contrast(' + amount + ')';
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }

  fail(err) {
    // Never break the game over lighting: switch it off for this session.
    this.failed = String(err && err.message || err);
    this.frame = null;
    console.warn('Real lighting switched off:', err);
  }
}
