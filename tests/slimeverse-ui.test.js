const assert = require('assert');
const fs = require('fs');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

const source = fs.readFileSync('js/slimeverse.js', 'utf8');
const css = fs.readFileSync('css/slime.css', 'utf8');

test('slimeverse includes a leaderboard coliseum and lantern paths', () => {
  assert.match(source, /var SV_COLISEUM_X\s*=\s*620/);
  assert.match(source, /function drawSVColiseum\(/);
  assert.match(source, /function drawSVChaseLights\(/);
  assert.match(source, /function drawSVRadioTower\(/);
  assert.match(source, /SLIMEVERSE TOP 10/);
  assert.match(source, /function drawSVLanterns\(/);
  assert.match(source, /refreshSlimeverseLeaderboard\(\)/);
});

test('slimeverse uses a closer readable character-scale camera', () => {
  assert.match(source, /var SV_FLOOR_FRAC\s*=\s*0\.88/);
  assert.match(source, /var SV_FAR_SCALE\s*=\s*0\.10/);
  assert.match(source, /var SV_PLAYER_SCALE\s*=\s*1\.42/);
  assert.match(source, /var SV_WORLD_ZOOM\s*=\s*1\.34/);
});

test('slimeverse landmarks and entrance zones render at double scale', () => {
  assert.match(source, /var SV_LANDMARK_SCALE\s*=\s*2\.0/);
  assert.match(source, /drawSVColiseum\([\s\S]*svScaleAt\(SV_COLISEUM_Z\) \* SV_LANDMARK_SCALE/);
  assert.match(source, /drawSlimeverseStoreBuilding\([\s\S]*svScaleAt\(SV_STORE_Z\) \* SV_LANDMARK_SCALE/);
  assert.match(source, /drawFinal4Tower\([\s\S]*svScaleAt\(SV_FINAL4_Z\) \* SV_LANDMARK_SCALE/);
  assert.match(source, /var sc = svScaleAt\(SV_FINAL4_Z\) \* SV_LANDMARK_SCALE/);
  assert.match(source, /dz < 90 \* SV_LANDMARK_SCALE && dx < 240 \* SV_LANDMARK_SCALE/);
  assert.match(source, /f4dz < 125 \* SV_LANDMARK_SCALE && f4dx < 190 \* SV_LANDMARK_SCALE/);
});

test('slimeverse smooths remote player snapshots before rendering', () => {
  assert.match(source, /function smoothSlimeverseRemotePlayer\(/);
  assert.match(source, /drawSlimeversePlayer\(smoothSlimeverseRemotePlayer\(p\)\)/);
});

test('inventory desktop sizing is intentionally larger while phones stay compact', () => {
  assert.match(css, /width:min\(1120px,96vw\)/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*#InventoryCard \{ width:94vw;/);
});
