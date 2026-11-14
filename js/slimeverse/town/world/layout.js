// layout.js -- The editable layer over a scene definition (pure, no DOM;
// unit tested). A scene's buildings and props get STABLE uids derived from
// the code-defined default; a layout is a DIFF over that default
// ({tiles, removed, changed, added}, see docs/LIFE_RPG_WORLD_BUILDER.md),
// so defaults shipped later still appear and "reset" = drop the diff.

const TS = 16;
export const LAYOUT_SCHEMA = 'moneyradar.life.layout';
export const LAYOUT_VERSION = 1;
const SOLID_TILE = /^(sea|sea_deep|shore|hedge_tile|river.*|channel_h|wall_.+)$/;

export function emptyLayout() { return { schema: LAYOUT_SCHEMA, version: LAYOUT_VERSION, scenes: {} }; }

export function emptySceneLayout() { return { tiles: {}, removed: [], changed: {}, added: [] }; }

// The scene's own diff, created on first write.
export function sceneLayout(layout, sceneId, create) {
  if (!layout.scenes[sceneId] && create) layout.scenes[sceneId] = emptySceneLayout();
  return layout.scenes[sceneId] || null;
}

export function isSolidTileName(name) { return SOLID_TILE.test(name || ''); }

export function cloneLayout(layout) { return JSON.parse(JSON.stringify(layout || emptyLayout())); }

// Default instances of a scene definition, in definition order.
// `size(sprite)` -> {w, h} (frame size) from the asset manifest.
export function defaultInstances(def, size, buildingSprite = () => undefined) {
  const out = [];
  const seen = {};
  const uniq = (uid) => {
    seen[uid] = (seen[uid] || 0) + 1;
    return seen[uid] === 1 ? uid : uid + '#' + seen[uid];
  };
  for (const b of def.buildings || []) {
    out.push(withDefaults({ uid: 'bld:' + b.id, kind: 'building', ref: b.id, sprite: b.sprite || buildingSprite(b.id),
      x: b.tile[0] * TS, y: b.tile[1] * TS, flip: false, solid: true, hidden: false, added: false, src: b }));
  }
  for (const p of def.props || []) {
    const { w, h } = size(p.sprite);
    let x;
    let y;
    let uid;
    if (p.at) { x = p.at[0]; y = p.at[1]; uid = 'prop:' + p.sprite + '@px' + p.at[0] + ',' + p.at[1]; } else {
      x = p.tile[0] * TS + 8 - w / 2 + (p.dx || 0);
      y = (p.tile[1] + 1) * TS - h + (p.dy || 0);
      uid = 'prop:' + p.sprite + '@' + p.tile[0] + ',' + p.tile[1];
    }
    // A prop whose default art was swapped keeps its old uid, so saved edits still apply.
    if (p.uid) uid = p.uid;
    out.push(withDefaults({ uid: uniq(uid), kind: 'prop', sprite: p.sprite, x, y, flip: !!p.flip, solid: p.solid !== false,
      anim: p.anim || null, phase: p.phase || 0, hidden: false, ground_ok: !!p.ground_ok, added: false, src: p }));
  }
  return out;
}

function withDefaults(inst) {
  inst.defaults = { x: inst.x, y: inst.y, flip: inst.flip, solid: inst.solid, sprite: inst.sprite, hidden: false, ground_ok: !!inst.ground_ok };
  return inst;
}

// Effective instances = defaults minus removed, with changes, plus added.
export function resolveInstances(def, sl, size, buildingSprite) {
  const base = defaultInstances(def, size, buildingSprite);
  if (!sl) return base;
  const removed = new Set(sl.removed || []);
  const out = [];
  for (const inst of base) {
    if (removed.has(inst.uid)) continue;
    const ch = (sl.changed || {})[inst.uid];
    out.push(ch ? { ...inst, ...ch, edited: true } : inst);
  }
  for (const a of sl.added || []) {
    out.push({ kind: 'prop', flip: false, solid: true, anim: null, phase: 0, hidden: false, ...a, added: true,
      src: { sprite: a.sprite, solid: a.solid, anim: a.anim } });
  }
  return out;
}

export function applyTiles(map, sl) {
  if (!sl || !sl.tiles) return;
  for (const [key, name] of Object.entries(sl.tiles)) {
    const [x, y] = key.split(',').map(Number);
    map.set(x, y, name, isSolidTileName(name));
  }
}

// ---------- edit operations (mutate a scene diff) ----------
function patchInstance(sl, inst, patch) {
  if (inst.added) {
    const entry = sl.added.find((a) => a.uid === inst.uid);
    if (entry) Object.assign(entry, patch);
    return;
  }
  const next = { ...(sl.changed[inst.uid] || {}), ...patch };
  // Drop keys that are back to the default so "edited" stays honest.
  for (const key of Object.keys(next)) if (inst.src && defaultValue(inst, key) === next[key]) delete next[key];
  if (Object.keys(next).length) sl.changed[inst.uid] = next; else delete sl.changed[inst.uid];
}

function defaultValue(inst, key) {
  if (inst.defaults) return inst.defaults[key];
  return undefined;
}

export function setInstance(sl, inst, patch) { patchInstance(sl, inst, patch); }

export function removeInstance(sl, inst) {
  if (inst.added) { sl.added = sl.added.filter((a) => a.uid !== inst.uid); return; }
  delete sl.changed[inst.uid];
  if (!sl.removed.includes(inst.uid)) sl.removed.push(inst.uid);
}

export function newUid(rand = Math.random) {
  let s = 'u_';
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 8; i += 1) s += abc[Math.floor(rand() * abc.length)];
  return s;
}

export function addInstance(sl, { sprite, x, y, flip = false, solid = true, anim = null }, rand) {
  const entry = { uid: newUid(rand), sprite, x: Math.round(x), y: Math.round(y), flip: !!flip, solid: !!solid, anim: anim || null };
  sl.added.push(entry);
  return entry;
}

export function resetInstance(sl, uid) {
  delete sl.changed[uid];
  sl.removed = sl.removed.filter((u) => u !== uid);
}

// Paint one tile; painting the default tile back removes the override.
export function paintTile(sl, tx, ty, name, defaultName) {
  const key = tx + ',' + ty;
  if (name === defaultName) delete sl.tiles[key]; else sl.tiles[key] = name;
}

// Reset a tile rect [tx, ty, tw, th] to the original: tiles, default
// objects whose origin lies inside (restored + unchanged), added objects
// inside are removed. `instances` = default instances of the scene.
export function resetArea(sl, rect, defaults) {
  const [rx, ry, rw, rh] = rect;
  const inside = (px, py) => px >= rx * TS && px < (rx + rw) * TS && py >= ry * TS && py < (ry + rh) * TS;
  for (const key of Object.keys(sl.tiles)) {
    const [x, y] = key.split(',').map(Number);
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) delete sl.tiles[key];
  }
  for (const d of defaults) if (inside(d.x, d.y)) resetInstance(sl, d.uid);
  for (const uid of Object.keys(sl.changed)) {
    const c = sl.changed[uid];
    if (c.x !== undefined && inside(c.x, c.y)) delete sl.changed[uid];
  }
  sl.added = sl.added.filter((a) => !inside(a.x, a.y));
}

export function sceneIsEmpty(sl) {
  return !sl || (!Object.keys(sl.tiles).length && !sl.removed.length && !Object.keys(sl.changed).length && !sl.added.length);
}

// Drop empty scene diffs (keeps saved files small and comparisons exact).
export function compactLayout(layout) {
  const out = cloneLayout(layout);
  for (const id of Object.keys(out.scenes)) if (sceneIsEmpty(out.scenes[id])) delete out.scenes[id];
  return out;
}

export function layoutsEqual(a, b) { return JSON.stringify(compactLayout(a)) === JSON.stringify(compactLayout(b)); }

export function snap(value, grid) { return Math.round(value / grid) * grid; }

// Client-side guard before import (the server validates again, strictly).
export function looksLikePresetFile(doc) {
  return !!doc && typeof doc === 'object' && doc.schema === 'moneyradar.life.preset' && doc.version === 1
    && doc.layout && doc.layout.schema === LAYOUT_SCHEMA && typeof doc.layout.scenes === 'object';
}
