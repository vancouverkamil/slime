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
vm.runInContext(fs.readFileSync('js/feature-cards.js', 'utf8'), context);
const cards = context.SlimeFeatureCards;

test('achievement reward cards remain locked until their achievement is present', () => {
  assert.strictEqual(cards.isCardUnlocked(null, 'rookie-grit'), true);
  assert.strictEqual(cards.isCardUnlocked({ achievements: [] }, 'mud-line'), false);
  assert.strictEqual(cards.isCardUnlocked({ achievements: [{ id: 'clean-win' }] }, 'mud-line'), true);
});

test('legacy string achievement ids still unlock rewards', () => {
  assert.strictEqual(cards.isAchievementUnlocked({ achievements: ['clean-win'] }, 'clean-win'), true);
  assert.strictEqual(cards.isCardUnlocked({ achievements: ['clean-win'] }, 'mud-line'), true);
});
