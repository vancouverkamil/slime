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

const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/menus.js', 'utf8'), context);

test('overlay bounds remain inside a short game viewport', () => {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.calculateOverlayBounds(720, 320))),
    { width: 692, height: 292, left: 14, top: 14 }
  );
});

test('overlay bounds remain inside a narrow game viewport', () => {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.calculateOverlayBounds(300, 560))),
    { width: 272, height: 532, left: 14, top: 14 }
  );
});

test('overlay bounds are capped for large game viewports', () => {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.calculateOverlayBounds(1800, 1200))),
    { width: 1280, height: 900, left: 260, top: 150 }
  );
});
