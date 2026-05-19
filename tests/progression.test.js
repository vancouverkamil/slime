const assert = require('assert');
const progression = require('../progression');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

test('progression has fast onboarding and a long prestige tail', () => {
  const level25 = progression.totalXpForLevel(25);
  const level70 = progression.totalXpForLevel(70);
  const level100 = progression.totalXpForLevel(100);

  assert.strictEqual(level25, 9960);
  assert.ok(level70 > level25 * 10);
  assert.ok(level100 > level70 * 4);
  assert.strictEqual(progression.levelFromXp(level25), 25);
  assert.strictEqual(progression.levelFromXp(level70), 70);
});

test('rank badges reuse a title for five levels with added arrows', () => {
  assert.deepStrictEqual(progression.rankForLevel(1), {
    title: 'Recruit',
    badge: 'REC ^',
    tier: 1,
    arrows: 1,
  });
  assert.deepStrictEqual(progression.rankForLevel(5), {
    title: 'Recruit',
    badge: 'REC ^^^^^',
    tier: 1,
    arrows: 5,
  });
  assert.strictEqual(progression.rankForLevel(6).title, 'Rookie');
});

test('level 70 unlocks prestige and gold crown', () => {
  const before = progression.getProgression(progression.totalXpForLevel(70) - 1);
  const prestige = progression.getProgression(progression.totalXpForLevel(70));

  assert.strictEqual(before.unlocks.goldCrown, false);
  assert.strictEqual(prestige.level, 70);
  assert.strictEqual(prestige.prestige, true);
  assert.strictEqual(prestige.unlocks.goldCrown, true);
});
