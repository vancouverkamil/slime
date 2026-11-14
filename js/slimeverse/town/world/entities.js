// entities.js -- Static world objects: Prop and Building.
import { drawNeon } from './neon_glow.js';

// Every entity has: x, y (top-left, world px), w, h, sortY (draw order =
// its base line), solidRects() (world rects), draw(ctx, assets, t, look).
// Buildings and props carry no domain logic; a building only names the
// action the app runs when its door is used (see buildings/registry.js).

export class Prop {
  constructor(sprite, x, y, opts = {}) {
    this.kind = 'prop';
    this.sprite = sprite;
    this.x = x;
    this.y = y;
    this.anim = opts.anim || null;
    this.flip = !!opts.flip;
    this.phase = opts.phase || 0;     // seconds offset so rows of palms don't sway in sync
    this.solid = opts.solid !== false;
    this.flat = !!opts.flat;          // drawn under everything (rugs, mats)
    this.label = opts.label || null;
    this.interact = opts.interact || null;
    this.w = 16;
    this.h = 16;
    this.sortY = y;
  }

  attach(assets) {
    const size = assets.size(this.sprite);
    this.w = size.w;
    this.h = size.h;
    this.meta = assets.info(this.sprite) || {};
    this.sortY = this.flat ? -1e6 + this.y : this.y + this.h;
  }

  solidRects() {
    if (!this.solid || this.flat) return [];
    const c = this.meta && this.meta.collision;
    if (!c) return [{ x: this.x, y: this.y + this.h - 8, w: this.w, h: 8 }];
    return [{ x: this.x + c[0], y: this.y + c[1], w: c[2], h: c[3] }];
  }

  interactRect() {
    const solid = this.solidRects()[0] || { x: this.x, y: this.y, w: this.w, h: this.h };
    return { x: solid.x - 2, y: solid.y - 2, w: solid.w + 4, h: solid.h + 4 };
  }

  draw(ctx, assets, t, look) {
    let frame = [0, 0];
    if (this.anim === 'auto-lit') frame = assets.animFrame(this.sprite, look.lit ? 'lit' : 'off', 0);
    else if (this.anim) frame = assets.animFrame(this.sprite, this.anim, look.still ? 0 : t + this.phase);
    assets.draw(ctx, this.sprite, Math.round(this.x), Math.round(this.y), frame, this.flip);
  }
}

export class Building {
  constructor(def, x, y) {
    this.kind = 'building';
    this.def = def;
    this.sprite = def.sprite;
    this.x = x;
    this.y = y;
    this.w = def.size[0];
    this.h = def.size[1];
    this.sortY = y + this.h;
  }

  attach(assets) {
    const meta = assets.info(this.sprite);
    if (meta) { this.w = meta.width; this.h = meta.height; }
    this.meta = meta || {};
    this.sortY = this.y + this.h;
  }

  solidRects() {
    const c = this.meta.collision || [0, 24, this.w, this.h - 24];
    return [{ x: this.x + c[0], y: this.y + c[1], w: c[2], h: c[3] }];
  }

  doorRect() {
    const d = this.meta.door || [this.w / 2 - 16, this.h - 28, 32, 28];
    return { x: this.x + d[0], y: this.y + d[1], w: d[2], h: d[3] };
  }

  // Where the player stands when coming back out: just below the door.
  exitSpawn() {
    const d = this.doorRect();
    return { x: d.x + d.w / 2, y: d.y + d.h + 12 };
  }

  interactRect() {
    const d = this.doorRect();
    return { x: d.x, y: d.y + d.h - 6, w: d.w, h: 10 };
  }

  // Walk-in trigger: a thin strip hugging the door's foot, inset from both
  // door edges so brushing past the corner never counts. The player only
  // goes in while PUSHING north into it (see Scene.doorAt).
  doorTrigger() {
    const d = this.doorRect();
    const inset = 8;
    return { x: d.x + inset, y: d.y + d.h - 2, w: d.w - inset * 2, h: 4 };
  }

  draw(ctx, assets, t, look) {
    assets.draw(ctx, this.sprite, this.x, this.y);
    this.drawEmblem(ctx, assets, t, look, '');
  }

  // An animated roof emblem over the facade (manifest meta "emblem": the
  // DESIGN studio's floating quill); suffix '_glow' draws its night aura.
  drawEmblem(ctx, assets, t, look, suffix) {
    const e = this.meta && this.meta.emblem;
    if (!e || !assets.has(e.sprite + suffix)) return;
    const frame = assets.animFrame(e.sprite + suffix, e.anim, look.still ? 0 : t);
    assets.draw(ctx, e.sprite + suffix, this.x + e.at[0], this.y + e.at[1], frame);
  }

  // Window/neon glow, drawn by the renderer AFTER the colour grade so the
  // night tint never dims the lights themselves.
  drawLights(ctx, assets, t, look, front) {
    const e = this.meta && this.meta.emblem;
    const neonFront = this.frontWithEmblem(front);
    if (!(e && e.front === 'neon')) front = neonFront;   // "neon": the lights layer still goes over the emblem
    if (look.lights > 0 && assets.has(this.sprite + '_lights')) {
      ctx.save();
      // Normal blending over the graded frame: the lit-window pixels show
      // their true warm colour ('lighter' saturated them to white).
      ctx.globalAlpha = look.lights;
      if (front && front.length) ctx.drawImage(this.lightsBehind(assets, t, look, front), this.x, this.y);
      else assets.draw(ctx, this.sprite + '_lights', this.x, this.y);
      ctx.restore();
    }
    if (look.lights > 0) {
      ctx.save();
      ctx.globalAlpha = look.lights;
      ctx.globalCompositeOperation = 'lighter';   // the aura adds light, like neon bloom
      this.drawEmblem(ctx, assets, t, look, '_glow');
      ctx.restore();
    }
    drawNeon(ctx, this, assets, look, neonFront, t);
  }

  // An emblem marked "front" stands in front of its own building's lights
  // and neon (the Strategy bulb); "front": "neon" only in front of the neon
  // (the Laboratory telescope: in front of the roof rim, behind the slit's glow).
  frontWithEmblem(front) {
    const e = this.meta && this.meta.emblem;
    if (!e || !e.front) return front;
    if (!this.emblemFront) this.emblemFront = { draw: (g, assets, t, look) => this.drawEmblem(g, assets, t, look, '') };
    return [...(front || []), this.emblemFront];
  }

  // The lights layer with the exact pixels of everything in front erased
  // (destination-out), so a player at the door stays in front of the lit door.
  lightsBehind(assets, t, look, front) {
    if (!this.lightsCanvas) this.lightsCanvas = document.createElement('canvas');
    const c = this.lightsCanvas;
    if (c.width !== this.w || c.height !== this.h) { c.width = this.w; c.height = this.h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    g.setTransform(1, 0, 0, 1, -this.x, -this.y);
    assets.draw(g, this.sprite + '_lights', this.x, this.y);
    g.globalCompositeOperation = 'destination-out';
    for (const e of front) e.draw(g, assets, t, look);
    g.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    return c;
  }

}
