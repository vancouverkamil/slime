const assert = require('assert');

function test(name, fn) {
  try { fn(); console.log(`ok - ${name}`); } catch (err) { console.error(`not ok - ${name}`); throw err; }
}

// Minimal server context: fake sockets, rooms and game starter, real tournament modules.
function makeServer() {
  const allClients = new Map();
  const started = [];
  const rooms = Array.from({ length: 6 }, (_, i) => ({ id: i, mapId: i === 5 ? 15 : i, phase: 'empty', players: [], spectators: [] }));
  const ctx = {
    allClients, rooms, WIN_AMOUNT: 7, crypto: require('crypto'),
    send() {}, pushLobbyState() {},
    leaveRoom() {},
    startRoomGame(room) { room.phase = 'playing'; started.push(room); },
  };
  require('../server/tournaments')(ctx);
  require('../server/tournament-matches')(ctx);
  require('../server/tournament-rooms')(ctx);
  const connect = (username) => {
    const ws = { readyState: 1, send() {} };
    const info = { userId: username, username, name: username, progression: { level: 5, xp: 100 } };
    allClients.set(ws, info);
    return { ws, info };
  };
  return { ctx, rooms, started, connect, allClients };
}

function startBracket(server, names) {
  const players = names.map(server.connect);
  players.forEach(p => server.ctx.handleTournamentJoin(p.ws, p.info, { bracketId: 'rookie' }));
  players.forEach(p => server.ctx.handleTournamentReady(p.ws, p.info));
  return { players, lobby: server.ctx.activeTournaments.get('rookie') };
}

const matchOf = (lobby, username) => lobby.rounds.flat().find(m => m.status !== 'final' && m.a && m.b && (m.a.username === username || m.b.username === username));
function winVsBot(ctx, p, lobby) {
  const m = matchOf(lobby, p.info.username);
  ctx.handleTournamentAccept(p.ws, p.info, { matchId: m.id });
  ctx.handleTournamentResult(p.ws, p.info, { matchId: m.id, won: true });
  ctx.handleTournamentResult(p.ws, p.info, { matchId: m.id, won: true });
  return m;
}
function resolveBots(lobby, ctx) {
  lobby.rounds.flat().forEach(m => { if (m.status === 'bot_live') m.resolveAt = 0; });
  ctx.tournamentHelpers.tickTourn(lobby);
}

test('every bracket match has an id the client can address', () => {
  const s = makeServer(); const { lobby } = startBracket(s, ['amy', 'bob']);
  assert.deepStrictEqual(lobby.rounds.map(r => r.map(m => m.id)), [['r0m0', 'r0m1', 'r0m2', 'r0m3'], ['r1m0', 'r1m1'], ['r2m0']]);
});

test('a won series finalizes and the winner advances', () => {
  const s = makeServer(); const { players: [amy], lobby } = startBracket(s, ['amy', 'bob']);
  const qf = winVsBot(s.ctx, amy, lobby);
  assert.strictEqual(qf.status, 'final');
  assert.strictEqual(qf.winner.username, 'amy');
  assert.strictEqual(lobby.rounds[1][Math.floor(qf.slot / 2)][qf.slot % 2 ? 'b' : 'a'].username, 'amy');
});

test('results from a reconnected socket still count', () => {
  const s = makeServer(); const { players: [amy], lobby } = startBracket(s, ['amy', 'bob']);
  const m = matchOf(lobby, 'amy');
  s.ctx.handleTournamentAccept(amy.ws, amy.info, { matchId: m.id });
  s.ctx.handleTournamentResult(amy.ws, amy.info, { matchId: m.id, won: true });
  s.allClients.delete(amy.ws);
  const again = s.connect('amy'); // fresh socket, no tournamentBracket yet
  s.ctx.reattachTournament(again.ws, again.info);
  assert.strictEqual(again.info.tournamentBracket, 'rookie');
  s.ctx.handleTournamentResult(again.ws, again.info, { matchId: m.id, won: true });
  assert.strictEqual(m.status, 'final');
});

test('two real players meet in a server room, not against bots', () => {
  const s = makeServer(); const { players: [amy, bob], lobby } = startBracket(s, ['amy', 'bob']);
  winVsBot(s.ctx, amy, lobby); winVsBot(s.ctx, bob, lobby); resolveBots(lobby, s.ctx);
  winVsBot(s.ctx, amy, lobby); winVsBot(s.ctx, bob, lobby);
  const final = lobby.rounds[2][0];
  assert.strictEqual(final.status, 'awaiting');
  assert.ok(s.ctx.isHeadToHead(final));

  s.ctx.handleTournamentAccept(amy.ws, amy.info, { matchId: 'r2m0' });
  assert.strictEqual(s.started.length, 0, 'waits for both players');
  s.ctx.handleTournamentAccept(bob.ws, bob.info, { matchId: 'r2m0' });
  assert.strictEqual(s.started.length, 1);
  const room = s.started[0];
  assert.strictEqual(final.status, 'live');
  assert.strictEqual(final.roomId, room.id);
  assert.notStrictEqual(room.mapId, 15, 'uses a standard arena');
  assert.deepStrictEqual(room.players.map(p => p.info.username), [final.a.username, final.b.username]);

  // Clients can no longer self-report head-to-head results.
  s.ctx.handleTournamentResult(amy.ws, amy.info, { matchId: 'r2m0', won: true });
  assert.strictEqual(final.winsA + final.winsB, 0);

  // Server-scored best of 3: after one game both must accept again.
  s.ctx.onTournamentGameOver(room.tournament, 'bob');
  assert.strictEqual(final.status, 'awaiting');
  assert.strictEqual(final.acceptedA || final.acceptedB, false);
  s.ctx.handleTournamentAccept(amy.ws, amy.info, { matchId: 'r2m0' });
  s.ctx.handleTournamentAccept(bob.ws, bob.info, { matchId: 'r2m0' });
  assert.strictEqual(s.started.length, 2);
  s.ctx.onTournamentGameOver(s.started[1].tournament, 'bob');
  assert.strictEqual(final.status, 'final');
  assert.strictEqual(lobby.champion.username, 'bob');
});

test('accept timeout with nobody accepting favours the series leader', () => {
  const s = makeServer(); const { players: [amy, bob], lobby } = startBracket(s, ['amy', 'bob']);
  winVsBot(s.ctx, amy, lobby); winVsBot(s.ctx, bob, lobby); resolveBots(lobby, s.ctx);
  winVsBot(s.ctx, amy, lobby); winVsBot(s.ctx, bob, lobby);
  const final = lobby.rounds[2][0];
  final.winsA = 1; final.acceptDeadline = Date.now() - 1;
  s.ctx.tournamentHelpers.tickTourn(lobby);
  assert.strictEqual(final.winner, final.a);
});

setTimeout(() => process.exit(0), 50); // tournament timers are not needed after the assertions
