// slime_town.js -- The Slimeverse world: Money Radar's neo-zen pixel town
// (copied engine + art in this folder) with slimes walking around it.
// The classic Slimeverse scripts (js/slimeverse/*.js) own the socket, input
// and fixed-step physics; this module owns the town: building it, collision
// against its walls/water/buildings, drawing a frame, and turning world
// positions into screen positions for name tags.
// Loaded once with import() by js/slimeverse/loader.js, then used through
// window.SlimeTown.

import { AssetStore } from './engine/assets.js';
import { Camera } from './engine/camera.js';
import { moveBox, nearestFree } from './engine/collision.js';
import { Renderer } from './engine/renderer.js';
import { Lighting } from './lighting/index.js';
import { Scene } from './world/scene.js';
import { sceneLayout } from './world/layout.js';
import { TOWN } from './scene/slime_buildings.js';   // the town + HAT SHOP and FINAL 4
import { HOME_LAYOUT } from './scene/home_layout.js';

// Kamil's own town look from Money Radar: night, strong shadows, moon and light shafts.
const LOOK_SETTINGS = {
  real_lighting: true, light_shadows: true, light_shading: true, light_moon: true,
  light_rim: false, light_shafts: true, light_intensity: 180, light_contrast: 135, light_shadow: 200,
};
const PHASE = 'night';
const TARGET_ROWS = 22;          // about 22 tiles of town fill the screen height
const SLIME_R = 12;              // slime body radius in town pixels (a town character is 16 wide, 24 tall)
const FOOT = { w: 12, h: 6 };    // the slime's feet box for collision
const OPEN_DOORS = new Set(['hat_shop', 'final4']);

// A slime in the town. x/y = feet on the ground (town px); hop = height of a jump.
class SlimeAvatar {
  constructor() {
    this.kind = 'slime';
    this.x = 0; this.y = 0; this.hop = 0; this.sortY = 0;
    this.p = {};
  }

  place(x, y, hop, p) {
    this.x = x; this.y = y; this.hop = Math.max(0, hop || 0); this.sortY = y; this.p = p || {};
  }

  solidRects() { return []; }
  update() {}

  // Drawn after the night grade (like the town's fireflies): a soft glow in the
  // slime's own colour, so every slime stays readable on a dark street.
  drawGlow(ctx) {
    const r = SLIME_R;
    const x = this.x;
    const y = this.y - this.hop - r * 0.35;
    const color = this.p.color || '#00ff00';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
    g.addColorStop(0, hexAlpha(color, 0.42));
    g.addColorStop(0.55, hexAlpha(color, 0.16));
    g.addColorStop(1, hexAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.restore();
  }

  draw(ctx) {
    const r = SLIME_R;
    const x = this.x;
    const y = this.y - this.hop;
    // Ground shadow shrinks as the slime hops.
    const k = Math.max(0.45, 1 - this.hop / 40);
    ctx.save();
    ctx.globalAlpha = 0.35 * k;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, this.y, r * 0.95 * k, r * 0.32 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const color = this.p.color || '#00ff00';
    const img = globalThis.greenSlimeImage;
    if (img && img.complete && typeof globalThis.getTintedCanvas === 'function') {
      const tc = globalThis.getTintedCanvas(img, color);
      const s = (r * 2) / tc.width;
      ctx.drawImage(tc, x - r, y - tc.height * s * 0.72, tc.width * s, tc.height * s);
    } else {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.42, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.42, r * 0.08, 0, Math.PI * 2); ctx.fill();
    if (typeof globalThis.drawHatAt === 'function') {
      globalThis.drawHatAt(ctx, x, y - r + 1, r, { hat: this.p.hat || 'none', anim: this.p.hatAnim || 'none', drawing: this.p.hatDrawing || [] });
    }
  }
}

function hexAlpha(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  const n = m ? parseInt(m[1], 16) : 0x00ff00;
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function footBox(x, y) { return { x: x - FOOT.w / 2, y: y - FOOT.h, w: FOOT.w, h: FOOT.h }; }

export async function createSlimeTown(onProgress) {
  const assets = new AssetStore();
  await assets.load(onProgress);
  const scene = new Scene(TOWN, assets, sceneLayout(HOME_LAYOUT, 'town', false));
  const camera = new Camera();
  camera.setMap(scene.pixelW, scene.pixelH);
  camera.smoothing = true;
  const surface = document.createElement('canvas');
  const renderer = new Renderer(surface);
  const lighting = new Lighting();
  lighting.configure(LOOK_SETTINGS);
  const self = new SlimeAvatar();
  const others = {};
  let scale = 2;

  const town = {
    width: scene.pixelW,
    height: scene.pixelH,

    spawn() {
      const s = scene.spawnPoint('default');
      return { x: s.x, y: s.y };
    },

    // Move a slime's feet by (dx, dy) with the town's collision (slides along walls).
    move(x, y, dx, dy) {
      const m = moveBox(scene.world, footBox(x, y), dx, dy);
      return { x: x + m.dx, y: y + m.dy };
    },

    // Nearest spot that is not inside a wall (spawns, server teleports).
    free(x, y) {
      const fix = nearestFree(scene.world, footBox(x, y));
      return fix ? { x: x + fix.dx, y: y + fix.dy } : { x, y };
    },

    // The Slimeverse building whose door the slime walks into (pushing north), or null.
    // Money Radar's own buildings stay closed: only the HAT SHOP and FINAL 4 open.
    doorAt(x, y, pushingUp) {
      if (!pushingUp) return null;
      const d = scene.doorAt(footBox(x, y), { y: -1 });
      const id = d && d.action && d.action.id;
      return id && OPEN_DOORS.has(id) ? id : null;
    },

    // An open door close to the slime, for the "walk in" hint: {id, name, x, y} or null.
    doorNear(x, y) {
      for (const id of OPEN_DOORS) {
        const b = scene.buildings[id];
        if (!b) continue;
        const d = b.doorRect();
        const cx = d.x + d.w / 2;
        const by = d.y + d.h;
        if (Math.abs(x - cx) < 34 && y >= by - 4 && y < by + 44) return { id, name: b.def ? b.def.name : id, x: cx, y: d.y };
      }
      return null;
    },

    // Where a slime stands when it comes back out of a building.
    doorExit(id) {
      const b = scene.buildings[id];
      return b ? b.exitSpawn() : this.spawn();
    },

    districtAt(x) {
      const tx = x / 16;
      const d = (TOWN.districts || []).find((it) => tx >= it.from && tx < it.to);
      return d ? d.name : TOWN.name;
    },

    resize(w, h) {
      scale = Math.max(1, h / (16 * TARGET_ROWS));
      const { viewW, viewH } = renderer.resize(w, h, scale, 1);
      camera.setView(viewW, viewH);
    },

    // One frame. me = {x, y, hop, p}; players = [{id, x, y, hop, p}] for everyone else.
    frame(ctx, w, h, t, dt, me, players) {
      if (surface.width !== Math.round(w) || surface.height !== Math.round(h)) this.resize(w, h);
      self.place(me.x, me.y, me.hop, me.p);
      const seen = {};
      for (const pl of players) {
        const a = others[pl.id] || (others[pl.id] = new SlimeAvatar());
        a.place(pl.x, pl.y, pl.hop, pl.p);
        seen[pl.id] = true;
      }
      for (const id of Object.keys(others)) if (!seen[id]) delete others[id];
      scene.live = Object.values(others);
      scene.update(dt, self, true);
      camera.follow(me.x, me.y, dt);
      renderer.render(scene, camera, assets, t, {
        phase: PHASE, reducedMotion: false, lighting: lighting.enabled ? lighting : null,
        player: self, radar: null, ambient: true, focus: null, overlay: null,
      });
      ctx.drawImage(surface, 0, 0, w, h);
    },

    snapCamera(x, y) { camera.snapTo(x, y); },

    // Town px -> screen px on the slime canvas (for name tags drawn on top).
    toScreen(x, y) {
      const camX = Math.round(camera.x * scale) / scale;
      const camY = Math.round(camera.y * scale) / scale;
      return { x: (x - camX) * scale, y: (y - camY) * scale, scale };
    },

    slimeRadius: SLIME_R,
  };
  return town;
}
