// assets.js -- AssetStore: the central asset registry. Loads manifest.json
// (asset DEFINITIONS: size, frames, anims, collision, door) + every shipped
// PNG, then the user's artwork overrides (/api/life/assets/overrides),
// and draws frames/tiles by name. Shipped art is kept in `originals` so
// it can always be restored; `custom_*` copies inherit their base's
// definition. A missing image never blocks the game: it draws a
// placeholder box of the manifest (or requested) size.

// Slimeverse: the town's art lives next to this engine (set by js/slimeverse/town-loader.js).
const BASE = (typeof globalThis !== 'undefined' && globalThis.SLIME_TOWN_ASSETS) || 'js/slimeverse/town/assets/';
const OVERRIDES_URL = '/api/life/assets/overrides';

export class AssetStore {
  constructor() {
    this.meta = {};
    this.images = {};
    this.originals = {};
    this.overrides = {};
    this.overrideImages = {};
    this.tileSize = 16;
  }

  async load(onProgress) {
    let manifest = { assets: {}, tile_size: 16 };
    try {
      const res = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
      if (res.ok) manifest = await res.json();
    } catch (_err) { /* run on placeholders */ }
    this.meta = manifest.assets || {};
    this.tileSize = manifest.tile_size || 16;
    const entries = Object.entries(this.meta);
    let loaded = 0;
    const tick = () => { loaded += 1; if (onProgress) onProgress(loaded, entries.length); };
    await Promise.all(entries.map(([name, meta]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; this.originals[name] = img; tick(); resolve(); };
      img.onerror = () => { tick(); resolve(); };
      img.src = BASE + meta.file;
    })));
  }

  // User artwork replaces shipped images by name; never fatal.
  async loadOverrides() {
    let list = {};
    try {
      const res = await fetch(OVERRIDES_URL, { cache: 'no-store' });
      const body = await res.json();
      if (body && body.ok) list = body.overrides || {};
    } catch (_err) { return; }
    await Promise.all(Object.entries(list).map(([name, entry]) => this.applyOverride(name, entry)));
  }

  async applyOverride(name, entry) {
    const img = await loadImage(entry.url);
    if (!img) return false;
    if (!this.meta[name] && entry.base && this.meta[entry.base]) {
      this.meta[name] = { ...this.meta[entry.base], file: null, base: entry.base, custom: true };
    }
    if (!this.meta[name]) return false;
    this.overrides[name] = entry;
    this.overrideImages[name] = img;
    this.images[name] = img;
    return true;
  }

  // Back to shipped art (or forget a custom copy entirely).
  dropOverride(name) {
    delete this.overrides[name];
    delete this.overrideImages[name];
    if (this.originals[name]) this.images[name] = this.originals[name];
    else { delete this.images[name]; delete this.meta[name]; }
  }

  // The art an asset is made from (user override, else shipped), ignoring
  // any runtime-derived replacement such as the recoloured player.
  sourceOf(name) { return this.overrideImages[name] || this.originals[name] || this.images[name] || null; }

  // Runtime-derived image (e.g. the recoloured player); originals untouched.
  setImage(name, image) { this.images[name] = image; }

  has(name) { return !!this.images[name]; }

  info(name) { return this.meta[name] || null; }

  size(name) {
    const m = this.meta[name];
    if (!m) return { w: 16, h: 16 };
    return { w: m.frame_w || m.width, h: m.frame_h || m.height };
  }

  // Current [col,row] of a named animation at time t (seconds).
  animFrame(name, anim, t) {
    const m = this.meta[name];
    const a = m && m.anims && m.anims[anim];
    if (!a || !a.frames || !a.frames.length) return [0, 0];
    const idx = Math.floor((t * 1000) / (a.ms || 200)) % a.frames.length;
    return a.frames[idx];
  }

  draw(ctx, name, x, y, frame = [0, 0], flip = false) {
    const img = this.images[name];
    const { w, h } = this.size(name);
    if (!img) { placeholder(ctx, name, x, y, w, h); return; }
    const sx = frame[0] * w;
    const sy = frame[1] * h;
    if (flip) {
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, w, h, x, y, w, h);
    }
  }

  // Draws atlas tile `tile` (static or animated) at world x,y.
  drawTile(ctx, atlas, tile, x, y, t) {
    const m = this.meta[atlas];
    const img = this.images[atlas];
    const ts = this.tileSize;
    let cell = m && m.tiles && m.tiles[tile];
    const anim = m && m.anims && m.anims[tile];
    if (anim && anim.frames && anim.frames.length) {
      cell = anim.frames[Math.floor((t * 1000) / (anim.ms || 400)) % anim.frames.length];
    }
    if (!img || !cell) { placeholder(ctx, tile, x, y, ts, ts); return; }
    ctx.drawImage(img, cell[0] * ts, cell[1] * ts, ts, ts, x, y, ts, ts);
  }
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function placeholder(ctx, name, x, y, w, h) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  ctx.fillStyle = 'hsl(' + (hash % 360) + ', 55%, 55%)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1a1030';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
