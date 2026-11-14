// collision.js -- Pure axis-aligned collision helpers (no DOM; unit tested).
// Rects are {x, y, w, h} in world pixels.

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function contains(outer, inner) {
  return inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

// World collision query: solid tiles from a grid plus solid rects.
export class CollisionWorld {
  constructor(widthTiles, heightTiles, tileSize) {
    this.cols = widthTiles;
    this.rows = heightTiles;
    this.tile = tileSize;
    this.solidTiles = new Uint8Array(widthTiles * heightTiles);
    this.rects = [];
    this.bounds = { x: 0, y: 0, w: widthTiles * tileSize, h: heightTiles * tileSize };
  }

  setSolidTile(col, row, solid = true) {
    if (col >= 0 && row >= 0 && col < this.cols && row < this.rows) this.solidTiles[row * this.cols + col] = solid ? 1 : 0;
  }

  isSolidTile(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return true;
    return this.solidTiles[row * this.cols + col] === 1;
  }

  addRect(rect, owner = null) {
    this.rects.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, owner });
  }

  blocked(box, ignoreOwner = null) {
    if (!contains(this.bounds, box)) return true;
    const t = this.tile;
    const c0 = Math.floor(box.x / t);
    const c1 = Math.floor((box.x + box.w - 0.001) / t);
    const r0 = Math.floor(box.y / t);
    const r1 = Math.floor((box.y + box.h - 0.001) / t);
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        if (this.isSolidTile(c, r)) return true;
      }
    }
    for (const rect of this.rects) {
      if (rect.owner !== null && rect.owner === ignoreOwner) continue;
      if (overlaps(box, rect)) return true;
    }
    return false;
  }
}

// Moves a box by (dx, dy) one axis at a time so the player slides along
// walls instead of sticking. Returns the actual {dx, dy} applied.
// Large steps are subdivided so a fast frame can never tunnel through a
// thin wall.
export function moveBox(world, box, dx, dy, ignoreOwner = null) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  const sx = dx / steps;
  const sy = dy / steps;
  let movedX = 0;
  let movedY = 0;
  const probe = { x: box.x, y: box.y, w: box.w, h: box.h };
  for (let i = 0; i < steps; i += 1) {
    if (sx) {
      probe.x += sx;
      if (world.blocked(probe, ignoreOwner)) probe.x -= sx; else movedX += sx;
    }
    if (sy) {
      probe.y += sy;
      if (world.blocked(probe, ignoreOwner)) probe.y -= sy; else movedY += sy;
    }
  }
  return { dx: movedX, dy: movedY };
}

// The area just in front of a box, used to find what the player faces.
export function reachRect(box, facing, reach = 12) {
  switch (facing) {
    case 'up': return { x: box.x - 2, y: box.y - reach, w: box.w + 4, h: reach };
    case 'down': return { x: box.x - 2, y: box.y + box.h, w: box.w + 4, h: reach };
    case 'left': return { x: box.x - reach, y: box.y - 4, w: reach, h: box.h + 8 };
    default: return { x: box.x + box.w, y: box.y - 4, w: reach, h: box.h + 8 };
  }
}

// Nearest unblocked position for a box (spiral search in `step` px rings).
// Used after a layout change or a scene switch so the player can never be
// left standing inside new geometry. Returns {dx, dy} to apply, or null.
export function nearestFree(world, box, ignoreOwner = null, step = 4, maxRadius = 160) {
  if (!world.blocked(box, ignoreOwner)) return { dx: 0, dy: 0 };
  for (let r = step; r <= maxRadius; r += step) {
    for (let i = -r; i <= r; i += step) {
      for (const [dx, dy] of [[i, -r], [i, r], [-r, i], [r, i]]) {
        if (!world.blocked({ x: box.x + dx, y: box.y + dy, w: box.w, h: box.h }, ignoreOwner)) return { dx, dy };
      }
    }
  }
  return null;
}
