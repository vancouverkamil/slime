const assert = require('assert');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const WebSocket = require('ws');
const { installServer, routeUpgrades, MODULES } = require('../server/index');

function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`ok - ${name}`),
    (err) => { console.error(`not ok - ${name}`); throw err; });
}

const fakeAccounts = {
  async getUserBySession() { return null; },
  publicProfile() { return null; },
};

function baseRuntime() {
  return {
    app: express(), accounts: fakeAccounts, wss: new WebSocketServer({ noServer: true }),
    allClients: new Map(), rooms: [], progression: require('../progression'), crypto: require('crypto'),
    normalizeUsername: (u) => u, WIN_AMOUNT: 7, TICK_MS: 20, RECONNECT_TIMEOUT_MS: 30000,
    RPS_CHOICES: new Set(['rock', 'paper', 'scissors']),
    newBall() {}, newSlime() {}, initRound() {}, tick() {},
  };
}

// Reading a name that no earlier module defined is exactly the bug that left
// leaveRoom undefined inside the Slimeverse and silently broke it.
function strictDuringInstall(runtime) {
  let installing = true;
  const proxy = new Proxy(runtime, {
    get(target, key) {
      if (installing && typeof key === 'string' && !(key in target)) {
        throw new Error(`"${key}" read before any module defined it`);
      }
      return target[key];
    },
  });
  return { proxy, done() { installing = false; } };
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const inbox = [];
    ws.on('message', (d) => inbox.push(JSON.parse(d)));
    ws.on('open', () => resolve({ ws, inbox }));
    ws.on('error', reject);
  });
}
const waitFor = (inbox, type) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  (function poll() {
    const m = inbox.find((x) => x.type === type);
    if (m) return resolve(m);
    if (Date.now() - t0 > 2000) return reject(new Error('no ' + type + ' message'));
    setTimeout(poll, 10);
  })();
});

(async () => {
  let runtime;
  await test('every server module only reads names defined before it installs', () => {
    const strict = strictDuringInstall(baseRuntime());
    installServer(strict.proxy);
    strict.done();
    runtime = strict.proxy;
    assert.ok(MODULES.includes('./slimeverse'));
  });

  const server = http.createServer(runtime.app);
  routeUpgrades(server, runtime);
  await new Promise((r) => server.listen(0, r));
  const base = 'ws://localhost:' + server.address().port;

  await test('slimeverse sockets get their own identity and never join the game lobby', async () => {
    const sv = await connect(base + '/slimeverse');
    const welcome = await waitFor(sv.inbox, 'welcome');
    assert.ok(/^sv-/.test(welcome.selfId));
    assert.strictEqual(runtime.allClients.size, 0, 'slimeverse socket leaked into allClients');
    const state = await waitFor(sv.inbox, 'state');
    assert.ok(state.players.some((p) => p.id === welcome.selfId), 'own avatar missing from world state');
    sv.ws.close();
  });

  await test('main sockets stay in the lobby and never see slimeverse traffic', async () => {
    const main = await connect(base + '/');
    await waitFor(main.inbox, 'connected');
    const sv = await connect(base + '/slimeverse');
    await waitFor(sv.inbox, 'state');
    assert.strictEqual(runtime.allClients.size, 1);
    assert.strictEqual([...runtime.allClients.values()][0].state, 'lobby');
    assert.ok(!main.inbox.some((m) => /^(welcome|state|leave|appearance)$/.test(m.type)));
    main.ws.close(); sv.ws.close();
  });

  server.close();
  runtime.wss.clients.forEach((c) => c.terminate());
  runtime.slimeverseWss.clients.forEach((c) => c.terminate());
})().catch((err) => { console.error(err); process.exit(1); });
