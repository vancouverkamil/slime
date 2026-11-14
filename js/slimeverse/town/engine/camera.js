// camera.js -- Follow camera bounded to the map (pure; unit tested).
// Positions are world pixels at 1x. When the view is larger than the map
// on an axis (a small interior on an ultrawide screen) the map is centred
// on that axis instead of pinned to a corner.

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.viewW = 320;
    this.viewH = 180;
    this.mapW = 320;
    this.mapH = 180;
    this.smoothing = true;
    this.fixed = false;   // whole-map view (the compact town): never follows
  }

  setView(viewW, viewH) { this.viewW = viewW; this.viewH = viewH; }

  setMap(mapW, mapH) { this.mapW = mapW; this.mapH = mapH; }

  clampAxis(value, view, map) {
    if (view >= map) return -(view - map) / 2;
    return Math.min(Math.max(value, 0), map - view);
  }

  targetFor(px, py) {
    // Fixed: centred across, top-anchored when a few rows of open sea at the
    // bottom are allowed to fall off a slightly short screen (fitScale crop).
    if (this.fixed) return { x: -(this.viewW - this.mapW) / 2, y: this.viewH >= this.mapH ? -(this.viewH - this.mapH) / 2 : 0 };
    return {
      x: this.clampAxis(px - this.viewW / 2, this.viewW, this.mapW),
      y: this.clampAxis(py - this.viewH / 2, this.viewH, this.mapH),
    };
  }

  snapTo(px, py) {
    const t = this.targetFor(px, py);
    this.x = t.x;
    this.y = t.y;
  }

  // Exponential smoothing, frame-rate independent. A mild follow, never a
  // swoop: `rate` 10 closes ~63% of the gap in 0.1s.
  follow(px, py, dt, rate = 10) {
    const t = this.targetFor(px, py);
    if (!this.smoothing) { this.x = t.x; this.y = t.y; return; }
    const k = 1 - Math.exp(-rate * dt);
    this.x += (t.x - this.x) * k;
    this.y += (t.y - this.y) * k;
    if (Math.abs(t.x - this.x) < 0.05) this.x = t.x;
    if (Math.abs(t.y - this.y) < 0.05) this.y = t.y;
  }
}

// Integer render scale for a device-pixel viewport: aim for roughly
// `targetRows` tiles of height, never below 2x or above 6x.
export function pickScale(deviceHeight, tileSize = 16, targetRows = 22) {
  const s = Math.round(deviceHeight / (tileSize * targetRows));
  return Math.min(6, Math.max(2, s));
}

// Integer scale that shows a whole map on one device-pixel viewport, or 0
// when it would need less than `min`x (too small to read; the caller falls
// back to a following camera). `crop` world px at the bottom (open sea) may
// fall off, so a maximised window a little short of the full height still
// gets the whole town at the same crisp scale. `exact`: the scale is not
// rounded down, so the map fills the screen edge to edge (the renderer draws
// a fractional scale through an integer buffer, see renderer.js).
export function fitScale(deviceW, deviceH, mapW, mapH, crop = 0, min = 2, exact = false) {
  const raw = Math.min(deviceW / mapW, deviceH / Math.max(1, mapH - crop));
  const s = exact ? Math.floor(raw * 1000) / 1000 : Math.floor(raw);
  return s >= min ? Math.min(s, 6) : 0;
}

// Scale for a fit-to-screen map that does not fit: the full map height when
// that is still at least `min`x (scrolling sideways only), else the usual
// follow-camera scale.
export function fallbackScale(deviceH, mapH, crop = 0, min = 2) {
  const s = Math.floor(deviceH / Math.max(1, mapH - crop));
  return s >= min ? Math.min(s, 6) : pickScale(deviceH);
}
