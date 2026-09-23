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
  'Championship Court',
];
const QUICKPLAY_MAP_IDS = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 15];
const LOBBIES_PER_MAP = 10;

const app = express();
function isBaseAllowedOrigin(origin) {
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

const accounts = createAccountStore();
app.use(compression());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isBaseAllowedOrigin(origin)) {
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

// Ten persistent Quick Play rooms per visible map.
const rooms = QUICKPLAY_MAP_IDS.flatMap((mapId) =>
  Array.from({ length: LOBBIES_PER_MAP }, (_, lobbyIndex) => ({
  id: mapId * LOBBIES_PER_MAP + lobbyIndex,
  mapId,
  lobbyIndex,
  name: ROOM_NAMES[mapId],
  players:          [], // [{ ws, info }], max 2
  spectators:       [], // [{ ws, info }], unlimited
  state:            null,
  interval:         null,
  phase:            'empty', // 'empty' | 'waiting' | 'playing'
  pendingReconnect: null,    // { side, userId, rejoinToken, timer, resumeGame }
})));


const runtime = {
  app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto,
  normalizeUsername,
  WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES,
  newBall, newSlime, initRound, tick,
};

require('./server/api')(runtime);
require('./server/lobby-state')(runtime);
require('./server/slimeverse')(runtime);
require('./server/game')(runtime);
require('./server/rooms')(runtime);
require('./server/tournaments')(runtime);
require('./server/tournament-spectate')(runtime);
require('./server/connection')(runtime);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Slime server on port ${PORT}`));
