const express     = require('express');
const http        = require('http');
const { WebSocketServer } = require('ws');
const path        = require('path');
const compression = require('compression');
const { loadLocalEnv } = require('./local-env');
const { newBall, newSlime, initRound, tick } = require('./physics');
const { createAccountStore, normalizeUsername } = require('./account-store');
const progression = require('./progression');
const { createRooms } = require('./server/rooms/room-list');
const { installServer, routeUpgrades } = require('./server/index');

loadLocalEnv();

const crypto = require('crypto');
const WIN_AMOUNT            = 7;
const TICK_MS               = 20;
const RECONNECT_TIMEOUT_MS  = 30_000;
const RPS_CHOICES = new Set(['rock', 'paper', 'scissors']);

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
// Only what the browser needs is public: never server code, tests, scripts or data.
const PUBLIC_ROOT_FILES = [
  'slime_volleyball.html', 'ws-config.js', 'progression.js',
  'vball.png', 'slime175green.png', 'slime175red.png', 'sky2.jpg', 'cave.jpg', 'sunset.jpg',
];
// A page served by this game server (localhost, a Cloudflare tunnel, the Railway URL)
// talks to this same server. The static slime-config.js on Vercel still points at production.
app.get('/slime-config.js', (req, res) => {
  res.type('application/javascript').set('Cache-Control', 'no-store').send('window.SLIME_SAME_ORIGIN_BACKEND = true;\n');
});
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
PUBLIC_ROOT_FILES.forEach((file) => app.get('/' + file, (req, res) => res.sendFile(path.join(__dirname, file))));
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
// 256 KB is far above any real message (a custom hat drawing is a few KB).
const wss    = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });

const allClients = new Map(); // main-socket clients: ws -> info
const rooms = createRooms();

const runtime = installServer({
  app, accounts, wss, allClients, rooms, progression, crypto, normalizeUsername,
  WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, RPS_CHOICES,
  newBall, newSlime, initRound, tick,
});
routeUpgrades(server, runtime);

// Log anything that escapes a handler instead of losing it silently.
process.on('unhandledRejection', (err) => console.error('[process] unhandled rejection', err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Slime server on port ${PORT}`));
