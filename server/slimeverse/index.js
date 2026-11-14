// Slimeverse server component: the open-world lobby on its own WebSocket endpoint.
// Its sockets and avatars live only here; they never join allClients, rooms,
// ranked queues or tournaments, so the world cannot interfere with a match.
const { WebSocketServer } = require('ws');
const {
  SLIMEVERSE_WORLD,
  createAvatar, publicAvatar, applyInput, applyAppearance, stepAvatar,
} = require('./avatars');

const SLIMEVERSE_PATH = '/slimeverse';
const TICK_MS = 16;

module.exports = function install(ctx) {
  const { accounts, parseCookies, progressionForUser, canUseHat } = ctx;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  const avatars = new Map(); // ws -> avatar

  function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
  function broadcast(msg) {
    const str = JSON.stringify(msg);
    avatars.forEach((_, ws) => { if (ws.readyState === 1) ws.send(str); });
  }

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('session') || parseCookies(req.headers.cookie).slime_session;
    const user = await accounts.getUserBySession(token);
    const progression = progressionForUser(user);
    const guestName = String(url.searchParams.get('name') || '').trim().slice(0, 20) || 'Guest' + (Math.floor(Math.random() * 9000) + 1000);
    const avatar = createAvatar({
      user, profile: accounts.publicProfile(user), level: progression.level, spawnIndex: avatars.size, guestName,
    });
    const hatAllowed = (hat) => canUseHat({ progression }, hat);
    avatars.set(ws, avatar);
    send(ws, { type: 'welcome', selfId: avatar.id, world: SLIMEVERSE_WORLD, player: publicAvatar(avatar) });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch (_) { return; }
      if (!msg || typeof msg !== 'object') return; // e.g. "null" would otherwise throw and crash the process
      if (msg.type === 'input') applyInput(avatar, msg);
      else if (msg.type === 'appearance') {
        if (Date.now() - (avatar.appearanceAt || 0) < 250) return; // at most 4 look changes a second
        avatar.appearanceAt = Date.now();
        applyAppearance(avatar, msg, hatAllowed);
        broadcast({ type: 'appearance', player: publicAvatar(avatar) });
      }
    });

    ws.on('close', () => {
      avatars.delete(ws);
      broadcast({ type: 'leave', id: avatar.id });
    });
  });

  function tick() {
    if (avatars.size === 0) return;
    const now = Date.now();
    const players = [];
    avatars.forEach((av) => { stepAvatar(av, now); players.push(publicAvatar(av)); });
    broadcast({ type: 'state', players });
  }
  setInterval(tick, TICK_MS).unref();

  Object.assign(ctx, { slimeverseWss: wss, slimeverseAvatars: avatars, SLIMEVERSE_PATH });
};
