module.exports = function install(ctx) {
  const { accounts, wss, allClients, progression, send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat, parseCookies, handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, handleTournamentJoin, handleTournamentReady, handleTournamentLeave, handleTournamentAccept, handleTournamentResult, handleTournamentScore, handleTournamentSpectate, handleTournamentState } = ctx;
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
  if (ctx.reattachTournament) ctx.reattachTournament(ws, info);

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
    handleRankedQueue(ws, info);
  } else if (msg.type === 'ranked_queue_cancel') {
    cancelRankedQueue(ws, info);
  } else if (msg.type === 'join_room') {
    handleJoinRoom(ws, info, msg.roomId, msg.rejoinToken);
  } else if (msg.type === 'customize') {
    await handleCustomize(ws, info, msg);
  } else if (msg.type === 'leave_room' || msg.type === 'cancel_queue') {
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
  } else if (msg.type === 'tournament_spectate') {
    handleTournamentSpectate(ws, info, msg);
  } else if (msg.type === 'tournament_state') {
    handleTournamentState(ws, info, msg);
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
  if (!info.room) return;
  const room = info.room;
  const sideIdx = room.players.findIndex(p => p.ws === ws);
  if (sideIdx === -1) return;
  const side = sideIdx === 0 ? 'left' : 'right';
  broadcastRoom(room, { type: 'customize', side, hat, hatAnim, color, hatDrawing: drawing, trail });
}

// Simple per-client chat rate limiter: max 5 messages per 3 s
function chatAllowed(info) {
  const now = Date.now();
  if (now > info.chatReset) { info.chatCount = 0; info.chatReset = now + 3000; }
  if (info.chatCount >= 5) return false;
  info.chatCount++;
  return true;
}

function relayChat(info, msg) {
  if (!chatAllowed(info)) return;
  const text = String(msg.message || '').slice(0, 200).trim();
  if (text) broadcastAll({ type: 'chat', name: info.name, message: text });
}

};
