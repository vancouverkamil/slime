// Head-to-head tournament matches (two real players) are played in a real,
// server-authoritative game room, exactly like Quick Play / Ranked. Only
// player-vs-bot matches are simulated on the player's own client.
module.exports = function install(ctx) {
  const { rooms, allClients, send, crypto, pushLobbyState, activeTournaments } = ctx;
  const { findMatch, resolveMatch, broadcastTournState, tickTourn } = ctx.tournamentHelpers;

  function isHeadToHead(match) {
    return !!(match && match.a && match.b && match.a.username && match.b.username);
  }

  function socketFor(username) {
    for (const [ws, info] of allClients) if (info.username === username && ws.readyState === 1) return { ws, info };
    return null;
  }

  function freeRoom() {
    const free = rooms.filter(r => r.phase === 'empty' && !r.players.length && !r.spectators.length && !r.pendingReconnect);
    const standard = free.filter(r => r.mapId !== 15);
    const pool = standard.length ? standard : free;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  // Returns false if the room could not be started (a player is offline or no room is free).
  function startTournamentRoom(lobby, match) {
    const a = socketFor(match.a.username), b = socketFor(match.b.username);
    const room = a && b ? freeRoom() : null;
    if (!room) return false;
    [a, b].forEach(p => { if (p.info.room) ctx.leaveRoom(p.ws, p.info, false); });
    room.ranked = false;
    room.tournament = { bracketId: lobby.bracketId, matchId: match.id };
    // Entrant A always plays on the left so scoreLeft/scoreRight map to scoreA/scoreB.
    [a, b].forEach((p, i) => {
      const tok = crypto.randomBytes(16).toString('hex');
      room.players.push({ ws: p.ws, info: p.info });
      p.info.room = room; p.info.role = 'player'; p.info.state = 'in_room'; p.info.rejoinToken = tok;
      send(p.ws, { type: 'room_joined', roomId: room.id, mapId: room.mapId, role: 'player', side: i === 0 ? 'left' : 'right',
        rejoinToken: tok, tournament: { bracketId: lobby.bracketId, matchId: match.id } });
    });
    match.roomId = room.id; match.scoreA = 0; match.scoreB = 0;
    ctx.startRoomGame(room);
    pushLobbyState();
    return true;
  }

  function lookup(t) {
    const lobby = t && activeTournaments.get(t.bracketId);
    const match = lobby && findMatch(lobby, t.matchId);
    return match && match.status !== 'final' ? { lobby, match } : null;
  }

  // Next game of the series: both players accept again, same as the first game.
  function awaitNextGame(lobby, match) {
    match.status = 'awaiting'; match.acceptedA = false; match.acceptedB = false;
    match.acceptDeadline = Date.now() + 60000;
    ctx.sendTournamentAccepts(lobby, match);
  }

  function onTournamentPoint(t, scoreLeft, scoreRight) {
    const found = lookup(t); if (!found) return;
    found.match.scoreA = scoreLeft; found.match.scoreB = scoreRight;
    broadcastTournState(found.lobby);
  }

  function onTournamentGameOver(t, winnerUsername) {
    const found = lookup(t); if (!found) return;
    const { lobby, match } = found;
    match.roomId = null;
    if (winnerUsername === match.a.username) match.winsA++; else match.winsB++;
    if (match.winsA >= 2 || match.winsB >= 2) resolveMatch(lobby, match, match.winsA >= 2 ? match.a : match.b, null);
    else awaitNextGame(lobby, match);
    broadcastTournState(lobby); tickTourn(lobby);
  }

  // Room ended without a result (disconnect timeout). The player still there takes the game;
  // if both left, the game is replayed after a fresh accept.
  function onTournamentRoomAbandoned(t, remainingUsername) {
    const found = lookup(t); if (!found) return;
    if (remainingUsername) { onTournamentGameOver(t, remainingUsername); return; }
    found.match.roomId = null;
    awaitNextGame(found.lobby, found.match);
    broadcastTournState(found.lobby); tickTourn(found.lobby);
  }

  Object.assign(ctx, { isHeadToHead, startTournamentRoom, onTournamentPoint, onTournamentGameOver, onTournamentRoomAbandoned });
};
