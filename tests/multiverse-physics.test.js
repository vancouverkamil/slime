// Slimeverse town physics: slime feel (instant velocity, volleyball-length hop)
// scaled to town pixels, collision supplied by the town.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function test(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (err) { console.error(`not ok - ${name}`); throw err; }
}

function loadPhysics() {
  const context = { keysDown: {}, KEY_A: 65, KEY_D: 68, KEY_W: 87, KEY_LEFT: 37, KEY_RIGHT: 39, KEY_UP: 38, KEY_DOWN: 40, KEY_SPACE: 32, Math };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/slimeverse/prediction.js', 'utf8'), context);
  return context;
}
const WORLD = { width: 1536, depth: 640 };
const still = { left: false, right: false, up: false, down: false, jump: false };

test('movement is instant, like the volleyball slime, and diagonals are not faster', () => {
  const p = loadPhysics();
  const s = { x: 100, y: 0, z: 100, vx: 0, vy: 0, vz: 0, onFloor: true };
  p.mvApplyInput(s, { ...still, right: true });
  p.mvStep(s, WORLD);
  assert.strictEqual(s.x, 100 + p.MV_MOVE);
  p.mvApplyInput(s, { ...still, right: true, down: true });
  assert.ok(Math.abs(Math.hypot(s.vx, s.vz) - p.MV_MOVE) < 1e-9);
  p.mvApplyInput(s, still);
  assert.strictEqual(s.vx, 0);
});

test('a hop lasts as long as a volleyball jump and lands back on the ground', () => {
  const p = loadPhysics();
  const s = { x: 100, y: 0, z: 100, vx: 0, vy: 0, vz: 0, onFloor: true };
  p.mvApplyInput(s, { ...still, jump: true });
  let ticks = 0, peak = 0;
  do { p.mvStep(s, WORLD); p.mvApplyInput(s, still); peak = Math.max(peak, s.y); ticks++; } while (!s.onFloor && ticks < 200);
  assert.ok(ticks >= 30 && ticks <= 35, 'hop ticks ' + ticks); // volleyball: 2 * 22 / 1.35 ~ 33 ticks
  assert.ok(peak > 18 && peak < 26, 'hop height ' + peak);
  assert.strictEqual(s.y, 0);
});

test('the town decides collisions: a blocked move keeps the slime in place', () => {
  const p = loadPhysics();
  const s = { x: 100, y: 0, z: 100, vx: 0, vy: 0, vz: 0, onFloor: true };
  p.mvApplyInput(s, { ...still, left: true });
  p.mvStep(s, WORLD, (x, z) => ({ x, y: z }));
  assert.strictEqual(s.x, 100);
});

test('local movement is not pulled toward delayed server snapshots', () => {
  const p = loadPhysics();
  const local = { x: 500, y: 0, z: 300 };
  p.mvReconcile(local, { x: 520, y: 0, z: 250 });
  assert.strictEqual(local.z, 300);
  p.mvReconcile(local, { x: 1400, y: 0, z: 250 });
  assert.strictEqual(local.x, 1400, 'a teleport-sized jump is accepted');
});

test('an old-units server height (1980 = ground) never launches a slime into the sky', () => {
  const p = loadPhysics();
  const local = {};
  p.mvSyncFromServer(local, { x: 600, y: 1980, z: 200 });
  assert.strictEqual(local.y, 0);
  assert.strictEqual(local.onFloor, true);
  assert.strictEqual(p.mvServerHop(12), 12);
});
