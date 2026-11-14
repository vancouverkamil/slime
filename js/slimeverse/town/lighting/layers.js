// layers.js -- Real Lighting: composes shadows.js primitives into the
// layers one frame needs.
//
// STATIC casters (buildings, props) are baked ONCE in world space (the whole
// scene: the town is 1536 x 640 px) into a shadow layer and a caster layer,
// and the baked shadow alpha is read back once, so "is this point in a
// shadow?" costs nothing per frame. The bake is redone only when the light,
// the scene's statics (World Builder rebuild) or reset() change.
//
// RECEIVERS: ground shadows are drawn under every sprite, so a sprite that
// stands INSIDE another caster's shadow would stay lit. Each receiver whose
// feet are in a baked shadow is darkened by that much (its own solid
// silhouette): static props in the bake; characters, cars and animated
// (swaying) props every frame, so their light moves with them.

import { castsShadow, isLive, reach } from './params.js';
import { DrawRecorder } from './record.js';
import { clear, drawCaster, drawOnto, drawShadow, inView, makeCanvas, recordCaster } from './shadows.js';

const MAX_BAKE = 4096;

export class ShadowLayers {
  constructor() {
    this.rec = new DrawRecorder();
    this.bake = { shadow: makeCanvas(1, 1), caster: makeCanvas(1, 1), dark: makeCanvas(1, 1), alpha: null, w: 0, h: 0, casts: [] };
    this.shadow = makeCanvas(1, 1);
    this.soft = makeCanvas(1, 1);
    this.caster = makeCanvas(1, 1);
    this.onto = makeCanvas(1, 1);
    this.dark = makeCanvas(1, 1);
    this.key = '';
    this.statics = null;
    this.baked = new Set();   // statics drawn into the bake
    this.version = 0;
  }

  reset() { this.version += 1; this.key = ''; this.statics = null; }

  // Baked shadow coverage (0..1) at a world point.
  coverage(x, y) {
    const b = this.bake;
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (!b.alpha || ix < 0 || iy < 0 || ix >= b.w || iy >= b.h) return 0;
    return b.alpha[(iy * b.w + ix) * 4 + 3] / 255;
  }

  // How much a baked static prop stands in SOMEONE ELSE's shadow: sampled
  // just behind its base, clear of its own contact shadow. A footprint prop
  // (the fountain) lies on top of its own ground shadow, so it is sampled
  // just behind its footprint instead -- the light is top-left, so its own
  // shadow never reaches there -- or it would darken itself black.
  // A caster standing ON a surface (`onto`, the bonsai in the basin) is
  // sampled just behind that surface for the same reason.
  receiverCoverage(cast) {
    const f = cast.foot || cast.onto;
    return f ? this.coverage(f.cx, f.cy - f.ry - 2) : this.coverage((cast.left + cast.right) / 2, cast.base - 6);
  }

  bakeStatics(scene, light, assets, look) {
    const key = [scene.id, light.sx, light.sy, this.version].join(',');
    if (key === this.key && this.statics === scene.statics) return;
    this.key = key;
    this.statics = scene.statics;
    const b = this.bake;
    b.w = Math.min(MAX_BAKE, scene.pixelW);
    b.h = Math.min(MAX_BAKE, scene.pixelH);
    const gs = clear(b.shadow, b.w, b.h);
    const gc = clear(b.caster, b.w, b.h);
    const still = { ...look, still: true };
    b.casts = [];
    this.baked = new Set(scene.statics.filter((e) => !isLive(e)));
    for (const e of scene.statics) {
      if (!castsShadow(e) || isLive(e)) continue;
      const cast = recordCaster(this.rec, e, assets, 0, still);
      if (!cast) continue;
      drawShadow(gs, cast, light, 0, 0);
      drawCaster(gc, cast, 0, 0);
      b.casts.push(cast);
    }
    b.alpha = gs.getImageData(0, 0, b.w, b.h).data;
    // Props standing in someone else's shadow (receiverCoverage).
    const gd = clear(b.dark, b.w, b.h);
    for (const cast of b.casts) {
      if (!cast.small) continue;
      const c = this.receiverCoverage(cast);
      if (c < 0.05) continue;
      gd.globalAlpha = Math.min(1, c * 1.2);
      drawCaster(gd, cast, 0, 0, true);
    }
  }

  frame(scene, view, light, drawn, assets, t, look, shading = true) {
    this.bakeStatics(scene, light, assets, look);
    const ox = Math.floor(view.x) - 1;
    const oy = Math.floor(view.y) - 1;
    const w = Math.ceil(view.w) + 3;
    const h = Math.ceil(view.h) + 3;
    const b = this.bake;
    const gs = clear(this.shadow, w, h);
    const gc = clear(this.caster, w, h);
    const gd = clear(this.dark, w, h);
    gs.drawImage(b.shadow, -ox, -oy);
    gc.drawImage(b.caster, -ox, -oy);
    gd.drawImage(b.dark, -ox, -oy);
    const margin = reach(light);
    const movers = [];
    for (const e of drawn) {
      if (this.baked.has(e) || !castsShadow(e)) continue;
      const cast = recordCaster(this.rec, e, assets, t, look);
      if (!cast || !inView(cast, view, margin)) continue;
      drawShadow(gs, cast, light, ox, oy);
      drawCaster(gc, cast, ox, oy);
      movers.push(cast);
    }
    if (shading) this.darkenMovers(gd, movers, ox, oy);
    const onto = this.drawOntoLayer(movers, light, ox, oy, w, h);
    gd.setTransform(1, 0, 0, 1, 0, 0);
    gd.globalCompositeOperation = 'source-in';
    gd.fillStyle = 'rgb(' + light.shadow.split(',').map((v) => Math.round(Number(v) * 0.5)).join(',') + ')';
    gd.fillRect(0, 0, w, h);
    gs.setTransform(1, 0, 0, 1, 0, 0);
    gs.globalCompositeOperation = 'source-in';
    gs.fillStyle = 'rgb(' + light.shadow + ')';
    gs.fillRect(0, 0, w, h);
    const soft = clear(this.soft, w, h);
    soft.filter = 'blur(1px)';
    soft.drawImage(this.shadow, 0, 0);
    soft.filter = 'none';
    return { shadow: this.soft, caster: this.caster, dark: this.dark, onto, ox, oy, w, h };
  }

  // Shadows that fall ON a surface sprite (drawn over it in light()). Anyone
  // drawn after the caster (a person in front of the fountain) is cut out,
  // so the shadow never lands on them. Null when no caster has one.
  drawOntoLayer(movers, light, ox, oy, w, h) {
    const casters = movers.filter((m) => m.onto);
    if (!casters.length) return null;
    const g = clear(this.onto, w, h);
    for (const c of casters) drawOnto(g, c, light, ox, oy);
    g.globalCompositeOperation = 'destination-out';
    for (const m of movers) {
      if (casters.some((c) => m.sortY > c.sortY)) drawCaster(g, m, ox, oy, true);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = 'rgb(' + light.shadow + ')';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    return this.onto;
  }

  // Painter's order, back to front, over the baked static darkening: each
  // mover first covers whatever is behind it (cut out), then wears its own
  // darkening if its feet are in a shadow; statics in front of it are then
  // re-applied the same way, so occlusion never erases anyone's shading.
  darkenMovers(gd, movers, ox, oy) {
    movers.sort((a, b) => a.sortY - b.sortY);
    for (const m of movers) {
      this.paintDark(gd, m, m.onto ? this.receiverCoverage(m) : this.coverage((m.left + m.right) / 2, m.base), ox, oy);
      for (const s of this.bake.casts) {
        if (!(s.sortY > m.sortY && s.right > m.left && s.left < m.right && s.top < m.base && s.base > m.top)) continue;
        this.paintDark(gd, s, s.small ? this.receiverCoverage(s) : 0, ox, oy);
      }
    }
    gd.globalAlpha = 1;
    gd.globalCompositeOperation = 'source-over';
  }

  paintDark(gd, cast, c, ox, oy) {
    gd.globalAlpha = 1;
    gd.globalCompositeOperation = 'destination-out';
    drawCaster(gd, cast, ox, oy, true);
    if (c < 0.05) return;
    gd.globalCompositeOperation = 'source-over';
    gd.globalAlpha = Math.min(1, c * 1.2);
    drawCaster(gd, cast, ox, oy, true);
  }
}
