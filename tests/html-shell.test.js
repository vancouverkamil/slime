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
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
});

test('html shell loads the extracted inventory component', () => {
  assert.match(html, /src="js\/inventory-ui\.js"/);
  assert.ok(html.indexOf('js/accounts.js') < html.indexOf('js/inventory-ui.js'));
  assert.ok(html.indexOf('js/inventory-ui.js') < html.indexOf('js/bootstrap.js'));
});

test('profile and inventory overlays expose modal semantics', () => {
  assert.match(html, /id="ProfileOverlay" role="dialog" aria-modal="true"/);
  assert.match(html, /id="InventoryOverlay" role="dialog" aria-modal="true"/);
});
