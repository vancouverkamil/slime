const express  = require('express');
const http     = require('http');
const { WebSocketServer } = require('ws');
const path     = require('path');
const { newBall, newSlime, initRound, tick } = require('./physics');

const WIN_AMOUNT = 7;
const TICK_MS    = 20;

const ROOM_NAMES = [
  'Sky Court', 'Cave Court', 'Sunset Court', 'Storm Court',
  'Jungle Court', 'Frozen Court', 'Desert Court', 'Neon Court',
  'Space Court', 'Volcano Court', 'Ocean Court',
  'Overpass Court', 'Bunker Court', 'Reactor Court', 'Void Court',
];

const app = express();
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'slime_volleyball.html')));
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// All connected clients: ws -> info object
const allClients = new Map();

// 8 persistent rooms
const rooms = ROOM_NAMES.map((name, id) => ({
  id, name,
  players:    [], // [{ ws, info }], max 2
  spectators: [], // [{ ws, info }], unlimited
  state:      null,
  interval:   null,
  phase:      'empty', // 'empty' | 'waiting' | 'playing'
}));

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
  allClients.forEach((info) => { list.push({ name: info.name, status: info.state, wins: info.wins || 0, rank: info.rank || 'PRIVATE' }); });
  return list;
}
function pushLobbyState() {
  const msg = JSON.stringify({
    type:         'lobby_list',
    lobbies:      getLobbySnapshot(),
    totalPlayers: allClients.size,
    playerList:   getPlayerList(),
  });
  allClients.forEach((_, ws) => { if (ws.readyState === 1) ws.send(msg); });
}
function randomName() {
  return 'Player' + (Math.floor(Math.random() * 9000) + 1000);
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
wss.on('connection', (ws) => {
  const info = { name: randomName(), room: null, role: null, gameHandler: null, state: 'lobby', chatCount: 0, chatReset: 0, hat: 'none', hatAnim: 'none', bodyColor: '#00ff00', hatDrawing: [] };
  allClients.set(ws, info);

  send(ws, { type: 'connected', name: info.name, totalPlayers: allClients.size, lobbies: getLobbySnapshot(), playerList: getPlayerList() });
  pushLobbyState();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      // In-game inputs route to game handler; chat still handled normally
      if (info.state === 'playing' && info.gameHandler) {
        info.gameHandler(msg);
        if (msg.type === 'chat') relayChat(info, msg);
        if (msg.type === 'set_name') {
          const name = String(msg.name || '').trim().slice(0, 20);
          if (name) info.name = name;
          info.wins = Math.max(0, Math.min(99999, parseInt(msg.wins) || 0));
          info.rank  = String(msg.rank || 'PRIVATE').slice(0, 20);
        }
        if (msg.type === 'customize') handleCustomize(ws, info, msg);
        return;
      }
      handleMsg(ws, info, msg);
    } catch (_) {}
  });

  ws.on('close', () => {
    leaveRoom(ws, info, true);
    allClients.delete(ws);
    pushLobbyState();
  });
});

// ── message routing ───────────────────────────────────────
function handleMsg(ws, info, msg) {
  if (msg.type === 'chat') {
    relayChat(info, msg);
  } else if (msg.type === 'set_name') {
    const name = String(msg.name || '').trim().slice(0, 20);
    if (name) info.name = name;
    info.wins = Math.max(0, Math.min(99999, parseInt(msg.wins) || 0));
    info.rank  = String(msg.rank || 'PRIVATE').slice(0, 20);
  } else if (msg.type === 'join_room') {
    handleJoinRoom(ws, info, msg.roomId);
  } else if (msg.type === 'customize') {
    handleCustomize(ws, info, msg);
  } else if (msg.type === 'leave_room' || msg.type === 'cancel_queue') {
    leaveRoom(ws, info, false);
    info.state = 'lobby';
    pushLobbyState();
  }
}

function handleCustomize(ws, info, msg) {
  if (!info.room) return;
  const room = info.room;
  const hat     = String(msg.hat      || 'none').slice(0, 20);
  const hatAnim = String(msg.hatAnim  || 'none').slice(0, 20);
  const color   = String(msg.color    || '#00ff00').slice(0, 20);
  const drawing = Array.isArray(msg.hatDrawing) ? msg.hatDrawing.slice(0, 300) : [];
  info.hat = hat; info.hatAnim = hatAnim; info.bodyColor = color; info.hatDrawing = drawing;
  const sideIdx = room.players.findIndex(p => p.ws === ws);
  if (sideIdx === -1) return;
  const side = sideIdx === 0 ? 'left' : 'right';
  broadcastRoom(room, { type: 'customize', side, hat, hatAnim, color, hatDrawing: drawing });
}

function relayChat(info, msg) {
  if (!chatAllowed(info)) return;
  const text = String(msg.message || '').slice(0, 200).trim();
  if (text) broadcastAll({ type: 'chat', name: info.name, message: text });
}

// ── room join ─────────────────────────────────────────────
function handleJoinRoom(ws, info, roomId) {
  const id = parseInt(roomId, 10);
  const room = (id >= 0 && id < rooms.length) ? rooms[id] : null;
  if (!room) return;
  leaveRoom(ws, info, false);

  if (room.players.length < 2) {
    // ── join as player ──
    const side = room.players.length === 0 ? 'left' : 'right';
    room.players.push({ ws, info });
    info.room  = room;
    info.role  = 'player';
    info.state = 'in_room';
    room.phase = room.players.length === 1 ? 'waiting' : 'playing';

    send(ws, { type: 'room_joined', roomId: room.id, role: 'player', side });

    if (room.players.length === 2) {
      startRoomGame(room);
    }
  } else {
    // ── join as spectator ──
    room.spectators.push({ ws, info });
    info.room  = room;
    info.role  = 'spectator';
    info.state = 'spectating';

    send(ws, { type: 'room_joined', roomId: room.id, role: 'spectator', side: null });

    // Push current game state immediately so spectator sees live action
    if (room.state) {
      send(ws, buildStateMsg(room.state));
    } else {
      send(ws, { type: 'spectator_waiting' });
    }
    // Send current player customizations to spectator
    if (room.players[0]) send(ws, { type: 'customize', side: 'left',  hat: room.players[0].info.hat, hatAnim: room.players[0].info.hatAnim, color: room.players[0].info.bodyColor, hatDrawing: room.players[0].info.hatDrawing });
    if (room.players[1]) send(ws, { type: 'customize', side: 'right', hat: room.players[1].info.hat, hatAnim: room.players[1].info.hatAnim, color: room.players[1].info.bodyColor, hatDrawing: room.players[1].info.hatDrawing });
  }
  pushLobbyState();
}

// ── leave room ────────────────────────────────────────────
function leaveRoom(ws, info, disconnecting) {
  if (!info.room) return;
  const room = info.room;

  if (info.role === 'player') {
    room.players = room.players.filter(p => p.ws !== ws);
    if (room.interval) {
      clearInterval(room.interval);
      room.interval = null;
      room.state    = null;
      if (!disconnecting) {
        broadcastRoom(room, { type: 'opponent_disconnected' });
      }
      // Reset remaining player back to in_room state
      room.players.forEach(({ info: i }) => {
        i.gameHandler = null;
        i.state = 'in_room';
      });
    }
    room.phase = room.players.length === 0 ? 'empty' : 'waiting';
  } else if (info.role === 'spectator') {
    room.spectators = room.spectators.filter(s => s.ws !== ws);
  }

  info.room  = null;
  info.role  = null;
}

// ── game ──────────────────────────────────────────────────
function startRoomGame(room) {
  room.state = createState();
  room.state.mapId = room.id;
  room.phase = 'playing';

  const [left, right] = room.players;
  const names = { nameLeft: left.info.name, nameRight: right.info.name, roomName: room.name };
  send(left.ws,  { type: 'start', side: 'left',  ...names });
  send(right.ws, { type: 'start', side: 'right', ...names });
  room.spectators.forEach(({ ws }) => send(ws, { type: 'game_started', ...names }));
  // Exchange customizations so each player sees the opponent's hat/color/anim
  send(left.ws,  { type: 'customize', side: 'right', hat: right.info.hat, hatAnim: right.info.hatAnim, color: right.info.bodyColor, hatDrawing: right.info.hatDrawing });
  send(right.ws, { type: 'customize', side: 'left',  hat: left.info.hat,  hatAnim: left.info.hatAnim,  color: left.info.bodyColor,  hatDrawing: left.info.hatDrawing  });
  room.spectators.forEach(({ ws: sw }) => {
    send(sw, { type: 'customize', side: 'left',  hat: left.info.hat,  hatAnim: left.info.hatAnim,  color: left.info.bodyColor,  hatDrawing: left.info.hatDrawing  });
    send(sw, { type: 'customize', side: 'right', hat: right.info.hat, hatAnim: right.info.hatAnim, color: right.info.bodyColor, hatDrawing: right.info.hatDrawing });
  });

  function bcast(msg) { broadcastRoom(room, msg); }
  function broadcastState() { bcast(buildStateMsg(room.state)); }

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

  function gameTick() {
    if (room.state.phase !== 'playing') return;
    const result = tick(room.state);
    if (result !== 0) {
      if (result === 1) { room.state.scoreLeft++;  room.state.leftServes = true;  }
      else              { room.state.scoreRight++; room.state.leftServes = false; }
      broadcastState();
      if (room.state.scoreLeft >= WIN_AMOUNT || room.state.scoreRight >= WIN_AMOUNT) {
        room.state.phase = 'done';
        bcast({ type: 'game_over', winner: room.state.scoreLeft >= WIN_AMOUNT ? 'left' : 'right' });
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
    const input = side === 'left' ? room.state.inputLeft : room.state.inputRight;
    if (typeof msg.movement === 'number') input.movement = msg.movement;
    if (msg.jump) input.jump = true;
  }

  left.info.state        = 'playing';
  right.info.state       = 'playing';
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

  let cleaned = false;
  function cleanup() {
    if (cleaned) return; cleaned = true;
    clearInterval(room.interval); room.interval = null; room.state = null; room.phase = 'empty';
    bcast({ type: 'opponent_disconnected' });
    [...room.players, ...room.spectators].forEach(({ info }) => {
      info.room = null; info.role = null; info.state = 'lobby'; info.gameHandler = null;
    });
    room.players = []; room.spectators = [];
    pushLobbyState();
  }
  left.ws.on('close',  cleanup);
  right.ws.on('close', cleanup);

  room.interval = setInterval(gameTick, TICK_MS);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Slime server on port ${PORT}`));
