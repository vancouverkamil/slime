const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function test(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (err) { console.error(`not ok - ${name}`); throw err; }
}

function listJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listJs(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name).split(path.sep).join('/')] : []);
}

const html = fs.readFileSync('slime_volleyball.html', 'utf8');
const sandbox = {};
vm.runInNewContext(fs.readFileSync('js/menus.part-2.js', 'utf8').match(/var SLIMEVERSE_SCRIPTS[\s\S]*?\n(?=function ensureSlimeverseLoaded)/)[0], sandbox);
const lazy = sandbox.SLIMEVERSE_SCRIPTS;

test('every browser script is loaded by the html shell or the Slimeverse lazy loader', () => {
  const missing = listJs('js').filter((f) => !html.includes(`src="${f}"`) && !lazy.includes(f));
  assert.deepStrictEqual(missing, [], 'scripts never loaded: ' + missing.join(', '));
});

test('lazy Slimeverse scripts all exist and load base file before its parts', () => {
  lazy.forEach((f) => assert.ok(fs.existsSync(f), f + ' does not exist'));
  assert.ok(lazy.indexOf('js/slimeverse.js') < lazy.indexOf('js/slimeverse.part-2.js'));
});
