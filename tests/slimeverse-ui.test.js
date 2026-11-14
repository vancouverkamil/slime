const assert = require('assert');
const fs = require('fs');
const { readComponent, readStylesheet } = require('./component-source');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

const source = readComponent('js/slimeverse');
const css = readStylesheet('css/slime.css');

test('the Slimeverse world is the copied Money Radar town, built once by the loader', () => {
  assert.match(fs.readFileSync('js/slimeverse/loader.js', 'utf8'), /js\/slimeverse\/town\/slime_town\.js/);
  assert.match(source, /slimeTown\.frame\(/);
  assert.ok(fs.existsSync('js/slimeverse/town/scene/town.js'));
  assert.ok(fs.existsSync('js/slimeverse/town/assets/manifest.json'));
});

test('the old city, hat shop and Final 4 tower are gone from the Slimeverse', () => {
  assert.doesNotMatch(source, /svStoreInside|drawSlimeverseStoreBuilding|drawFinal4Tower|SV_COLISEUM/);
});

test('the town copy leaves Money Radar features out', () => {
  const town = fs.readFileSync('js/slimeverse/town/scene/town.js', 'utf8');
  const scene = fs.readFileSync('js/slimeverse/town/world/scene.js', 'utf8');
  assert.doesNotMatch(town, /crowd:|cars:|dynamic: '(hiring|news)'/);
  assert.doesNotMatch(scene, /npc\/|createCrowd|new Car\(/);
  assert.ok(!fs.existsSync('js/slimeverse/town/panels') && !fs.existsSync('js/slimeverse/town/adapters'));
});

test('the town has a walk-in HAT SHOP and FINAL 4 tower in its own art', () => {
  const lots = fs.readFileSync('js/slimeverse/town/scene/slime_buildings.js', 'utf8');
  assert.match(lots, /id: 'final4'/);
  assert.match(lots, /id: 'hat_shop'/);
  const manifest = JSON.parse(fs.readFileSync('js/slimeverse/town/assets/manifest.json', 'utf8')).assets;
  for (const name of ['bld_hat_shop', 'bld_final4']) {
    assert.ok(manifest[name] && manifest[name].door, name + ' has a door');
    assert.ok(fs.existsSync('js/slimeverse/town/assets/' + manifest[name].file), name + ' art exists');
    assert.ok(manifest[name + '_lights'] && manifest[name + '_neon'], name + ' has night layers');
  }
  assert.match(source, /startFinal4\(\)/);
  assert.match(source, /\/api\/me\/buy/);
});

test('slimeverse smooths remote player snapshots before drawing', () => {
  assert.match(source, /function smoothSlimeverseRemotePlayer\(/);
  assert.match(source, /smoothSlimeverseRemotePlayer\(slimeversePlayers\[id\]\)/);
});

test('inventory desktop sizing is intentionally larger while phones stay compact', () => {
  assert.match(css, /width:min\(1120px,96vw\)/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*#InventoryCard \{ width:94vw;/);
});
