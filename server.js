const express  = require('express');
const http     = require('http');
const { WebSocketServer } = require('ws');
const path     = require('path');
const { newBall, newSlime, initRound, tick } = require('./physics');

const WIN_AMOUNT = 7;
const TICK_MS    = 20;

const app = express();
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// All connected clients: ws -> { name, state, gameHandler }
const lobby = new Map();
let waitingPlayer = null;

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(msg) {
  const str = JSON.stringify(msg);
  lobby.forEach((_, ws) => { if (ws.readyState === 1) ws.send(str); });
}

function broadcastPlayerCount() {
  broadcast({ type: 'player_count', count: lobby.size });
}

function randomName() {
  return 'Player' + (Math.floor(Math.random() * 9000) + 1000);
}

function escapeText(str) {
  return String(str || '').replace(/[<>&"]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[c])
  );
}

wss.on('connection', (ws) => {
  const info = { name: randomName(), state: 'lobby', gameHandler: null };
  lobby.set(ws, info);

  send(ws, { type: 'connected', name: info.name, playerCount: lobby.size });
  broadcastPlayerCount();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      // In-game messages routed to game handler
      if (info.state === 'playing' && info.gameHandler) {
        info.gameHandler(msg);
        return;
      }
      handleLobbyMsg(ws, info, msg);
    } catch (_) {}
  });

  ws.on('close', () => {
    lobby.delete(ws);
    if (waitingPlayer === ws) waitingPlayer = null;
    broadcastPlayerCount();
  });
});

function handleLobbyMsg(ws, info, msg) {
  if (msg.type === 'chat') {
    const text = String(msg.message || '').slice(0, 200).trim();
    if (text) broadcast({ type: 'chat', name: escapeText(info.name), message: escapeText(text) });
  } else if (msg.type === 'queue') {
    joinQueue(ws, info);
  } else if (msg.type === 'cancel_queue') {
    if (waitingPlayer === ws) waitingPlayer = null;
    info.state = 'lobby';
  }
}

function joinQueue(ws, info) {
  if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === 1) {
    const leftWs   = waitingPlayer;
    const leftInfo = lobby.get(leftWs);
    waitingPlayer  = null;
    startGame(leftWs, leftInfo, ws, info);
  } else {
    info.state    = 'queued';
    waitingPlayer = ws;
    send(ws, { type: 'waiting' });
  }
}

function createState() {
  const state = {
    ball: newBall(), slimeLeft: newSlime(true), slimeRight: newSlime(false),
    scoreLeft: 0, scoreRight: 0,
    inputLeft: { movement: 0, jump: false },
    inputRight: { movement: 0, jump: false },
    phase: 'playing', leftServes: true,
  };
  initRound(state, true);
  return state;
}

function startGame(leftWs, leftInfo, rightWs, rightInfo) {
  leftInfo.state  = 'playing';
  rightInfo.state = 'playing';
  broadcastPlayerCount();

  const state = createState();

  function bcast(msg) { send(leftWs, msg); send(rightWs, msg); }
  function broadcastState() {
    bcast({
      type: 'state',
      ball:       { x: state.ball.x, y: state.ball.y, velocityX: state.ball.velocityX },
      slimeLeft:  { x: state.slimeLeft.x,  y: state.slimeLeft.y  },
      slimeRight: { x: state.slimeRight.x, y: state.slimeRight.y },
      scoreLeft: state.scoreLeft, scoreRight: state.scoreRight,
    });
  }

  send(leftWs,  { type: 'start', side: 'left'  });
  send(rightWs, { type: 'start', side: 'right' });

  let interval = null;

  function endGame() {
    clearInterval(interval);
    leftInfo.state  = 'lobby'; rightInfo.state  = 'lobby';
    leftInfo.gameHandler = null; rightInfo.gameHandler = null;
    broadcastPlayerCount();
  }

  function startNextPoint() {
    state.phase = 'playing';
    initRound(state, state.leftServes);
    state.inputLeft  = { movement: 0, jump: false };
    state.inputRight = { movement: 0, jump: false };
  }

  function gameTick() {
    if (state.phase !== 'playing') return;
    const result = tick(state);
    if (result !== 0) {
      if (result === 1) { state.scoreLeft++;  state.leftServes = true;  }
      else              { state.scoreRight++; state.leftServes = false; }
      broadcastState();
      if (state.scoreLeft >= WIN_AMOUNT || state.scoreRight >= WIN_AMOUNT) {
        state.phase = 'game_over';
        bcast({ type: 'game_over', winner: state.scoreLeft >= WIN_AMOUNT ? 'left' : 'right' });
        endGame();
        return;
      }
      state.phase = 'point_pause';
      bcast({ type: 'point', scorer: result === 1 ? 'left' : 'right' });
      setTimeout(() => { startNextPoint(); broadcastState(); }, 700);
      return;
    }
    broadcastState();
  }

  function handleInput(side, msg) {
    const input = side === 'left' ? state.inputLeft : state.inputRight;
    if (typeof msg.movement === 'number') input.movement = msg.movement;
    if (msg.jump) input.jump = true;
    // Allow chat during a game
    if (msg.type === 'chat') {
      const info = side === 'left' ? leftInfo : rightInfo;
      const text = String(msg.message || '').slice(0, 200).trim();
      if (text) broadcast({ type: 'chat', name: escapeText(info.name), message: escapeText(text) });
    }
  }

  leftInfo.gameHandler  = (msg) => handleInput('left',  msg);
  rightInfo.gameHandler = (msg) => handleInput('right', msg);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    endGame();
    bcast({ type: 'opponent_disconnected' });
  }
  leftWs.on('close',  cleanup);
  rightWs.on('close', cleanup);

  interval = setInterval(gameTick, TICK_MS);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Slime server on port ${PORT}`));
