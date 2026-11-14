// ambient_fx.js -- Neo-zen atmosphere for the outdoor town: sakura petals
// drifting down from the blossom trees (plus a light breeze of strays
// across the whole map) and small firefly swarms that appear once in a
// while over the garden, more often after dark; and holographic koi that
// swim slowly through the air above the town (Tokyo-future signature). Decorative only: never
// solid, never interactive, and off with the rest of the Ambient Life
// setting / reduced motion. Deterministic (seeded) so tests are stable.

const TAU = Math.PI * 2;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PETAL_COLORS = ['#ffadcc', '#ffe0ec', '#f07aa8', '#ffc4dc'];

// Petals: each tree is an emitter; a share of petals are strays that ride
// the breeze across the whole scene. A petal falls with a sway, lands, and
// fades out where it lands before being reused.
export class Petals {
  constructor({ trees = [], width, height, count = 70, seed = 7 }) {
    this.kind = 'petals';
    this.sortY = 1e6 - 1;            // above the scene, below birds
    this.trees = trees;              // [{ x, y }] canopy centres, world px
    this.width = width;
    this.height = height;
    this.rand = rng(seed);
    this.petals = [];
    for (let i = 0; i < count; i += 1) this.petals.push(this.spawn({}, true));
  }

  spawn(p, initial) {
    const r = this.rand;
    const tree = this.trees.length && r() < 0.75 ? this.trees[Math.floor(r() * this.trees.length)] : null;
    p.x = tree ? tree.x + (r() - 0.5) * 36 : r() * this.width;
    p.y = tree ? tree.y + (r() - 0.5) * 20 : -8 - r() * 40;
    p.ground = tree ? tree.y + 18 + r() * 42 : 40 + r() * (this.height - 60);
    if (initial) p.y += r() * (p.ground - p.y);
    p.vx = 6 + r() * 10;             // the breeze blows east
    p.vy = 9 + r() * 8;
    p.phase = r() * TAU;
    p.sway = 0.8 + r() * 1.6;
    p.color = PETAL_COLORS[Math.floor(r() * PETAL_COLORS.length)];
    p.big = r() < 0.3;
    p.rest = 0;                      // seconds left lying on the ground
    return p;
  }

  update(dt) {
    for (const p of this.petals) {
      if (p.rest > 0) {
        p.rest -= dt;
        if (p.rest <= 0) this.spawn(p, false);
        continue;
      }
      p.phase += dt * p.sway;
      p.x += (p.vx + Math.sin(p.phase) * 10) * dt;
      p.y += p.vy * dt * (0.7 + 0.3 * Math.cos(p.phase));
      if (p.y >= p.ground) { p.y = p.ground; p.rest = 1.5 + this.rand() * 2.5; }
      if (p.x > this.width + 8) this.spawn(p, false);
    }
  }

  solidRects() { return []; }

  draw(ctx) {
    for (const p of this.petals) {
      ctx.globalAlpha = p.rest > 0 ? Math.min(1, p.rest) * 0.85 : 1;
      ctx.fillStyle = p.color;
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const flip = Math.sin(p.phase * 2) > 0;
      ctx.fillRect(x, y, flip ? 2 : 1, 1);
      if (p.big) ctx.fillRect(x + (flip ? 0 : 1), y + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// Fireflies: a swarm fades in at one of the scene's firefly spots, drifts
// for a while, then fades away; the next one comes after a quiet gap that
// is shorter at night. Drawn after the colour grade (drawGlow) so they
// glow in the dark instead of being dimmed by it.
export class Fireflies {
  constructor({ spots = [], seed = 11, size = [6, 10], life = [11, 16], gap = { day: [40, 70], sunset: [16, 30], night: [6, 14] } }) {
    this.kind = 'fireflies';
    this.sortY = 1e6 - 2;
    this.spots = spots;              // [{ x, y, r }] world px
    this.rand = rng(seed);
    this.size = size;
    this.life = life;
    this.gap = gap;
    this.phase = 'day';
    this.flies = [];
    this.age = 0;
    this.span = 0;
    this.wait = 4 + this.rand() * 6; // the first swarm comes soon after arriving
  }

  between([a, b]) { return a + this.rand() * (b - a); }

  get active() { return this.flies.length > 0; }

  start() {
    if (!this.spots.length) return;
    const spot = this.spots[Math.floor(this.rand() * this.spots.length)];
    const n = Math.round(this.between(this.size));
    this.flies = [];
    for (let i = 0; i < n; i += 1) {
      const a = this.rand() * TAU;
      const d = this.rand() * spot.r;
      this.flies.push({ cx: spot.x + Math.cos(a) * d, cy: spot.y + Math.sin(a) * d * 0.6,
        rx: 6 + this.rand() * 14, ry: 3 + this.rand() * 8, w: 0.4 + this.rand() * 0.8, t: this.rand() * TAU,
        blink: 1.2 + this.rand() * 2, bt: this.rand() * TAU, x: 0, y: 0 });
    }
    this.age = 0;
    this.span = this.between(this.life);
  }

  update(dt) {
    if (!this.active) {
      this.wait -= dt;
      if (this.wait <= 0) this.start();
      return;
    }
    this.age += dt;
    for (const f of this.flies) {
      f.t += dt * f.w;
      f.bt += dt * f.blink;
      f.cx += Math.sin(f.t * 0.37) * dt * 3;
      f.x = f.cx + Math.cos(f.t) * f.rx;
      f.y = f.cy + Math.sin(f.t * 1.7) * f.ry - this.age * 0.6;
    }
    if (this.age >= this.span) {
      this.flies = [];
      this.wait = this.between(this.gap[this.phase] || this.gap.day);
    }
  }

  // Swarm fade: in over 2 s, out over the last 3 s.
  fade() { return Math.max(0, Math.min(1, this.age / 2, (this.span - this.age) / 3)); }

  solidRects() { return []; }

  draw(_ctx, _assets, _t, look) { this.phase = (look && look.phase) || 'day'; }

  drawGlow(ctx, look) {
    if (!this.active) return;
    const dark = look.phase === 'night' ? 1 : look.phase === 'sunset' ? 0.8 : 0.55;
    const fade = this.fade();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flies) {
      const on = (0.35 + 0.65 * Math.max(0, Math.sin(f.bt))) * fade * dark;
      if (on <= 0.02) continue;
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      const g = ctx.createRadialGradient(x + 0.5, y + 0.5, 0, x + 0.5, y + 0.5, 5);
      g.addColorStop(0, 'rgba(214, 255, 140, ' + (0.55 * on) + ')');
      g.addColorStop(1, 'rgba(214, 255, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 5, y - 5, 11, 11);
      ctx.fillStyle = 'rgba(250, 255, 200, ' + on + ')';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }
}

// A holographic koi gliding through the sky above the town, east or west,
// wrapping at the map edges. Translucent and additive, drawn after the grade:
// faint by day, vivid at night. Body = segments trailing a travelling wave.
const KOI_TONES = { pink: ['255, 120, 190', '255, 220, 240'], cyan: ['79, 242, 255', '210, 255, 255'], gold: ['255, 200, 90', '255, 245, 200'] };

export class HoloKoi {
  constructor({ y, speed = 12, dir = 1, start = 0, tone = 'pink', width, size = 1 }) {
    this.kind = 'holo_koi';
    this.sortY = 1e6 - 3;
    this.baseY = y * 16;
    this.speed = speed;
    this.dir = dir;
    this.width = width;
    this.headX = start * 16;
    this.t = start;
    this.tone = KOI_TONES[tone] || KOI_TONES.pink;
    this.size = size;
  }

  update(dt) {
    this.t += dt;
    this.headX += this.dir * this.speed * dt;
    if (this.dir > 0 && this.headX > this.width + 40) this.headX = -40;
    if (this.dir < 0 && this.headX < -40) this.headX = this.width + 40;
  }

  solidRects() { return []; }

  draw() {}

  segments() {
    const out = [];
    for (let i = 0; i < 10; i += 1) {
      const x = this.headX - this.dir * i * 2.2 * this.size;
      const y = this.baseY + Math.sin(this.t * 1.6 - i * 0.55) * (1 + i * 0.35) + Math.sin(this.t * 0.3) * 6;
      out.push([x, y, i]);
    }
    return out;
  }

  drawGlow(ctx, look) {
    const a = look.phase === 'night' ? 0.8 : look.phase === 'sunset' ? 0.6 : 0.38;
    const [body, core] = this.tone;
    const segs = this.segments();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const [hx, hy] = segs[2];
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 18 * this.size);
    g.addColorStop(0, 'rgba(' + body + ', ' + 0.22 * a + ')');
    g.addColorStop(1, 'rgba(' + body + ', 0)');
    ctx.fillStyle = g;
    ctx.fillRect(hx - 18 * this.size, hy - 18 * this.size, 36 * this.size, 36 * this.size);
    for (const [x, y, i] of segs) {
      const half = Math.max(0, Math.round((i < 3 ? 2 : i < 7 ? 1.5 : 0.5) * this.size));
      ctx.fillStyle = 'rgba(' + body + ', ' + a * (1 - i * 0.06) + ')';
      ctx.fillRect(Math.round(x), Math.round(y) - half, 2, half * 2 + 1);
      if (i < 6) {
        ctx.fillStyle = 'rgba(' + core + ', ' + a * 0.8 + ')';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    const [tx, ty] = segs[9];                       // tail fin
    ctx.fillStyle = 'rgba(' + body + ', ' + a * 0.7 + ')';
    for (let k = 1; k <= 3; k += 1) {
      ctx.fillRect(Math.round(tx - this.dir * k), Math.round(ty) - k, 1, 1);
      ctx.fillRect(Math.round(tx - this.dir * k), Math.round(ty) + k, 1, 1);
    }
    const [fx, fy] = segs[3];                       // pectoral fins
    ctx.fillRect(Math.round(fx), Math.round(fy) - 3, 1, 1);
    ctx.fillRect(Math.round(fx), Math.round(fy) + 3, 1, 1);
    ctx.restore();
  }
}
