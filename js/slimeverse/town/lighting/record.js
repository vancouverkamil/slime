// record.js -- A stand-in 2D context that RECORDS an entity's sprite draws
// instead of painting them. Lighting never needs to know how a prop, a
// building or a character draws itself: it runs the entity's own draw()
// against this recorder and gets back every drawImage as
//   { img, sx, sy, sw, sh, m }   (m = world matrix of the sw x sh source rect)
// Shapes (fillRect, arcs, text) are ignored: lighting is about sprites.

import { mul } from './params.js';

const NOOP = () => {};
const GRADIENT = { addColorStop: NOOP };

export class DrawRecorder {
  constructor() {
    this.calls = [];
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    // Properties entities may set (all ignored).
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.imageSmoothingEnabled = false;
    this.lineWidth = 1;
    this.font = '';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.filter = 'none';
    this.canvas = { width: 0, height: 0 };
  }

  begin() { this.calls.length = 0; this.m = [1, 0, 0, 1, 0, 0]; this.stack.length = 0; return this; }

  save() { this.stack.push(this.m); }
  restore() { if (this.stack.length) this.m = this.stack.pop(); }
  setTransform(a, b, c, d, e, f) { this.m = typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f]; }
  resetTransform() { this.m = [1, 0, 0, 1, 0, 0]; }
  transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }
  translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); }
  scale(x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); }
  rotate(r) { const c = Math.cos(r); const s = Math.sin(r); this.m = mul(this.m, [c, s, -s, c, 0, 0]); }

  drawImage(img, ...a) {
    if (!img) return;
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    let sx = 0; let sy = 0; let sw = iw; let sh = ih; let dx; let dy; let dw; let dh;
    if (a.length >= 8) [sx, sy, sw, sh, dx, dy, dw, dh] = a;
    else if (a.length >= 4) [dx, dy, dw, dh] = a;
    else { [dx, dy] = a; dw = iw; dh = ih; }
    if (!(sw > 0 && sh > 0 && dw && dh)) return;
    // source px -> dest rect -> current transform
    const local = [dw / sw, 0, 0, dh / sh, dx, dy];
    this.calls.push({ img, sx, sy, sw, sh, m: mul(this.m, local) });
  }

  createRadialGradient() { return GRADIENT; }
  createLinearGradient() { return GRADIENT; }
  createPattern() { return null; }
  measureText() { return { width: 0 }; }
}

// Every no-op path method an entity might call.
for (const name of ['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo',
  'ellipse', 'rect', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'clip', 'fillText', 'strokeText', 'putImageData',
  'setLineDash']) {
  DrawRecorder.prototype[name] = NOOP;
}
