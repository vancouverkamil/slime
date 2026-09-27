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

const html = fs.readFileSync('slime_volleyball.html', 'utf8');

test('html shell declares its document metadata', () => {
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta charset="UTF-8">/);
  assert.match(html, /<title>Slime Volleyball<\/title>/);
});

test('html shell declares a mobile viewport', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1,/);
});

test('html shell loads the inventory component after accounts and before boot', () => {
  assert.match(html, /src="js\/account\/inventory\.js"/);
  assert.ok(html.indexOf('js/account/accounts.js') < html.indexOf('js/account/inventory.js'));
  assert.ok(html.indexOf('js/account/inventory.js') < html.indexOf('js/core/bootstrap.js'));
});

test('html shell loads map thumbnail assets before lobby rendering', () => {
  assert.match(html, /src="js\/lobby\/map-thumbnails\.js"/);
  assert.ok(html.indexOf('js/lobby/map-thumbnails.js') < html.indexOf('js/lobby/lobby-select.js'));
});

test('bootstrap is the last script the html shell loads', () => {
  const srcs = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(srcs[srcs.length - 1], 'js/core/bootstrap.js');
});

test('profile and inventory overlays expose modal semantics', () => {
  assert.match(html, /id="ProfileOverlay" role="dialog" aria-modal="true"/);
  assert.match(html, /id="InventoryOverlay" role="dialog" aria-modal="true"/);
});

test('html shell does not reuse element ids', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepStrictEqual([...new Set(duplicates)], []);
});
