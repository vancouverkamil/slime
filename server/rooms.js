module.exports = function install(ctx) {
  const { app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES, newBall, newSlime, initRound, tick, send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, getPublicPlayer, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat, broadcastSlimeverse, leaveSlimeverse, enterSlimeverse, slimeverseSnapshot, chatAllowed, parseCookies, getReqToken, handleCustomize, relayChat, startRoomGame, handleTournamentJoin, handleTournamentReady, handleTournamentLeave } = ctx;
function handleJoinRoom(ws, info, roomId, rejoinToken) {
  const id = parseInt(roomId, 10);
  const room = rooms.find(r => r.id === id) || null;
  if (!room) return;
  leaveRoom(ws, info, false);

  // ── reconnect path ──────────────────────────────────────
  if (room.pendingReconnect) {
    const pr = room.pendingReconnect;
    const tokenMatch = rejoinToken && pr.rejoinToken === rejoinToken;
    const userMatch  = info.userId && pr.userId && info.userId === pr.userId;
    if (tokenMatch || userMatch) {
      pr.resumeGame(ws, info);
      return;
    }
  }

  // ── normal join path ────────────────────────────────────
  const spotFree = room.players.length < 2 && !room.pendingReconnect;
  if (spotFree) {
    const side      = room.players.length === 0 ? 'left' : 'right';
    const joinToken = crypto.randomBytes(16).toString('hex');
    if (room.players.length === 0) { room.ranked = false; room.tournament = null; }
    room.players.push({ ws, info });
    info.room        = room;
    info.role        = 'player';
    info.state       = 'in_room';
    info.rejoinToken = joinToken;
    room.phase       = room.players.length === 1 ? 'waiting' : 'playing';

    send(ws, { type: 'room_joined', roomId: room.id, mapId: room.mapId, role: 'player', side, rejoinToken: joinToken });

    if (room.players.length === 2) startRoomGame(room);
  } else {
    // ── spectator ──
    room.spectators.push({ ws, info });
    info.room  = room;
    info.role  = 'spectator';
    info.state = 'spectating';

    send(ws, { type: 'room_joined', roomId: room.id, mapId: room.mapId, role: 'spectator', side: null });

    if (room.state) {
      send(ws, buildStateMsg(room.state));
    } else if (room.pendingReconnect) {
      send(ws, { type: 'opponent_reconnecting', side: room.pendingReconnect.side, timeoutMs: RECONNECT_TIMEOUT_MS });
    } else {
      send(ws, { type: 'spectator_waiting' });
    }
    if (room.players[0]) send(ws, { type: 'customize', side: 'left',  hat: room.players[0].info.hat, hatAnim: room.players[0].info.hatAnim, color: room.players[0].info.bodyColor, hatDrawing: room.players[0].info.hatDrawing, trail: room.players[0].info.trail || 'none' });
    if (room.players[1]) send(ws, { type: 'customize', side: 'right', hat: room.players[1].info.hat, hatAnim: room.players[1].info.hatAnim, color: room.players[1].info.bodyColor, hatDrawing: room.players[1].info.hatDrawing, trail: room.players[1].info.trail || 'none' });
  }
  pushLobbyState();
}

// ── leave room ────────────────────────────────────────────
function leaveRoom(ws, info, disconnecting) {
  if (!info.room) return;
  const room = info.room;

  if (info.role === 'player') {
    room.players = room.players.filter(p => p.ws !== ws);

    // Cancel any pending reconnect (explicit leave = no grace period)
    if (room.pendingReconnect) {
      clearTimeout(room.pendingReconnect.timer);
      room.pendingReconnect = null;
    }

    if (room.interval) {
      clearInterval(room.interval);
      room.interval = null;
      room.state    = null;
      if (room.tournament && ctx.onTournamentRoomAbandoned) {
        const t = room.tournament, stayed = room.players[0];
        room.tournament = null;
        ctx.onTournamentRoomAbandoned(t, stayed ? stayed.info.username : null);
      }
      if (!disconnecting) {
        broadcastRoom(room, { type: 'opponent_disconnected' });
      }
      // Fully evict remaining players/spectators so the room is truly empty
      [...room.players, ...room.spectators].forEach(({ info: i }) => {
        i.room = null; i.role = null; i.state = 'lobby'; i.gameHandler = null;
      });
      room.players    = [];
      room.spectators = [];
    }
    room.phase = room.players.length === 0 ? 'empty' : 'waiting';
  } else if (info.role === 'spectator') {
    room.spectators = room.spectators.filter(s => s.ws !== ws);
  }

  info.room  = null;
  info.role  = null;
}

// ── ranked queue ──────────────────────────────────────────
const rankedQueue = [];

function handleRankedQueue(ws, info) {
  if (!info.userId) {
    send(ws, { type: 'ranked_error', message: 'Sign in to play ranked.' });
    return;
  }
  leaveRoom(ws, info, false);
  rankedQueue.push({ ws, info });
  info.state = 'ranked_queue';
  send(ws, { type: 'ranked_queued', position: rankedQueue.length });
  tryMatchRanked();
}

function cancelRankedQueue(ws, info) {
  const idx = rankedQueue.findIndex(q => q.ws === ws);
  if (idx === -1) return;
  rankedQueue.splice(idx, 1);
  if (info.state === 'ranked_queue') info.state = 'lobby';
  send(ws, { type: 'ranked_queue_left' });
}

function tryMatchRanked() {
  if (rankedQueue.length < 2) return;
  const p1 = rankedQueue.shift();
  const p2 = rankedQueue.shift();
  // Random free room on a standard arena, so ranked looks and plays like Quick Play
  // (it used to always take the last room, which is the Championship stage).
  const free = rooms.filter(r => r.phase === 'empty' && r.players.length === 0 && r.spectators.length === 0);
  const standard = free.filter(r => r.mapId !== 15);
  const pool = standard.length ? standard : free;
  const room = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (!room) {
    rankedQueue.unshift(p1, p2);
    return;
  }
  room.ranked = true;
  [p1, p2].forEach((p, i) => {
    const side = i === 0 ? 'left' : 'right';
    const tok = crypto.randomBytes(16).toString('hex');
    room.players.push({ ws: p.ws, info: p.info });
    p.info.room = room; p.info.role = 'player'; p.info.state = 'in_room'; p.info.rejoinToken = tok;
    const tier = progression.getRankedTier(p.info.ranked ? p.info.ranked.rating : 1000, p.info.ranked ? p.info.ranked.placementsLeft : 5);
    send(p.ws, { type: 'room_joined', roomId: room.id, mapId: room.mapId, role: 'player', side, ranked: true, rejoinToken: tok, opponentTier: tier.label });
  });
  room.phase = 'playing';
  startRoomGame(room);
  pushLobbyState();
}

  Object.assign(ctx, { handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, rankedQueue });
};
