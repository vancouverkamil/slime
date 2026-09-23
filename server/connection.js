module.exports = function install(ctx) {
  const { app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES, newBall, newSlime, initRound, tick, send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, getPublicPlayer, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat, broadcastSlimeverse, leaveSlimeverse, enterSlimeverse, slimeverseSnapshot, chatAllowed, parseCookies, getReqToken, handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, startRoomGame, handleTournamentJoin, handleTournamentReady, handleTournamentLeave, handleTournamentAccept, handleTournamentResult, handleTournamentScore, rankedQueue } = ctx;
wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const sessionToken = url.searchParams.get('session') || parseCookies(req.headers.cookie).slime_session;
  const user = await accounts.getUserBySession(sessionToken);
  const profile = accounts.publicProfile(user);
  const playerProgression = progressionForUser(user);
  const info = {
    id: makeClientId(),
    userId: user ? user.id : null,
    username: user ? user.username : null,
    name: user ? user.displayName : randomName(),
    wins: user ? user.stats.wins : 0,
    matches: user ? user.stats.matches : 0,
    rank: user ? getRank(user.stats.wins) : 'PRIVATE',
    progression: playerProgression,
    room: null,
    role: null,
    gameHandler: null,
    state: 'lobby',
    chatCount: 0,
    chatReset: 0,
    hat: profile && profile.slime ? profile.slime.hat : 'none',
    hatAnim: profile && profile.slime ? profile.slime.hatAnim : 'none',
    bodyColor: profile && profile.slime ? profile.slime.color : '#00ff00',
    hatDrawing: profile && profile.slime ? profile.slime.hatDrawing : [],
    trail: 'none',
    ranked: profile ? (profile.ranked || progression.defaultRanked()) : null,
    tournamentBracket: null,
  };
  allClients.set(ws, info);

  send(ws, { type: 'connected', name: info.name, profile, totalPlayers: allClients.size, lobbies: getLobbySnapshot(), playerList: getPlayerList() });
  pushLobbyState();

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      // In-game inputs route to game handler; chat still handled normally
      if (info.state === 'playing' && info.gameHandler) {
        info.gameHandler(msg);
        if (msg.type === 'chat') relayChat(info, msg);
        if (msg.type === 'set_name') {
          const name = String(msg.name || '').trim().slice(0, 20);
          if (!info.userId && name) info.name = name;
          if (!info.userId) {
            info.wins = Math.max(0, Math.min(99999, parseInt(msg.wins) || 0));
            info.rank  = String(msg.rank || 'PRIVATE').slice(0, 20);
          }
        }
        if (msg.type === 'customize') await handleCustomize(ws, info, msg);
        return;
      }
      await handleMsg(ws, info, msg);
    } catch (_) {}
  });

  ws.on('close', () => {
    handleTournamentLeave(ws, info);
    leaveSlimeverse(ws, info);
    cancelRankedQueue(ws, info);
    // Active-game players: the in-game handleDisconnect manages the grace period
    const handledByGame = info.room && info.role === 'player' && info.room.phase === 'playing';
    if (!handledByGame) leaveRoom(ws, info, true);
    allClients.delete(ws);
    pushLobbyState();
  });
});

// ── message routing ───────────────────────────────────────
async function handleMsg(ws, info, msg) {
  if (msg.type === 'perf_ping') {
    send(ws, { type: 'perf_pong', t: msg.t });
  } else if (msg.type === 'chat') {
    relayChat(info, msg);
  } else if (msg.type === 'set_name') {
    const name = String(msg.name || '').trim().slice(0, 20);
    if (!info.userId && name) info.name = name;
    if (!info.userId) {
      info.wins = Math.max(0, Math.min(99999, parseInt(msg.wins) || 0));
      info.rank  = String(msg.rank || 'PRIVATE').slice(0, 20);
    }
  } else if (msg.type === 'ranked_queue') {
    leaveSlimeverse(ws, info);
    handleRankedQueue(ws, info);
  } else if (msg.type === 'ranked_queue_cancel') {
    cancelRankedQueue(ws, info);
  } else if (msg.type === 'join_room') {
    leaveSlimeverse(ws, info);
    handleJoinRoom(ws, info, msg.roomId, msg.rejoinToken);
  } else if (msg.type === 'customize') {
    await handleCustomize(ws, info, msg);
  } else if (msg.type === 'enter_slimeverse') {
    enterSlimeverse(ws, info);
  } else if (msg.type === 'leave_slimeverse') {
    leaveSlimeverse(ws, info);
    pushLobbyState();
  } else if (msg.type === 'slimeverse_input') {
    const sv = slimeverseClients.get(ws);
    if (sv) {
      sv.left = !!msg.left;
      sv.right = !!msg.right;
      sv.fwd  = !!msg.fwd;
      sv.back = !!msg.back;
      if (msg.jump) sv.jump = true;
      const px = Number(msg.x);
      const py = Number(msg.y);
      const pz = Number(msg.z);
      if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)) {
        sv.x = Math.max(70, Math.min(SLIMEVERSE_WORLD.width - 70, px));
        sv.y = Math.max(0, Math.min(SLIMEVERSE_WORLD.floorY, py));
        sv.z = Math.max(0, Math.min(SLIMEVERSE_WORLD.maxZ, pz));
        sv.vx = Number.isFinite(Number(msg.vx)) ? Math.max(-12, Math.min(12, Number(msg.vx))) : sv.vx;
        sv.vy = Number.isFinite(Number(msg.vy)) ? Math.max(-30, Math.min(30, Number(msg.vy))) : sv.vy;
        sv.vz = Number.isFinite(Number(msg.vz)) ? Math.max(-14, Math.min(14, Number(msg.vz))) : sv.vz;
        sv.jump = false;
        sv.clientPoseAt = Date.now();
      }
    }
  } else if (msg.type === 'slimeverse_enter_store') {
    const sv = slimeverseClients.get(ws);
    if (sv) { sv.inStore = true; sv.storeX = 1050; }
  } else if (msg.type === 'slimeverse_exit_store') {
    const sv = slimeverseClients.get(ws);
    if (sv) sv.inStore = false;
  } else if (msg.type === 'slimeverse_store_move') {
    const sv = slimeverseClients.get(ws);
    if (sv && sv.inStore) sv.storeX = Math.max(80, Math.min(2620, Number(msg.storeX) || 1050));
  } else if (msg.type === 'leave_room' || msg.type === 'cancel_queue') {
    leaveSlimeverse(ws, info);
    leaveRoom(ws, info, false);
    info.state = 'lobby';
    pushLobbyState();
  } else if (msg.type === 'tournament_join') {
    handleTournamentJoin(ws, info, msg);
  } else if (msg.type === 'tournament_ready') {
    handleTournamentReady(ws, info);
  } else if (msg.type === 'tournament_leave') {
    handleTournamentLeave(ws, info);
  } else if (msg.type === 'tournament_accept') {
    handleTournamentAccept(ws, info, msg);
  } else if (msg.type === 'tournament_result') {
    handleTournamentResult(ws, info, msg);
  } else if (msg.type === 'tournament_score') {
    handleTournamentScore(ws, info, msg);
  }
}

async function handleCustomize(ws, info, msg) {
  let hat       = String(msg.hat      || 'none').slice(0, 20);
  const hatAnim = String(msg.hatAnim  || 'none').slice(0, 20);
  const color   = String(msg.color    || '#00ff00').slice(0, 20);
  const trail   = String(msg.trail    || 'none').slice(0, 20);
  const drawing = Array.isArray(msg.hatDrawing) ? msg.hatDrawing.slice(0, 300) : [];
  if (!canUseHat(info, hat)) hat = 'none';
  info.hat = hat; info.hatAnim = hatAnim; info.bodyColor = color; info.hatDrawing = drawing; info.trail = trail;
  if (info.userId) await accounts.updateSlime(info.userId, { hat, hatAnim, color, hatDrawing: drawing, trail });
  if (info.state === 'slimeverse') {
    broadcastSlimeverse({ type: 'slimeverse_customized', player: getPublicPlayer(info) });
    return;
  }
  if (!info.room) return;
  const room = info.room;
  const sideIdx = room.players.findIndex(p => p.ws === ws);
  if (sideIdx === -1) return;
  const side = sideIdx === 0 ? 'left' : 'right';
  broadcastRoom(room, { type: 'customize', side, hat, hatAnim, color, hatDrawing: drawing, trail });
}

function relayChat(info, msg) {
  if (!chatAllowed(info)) return;
  const text = String(msg.message || '').slice(0, 200).trim();
  if (text) broadcastAll({ type: 'chat', name: info.name, message: text });
}

};
