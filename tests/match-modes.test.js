const assert = require('assert');
const express = require('express');
const { WebSocketServer } = require('ws');
const { installServer } = require('../server/index');
const { createRooms } = require('../server/rooms/room-list');
const physics = require('../physics');

function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => console.log(`ok - ${name}`),
    (err) => { console.error(`not ok - ${name}`); throw err; });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeServer() {
  const recorded = [];
  const accounts = {
    async getUserBySession() { return null; }, publicProfile() { return null; },
    async recordMatch(...args) { recorded.push(args); }, async findById() { return null; },
  };
  const ctx = installServer({
    app: express(), accounts, wss: new WebSocketServer({ noServer: true }),
    allClients: new Map(), rooms: createRooms(), progression: require('../progression'), crypto: require('crypto'),
    normalizeUsername: (u) => u, WIN_AMOUNT: 7, TICK_MS: 20, RECONNECT_TIMEOUT_MS: 30000,
    RPS_CHOICES: new Set(['rock', 'paper', 'scissors']), ...physics,
  });
  const connect = (username) => {
    const ws = { readyState: 1, inbox: [], send(m) { this.inbox.push(JSON.parse(m)); }, on() {} };
    const info = { id: username, userId: username, username, name: username, state: 'lobby', room: null,
      progression: { level: 5, xp: 100 }, ranked: null, hat: 'none', bodyColor: '#0f0', hatDrawing: [] };
    ctx.allClients.set(ws, info);
    return { ws, info };
  };
  return { ctx, recorded, connect };
}

// Finish a running room game by giving the left side the winning point.
async function finishGame(room) {
  room.state.phase = 'playing';
  room.state.scoreLeft = 6;
  Object.assign(room.state.ball, { x: 800, y: 1, velocityX: 0, velocityY: -5 });
  await sleep(80);
}

(async () => {
  await test('a tournament head-to-head game is recorded as a tournament match, never ranked', async () => {
    const s = makeServer();
    const amy = s.connect('amy'), bob = s.connect('bob');
    const match = { id: 'r2m0', a: { username: 'amy' }, b: { username: 'bob' } };
    assert.ok(s.ctx.startTournamentRoom({ bracketId: 'rookie' }, match));
    const room = s.ctx.rooms.find((r) => r.tournament);
    assert.strictEqual(room.ranked, false);
    await finishGame(room);
    assert.strictEqual(s.recorded.length, 1);
    const [, , , , , ranked, mode] = s.recorded[0];
    assert.strictEqual(ranked, false);
    assert.strictEqual(mode, 'tournament');
    assert.ok(!amy.ws.inbox.some((m) => m.type === 'ranked_result'));
    clearInterval(room.interval);
  });

  await test('starting a tournament match takes both players out of the ranked queue', async () => {
    const s = makeServer();
    const amy = s.connect('amy'), bob = s.connect('bob');
    s.ctx.handleRankedQueue(amy.ws, amy.info);
    s.ctx.startTournamentRoom({ bracketId: 'rookie' }, { id: 'r2m0', a: { username: 'amy' }, b: { username: 'bob' } });
    const tRoom = amy.info.room;
    assert.ok(tRoom && tRoom.tournament);
    // someone else queues ranked: amy must not be pulled out of her tournament match
    const cat = s.connect('cat');
    s.ctx.handleRankedQueue(cat.ws, cat.info);
    assert.strictEqual(amy.info.room, tRoom);
    assert.ok(!s.ctx.rooms.some((r) => r.ranked));
    clearInterval(tRoom.interval);
  });

  await test('a Quick Play player cannot be pulled into ranked, and queueing twice never self-matches', async () => {
    const s = makeServer();
    const amy = s.connect('amy'), bob = s.connect('bob');
    s.ctx.handleRankedQueue(amy.ws, amy.info);
    s.ctx.handleRankedQueue(amy.ws, amy.info);
    assert.ok(!s.ctx.rooms.some((r) => r.ranked), 'matched against herself');
    s.ctx.handleJoinRoom(amy.ws, amy.info, 0);
    s.ctx.handleRankedQueue(bob.ws, bob.info);
    assert.ok(!s.ctx.rooms.some((r) => r.ranked), 'Quick Play player was pulled into ranked');
  });

  await test('a real ranked match is still recorded as ranked', async () => {
    const s = makeServer();
    const amy = s.connect('amy'), bob = s.connect('bob');
    s.ctx.handleRankedQueue(amy.ws, amy.info);
    s.ctx.handleRankedQueue(bob.ws, bob.info);
    const room = s.ctx.rooms.find((r) => r.ranked);
    assert.ok(room);
    await finishGame(room);
    const [, , , , , ranked, mode] = s.recorded[0];
    assert.strictEqual(ranked, true);
    assert.strictEqual(mode, 'ranked');
    clearInterval(room.interval);
  });
})().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
