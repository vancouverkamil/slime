const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AccountStore } = require('../account-store');

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

test('register stores a public profile without password fields', () => {
  const store = tempStore();
  const user = store.register('Test_Player', 'password123');
  const profile = store.publicProfile(user);

  assert.strictEqual(profile.username, 'test_player');
  assert.strictEqual(profile.stats.matches, 0);
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

  const leftProfile = store.publicProfile(store.findByUsername('lefty'));
  const rightProfile = store.publicProfile(store.findByUsername('righty'));

  assert.deepStrictEqual(leftProfile.stats, {
    matches: 1,
    wins: 1,
    losses: 0,
    pointsFor: 7,
    pointsAgainst: 4,
  });
  assert.deepStrictEqual(rightProfile.stats, {
    matches: 1,
    wins: 0,
    losses: 1,
    pointsFor: 4,
    pointsAgainst: 7,
  });
  assert.strictEqual(leftProfile.recentMatches[0].opponent, 'righty');
  assert.strictEqual(rightProfile.recentMatches[0].result, 'loss');
});
