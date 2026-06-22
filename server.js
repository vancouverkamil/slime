const express     = require('express');
const http        = require('http');
const { WebSocketServer } = require('ws');
const path        = require('path');
const compression = require('compression');
const { loadLocalEnv } = require('./local-env');
const { newBall, newSlime, initRound, tick } = require('./physics');
const { createAccountStore, normalizeUsername } = require('./account-store');
const progression = require('./progression');

loadLocalEnv();

const crypto = require('crypto');
const WIN_AMOUNT            = 7;
const TICK_MS               = 20;
const RECONNECT_TIMEOUT_MS  = 30_000;
const SLIMEVERSE_TICK_MS = 16;
const SLIMEVERSE_WORLD = { width: 4500, height: 2250, floorY: 1980, maxZ: 3000 };
const RPS_CHOICES = new Set(['rock', 'paper', 'scissors']);

const ROOM_NAMES = [
  'Sky Court', 'Cave Court', 'Sunset Court', 'Storm Court',
  'Jungle Court', 'Frozen Court', 'Desert Court', 'Neon Court',
  'Space Court', 'Volcano Court', 'Ocean Court',
  'Overpass Court', 'Bunker Court', 'Reactor Court', 'Void Court',
];

const app = express();
const accounts = createAccountStore();
app.use(compression());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: '256kb' }));
app.use(express.text({ type: 'text/plain', limit: '256kb' }));
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch (_) {
      req.body = {};
    }
  }
  next();
});
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'slime_volleyball.html')));
app.get('/healthz', async (_req, res) => {
  try {
    if (accounts.ready) await accounts.ready;
    res.json({
      ok: true,
      database: accounts.constructor && accounts.constructor.name === 'PostgresAccountStore' ? 'postgres' : 'file',
      websocketClients: allClients.size,
      rooms: rooms.length,
    });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message || 'health check failed' });
  }
});
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// All connected clients: ws -> info object
const allClients = new Map();
const slimeverseClients = new Map();

// 8 persistent rooms
const rooms = ROOM_NAMES.map((name, id) => ({
  id, name,
  players:          [], // [{ ws, info }], max 2
  spectators:       [], // [{ ws, info }], unlimited
  state:            null,
  interval:         null,
  phase:            'empty', // 'empty' | 'waiting' | 'playing'
  pendingReconnect: null,    // { side, userId, rejoinToken, timer, resumeGame }
}));

function parseCookies(header) {
  const cookies = {};
  String(header || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return cookies;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const extraOrigins = String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === 'slime-7wuo.onrender.com' ||
      url.hostname === 'slime.vercel.app' ||
      url.hostname === 'slime-nu.vercel.app' ||
      url.hostname === 'slime-kamils-projects-2416babd.vercel.app' ||
      (url.hostname.startsWith('slime-') && url.hostname.endsWith('-kamils-projects-2416babd.vercel.app')) ||
      extraOrigins.includes(origin)
    );
  } catch (_) {
    return false;
  }
}

function isCrossSiteRequest(req) {
  if (!req.headers.origin) return false;
  try {
    return new URL(req.headers.origin).host !== req.headers.host;
  } catch (_) {
    return false;
  }
}

function sessionCookie(token, req) {
  const crossSite = isCrossSiteRequest(req);
  const sameSite = crossSite ? 'None' : 'Lax';
  const secure = crossSite ? '; Secure' : '';
  return `slime_session=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}

function clearSessionCookie(req) {
  const crossSite = isCrossSiteRequest(req);
  const sameSite = crossSite ? 'None' : 'Lax';
  const secure = crossSite ? '; Secure' : '';
  return `slime_session=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`;
}

async function getReqUser(req) {
  const token = getReqToken(req);
  return await accounts.getUserBySession(token);
}

function getReqToken(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  if (req.query && req.query.session) return String(req.query.session);
  if (req.body && req.body._session) return String(req.body._session);
  return parseCookies(req.headers.cookie).slime_session;
}

function sendUser(res, user) {
  res.json({ user: accounts.publicProfile(user) });
}

app.get('/api/me', async (req, res) => {
  sendUser(res, await getReqUser(req));
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await accounts.register(req.body.username, req.body.password);
    const token = await accounts.createSession(user.id);
    res.setHeader('Set-Cookie', sessionCookie(token, req));
    res.json({ user: accounts.publicProfile(user), token });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await accounts.login(req.body.username, req.body.password);
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const token = await accounts.createSession(user.id);
    res.setHeader('Set-Cookie', sessionCookie(token, req));
    res.json({ user: accounts.publicProfile(user), token });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = getReqToken(req);
  await accounts.deleteSession(token);
  res.setHeader('Set-Cookie', clearSessionCookie(req));
  res.json({ ok: true });
});

app.get('/api/profiles/:username', async (req, res) => {
  const user = await accounts.findByUsername(normalizeUsername(req.params.username));
  if (!user) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  res.json({ user: accounts.publicProfile(user) });
});

app.get('/api/leaderboard', async (_req, res) => {
  const players = typeof accounts.leaderboard === 'function' ? await accounts.leaderboard() : [];
  res.json({ players });
});

app.post('/api/me/slime', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) {
    res.status(401).json({ error: 'Login required.' });
    return;
  }
  const updated = await accounts.updateSlime(user.id, req.body || {});
  sendUser(res, updated);
});

const SHOP_ITEMS = {
  devil:      { price: 400,  name: 'Devil Horns' },
  prismatic:  { price: 600,  name: 'Prismatic Crown' },
  dragonfire: { price: 800,  name: 'Dragon Horns' },
  cosmic:     { price: 1200, name: 'Cosmic Crown' },
  angelic:    { price: 1500, name: 'Triple Halo' },
  overlord:   { price: 2500, name: 'Overlord Crown' },
};

app.post('/api/me/buy', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) { res.status(401).json({ error: 'Login required.' }); return; }
  const hatId = String(req.body.hat || '');
  const item = SHOP_ITEMS[hatId];
  if (!item) { res.status(400).json({ error: 'Unknown item.' }); return; }
  try {
    const updated = await accounts.purchaseItem(user.id, hatId, item.price);
    sendUser(res, updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Purchase failed.' });
  }
});

app.post('/api/me/hat-drawings', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) { res.status(401).json({ error: 'Login required.' }); return; }
  try {
    const updated = await accounts.saveHatPreset(user.id, req.body || {});
    sendUser(res, updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not save hat drawing.' });
  }
});

app.delete('/api/me/hat-drawings/:id', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) { res.status(401).json({ error: 'Login required.' }); return; }
  const updated = await accounts.deleteHatPreset(user.id, String(req.params.id || '').slice(0, 32));
  sendUser(res, updated);
});

// ── helpers ──────────────────────────────────────────────
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcastAll(msg) {
  const str = JSON.stringify(msg);
  allClients.forEach((_, ws) => { if (ws.readyState === 1) ws.send(str); });
}
function broadcastRoom(room, msg) {
  const str = JSON.stringify(msg);
  [...room.players, ...room.spectators].forEach(({ ws }) => {
    if (ws.readyState === 1) ws.send(str);
  });
}
function getLobbySnapshot() {
  return rooms.map(r => ({
    id:             r.id,
    name:           r.name,
    playerCount:    r.players.length,
    spectatorCount: r.spectators.length,
    phase:          r.phase,
    restricted:     r.id >= 11,
  }));
}
function getPlayerList() {
  const list = [];
  allClients.forEach((info) => {
    list.push({
      name: info.name,
      username: info.username || null,
      status: info.state,
      wins: info.wins || 0,
      rank: info.rank || 'PRIVATE',
      level: info.progression ? info.progression.level : 1,
      rankTitle: info.progression ? info.progression.rankTitle : 'Recruit',
      badge: info.progression ? info.progression.badge : 'REC ^',
      prestige: !!(info.progression && info.progression.prestige),
      matches: info.matches || 0,
      account: !!info.userId,
    });
  });
  return list;
}
function getPublicPlayer(info) {
  return {
    id: info.id,
    name: info.name,
    username: info.username || null,
    level: info.progression ? info.progression.level : 1,
    rankTitle: info.progression ? info.progression.rankTitle : 'Recruit',
    badge: info.progression ? info.progression.badge : 'REC ^',
    hat: info.hat || 'none',
    hatAnim: info.hatAnim || 'none',
    color: info.bodyColor || '#00ff00',
    hatDrawing: info.hatDrawing || [],
  };
}
let _lobbyFlushTimer = null;
function pushLobbyState() {
  if (_lobbyFlushTimer) return;
  _lobbyFlushTimer = setTimeout(() => {
    _lobbyFlushTimer = null;
    if (allClients.size === 0) return;
    const msg = JSON.stringify({
      type:         'lobby_list',
      lobbies:      getLobbySnapshot(),
      totalPlayers: allClients.size,
      playerList:   getPlayerList(),
    });
    allClients.forEach((_, ws) => { if (ws.readyState === 1) ws.send(msg); });
  }, 50);
}
function randomName() {
  return 'Player' + (Math.floor(Math.random() * 9000) + 1000);
}
function makeClientId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function getRank(wins) {
  if (wins >= 10) return 'LIEUTENANT';
  if (wins >= 6) return 'SERGEANT';
  if (wins >= 3) return 'CORPORAL';
  return 'PRIVATE';
}

function progressionForUser(user) {
  return progression.getProgression(user && user.stats ? user.stats.xp : 0);
}

function canUseHat(info, hat) {
  return hat !== 'goldcrown' || !!(info.progression && info.progression.unlocks.goldCrown);
}

function broadcastSlimeverse(msg) {
  const str = JSON.stringify(msg);
  slimeverseClients.forEach((_, sws) => {
    if (sws.readyState === 1) sws.send(str);
  });
}

function leaveSlimeverse(ws, info) {
  if (!slimeverseClients.has(ws)) return;
  slimeverseClients.delete(ws);
  if (info.state === 'slimeverse') info.state = 'lobby';
  broadcastSlimeverse({ type: 'slimeverse_leave', id: info.id });
  pushLobbyState();
}

function enterSlimeverse(ws, info) {
  leaveRoom(ws, info, false);
  const spawnIndex = slimeverseClients.size;
  slimeverseClients.set(ws, {
    x: 500 + (spawnIndex % 8) * 85,
    y: SLIMEVERSE_WORLD.floorY,
    z: 200,
    vx: 0,
    vy: 0,
    vz: 0,
    left: false,
    right: false,
    jump: false,
    fwd: false,
    back: false,
    inStore: false,
    storeX: 1050,
  });
  info.room = null;
  info.role = 'wanderer';
  info.state = 'slimeverse';
  send(ws, {
    type: 'slimeverse_joined',
    selfId: info.id,
    world: SLIMEVERSE_WORLD,
    player: getPublicPlayer(info),
  });
  pushLobbyState();
}

function slimeverseSnapshot() {
  const players = [];
  slimeverseClients.forEach((sv, sws) => {
    const info = allClients.get(sws);
    if (!info) return;
    players.push({
      ...getPublicPlayer(info),
      x: Math.round(sv.x),
      y: Math.round(sv.y),
      z: Math.round(sv.z),
      vx: Math.round(sv.vx * 10) / 10,
      vy: Math.round(sv.vy * 10) / 10,
      vz: Math.round(sv.vz * 10) / 10,
      inStore: !!sv.inStore,
      storeX: sv.storeX || 1050,
    });
  });
  return players;
}

function tickSlimeverse() {
  if (slimeverseClients.size === 0) return;
  const maxZ = SLIMEVERSE_WORLD.maxZ;
  slimeverseClients.forEach((sv) => {
    if (sv.inStore) return;
    sv.vx = sv.left && !sv.right ? -7 : sv.right && !sv.left ? 7 : 0;
    sv.vz = sv.fwd  && !sv.back ? -8 : sv.back  && !sv.fwd  ? 8 : 0;
    if (sv.jump && sv.y >= SLIMEVERSE_WORLD.floorY) sv.vy = -22;
    sv.jump = false;
    sv.vy = Math.min(26, sv.vy + 1.35);
    sv.x = Math.max(70, Math.min(SLIMEVERSE_WORLD.width - 70, sv.x + sv.vx));
    sv.y += sv.vy;
    sv.z = Math.max(0, Math.min(maxZ, sv.z + sv.vz));
    if (sv.y > SLIMEVERSE_WORLD.floorY) { sv.y = SLIMEVERSE_WORLD.floorY; sv.vy = 0; }
  });
  broadcastSlimeverse({ type: 'slimeverse_state', players: slimeverseSnapshot() });
}

// Simple per-client chat rate limiter: max 5 messages per 3 s
function chatAllowed(info) {
  const now = Date.now();
  if (now > info.chatReset) { info.chatCount = 0; info.chatReset = now + 3000; }
  if (info.chatCount >= 5) return false;
  info.chatCount++;
  return true;
}

// ── connection ────────────────────────────────────────────
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

// ── room join ─────────────────────────────────────────────
function handleJoinRoom(ws, info, roomId, rejoinToken) {
  const id = parseInt(roomId, 10);
  const room = (id >= 0 && id < rooms.length) ? rooms[id] : null;
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
    room.players.push({ ws, info });
    info.room        = room;
    info.role        = 'player';
    info.state       = 'in_room';
    info.rejoinToken = joinToken;
    room.phase       = room.players.length === 1 ? 'waiting' : 'playing';

    send(ws, { type: 'room_joined', roomId: room.id, role: 'player', side, rejoinToken: joinToken });

    if (room.players.length === 2) startRoomGame(room);
  } else {
    // ── spectator ──
    room.spectators.push({ ws, info });
    info.room  = room;
    info.role  = 'spectator';
    info.state = 'spectating';

    send(ws, { type: 'room_joined', roomId: room.id, role: 'spectator', side: null });

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
  // Find a free room (prefer higher-numbered rooms for ranked)
  const room = [...rooms].reverse().find(r => r.phase === 'empty') || null;
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
    send(p.ws, { type: 'room_joined', roomId: room.id, role: 'player', side, ranked: true, rejoinToken: tok, opponentTier: tier.label });
  });
  room.phase = 'playing';
  startRoomGame(room);
  pushLobbyState();
}

// ── game ──────────────────────────────────────────────────
function startRoomGame(room) {
  room.state = createState();
  room.state.mapId = room.id;
  room.state.phase = 'rps';
  room.phase = 'playing';

  const [left, right] = room.players;
  const names = { nameLeft: left.info.name, nameRight: right.info.name, roomName: room.name };
  send(left.ws,  { type: 'start', side: 'left',  ...names });
  send(right.ws, { type: 'start', side: 'right', ...names });
  room.spectators.forEach(({ ws }) => send(ws, { type: 'game_started', ...names }));
  // Exchange customizations so each player sees the opponent's hat/color/anim
  send(left.ws,  { type: 'customize', side: 'right', hat: right.info.hat, hatAnim: right.info.hatAnim, color: right.info.bodyColor, hatDrawing: right.info.hatDrawing, trail: right.info.trail||'none' });
  send(right.ws, { type: 'customize', side: 'left',  hat: left.info.hat,  hatAnim: left.info.hatAnim,  color: left.info.bodyColor,  hatDrawing: left.info.hatDrawing,  trail: left.info.trail ||'none' });
  room.spectators.forEach(({ ws: sw }) => {
    send(sw, { type: 'customize', side: 'left',  hat: left.info.hat,  hatAnim: left.info.hatAnim,  color: left.info.bodyColor,  hatDrawing: left.info.hatDrawing,  trail: left.info.trail ||'none' });
    send(sw, { type: 'customize', side: 'right', hat: right.info.hat, hatAnim: right.info.hatAnim, color: right.info.bodyColor, hatDrawing: right.info.hatDrawing, trail: right.info.trail||'none' });
  });

  function bcast(msg) { broadcastRoom(room, msg); }
  function broadcastState() { bcast(buildStateMsg(room.state)); }

  function sendRpsPrompt(reason) {
    room.state.phase = 'rps';
    room.state.rps = { choices: {}, reason: reason || 'start' };
    bcast({ type: 'rps_start', reason: room.state.rps.reason });
  }

  function rpsWinner(a, b) {
    if (a === b) return null;
    if ((a === 'rock' && b === 'scissors') ||
        (a === 'paper' && b === 'rock') ||
        (a === 'scissors' && b === 'paper')) return 'left';
    return 'right';
  }

  function maybeResolveRps() {
    if (!room.state || room.state.phase !== 'rps' || !room.state.rps) return;
    const choices = room.state.rps.choices || {};
    if (!choices.left || !choices.right) return;
    const winner = rpsWinner(choices.left, choices.right);
    if (!winner) {
      bcast({ type: 'rps_result', tie: true, choices: { left: choices.left, right: choices.right } });
      setTimeout(() => { if (room.state && room.state.phase === 'rps') sendRpsPrompt('tie'); }, 900);
      return;
    }
    room.state.leftServes = winner === 'left';
    room.state.phase = 'countdown';
    bcast({
      type: 'rps_result',
      tie: false,
      winner,
      serveSide: winner,
      choices: { left: choices.left, right: choices.right },
    });
    [3, 2, 1].forEach((n, i) => {
      setTimeout(() => {
        if (room.state && room.state.phase === 'countdown') bcast({ type: 'pregame_countdown', n });
      }, 650 + i * 1000);
    });
    setTimeout(() => {
      if (!room.state || room.state.phase !== 'countdown') return;
      startNextPoint();
      broadcastState();
    }, 3650);
  }

  function handleRpsChoice(side, choice) {
    if (!room.state || room.state.phase !== 'rps') return;
    choice = String(choice || '').toLowerCase();
    if (!RPS_CHOICES.has(choice)) return;
    if (!room.state.rps) room.state.rps = { choices: {} };
    if (room.state.rps.choices[side]) return;
    room.state.rps.choices[side] = choice;
    bcast({ type: 'rps_locked', side });
    maybeResolveRps();
  }

  function endRoomGame() {
    clearInterval(room.interval);
    room.interval = null;
    room.state    = null;
    room.phase    = 'empty';
    [...room.players, ...room.spectators].forEach(({ info }) => {
      info.room = null; info.role = null; info.state = 'lobby'; info.gameHandler = null;
    });
    room.players    = [];
    room.spectators = [];
    pushLobbyState();
  }

  function startNextPoint() {
    room.state.phase = 'playing';
    initRound(room.state, room.state.leftServes);
    room.state.inputLeft  = { movement: 0, jump: false };
    room.state.inputRight = { movement: 0, jump: false };
  }

  async function gameTick() {
    if (room.state.phase !== 'playing') return;
    const result = tick(room.state);
    if (result !== 0) {
      if (result === 1) { room.state.scoreLeft++;  room.state.leftServes = true;  }
      else              { room.state.scoreRight++; room.state.leftServes = false; }
      broadcastState();
      if (room.state.scoreLeft >= WIN_AMOUNT || room.state.scoreRight >= WIN_AMOUNT) {
        room.state.phase = 'done';
        const winner = room.state.scoreLeft >= WIN_AMOUNT ? 'left' : 'right';
        await accounts.recordMatch(left.info.userId, right.info.userId, winner, room.state.scoreLeft, room.state.scoreRight, !!room.ranked);
        for (const playerInfo of [left.info, right.info]) {
          if (!playerInfo.userId) continue;
          const user = await accounts.findById(playerInfo.userId);
          if (!user) continue;
          playerInfo.wins = user.stats.wins;
          playerInfo.matches = user.stats.matches;
          playerInfo.rank = getRank(user.stats.wins);
          playerInfo.progression = progressionForUser(user);
          if (user.ranked) playerInfo.ranked = user.ranked;
        }
        // Send ranked rating change to each player individually
        if (room.ranked) {
          send(left.ws,  { type: 'ranked_result', ranked: left.info.ranked  || progression.defaultRanked() });
          send(right.ws, { type: 'ranked_result', ranked: right.info.ranked || progression.defaultRanked() });
        }
        bcast({ type: 'game_over', winner });
        endRoomGame();
        return;
      }
      room.state.phase = 'point_pause';
      bcast({ type: 'point', scorer: result === 1 ? 'left' : 'right' });
      setTimeout(() => { if (room.state) { startNextPoint(); broadcastState(); } }, 700);
      return;
    }
    broadcastState();
  }

  function handleInput(side, msg) {
    if (!room.state) return;
    if (msg.type === 'rps_choice') {
      handleRpsChoice(side, msg.choice);
      return;
    }
    const input = side === 'left' ? room.state.inputLeft : room.state.inputRight;
    if (typeof msg.movement === 'number') input.movement = msg.movement;
    if (msg.jump) input.jump = true;
  }

  left.info.state     = 'playing';
  right.info.state    = 'playing';
  left.info.gameSide  = 'left';
  right.info.gameSide = 'right';
  left.info.gameHandler  = (msg) => {
    handleInput('left', msg);
    if (msg.type === 'emote') {
      const e = String(msg.emoji || '').slice(0, 4);
      if (e) bcast({ type: 'emote', side: 'left', emoji: e });
    }
  };
  right.info.gameHandler = (msg) => {
    handleInput('right', msg);
    if (msg.type === 'emote') {
      const e = String(msg.emoji || '').slice(0, 4);
      if (e) bcast({ type: 'emote', side: 'right', emoji: e });
    }
  };

  function handleDisconnect(side) {
    // Both players dropped → immediate full cleanup
    if (room.pendingReconnect) {
      clearTimeout(room.pendingReconnect.timer);
      room.pendingReconnect = null;
      clearInterval(room.interval); room.interval = null;
      room.state = null; room.phase = 'empty';
      bcast({ type: 'opponent_disconnected' });
      [...room.players, ...room.spectators].forEach(({ info: i }) => {
        i.room = null; i.role = null; i.state = 'lobby'; i.gameHandler = null;
      });
      room.players = []; room.spectators = [];
      pushLobbyState();
      return;
    }

    const disconnIdx = room.players.findIndex(p => p.info.gameSide === side);
    if (disconnIdx === -1) return;
    const dp = room.players.splice(disconnIdx, 1)[0];
    dp.info.room = null; dp.info.role = null; dp.info.gameHandler = null; dp.info.state = 'lobby';

    clearInterval(room.interval);
    room.interval = null;
    room.phase    = 'waiting';

    const token = crypto.randomBytes(16).toString('hex');

    function finalCleanup() {
      room.pendingReconnect = null;
      room.state = null; room.phase = 'empty';
      bcast({ type: 'opponent_disconnected' });
      [...room.players, ...room.spectators].forEach(({ info: i }) => {
        i.room = null; i.role = null; i.state = 'lobby'; i.gameHandler = null;
      });
      room.players = []; room.spectators = [];
      pushLobbyState();
    }

    room.pendingReconnect = {
      side,
      userId:      dp.info.userId || null,
      rejoinToken: token,
      timer:       setTimeout(finalCleanup, RECONNECT_TIMEOUT_MS),
      resumeGame:  function(newWs, newInfo) {
        const pr = room.pendingReconnect;
        if (!pr) return;
        clearTimeout(pr.timer);
        room.pendingReconnect = null;

        newInfo.room        = room;
        newInfo.role        = 'player';
        newInfo.state       = 'playing';
        newInfo.gameSide    = side;
        newInfo.gameHandler = (msg) => {
          handleInput(side, msg);
          if (msg.type === 'emote') {
            const e = String(msg.emoji || '').slice(0, 4);
            if (e) bcast({ type: 'emote', side, emoji: e });
          }
        };

        if (side === 'left') room.players.unshift({ ws: newWs, info: newInfo });
        else                 room.players.push(   { ws: newWs, info: newInfo });
        room.phase = 'playing';

        newWs.on('close', () => handleDisconnect(side));

        room.interval = setInterval(() => gameTick().catch(err => {
          console.error('gameTick error after reconnect', err);
          clearInterval(room.interval); room.interval = null;
          room.state = null; room.phase = 'empty'; pushLobbyState();
        }), TICK_MS);

        const other    = room.players.find(p => p.ws !== newWs);
        const nameLeft  = side === 'left'  ? newInfo.name : (other ? other.info.name : 'Player 1');
        const nameRight = side === 'right' ? newInfo.name : (other ? other.info.name : 'Player 2');
        send(newWs, { type: 'reconnected', side, roomId: room.id, nameLeft, nameRight });
        if (room.state) send(newWs, buildStateMsg(room.state));
        if (other) send(newWs, { type: 'customize', side: other.info.gameSide,
          hat: other.info.hat, hatAnim: other.info.hatAnim,
          color: other.info.bodyColor, hatDrawing: other.info.hatDrawing });
        bcast({ type: 'opponent_reconnected', side });
        pushLobbyState();
      },
    };

    bcast({ type: 'opponent_reconnecting', side, timeoutMs: RECONNECT_TIMEOUT_MS, rejoinToken: token, roomId: room.id });
    pushLobbyState();
  }

  left.ws.on('close',  () => handleDisconnect('left'));
  right.ws.on('close', () => handleDisconnect('right'));

  room.interval = setInterval(() => {
    gameTick().catch((err) => {
      console.error('game tick failed', err);
      clearInterval(room.interval);
      room.interval = null;
      room.state = null;
      room.phase = 'empty';
      pushLobbyState();
    });
  }, TICK_MS);
  sendRpsPrompt('start');
  pushLobbyState();
}

function buildStateMsg(state) {
  return {
    type:       'state',
    ball:       { x: state.ball.x, y: state.ball.y, velocityX: state.ball.velocityX },
    slimeLeft:  { x: state.slimeLeft.x,  y: state.slimeLeft.y  },
    slimeRight: { x: state.slimeRight.x, y: state.slimeRight.y },
    scoreLeft:  state.scoreLeft,
    scoreRight: state.scoreRight,
    phase:      state.phase,
  };
}

function createState() {
  const s = {
    ball: newBall(), slimeLeft: newSlime(true), slimeRight: newSlime(false),
    scoreLeft: 0, scoreRight: 0,
    inputLeft: { movement: 0, jump: false }, inputRight: { movement: 0, jump: false },
    phase: 'playing', leftServes: true,
  };
  initRound(s, true);
  return s;
}

// ── online tournament lobbies ─────────────────────────────
const TOURN_BRACKETS = [
  { id: 'rookie',     name: 'Rookie Cup',     minLevel: 1,  maxLevel: 15  },
  { id: 'challenger', name: 'Challenger Cup', minLevel: 16, maxLevel: 35  },
  { id: 'elite',      name: 'Elite Cup',      minLevel: 36, maxLevel: 60  },
  { id: 'master',     name: 'Master Cup',     minLevel: 61, maxLevel: 100 },
];
const TOURN_SIZE = 8;
const TOURN_BOT_ROSTER = [
  { name: 'Rust Belly',   color: '#a95522', xp: 150   },
  { name: 'Static Slime', color: '#55ccff', xp: 800   },
  { name: 'Mire Unit',    color: '#5b7f2a', xp: 1800  },
  { name: 'Tar Pit',      color: '#363036', xp: 3500  },
  { name: 'Ghost Gel',    color: '#eeeeff', xp: 5500  },
  { name: 'Scarlet Vex',  color: '#ff335f', xp: 9000  },
  { name: 'Hazard King',  color: '#ffb000', xp: 15000 },
  { name: 'Iron Maw',     color: '#8899bb', xp: 400   },
];

const tournamentLobbies = new Map();

function xpToBotLevel(xp) {
  if (xp < 1000)  return 1;
  if (xp < 5000)  return 2;
  if (xp < 15000) return 3;
  return 4;
}

function getTournLobby(bracketId) {
  if (!tournamentLobbies.has(bracketId)) {
    const def = TOURN_BRACKETS.find(b => b.id === bracketId);
    if (!def) return null;
    tournamentLobbies.set(bracketId, {
      bracketId, name: def.name,
      minLevel: def.minLevel, maxLevel: def.maxLevel,
      players: [], status: 'waiting',
    });
  }
  return tournamentLobbies.get(bracketId);
}

function broadcastTournLobby(lobby) {
  const msg = JSON.stringify({
    type: 'tournament_lobby',
    bracketId: lobby.bracketId,
    bracketName: lobby.name,
    minLevel: lobby.minLevel,
    maxLevel: lobby.maxLevel,
    players: lobby.players.map(p => ({
      username: p.info.username,
      name: p.info.name,
      level: p.info.progression ? p.info.progression.level : 1,
      xp: p.xp,
      ready: p.ready,
      color: p.info.bodyColor || '#00ff00',
    })),
    totalSlots: TOURN_SIZE,
    readyCount: lobby.players.filter(p => p.ready).length,
    status: lobby.status,
  });
  allClients.forEach((_, ws) => { if (ws.readyState === 1) ws.send(msg); });
}

function buildTournBracket(lobby) {
  const sorted = [...lobby.players].sort((a, b) => b.xp - a.xp);
  sorted.forEach((p, i) => { p.seed = i + 1; });

  const bots = [];
  const needed = TOURN_SIZE - sorted.length;
  for (let i = 0; i < needed; i++) {
    const t = TOURN_BOT_ROSTER[i % TOURN_BOT_ROSTER.length];
    const seed = sorted.length + i + 1;
    bots.push({ id: 'bot_' + seed, name: t.name, color: t.color, xp: t.xp, botLevel: xpToBotLevel(t.xp), seed, bot: true });
  }

  // Standard 8-seed bracket placement: 1v8, 4v5, 2v7, 3v6
  const seedOrder = [1, 8, 4, 5, 2, 7, 3, 6];
  const entrantBySeed = (seed) => {
    if (seed <= sorted.length) {
      const p = sorted[seed - 1];
      const prog = p.info.progression;
      return {
        id: p.info.username, name: p.info.name,
        color: p.info.bodyColor || '#00ff00',
        hat: p.info.hat || 'none', hatAnim: p.info.hatAnim || 'none', hatDrawing: p.info.hatDrawing || [],
        level: prog ? prog.level : 1, xp: p.xp, botLevel: xpToBotLevel(p.xp),
        seed, bot: false, username: p.info.username,
      };
    }
    return bots[seed - sorted.length - 1];
  };

  const ordered = seedOrder.map(entrantBySeed);
  const m = (a, b, round, slot) => ({ round, slot, a, b, winsA: 0, winsB: 0, winner: null, status: 'upcoming' });
  return [
    [m(ordered[0], ordered[1], 0, 0), m(ordered[2], ordered[3], 0, 1), m(ordered[4], ordered[5], 0, 2), m(ordered[6], ordered[7], 0, 3)],
    [{ round:1, slot:0, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }, { round:1, slot:1, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }],
    [{ round:2, slot:0, a:null, b:null, winsA:0, winsB:0, winner:null, status:'waiting' }],
  ];
}

function tryStartTournament(lobby) {
  if (lobby.players.length < 2 || !lobby.players.every(p => p.ready)) return;
  lobby.status = 'starting';
  const rounds = buildTournBracket(lobby);
  const msg = JSON.stringify({
    type: 'tournament_start',
    bracketId: lobby.bracketId,
    bracketName: lobby.name,
    rounds,
    participants: lobby.players.map(p => ({ username: p.info.username, seed: p.seed })),
  });
  lobby.players.forEach(({ ws }) => { if (ws.readyState === 1) ws.send(msg); });
  setTimeout(() => { tournamentLobbies.delete(lobby.bracketId); }, 10000);
}

function handleTournamentJoin(ws, info, msg) {
  if (!info.userId) { send(ws, { type: 'tournament_error', error: 'Sign in to join tournaments.' }); return; }
  const bracketId = String(msg.bracketId || '').slice(0, 20);
  const lobby = getTournLobby(bracketId);
  if (!lobby) { send(ws, { type: 'tournament_error', error: 'Invalid bracket.' }); return; }
  if (lobby.status !== 'waiting') { send(ws, { type: 'tournament_error', error: 'This bracket already started.' }); return; }
  const level = info.progression ? info.progression.level : 1;
  if (level < lobby.minLevel || level > lobby.maxLevel) {
    send(ws, { type: 'tournament_error', error: 'Your level (' + level + ') doesn\'t qualify for this bracket (L' + lobby.minLevel + '-' + lobby.maxLevel + ').' });
    return;
  }
  if (lobby.players.find(p => p.info.userId === info.userId)) { broadcastTournLobby(lobby); return; }
  if (lobby.players.length >= TOURN_SIZE) { send(ws, { type: 'tournament_error', error: 'This bracket is full.' }); return; }
  handleTournamentLeave(ws, info);
  const xp = info.progression ? (info.progression.xp || 0) : 0;
  lobby.players.push({ ws, info, xp, level, ready: false, seed: null });
  info.tournamentBracket = bracketId;
  broadcastTournLobby(lobby);
}

function handleTournamentReady(ws, info) {
  const bracketId = info.tournamentBracket;
  if (!bracketId) return;
  const lobby = tournamentLobbies.get(bracketId);
  if (!lobby || lobby.status !== 'waiting') return;
  const p = lobby.players.find(x => x.ws === ws);
  if (!p) return;
  p.ready = !p.ready;
  broadcastTournLobby(lobby);
  tryStartTournament(lobby);
}

function handleTournamentLeave(ws, info) {
  const bracketId = info.tournamentBracket;
  if (!bracketId) return;
  const lobby = tournamentLobbies.get(bracketId);
  if (lobby) {
    lobby.players = lobby.players.filter(x => x.ws !== ws);
    if (lobby.players.length === 0) tournamentLobbies.delete(bracketId);
    else broadcastTournLobby(lobby);
  }
  info.tournamentBracket = null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Slime server on port ${PORT}`));
setInterval(tickSlimeverse, SLIMEVERSE_TICK_MS);
