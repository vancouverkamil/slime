const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function test(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (err) { console.error(`not ok - ${name}`); throw err; }
}

function load() {
  const listeners = [];
  const document = {
    addEventListener(t, f) { listeners.push([t, f]); },
    removeEventListener(t, f) { const i = listeners.findIndex((l) => l[0] === t && l[1] === f); if (i >= 0) listeners.splice(i, 1); },
  };
  const context = { console, setInterval, clearInterval, setTimeout, clearTimeout, document, gameIntervalObject: null, gameIteration() {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/core/screen.js', 'utf8'), context);
  return { context, listeners };
}

test('claiming a new screen disposes everything the previous scene owned', () => {
  const { context: c, listeners } = load();
  const a = c.claimScreen('online-match');
  let exited = 0;
  const id = a.interval(() => {}, 1000);
  a.listen(c.document, 'keydown', () => {});
  a.onExit(() => exited++);
  c.claimScreen('replay');
  assert.ok(a.disposed);
  assert.strictEqual(exited, 1);
  assert.strictEqual(listeners.length, 0, 'the key listener was removed');
  assert.strictEqual(c.currentScreenOwner(), 'replay');
  clearInterval(id);
  c.releaseScreen('replay');
});

test('re-claiming the same screen still starts a fresh scene', () => {
  const { context: c } = load();
  const first = c.claimScreen('online-match');
  const second = c.claimScreen('online-match');
  assert.ok(first.disposed && !second.disposed && second.isCurrent());
  c.releaseScreen('online-match');
});

test('a release callback runs once, even if it releases its own screen', () => {
  const { context: c } = load();
  let stops = 0;
  c.claimScreen('slimeverse', () => { stops++; c.releaseScreen('slimeverse'); });
  c.claimScreen('menu');
  assert.strictEqual(stops, 1);
  assert.strictEqual(c.currentScreenOwner(), 'menu');
});

test('releasing a screen someone else now owns does nothing', () => {
  const { context: c } = load();
  c.claimScreen('replay');
  const next = c.claimScreen('tournament');
  c.releaseScreen('replay');
  assert.ok(next.isCurrent());
});

test('the local game loop belongs to its scene', () => {
  const { context: c } = load();
  c.startLocalGameLoop();
  assert.ok(c.gameIntervalObject);
  c.claimScreen('menu');
  assert.strictEqual(c.gameIntervalObject, null);
});
