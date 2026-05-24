const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AccountStore, resolveDatabaseUrl } = require('../account-store');
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

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slime-accounts-'));
  return new AccountStore(path.join(dir, 'accounts.json'));
}

test('resolveDatabaseUrl supports Supabase and Vercel Postgres env names', () => {
  assert.strictEqual(resolveDatabaseUrl({ DATABASE_URL: 'postgres://primary' }), 'postgres://primary');
  assert.strictEqual(resolveDatabaseUrl({ SUPABASE_DATABASE_URL: 'postgres://supabase' }), 'postgres://supabase');
  assert.strictEqual(resolveDatabaseUrl({ POSTGRES_URL: 'postgres://vercel' }), 'postgres://vercel');
  assert.strictEqual(resolveDatabaseUrl({}), '');
});

test('register stores a public profile without password fields', () => {
  const store = tempStore();
  const user = store.register('Test_Player', 'password123');
  const profile = store.publicProfile(user);

  assert.strictEqual(profile.username, 'test_player');
  assert.strictEqual(profile.stats.matches, 0);
  assert.strictEqual(profile.progression.level, 1);
  assert.strictEqual(profile.achievements.length, 0);
  assert.strictEqual(profile.passwordHash, undefined);
  assert.strictEqual(profile.passwordSalt, undefined);
});

test('login validates password and sessions load current user', () => {
  const store = tempStore();
  const user = store.register('winner', 'password123');
  assert.strictEqual(store.login('winner', 'bad-password'), null);

  const loggedIn = store.login('winner', 'password123');
  const token = store.createSession(loggedIn.id);

  assert.strictEqual(loggedIn.id, user.id);
  assert.strictEqual(store.getUserBySession(token).username, 'winner');
});

test('recordMatch updates both linked accounts', () => {
  const store = tempStore();
  const left = store.register('lefty', 'password123');
  const right = store.register('righty', 'password123');

  store.recordMatch(left.id, right.id, 'left', 7, 4);
  const leftXp = progression.getMatchXp({ won: true, scoreFor: 7, scoreAgainst: 4 });
  const rightXp = progression.getMatchXp({ won: false, scoreFor: 4, scoreAgainst: 7 });
  const leftCoins = progression.getCoinReward({ won: true, scoreFor: 7, scoreAgainst: 4 });

  const leftProfile = store.publicProfile(store.findByUsername('lefty'));
  const rightProfile = store.publicProfile(store.findByUsername('righty'));

  assert.deepStrictEqual(leftProfile.stats, {
    matches: 1,
    wins: 1,
    losses: 0,
    pointsFor: 7,
    pointsAgainst: 4,
    xp: leftXp,
  });
  assert.deepStrictEqual(rightProfile.stats, {
    matches: 1,
    wins: 0,
    losses: 1,
    pointsFor: 4,
    pointsAgainst: 7,
    xp: rightXp,
  });
  assert.strictEqual(leftProfile.recentMatches[0].opponent, 'righty');
  assert.strictEqual(leftProfile.recentMatches[0].xpGained, leftXp);
  assert.strictEqual(leftProfile.recentMatches[0].coinsGained, leftCoins);
  assert.strictEqual(leftProfile.coins, 1 + leftCoins);
  assert.strictEqual(rightProfile.recentMatches[0].result, 'loss');
  assert.strictEqual(rightProfile.coins, 1);
});

test('leaderboard sorts accounts by total xp', () => {
  const store = tempStore();
  const high = store.register('high_xp', 'password123');
  const low = store.register('low_xp', 'password123');

  high.stats.xp = 250;
  low.stats.xp = 40;
  store.save();

  const rows = store.leaderboard();
  assert.deepStrictEqual(rows.map((row) => row.username), ['high_xp', 'low_xp']);
  assert.strictEqual(rows[0].progression.xp, 250);
  assert.strictEqual(rows[0].passwordHash, undefined);
});

test('saved hat drawings are capped at five and can be deleted', () => {
  const store = tempStore();
  const user = store.register('artist', 'password123');

  for (let i = 0; i < 5; i++) {
    store.saveHatPreset(user.id, {
      name: `Preset ${i + 1}`,
      hatAnim: 'pulse',
      drawBrush: 'marker',
      drawSize: 5,
      drawColor: '#44aaff',
      drawing: [{ pts: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: '#fff', size: 4, brush: 'pen' }],
    });
  }

  assert.throws(() => store.saveHatPreset(user.id, { name: 'Extra', drawing: [] }), /up to 5/);

  const profile = store.publicProfile(store.findByUsername('artist'));
  assert.strictEqual(profile.savedHatDrawings.length, 5);
  assert.strictEqual(profile.savedHatDrawings[0].hatAnim, 'pulse');
  assert.strictEqual(profile.savedHatDrawings[0].drawBrush, 'marker');

  store.deleteHatPreset(user.id, profile.savedHatDrawings[0].id);
  assert.strictEqual(store.publicProfile(store.findByUsername('artist')).savedHatDrawings.length, 4);
});
