const { createRateLimiter } = require('./rate-limit');
const customizeLimiter = createRateLimiter({ limit: 20, windowMs: 10 * 1000 });

const OUT_OF_GAME_MESSAGES = new Set(['leave_room', 'cancel_queue', 'perf_ping']);
// Handled normally even while a game is running, alongside the game input.
const IN_GAME_LOBBY_MESSAGES = new Set(['chat', 'set_name', 'customize']);

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
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; } // not JSON: ignore
    if (!msg || typeof msg !== 'object') return;
    try {
      // In-game inputs route to game handler; chat still handled normally.
      // Leaving and pings are not game input: they always reach the normal handler.
      if (info.state === 'playing' && info.gameHandler && !OUT_OF_GAME_MESSAGES.has(msg.type)) {
        info.gameHandler(msg);
        if (IN_GAME_LOBBY_MESSAGES.has(msg.type)) await handleMsg(ws, info, msg);
        return;
      }
      await handleMsg(ws, info, msg);
    } catch (err) {
      // Never swallow handler errors: they hide real bugs (the Slimeverse join once failed silently this way).
      console.error('[ws] message handler failed', { type: msg.type, user: info.username || info.name, state: info.state, room: info.room && info.room.id }, err);
      send(ws, { type: 'server_error', ref: msg.type });
    }
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
function setGuestName(info, msg) {
  const name = String(msg.name || '').trim().slice(0, 20);
  if (!info.userId && name) info.name = name;
  if (!info.userId) {
    info.wins = Math.max(0, Math.min(99999, parseInt(msg.wins) || 0));
    info.rank  = String(msg.rank || 'PRIVATE').slice(0, 20);
  }
}

function leaveRoomRequest(ws, info, msg) {
  // A leave that names a room only applies to that room (a late "stop spectating"
  // must not pull a player out of the match they were just moved into).
  if (msg.roomId != null && (!info.room || info.room.id !== Number(msg.roomId))) return;
  leaveRoom(ws, info, false);
  info.state = 'lobby';
  pushLobbyState();
}

// Lobby-socket messages: exactly one handler per type; anything else is ignored.
const HANDLERS = {
  perf_ping:           (ws, info, msg) => send(ws, { type: 'perf_pong', t: msg.t }),
  chat:                (ws, info, msg) => relayChat(info, msg),
  set_name:            (ws, info, msg) => setGuestName(info, msg),
  customize:           (ws, info, msg) => handleCustomize(ws, info, msg),
  join_room:           (ws, info, msg) => handleJoinRoom(ws, info, msg.roomId, msg.rejoinToken),
  leave_room:          leaveRoomRequest,
  cancel_queue:        leaveRoomRequest,
  ranked_queue:        (ws, info) => handleRankedQueue(ws, info),
  ranked_queue_cancel: (ws, info) => cancelRankedQueue(ws, info),
  tournament_join:     (ws, info, msg) => handleTournamentJoin(ws, info, msg),
  tournament_ready:    (ws, info) => handleTournamentReady(ws, info),
  tournament_leave:    (ws, info) => handleTournamentLeave(ws, info),
  tournament_accept:   (ws, info, msg) => handleTournamentAccept(ws, info, msg),
  tournament_result:   (ws, info, msg) => handleTournamentResult(ws, info, msg),
  tournament_score:    (ws, info, msg) => handleTournamentScore(ws, info, msg),
  tournament_spectate: (ws, info, msg) => handleTournamentSpectate(ws, info, msg),
  tournament_state:    (ws, info, msg) => handleTournamentState(ws, info, msg),
};

async function handleMsg(ws, info, msg) {
  const handler = Object.prototype.hasOwnProperty.call(HANDLERS, msg.type) ? HANDLERS[msg.type] : null;
  if (handler) await handler(ws, info, msg);
}

async function handleCustomize(ws, info, msg) {
  if (!customizeLimiter.allow(info.id)) return; // each change is a database write
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
