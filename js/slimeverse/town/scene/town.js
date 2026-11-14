// town.js -- Copied from Money Radar (scripts/ui/life/data/scenes/town.js) for the Slimeverse:
// NPCs, traffic, birds and drones left out; scenery only. Original header:
// "Sunset Bay", neo-zen Tokyo edition: the whole outdoor world
// on ONE screen. 96 x 40 tiles = 1536 x 640 world px, fitted EXACTLY to the
// width of a 3440 x 1440 ultrawide (~2.24x, drawn crisp through an integer
// buffer: engine/renderer.js), so everything is a little bigger than the
// old 2x and the camera never has to move.
//   x 0-8     west jungle grove      x 86-95  east jungle grove (+ NE grove)
//   x 9-31    Westpoint Labs (dusk grass, tech paving, THE LABORATORY)
//   x 32-35   the river: lion spring at its head (rows 20-21), the garden
//             bridge (rows 24-25) and the boardwalk bridge (rows 30-31), each
//             with granite landings and lantern posts, then a river mouth
//             into the sea (row 35)
//   x 36-85   Sunset Bay (Career Center, The Bank, Strategy Studio, ...);
//             the zen square (x 36-56, rows 20-29) centres on the grand bonsai fountain
//   rows 0-11 building row   rows 12-19 sidewalk / neon boulevard (road 14-17) / promenade
//   rows 20-29 lab plaza + annex | zen garden square | GFX + FITNESS
//   row 30-31 boardwalk      rows 32-34 beach     rows 35-39 ocean
// Stepping-stone trails wind through the groves. The four daily buildings
// sit side by side on the north row: door to door is 3-7 s at walking speed.
// Sakura petals, firefly swarms and holographic koi: world/ambient_fx.js.

const W = 96;
const H = 40;
const WP = 32;   // the river is the border between the two neighbourhoods
const RX = 32;   // river: columns RX .. RX + 3

function river(map) {
  map.fill(RX, 22, 4, 1, 'river_t', { solid: true });
  map.fill(RX, 23, 1, 12, 'river_l', { solid: true });
  map.fill(RX + 1, 23, 2, 12, 'river', { solid: true });
  map.fill(RX + 3, 23, 1, 12, 'river_r', { solid: true });
  map.fill(RX, 35, 1, 1, 'river_mouth_l', { solid: true });   // the banks run on down to the surf
  map.fill(RX + 1, 35, 2, 1, 'river_mouth', { solid: true });
  map.fill(RX + 3, 35, 1, 1, 'river_mouth_r', { solid: true });
  for (const y of [24, 30]) {                              // garden bridge, boardwalk bridge
    map.fill(RX, y, 4, 2, 'bridge', { solid: false });
    map.fill(RX - 1, y, 1, 2, 'bridge_end_l', { solid: false });
    map.fill(RX + 4, y, 1, 2, 'bridge_end_r', { solid: false });
  }
}

// Stepping-stone trails winding through the groves (ground tiles only);
// the grove generator keeps every trunk off them.
const TRAILS = [
  [[4, 29], [5, 28], [5, 27], [4, 26], [3, 25], [3, 24], [4, 23], [5, 22], [5, 21], [4, 20]],
  [[90, 29], [91, 28], [91, 27], [90, 26], [89, 25], [89, 24], [90, 23], [91, 22], [91, 21], [90, 20]],
  [[6, 11], [6, 10], [5, 9], [5, 8], [6, 7], [7, 6], [7, 5], [6, 4], [5, 3]],
  [[88, 11], [88, 10], [89, 9], [90, 8], [90, 7], [89, 6], [88, 5], [88, 4], [89, 3]],
];
const TRAIL_SET = new Set(TRAILS.flat().map(([x, y]) => x + ',' + y));

function trails(map) {
  for (const path of TRAILS) for (const [x, y] of path) map.set(x, y, 'stepping');
}

function paint(map) {
  // North: dusk lawn (Westpoint) and moss (Sunset Bay).
  map.fill(0, 0, WP, 12, 'grass_dusk', { alt: 'grass_dusk_alt', every: 5 });
  map.fill(WP, 0, W - WP, 12, 'grass', { alt: 'grass_alt', every: 6 });
  map.fill(0, 0, W, 1, 'hedge_tile', { solid: true });
  [[39, 2], [58, 1], [71, 3], [74, 9], [79, 6], [83, 10], [92, 6], [2, 6], [10, 2], [94, 2]]
    .forEach(([x, y]) => map.set(x, y, x < WP ? 'grass_dusk' : 'grass_flowers'));
  map.fill(30, 9, 16, 3, 'plaza', { alt: 'plaza_alt', every: 13 });          // Career Center forecourt
  map.fill(13, 10, 18, 2, 'lab_plaza', { alt: 'lab_plaza_alt', every: 4 });  // Laboratory forecourt
  map.fill(13, 11, 18, 1, 'tech_line_h');
  // Sidewalk, the neon boulevard across the whole width, promenade.
  map.fill(0, 12, WP, 1, 'tech_pave', { alt: 'tech_pave_alt', every: 4 });
  map.fill(WP, 12, W - WP, 1, 'pave', { alt: 'pave_alt', every: 4 });
  map.fill(0, 13, W, 1, 'pave_curb');
  map.fill(0, 14, W, 4, 'road');
  // The centre line sits ON the seam between rows 15 and 16 (the middle of
  // the four lanes 14-17): the dash is split across the two tiles.
  map.fill(0, 15, W, 1, 'road_dash_n');
  map.fill(0, 16, W, 1, 'road_dash_s');
  for (const x of [21, 38, 51, 63]) map.fill(x, 14, 3, 4, 'road_crosswalk');
  map.fill(0, 18, W, 1, 'pave_curb_top');
  map.fill(0, 19, WP, 1, 'tech_pave', { alt: 'tech_pave_alt', every: 4 });
  map.fill(WP, 19, W - WP, 1, 'pave', { alt: 'pave_alt', every: 4 });
  map.fill(31, 19, 6, 1, 'pave_petals');                  // under the blossom by the spring
  // Westpoint south: the Lab Annex, the lab plaza (its tech line runs onto
  // the garden bridge), the Snack Pod by the boardwalk.
  map.fill(0, 20, WP, 10, 'grass_dusk', { alt: 'grass_dusk_alt', every: 5 });
  map.fill(18, 20, 13, 6, 'lab_plaza', { alt: 'lab_plaza_alt', every: 4 });
  map.fill(18, 24, 13, 1, 'tech_line_h');
  map.fill(24, 20, 2, 6, 'tech_line_v');
  map.fill(24, 24, 2, 1, 'lab_plaza_core');
  map.fill(24, 26, 2, 4, 'path');                // plaza core down to the boardwalk
  map.fill(12, 27, 2, 1, 'path');                // Lab Annex door
  map.fill(10, 28, 14, 1, 'path');
  // Sunset Bay south: the zen garden square, then GFX and FITNESS.
  map.fill(WP, 20, W - WP, 10, 'grass', { alt: 'grass_alt', every: 6 });
  map.fill(36, 20, 21, 10, 'plaza', { alt: 'plaza_alt', every: 13 });
  // The grand fountain's round court (a flat prop) fills the middle; raked
  // gravel beds flank it and the paths run up to its edge.
  map.fill(37, 22, 5, 2, 'gravel_h');
  map.fill(51, 22, 5, 2, 'gravel_v');
  map.fill(37, 24, 4, 2, 'path');                // bridge landing -> court
  map.fill(52, 24, 5, 2, 'path');                // court -> east
  map.fill(45, 28, 3, 2, 'path');                // court -> gate -> boardwalk
  map.fill(60, 28, 2, 2, 'path');                // GFX door
  map.fill(69, 28, 2, 2, 'path');                // FITNESS door
  map.fill(57, 29, 17, 1, 'path');
  [[66, 29], [80, 20], [94, 24], [2, 21]].forEach(([x, y]) => map.set(x, y, x < WP ? 'grass_dusk' : 'grass_flowers'));
  // Waterfront.
  map.fill(0, 30, W, 1, 'boardwalk');
  map.fill(0, 31, W, 1, 'boardwalk_edge');
  map.fill(0, 32, W, 3, 'sand', { alt: 'sand_alt', every: 5 });
  [[6, 33], [26, 34], [44, 33], [58, 34], [88, 33]].forEach(([x, y]) => map.set(x, y, 'sand_shell'));
  map.fill(0, 35, W, 1, 'shore', { solid: true });
  map.fill(0, 36, W, 2, 'sea', { solid: true });
  map.fill(0, 38, W, 2, 'sea_deep', { solid: true });
  river(map);
  trails(map);
}

const sway = (sprite) => (x, y, phase, uid) => ({ sprite, tile: [x, y], anim: 'sway', phase, ...(uid ? { uid } : {}) });
const sakura = sway('sakura');
const sakuraS = sway('sakura_small');
const bamboo = sway('bamboo');
const jungle = sway('jungle_tree');
const jungleG = sway('jungle_tree_glow');
const tfern = sway('tree_fern');
const palm = sway('palm');
const tpalm = sway('palm_tech');
const grass = (x, y, phase) => ({ sprite: 'tall_grass', tile: [x, y], anim: 'sway', phase, solid: false });
const deco = (sprite) => (x, y) => ({ sprite, tile: [x, y], solid: false });
const fern = deco('fern');
const shroom = deco('glow_shroom');
const lit = (sprite) => (x, y) => ({ sprite, tile: [x, y], anim: 'auto-lit' });
const light = lit('streetlight');
const llight = lit('lab_streetlight');
const toro = lit('stone_lantern');
const chochin = lit('paper_lantern');
const post = lit('bridge_post');
const pole = (x, y, phase) => ({ sprite: 'neon_pole', tile: [x, y], anim: 'flicker', phase });
const pylon = (x, y, phase) => ({ sprite: 'glow_pylon', tile: [x, y], anim: 'pulse', phase });
// Bridge rails sit on the river (already solid); the near rail draws in front.
const rail = (y) => ({ sprite: 'bridge_rail', tile: [RX + 1, y], dx: 8, solid: false });
const say = (prompt, speaker, lines) => ({ prompt, action: { type: 'dialog', speaker, lines } });

// Rainforest groves on the open land: a jittered lattice of big trees (solid
// only at the trunk), glowing-pod trees, tree ferns and monstera, with
// ferns, tall grass and glow mushrooms underneath. Deterministic; trunks
// never land on (or right beside) a trail stone, so the groves stay walkable.
function hash(x, y, k) {
  let n = (x * 374761393 + y * 668265263 + k * 1442695041) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}

const nearTrail = (x, y) => TRAIL_SET.has(x + ',' + y) || TRAIL_SET.has((x - 1) + ',' + y) || TRAIL_SET.has((x + 1) + ',' + y);

function grove(x0, x1, y0, y1, seed, skip = () => false) {
  const out = [];
  for (let gy = y0; gy <= y1; gy += 2) {
    for (let gx = x0 + (gy % 2); gx <= x1; gx += 3) {
      const h = hash(gx, gy, seed);
      const x = Math.min(x1, Math.max(x0, gx + (h % 3) - 1));
      const y = Math.min(y1, gy + ((h >>> 3) % 2));
      if (skip(x, y) || nearTrail(x, y)) continue;
      const kind = (h >>> 5) % 20;
      const phase = ((h >>> 9) % 10) / 10;
      out.push(kind < 12 ? jungle(x, y, phase) : kind < 15 ? jungleG(x, y, phase) : kind < 19 ? tfern(x, y, phase) : { sprite: 'monstera', tile: [x, y] });
      const u = (h >>> 12) % 6;                   // understory, never solid
      const ux = x + ((h >>> 15) % 2 ? 1 : -1);
      if (TRAIL_SET.has(ux + ',' + (y + 1)) || ux < 0 || ux > W - 1) continue;
      if (u < 2) out.push(fern(ux, y + 1));
      else if (u < 4) out.push(grass(ux, y + 1, phase));
      else if (u === 4) out.push(shroom(ux, y + 1));
    }
  }
  return out;
}

const GROVES = [
  ...grove(0, 12, 2, 10, 1, (x, y) => x < 8 && y >= 8),     // north-west, around the Laboratory lawn
  ...grove(0, 7, 21, 29, 2),                                // south-west, beside the Lab Annex
  ...grove(84, 95, 2, 11, 3),                               // north-east grove
  ...grove(87, 95, 21, 29, 4),                              // south-east, past the Residences
  ...grove(76, 83, 2, 4, 5, (x) => x >= 79 && x <= 81),     // the lawn east of the Strategy Studio
  sakura(73, 6, 0.3), bamboo(80, 5, 0.2), bamboo(82, 11, 0.7), jungle(80, 9, 0.4),
  palm(2, 33, 0.3), palm(93, 33, 0.6), { sprite: 'palm_small', tile: [5, 34], anim: 'sway', phase: 0.2 },
];

export const TOWN = {
  id: 'town', name: 'Sunset Bay', district: 'sunset_bay', subtitle: 'The whole coast, one walk',
  look: 'outdoor', fit: true, fitExact: true, softEdges: true,
  width: W, height: H, atlas: 'tiles_city', fill: 'grass', paint,
  // The HUD names the neighbourhood under the player (no loading between them).
  districts: [
    { id: 'lab_district', name: 'Westpoint Labs', from: 0, to: WP },
    { id: 'city', name: 'Sunset Bay', from: WP, to: W },
  ],
  buildings: [
    { id: 'laboratory', tile: [15, 0] },
    { id: 'career', tile: [32, 1] },
    { id: 'finance', tile: [47, 3] },
    { id: 'strategy', tile: [59, 2] },   // one tile taller: same ground line, more room under the sign
    // South of the boulevard.
    { id: 'lab_annex', tile: [9, 20] },
    { id: 'lab_pod', tile: [25, 24] },   // one tile clear of the garden bridge
    { id: 'gfx', tile: [57, 20] },
    { id: 'fitness', tile: [66, 20] },
    // A slimmer tower for the one-screen town: its foot stands on the beach.
    { id: 'condo', tile: [75, 18], sprite: 'bld_condo_tower' },
  ],
  props: [
    ...GROVES,
    // Westpoint north lawn.
    { sprite: 'tesla_coil', tile: [14, 8], anim: 'spark' }, { sprite: 'tesla_coil', tile: [30, 7], anim: 'spark', phase: 0.4 },
    // Swapped art keeps the old palm uids, so saved World Editor edits still apply.
    bamboo(13, 11, 0.3, 'prop:palm_tech@17,11'), bamboo(30, 11, 0.6, 'prop:palm_tech@35,11'),
    // Sunset Bay north lawn: blossom between the buildings, a holo billboard.
    sakuraS(46, 11, 0.2, 'prop:palm@51,11'), sakuraS(58, 11, 0.7, 'prop:palm@63,11'), sakuraS(70, 11, 0.4, 'prop:palm@75,11'),
    { sprite: 'holo_billboard', tile: [77, 11], anim: 'play' }, toro(72, 11),
    { sprite: 'bench', tile: [41, 11] }, { sprite: 'trash_can', tile: [31, 13] },
    // The boulevard: street lamps and neon sign poles stand on the curb rows,
    // so the lane every door opens onto (row 12) stays one clear walk.
    llight(11, 13), llight(26, 13), light(36, 13), light(49, 13), light(61, 13), light(75, 13),
    pole(44, 13, 0.0), pole(67, 13, 0.5), pole(83, 13, 0.2), pole(6, 13, 0.7),
    { sprite: 'mailbox', tile: [55, 13] }, { sprite: 'hydrant', tile: [69, 13] },
    llight(11, 19), llight(28, 19), light(40, 19), light(53, 19), light(65, 19),
    pole(44, 19, 0.3), pole(60, 19, 0.8), pole(72, 19, 0.1), pole(18, 19, 0.6),
    chochin(38, 19), chochin(56, 19), chochin(47, 19),
    { sprite: 'holo_billboard', tile: [4, 11], anim: 'play', phase: 0.6 },
    // The river head: the lion spring, blossom on the bank.
    { sprite: 'lion_spring', tile: [RX + 1, 21], dx: 8, dy: 8, anim: 'flow' },   // its stream lands in the river sakuraS(31, 21, 0.3),
    // Both bridges: rails over the water, a lantern post at each corner.
    rail(23), rail(26), rail(29), rail(32),
    post(31, 23), post(36, 23), post(31, 26), post(36, 26),
    post(31, 29), post(36, 29), post(31, 32), post(36, 32),
    // The lab plaza.
    pylon(19, 21, 0.0), pylon(30, 21, 0.5), pylon(19, 25, 0.25),
    { sprite: 'holo_sign', tile: [21, 21], anim: 'flicker',
      interact: say('Read the hologram', 'Hologram', ['WESTPOINT LABS. Ideas are tested here before they are trusted.', 'THE LABORATORY is just north, across the boulevard.', 'The lion spring feeds the river east of the plaza.']) },
    { sprite: 'lab_bench', tile: [21, 23] }, { sprite: 'lab_bench', tile: [28, 22] },
    { sprite: 'crystal_planter', tile: [27, 23], anim: 'shimmer' }, { sprite: 'crystal_planter', tile: [22, 26], anim: 'shimmer', phase: 0.5 },
    // Around the annex and pod.
    tpalm(18, 29, 0.5), { sprite: 'lab_bench', tile: [20, 29] },
    // The zen garden square: notice boards along the top, then the grand
    // bonsai fountain on its round court (props_fountain.py), framed by two
    // sakura and the neon gate to the sea.
    { sprite: 'sign_post', tile: [37, 21],
      interact: say('Read the sign', 'Sign', ['North: THE LABORATORY, Career Center, The Bank, Strategy Studio.', 'West: the garden bridge to Westpoint. East: GFX, FITNESS and the Waterfront Residences. South: the beach.']) },
    { sprite: 'job_poster', tile: [40, 21] },
    { sprite: 'newsbox', tile: [43, 21] },
    { sprite: 'vending', tile: [55, 21],
      interact: say('Vending machine', 'Vending machine', ['Out of lemon soda. The sign says: back tomorrow.']) },
    { sprite: 'grand_fountain_apron', at: [652, 338], flat: true, solid: false, uid: 'prop:grand_fountain_apron' },
    { sprite: 'grand_fountain', at: [680, 318], anim: 'flow', uid: 'prop:grand_fountain',
      interact: say('Look at the fountain', 'Bonsai fountain', ['An old juniper grows on a rock in the middle of the water. Nobody remembers who planted it.', 'The water sheets over the inner ring without a sound. Lights glow under the surface.']) },
    // The bonsai on the fountain's rock island: its trunk foot (sprite bottom
    // centre) sits on fountain px (64, 68); sortBias draws it just after the
    // fountain (whose base is 48 px lower) so the basin never covers it.
    { sprite: 'grand_bonsai', at: [686, 287], anim: 'sway', phase: 0.35, solid: false, sortBias: 48, uid: 'prop:grand_bonsai' },
    sakura(37, 29, 0.2), sakura(55, 29, 0.6),
    // The gate stands on the boardwalk: the arch into the square, clear of the fountain.
    { sprite: 'neon_gate', tile: [46, 30], solid: false, uid: 'prop:neon_gate@46,29' },
    // The moss green in front of GFX and FITNESS.
    { sprite: 'bench', tile: [64, 29] }, toro(59, 29), toro(72, 29), sakuraS(74, 26, 0.5),
    // Beach and sea.
    { sprite: 'beach_umbrella', tile: [9, 34] }, { sprite: 'surfboards', tile: [19, 33] },
    { sprite: 'beach_umbrella', tile: [40, 34] }, { sprite: 'lifeguard_tower', tile: [50, 34] },
    { sprite: 'beach_umbrella', tile: [64, 33] }, { sprite: 'surfboards', tile: [70, 33] }, { sprite: 'beach_umbrella', tile: [89, 34] },
    { sprite: 'sailboat', at: [200, 588], anim: 'bob', solid: false },
    { sprite: 'sailboat', at: [760, 608], anim: 'bob', phase: 0.7, solid: false },
    { sprite: 'sailboat', at: [1300, 594], anim: 'bob', phase: 0.3, solid: false },
  ],
  // Atmosphere (world/ambient_fx.js): every sakura sheds petals; firefly
  // swarms appear once in a while at one of these spots [tx, ty, radius];
  // holographic koi glide through the air.
  petals: { count: 90 },
  fireflies: { spots: [[33, 27, 3], [46, 23, 4], [33, 33, 3], [4, 25, 4], [90, 25, 4], [87, 7, 4], [6, 7, 4], [64, 28, 3]] },
  holoKoi: [
    { y: 6.5, speed: 10, dir: 1, start: 10, tone: 'pink' },
    { y: 21.5, speed: 8, dir: -1, start: 70, tone: 'cyan' },
    { y: 36, speed: 12, dir: 1, start: 40, tone: 'gold', size: 1.3 },
  ],
  labels: [],
  exits: [],
  spawns: { default: [45, 13] },
};
