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

function loadInventory() {
  const grid = {
    innerHTML: '',
    querySelectorAll() { return []; },
  };
  const coins = { textContent: '' };
  const context = {
    console,
    playerHat: 'none',
    escHtml: String,
    document: {
      getElementById(id) {
        return id === 'InventoryGrid' ? grid : id === 'InventoryCoins' ? coins : null;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/inventory-ui.js', 'utf8'), context);
  return { context, grid, coins };
}

test('inventory renderer preserves zero coins and offers an equipped no-hat slot', () => {
  const { context, grid, coins } = loadInventory();
  context.renderInventory({ coins: 0, inventory: [] });
  assert.strictEqual(coins.textContent, 'SC: 0');
  assert.match(grid.innerHTML, /No Hat, equipped/);
  assert.match(grid.innerHTML, /0 OWNED \/ 31 SLOTS/);
});
