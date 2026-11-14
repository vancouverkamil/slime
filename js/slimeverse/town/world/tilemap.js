// tilemap.js -- TileMap: a grid of atlas tile names plus a solid mask.
// Static tiles are pre-rendered once into an offscreen canvas; animated
// tiles (sea, shore, pool) are redrawn each frame on top, visible range only.
// Outdoor maps (opts.edges) also bake soft lawn transitions (tile_edges.js).

import { drawEdges } from './tile_edges.js';

export class TileMap {
  constructor(width, height, atlas, fill) {
    this.width = width;
    this.height = height;
    this.atlas = atlas;
    this.tiles = new Array(width * height).fill(fill);
    this.solid = new Uint8Array(width * height);
    this.cache = null;
    this.animated = [];
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }

  get(x, y) { return this.inBounds(x, y) ? this.tiles[y * this.width + x] : null; }

  set(x, y, tile, solid) {
    if (!this.inBounds(x, y)) return;
    this.tiles[y * this.width + x] = tile;
    if (solid !== undefined) this.solid[y * this.width + x] = solid ? 1 : 0;
  }

  // Fill a rect; `alt` (optional) is mixed in on a fixed hash so large
  // areas don't look stamped, deterministically.
  fill(x, y, w, h, tile, opts = {}) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) {
        let name = tile;
        if (opts.alt && ((xx * 73856093) ^ (yy * 19349663)) % (opts.every || 5) === 0) name = opts.alt;
        this.set(xx, yy, name, opts.solid);
      }
    }
  }

  setSolid(x, y, w, h, solid = true) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) {
        if (this.inBounds(xx, yy)) this.solid[yy * this.width + xx] = solid ? 1 : 0;
      }
    }
  }

  isSolid(x, y) { return !this.inBounds(x, y) || this.solid[y * this.width + x] === 1; }

  // Pre-render static tiles; remember which cells animate.
  bake(assets) {
    const ts = assets.tileSize;
    const meta = assets.info(this.atlas) || {};
    const anims = meta.anims || {};
    const canvas = document.createElement('canvas');
    canvas.width = this.width * ts;
    canvas.height = this.height * ts;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.animated = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const tile = this.tiles[y * this.width + x];
        if (anims[tile]) this.animated.push([x, y, tile]);
        assets.drawTile(ctx, this.atlas, tile, x * ts, y * ts, 0);
      }
    }
    if (this.edges) drawEdges(ctx, this, ts);
    this.cache = canvas;
  }

  draw(ctx, assets, view, t, animate) {
    const ts = assets.tileSize;
    if (!this.cache) this.bake(assets);
    const sx = Math.max(0, Math.floor(view.x));
    const sy = Math.max(0, Math.floor(view.y));
    const sw = Math.min(this.cache.width - sx, Math.ceil(view.w) + 1);
    const sh = Math.min(this.cache.height - sy, Math.ceil(view.h) + 1);
    if (sw > 0 && sh > 0) ctx.drawImage(this.cache, sx, sy, sw, sh, sx, sy, sw, sh);
    if (!animate) return;
    const c0 = Math.floor(view.x / ts) - 1;
    const c1 = Math.ceil((view.x + view.w) / ts) + 1;
    const r0 = Math.floor(view.y / ts) - 1;
    const r1 = Math.ceil((view.y + view.h) / ts) + 1;
    for (const [x, y, tile] of this.animated) {
      if (x < c0 || x > c1 || y < r0 || y > r1) continue;
      assets.drawTile(ctx, this.atlas, tile, x * ts, y * ts, t);
    }
  }
}
