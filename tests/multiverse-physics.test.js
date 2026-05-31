const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

function loadPhysics() {
  const context = {
    keysDown: {},
    KEY_A: 65,
    KEY_D: 68,
    KEY_LEFT: 37,
    KEY_RIGHT: 39,
    KEY_UP: 38,
    KEY_DOWN: 40,
    KEY_W: 87,
    KEY_SPACE: 32,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/multiverse-physics.js', 'utf8'), context);
  return context;
}

test('render pose extrapolates smoothly between fixed physics steps', () => {
  const p = loadPhysics();
  const pose = p.mvRenderState({ x: 100, y: 1980, z: 200, vx: 8, vy: 0, vz: -6 }, 8, {
    width: 4500,
    floorY: 1980,
    maxZ: 3000,
  });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pose)), { x: 104, y: 1980, z: 197 });
});

test('ordinary depth drift is corrected without teleporting', () => {
  const p = loadPhysics();
  const local = { x: 500, y: 1980, z: 500 };
  p.keysDown[p.KEY_UP] = true;
  p.mvReconcile(local, { x: 500, y: 1980, z: 150 }, 0.06);
  assert.strictEqual(local.z, 496);
});

test('spawn-scale drift still hard-syncs', () => {
  const p = loadPhysics();
  const local = { x: 2000, y: 1980, z: 1800 };
  p.mvReconcile(local, { x: 500, y: 1980, z: 200 }, 0.06);
  assert.deepStrictEqual(local, { x: 500, y: 1980, z: 200 });
});
