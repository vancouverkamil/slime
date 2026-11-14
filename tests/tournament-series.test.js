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
  const accounts = { async getUserBySession() { return null; }, publicProfile() { return null; },
    async recordMatch() {}, async findById() { return null; } };
  const ctx = installServer({
    app: express(), accounts, wss: new WebSocketServer({ noServer: true }),
    allClients: new Map(), rooms: createRooms(), progression: require('../progression'), crypto: require('crypto'),
    normalizeUsername: (u) => u, WIN_AMOUNT: 7, TICK_MS: 20, RECONNECT_TIMEOUT_MS: 30000,
    RPS_CHOICES: new Set(['rock', 'paper', 'scissors']), ...physics,
  });
  const connect = (username, xp) => {
    const ws = {
      readyState: 1, inbox: [], listeners: [],
      send(m) { this.inbox.push(JSON.parse(m)); },
      on(ev, f) { this.listeners.push([ev, f]); },
      off(ev, f) { this.listeners = this.listeners.filter((l) => l[0] !== ev || l[1] !== f); },
    };
    const info = { id: username, userId: username, username, name: username, state: 'lobby', room: null,
      progression: { level: 5, xp }, ranked: null, hat: 'none', bodyColor: '#0f0', hatDrawing: [] };
    ctx.allClients.set(ws, info);
    return { ws, info };
  };
  return { ctx, connect };
}

// What server/core/connection.js does with a message from this player.
function sendMsg(ctx, p, msg) {
  if (p.info.state === 'playing' && p.info.gameHandler) return p.info.gameHandler(msg);
  if (msg.type === 'tournament_accept') ctx.handleTournamentAccept(p.ws, p.info, msg);
}

async function playGame(ctx, A, B, match, winnerSide) {
  A.ws.inbox = []; B.ws.inbox = [];
  sendMsg(ctx, A, { type: 'tournament_accept', matchId: match.id });
  sendMsg(ctx, B, { type: 'tournament_accept', matchId: match.id });
  const room = A.info.room;
  assert.ok(room && room.state && room.state.phase === 'rps', 'game starts with rock-paper-scissors');
  const gameId = room.game.id;
  const rpsStart = A.ws.inbox.find((m) => m.type === 'rps_start');
  assert.ok(rpsStart && rpsStart.gameId === gameId, 'rps prompt is stamped with the game id');
  sendMsg(ctx, A, { type: 'rps_choice', choice: 'rock' });
  sendMsg(ctx, B, { type: 'rps_choice', choice: 'scissors' });
  assert.strictEqual(room.state.phase, 'countdown', 'both picks are accepted');
  await sleep(3800);
  assert.strictEqual(room.state.phase, 'playing');
  // give one side the winning point
  if (winnerSide === 'left') room.state.scoreLeft = 6; else room.state.scoreRight = 6;
  Object.assign(room.state.ball, { x: winnerSide === 'left' ? 800 : 200, y: 1, velocityX: 0, velocityY: -5 });
  const game = room.game;
  await sleep(120);
  assert.ok(A.ws.inbox.some((m) => m.type === 'game_over' && m.gameId === gameId));
  assert.ok(game.disposed && game.timers.size === 0, 'a finished game leaves no timers behind');
  assert.strictEqual(A.ws.listeners.length, 0, 'a finished game leaves no socket listeners behind');
  return { gameId, handler: null };
}

(async () => {
  await test('a head-to-head best-of-3 plays every game, rock-paper-scissors included', async () => {
    const { ctx, connect } = makeServer();
    const players = ['amy', 'bob', 'cat', 'dan', 'eve'].map((u, i) => connect(u, 500 - i * 50));
    players.forEach((p) => ctx.handleTournamentJoin(p.ws, p.info, { bracketId: 'rookie' }));
    players.forEach((p) => ctx.handleTournamentReady(p.ws, p.info));
    const lobby = ctx.activeTournaments.get('rookie');
    const match = lobby.rounds[0].find((m) => m.a && m.b && m.a.username && m.b.username);
    const [A, B] = [match.a.username, match.b.username].map((u) => players.find((p) => p.info.username === u));

    const g1 = await playGame(ctx, A, B, match, 'left');
    assert.deepStrictEqual([match.winsA, match.winsB, match.status], [1, 0, 'awaiting']);
    const staleHandler = A.info.gameHandler; // cleared on game end; keep the ids instead
    const g2 = await playGame(ctx, A, B, match, 'right');
    assert.notStrictEqual(g1.gameId, g2.gameId, 'every game gets its own id');
    assert.deepStrictEqual([match.winsA, match.winsB, match.status], [1, 1, 'awaiting']);
    await playGame(ctx, A, B, match, 'left');
    assert.deepStrictEqual([match.winsA, match.winsB, match.status], [2, 1, 'final']);
    assert.strictEqual(staleHandler, null);
  });

  await test("an old game's input handler does nothing once the next game has started", async () => {
    const { ctx, connect } = makeServer();
    const amy = connect('amy', 100), bob = connect('bob', 90);
    const match = { id: 'r2m0', a: { username: 'amy' }, b: { username: 'bob' } };
    ctx.startTournamentRoom({ bracketId: 'rookie' }, match);
    const oldHandler = amy.info.gameHandler;
    const room1 = amy.info.room;
    ctx.leaveRoom(amy.ws, amy.info, false); // game 1 ends early
    ctx.startTournamentRoom({ bracketId: 'rookie' }, match);
    const room2 = amy.info.room;
    oldHandler({ type: 'rps_choice', choice: 'rock' });
    assert.ok(!room2.state.rps.choices.left, 'game 1 handler reached game 2');
    assert.strictEqual(room1.game, null);
    room2.game.dispose();
  });
  await test('a finished series can never be reopened or skip its accept check', () => {
    const { setMatchStatus } = require('../server/tournament/match-status');
    const warn = console.warn; console.warn = () => {};
    try {
      const m = { id: 'x', status: 'upcoming' };
      assert.ok(!setMatchStatus(m, 'live'), 'upcoming must go through the accept check first');
      assert.ok(setMatchStatus(m, 'awaiting') && setMatchStatus(m, 'live') && setMatchStatus(m, 'awaiting'));
      assert.ok(setMatchStatus(m, 'final'));
      ['awaiting', 'live', 'upcoming', 'waiting'].forEach((to) => assert.ok(!setMatchStatus(m, to)));
      assert.strictEqual(m.status, 'final');
    } finally { console.warn = warn; }
  });
})().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
