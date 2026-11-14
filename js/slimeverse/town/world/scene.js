// scene.js -- (Slimeverse copy of Money Radar's world/scene.js, NPCs/traffic removed.)
// Scene: builds a playable space from a declarative scene
// definition (data/scenes/*.js) plus the active layout diff (world/layout.js):
// tiles, buildings, props, NPCs, walkers, crowd, labels, exits and spawns.
// Owns the collision world and the y-sorted entity list. Static content
// (tiles, buildings, props) can be rebuilt live while the World Editor
// works; actors (NPCs, walkers, crowd, cars) keep running across rebuilds.
// Knows nothing about Money Radar: interactions are descriptors.

import { CollisionWorld, overlaps } from '../engine/collision.js';
import { TileMap } from './tilemap.js';
import { Building, Prop } from './entities.js';
import { Petals, Fireflies, HoloKoi } from './ambient_fx.js';
import { buildingDef } from '../buildings/registry.js';
import { applyTiles, resolveInstances } from './layout.js';

const TS = 16;

export class Scene {
  constructor(def, assets, diff) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.district = def.district || null;
    this.look = def.look || 'outdoor';
    this.assets = assets;
    this.pixelW = def.width * TS;
    this.pixelH = def.height * TS;
    this.labels = (def.labels || []).map((l) => ({ text: l.text, x: l.tile[0] * TS + 8, y: l.tile[1] * TS, tone: l.tone }));
    this.exits = (def.exits || []).map((e) => ({ ...e, rect: tileRect(e.rect) }));
    this.npcs = {};
    this.actors = [];        // NPCs: solid, drawn, talkable
    this.ambient = [];       // walkers, crowd, cars, birds, drones, bikes
    this.crowd = [];
    this.live = [];          // state-driven actors attached by the app (Lab agents): always drawn/updated
    this.buildStatic(diff);
    this.buildActors();
    this.buildCollision();
  }

  // ---------- static content (rebuildable) ----------
  buildStatic(diff) {
    const def = this.def;
    this.diff = diff || null;
    this.map = new TileMap(def.width, def.height, def.atlas, def.fill);
    this.map.edges = !!def.softEdges;
    def.paint(this.map);
    this.baseTiles = this.map.tiles.slice();
    applyTiles(this.map, diff);
    this.statics = [];
    this.buildings = {};
    this.staticInteractables = [];
    this.doors = [];                 // walk-in doors (buildings you enter)
    this.spawns = {};
    for (const [key, [tx, ty]] of Object.entries(def.spawns || {})) this.spawns[key] = { x: tx * TS + 8, y: ty * TS + 12 };
    const size = (sprite) => this.assets.size(sprite);
    this.instances = resolveInstances(def, diff, size, (id) => buildingDef(id).sprite);
    for (const inst of this.instances) {
      // A deleted custom copy falls back to the object's original art.
      if (inst.sprite && !this.assets.info(inst.sprite) && inst.defaults && inst.defaults.sprite) inst.sprite = inst.defaults.sprite;
      const entity = inst.kind === 'building' ? this.makeBuilding(inst) : this.makeProp(inst);
      if (entity) entity.inst = inst;
    }
    for (const z of def.zones || []) {
      this.staticInteractables.push({ rect: tileRect(z.rect), entity: null, prompt: z.prompt, action: z.action });
    }
    for (const ex of this.exits) {
      if (ex.prompt) this.staticInteractables.push({ rect: ex.rect, entity: null, prompt: ex.prompt, action: { type: 'exit', exit: ex } });
    }
  }

  makeBuilding(inst) {
    const bdef = buildingDef(inst.ref);
    const building = new Building(bdef, inst.x, inst.y);
    if (inst.sprite && inst.sprite !== bdef.sprite) building.sprite = inst.sprite;
    building.attach(this.assets);
    // The door/exit spawn exists even while hidden, so interiors can return.
    this.spawns['door_' + inst.ref] = building.exitSpawn();
    if (inst.hidden) return building;
    this.buildings[inst.ref] = building;
    this.statics.push(building);
    if (bdef.kind === 'closed') return building;   // not open yet: no prompt, no door
    const action = { type: 'building', id: inst.ref };
    const walkIn = bdef.kind === 'enter';
    this.staticInteractables.push({ rect: building.interactRect(), entity: building, prompt: bdef.prompt, action, walkIn });
    if (walkIn) this.doors.push({ rect: building.doorTrigger(), entity: building, prompt: bdef.prompt, action });
    return building;
  }

  makeProp(inst) {
    const p = inst.src || {};
    const prop = new Prop(inst.sprite, inst.x, inst.y, { ...p, anim: inst.anim, flip: inst.flip, phase: inst.phase, solid: inst.solid });
    prop.attach(this.assets);
    if (p.sortBias) prop.sortY += p.sortBias;
    if (inst.hidden) return prop;
    this.statics.push(prop);
    if (p.interact) this.staticInteractables.push({ rect: prop.interactRect(), entity: prop, prompt: p.interact.prompt, action: p.interact.action });
    return prop;
  }

  // Re-derive tiles/buildings/props/collision from a new layout diff.
  rebuild(diff) {
    this.buildStatic(diff);
    this.buildCollision();
  }

  // ---------- actors (persist across rebuilds) ----------
  // Slimeverse copy: no NPCs, walkers, crowd or traffic, only the town's atmosphere.
  buildActors() {
    const def = this.def;
    if (def.petals) {
      // Every sakura in the scene sheds petals from its canopy.
      const lift = { sakura: 36, sakura_small: 24 };
      const trees = (def.props || []).filter((p) => lift[p.sprite] && p.tile)
        .map((p) => ({ x: p.tile[0] * TS + 8, y: (p.tile[1] + 1) * TS - lift[p.sprite] }));
      this.ambient.push(new Petals({ trees, width: this.pixelW, height: this.pixelH, count: def.petals.count }));
    }
    if (def.fireflies) {
      const spots = def.fireflies.spots.map(([tx, ty, r]) => ({ x: tx * TS + 8, y: ty * TS + 8, r: (r || 2) * TS }));
      this.ambient.push(new Fireflies({ spots }));
    }
    for (const k of def.holoKoi || []) this.ambient.push(new HoloKoi({ ...k, width: this.pixelW }));
  }

  // The crowd needs the collision world to place itself, so it is created
  // after the first collision build (and re-pointed on every rebuild).
  ensureCrowd() {}

  get interactables() {
    const out = this.staticInteractables.slice();
    for (const n of this.def.npcs || []) {
      const npc = this.npcs[n.id];
      if (n.action) out.push({ rect: npc.interactRect(), entity: npc, prompt: n.prompt || ('Talk to ' + n.name), action: n.action });
    }
    for (const a of this.live) {
      if (a.interaction) out.push({ rect: a.interactRect(), entity: a, prompt: a.interaction.prompt, action: a.interaction.action });
    }
    for (const w of this.ambientOn === false ? [] : this.crowd) {
      if (w.name) out.push({ rect: w.interactRect(), entity: w, prompt: 'Talk to ' + w.name, action: { type: 'talk' } });
    }
    return out;
  }

  get entities() { return this.statics.concat(this.actors); }

  buildCollision() {
    const world = new CollisionWorld(this.def.width, this.def.height, TS);
    for (let y = 0; y < this.def.height; y += 1) {
      for (let x = 0; x < this.def.width; x += 1) if (this.map.isSolid(x, y)) world.setSolidTile(x, y);
    }
    for (const e of this.entities) for (const r of e.solidRects()) world.addRect(r, e);
    this.world = world;
    this.ensureCrowd();
  }

  spawnPoint(key) {
    return this.spawns[key] || this.spawns.default || { x: this.pixelW / 2, y: this.pixelH / 2 };
  }

  update(dt, player, ambientOn) {
    this.ambientOn = ambientOn;
    for (const a of this.live) a.update(dt, this.world, player);
    if (!ambientOn) return;
    for (const a of this.ambient) {
      if (a.kind === 'walker' || a.kind === 'wanderer') a.update(dt, this.world, player); else a.update(dt, player, player);
    }
  }

  // Door the player walks into: pushing north, feet box touching the
  // door's trigger strip, and the box centre inside the strip's span.
  doorAt(box, intent) {
    if (!intent || !(intent.y < 0)) return null;
    const cx = box.x + box.w / 2;
    return this.doors.find((d) => overlaps(d.rect, box) && cx >= d.rect.x && cx <= d.rect.x + d.rect.w) || null;
  }

  // Exit whose rect the player's feet box overlaps (stepping on a mat).
  exitAt(box) {
    return this.exits.find((e) => e.auto !== false && overlaps(e.rect, box)) || null;
  }

  // What the player is facing, nearest first.
  interactableIn(reach) {
    let best = null;
    let bestD = Infinity;
    const cx = reach.x + reach.w / 2;
    const cy = reach.y + reach.h / 2;
    for (const it of this.interactables) {
      if (!overlaps(it.rect, reach)) continue;
      const d = Math.hypot(it.rect.x + it.rect.w / 2 - cx, it.rect.y + it.rect.h / 2 - cy);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  drawList(player, radar, ambientOn) {
    const list = this.entities;
    list.push(...this.live);
    if (ambientOn) list.push(...this.ambient);
    if (player) list.push(player);
    if (radar) list.push(radar);
    list.sort((a, b) => a.sortY - b.sortY);
    return list;
  }

  // Default tile at a cell (before the layout's tile overrides).
  baseTile(x, y) { return this.baseTiles[y * this.def.width + x]; }
}

function tileRect([x, y, w, h]) {
  return { x: x * TS, y: y * TS, w: w * TS, h: h * TS };
}
