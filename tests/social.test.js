const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { AccountStore, normalizeUsername } = require('../account-store');
const { createSocialService } = require('../server/social/service');

function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`ok - ${name}`),
    (err) => { console.error(`not ok - ${name}`); throw err; });
}

async function setup() {
  const file = path.join(os.tmpdir(), 'slime-social-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.json');
  const accounts = new AccountStore(file);
  const users = {};
  for (const name of ['amy', 'bob', 'cat']) users[name] = await accounts.register(name, 'password1');
  const pushes = [];
  const online = new Set();
  const playing = new Map();   // userId -> room id of a live 1v1
  const svc = createSocialService({
    accounts, normalizeUsername,
    isOnline: (id) => online.has(id),
    watchRoomOf: (id) => (playing.has(id) ? playing.get(id) : null),
    notify: (id, msg) => pushes.push({ to: id, msg }),
  });
  return { accounts, users, svc, pushes, online, playing, file };
}

const rejects = async (p, re) => { await assert.rejects(p, (err) => re.test(err.message)); };

(async () => {
  await test('a request, then accept, makes two players friends', async () => {
    const { svc, users: { amy, bob }, online } = await setup();
    await svc.request(amy, 'bob');
    assert.deepStrictEqual((await svc.overview(bob)).incoming.map((u) => u.username), ['amy']);
    assert.deepStrictEqual((await svc.overview(amy)).outgoing.map((u) => u.username), ['bob']);
    await svc.accept(bob, 'amy');
    online.add(bob.id);
    const mine = await svc.overview(amy);
    assert.deepStrictEqual(mine.friends.map((f) => [f.username, f.online]), [['bob', true]]);
    assert.strictEqual(mine.incoming.length + mine.outgoing.length, 0);
  });

  await test('a friend in a live match can be watched from the friends list', async () => {
    const { svc, users: { amy, bob }, online, playing } = await setup();
    await svc.request(amy, 'bob'); await svc.accept(bob, 'amy');
    online.add(bob.id);
    assert.strictEqual((await svc.overview(amy)).friends[0].watchRoom, null);
    playing.set(bob.id, 4);
    assert.strictEqual((await svc.overview(amy)).friends[0].watchRoom, 4);
  });

  await test('asking someone who already asked you accepts straight away', async () => {
    const { svc, users: { amy, bob } } = await setup();
    await svc.request(amy, 'bob');
    assert.strictEqual((await svc.request(bob, 'amy')).status, 'friends');
    assert.strictEqual((await svc.overview(amy)).friends.length, 1);
  });

  await test('friends can message; unread counts clear when the chat is opened', async () => {
    const { svc, users: { amy, bob }, pushes } = await setup();
    await svc.request(amy, 'bob'); await svc.accept(bob, 'amy');
    const sent = await svc.sendMessage(amy, 'bob', '  gg   ez  ');
    assert.strictEqual(sent.message.body, 'gg ez');
    assert.ok(pushes.some((p) => p.to === bob.id && p.msg.type === 'dm'), 'recipient gets it live');
    assert.strictEqual((await svc.overview(bob)).unreadTotal, 1);
    const convo = await svc.conversation(bob, 'amy');
    assert.deepStrictEqual(convo.messages.map((m) => [m.from, m.body]), [['amy', 'gg ez']]);
    assert.strictEqual((await svc.overview(bob)).unreadTotal, 0);
  });

  await test('strangers, empty messages and yourself are refused', async () => {
    const { svc, users: { amy } } = await setup();
    await rejects(svc.sendMessage(amy, 'cat', 'hi'), /only message friends/);
    await rejects(svc.request(amy, 'amy'), /that's you/i);
    await rejects(svc.request(amy, 'nobody_here'), /No player/);
    await svc.request(amy, 'cat');
    await rejects(svc.accept(amy, 'cat'), /No friend request/); // can't accept your own request
  });

  await test('blocking ends the friendship and stops requests and messages', async () => {
    const { svc, users: { amy, bob } } = await setup();
    await svc.request(amy, 'bob'); await svc.accept(bob, 'amy');
    await svc.block(bob, 'amy');
    await rejects(svc.sendMessage(amy, 'bob', 'hey'), /only message friends/);
    await rejects(svc.request(amy, 'bob'), /can't add/);
    assert.deepStrictEqual((await svc.overview(bob)).blocked.map((u) => u.username), ['amy']);
    assert.strictEqual((await svc.overview(amy)).friends.length, 0);
    await svc.unblock(bob, 'amy');
    await svc.request(amy, 'bob');
    assert.strictEqual((await svc.overview(bob)).incoming.length, 1);
  });

  await test('declining or cancelling a request clears it for both players', async () => {
    const { svc, users: { amy, bob } } = await setup();
    await svc.request(amy, 'bob');
    await svc.decline(bob, 'amy');
    assert.strictEqual((await svc.overview(amy)).outgoing.length, 0);
    await svc.request(amy, 'bob');
    await svc.decline(amy, 'bob'); // cancel your own
    assert.strictEqual((await svc.overview(bob)).incoming.length, 0);
  });

  await test('friends and messages survive a server restart', async () => {
    const { svc, users: { amy, bob }, file } = await setup();
    await svc.request(amy, 'bob'); await svc.accept(bob, 'amy');
    await svc.sendMessage(amy, 'bob', 'still here?');
    const reloaded = new AccountStore(file);
    assert.strictEqual((await reloaded.listEdges(amy.id)).length, 2);
    assert.strictEqual((await reloaded.listMessages(amy.id, bob.id, 50)).length, 1);
    fs.unlinkSync(file);
  });
})().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
