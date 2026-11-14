const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { slimeverseScripts } = require('./component-source');

function test(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (err) { console.error(`not ok - ${name}`); throw err; }
}

function listJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listJs(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name).split(path.sep).join('/')] : []);
}

const html = fs.readFileSync('slime_volleyball.html', 'utf8');
const htmlScripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
const lazy = slimeverseScripts();

// The Slimeverse town is ES modules: everything import()ed from its entry module counts as loaded.
function moduleGraph(entry) {
  const seen = new Set();
  (function walk(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^import [^'"]*['"](.[^'"]+)['"]/gm)) walk(path.posix.join(path.posix.dirname(file), m[1]));
  })(entry);
  return [...seen];
}
const townEntry = fs.readFileSync('js/slimeverse/loader.js', 'utf8').match(/SLIMEVERSE_TOWN_MODULE = '([^']+)'/)[1];
const townModules = moduleGraph(townEntry);

test('every browser script is loaded by the html shell or the Slimeverse lazy loader', () => {
  const missing = listJs('js').filter((f) => !htmlScripts.includes(f) && !lazy.includes(f) && !townModules.includes(f));
  assert.deepStrictEqual(missing, [], 'scripts never loaded: ' + missing.join(', '));
});

test('every Slimeverse town module exists', () => {
  townModules.forEach((f) => assert.ok(fs.existsSync(f), f + ' does not exist'));
  assert.ok(townModules.length > 10, 'town modules: ' + townModules.length);
});

test('no script is loaded twice', () => {
  const all = htmlScripts.concat(lazy);
  const dupes = all.filter((f, i) => all.indexOf(f) !== i);
  assert.deepStrictEqual(dupes, []);
});

test('lazy Slimeverse scripts all exist and live in the slimeverse component', () => {
  lazy.forEach((f) => assert.ok(fs.existsSync(f), f + ' does not exist'));
  lazy.forEach((f) => assert.ok(f.startsWith('js/slimeverse/'), f + ' is outside js/slimeverse'));
  assert.strictEqual(lazy[0], 'js/slimeverse/state.js');
});

test('only the Slimeverse loader is loaded eagerly from the slimeverse component', () => {
  const eager = htmlScripts.filter((f) => f.startsWith('js/slimeverse/'));
  assert.deepStrictEqual(eager, ['js/slimeverse/loader.js']);
});

test('no leftover part-N split files remain', () => {
  const parts = listJs('js').concat(fs.readdirSync('.')).filter((f) => /\.part-\d+\.js$/.test(f));
  assert.deepStrictEqual(parts, []);
});
