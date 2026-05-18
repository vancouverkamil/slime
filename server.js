const express  = require('express');
const http     = require('http');
const { WebSocketServer } = require('ws');
const path     = require('path');
const { newBall, newSlime, initRound, tick } = require('./physics');

const WIN_AMOUNT = 7;
const TICK_MS    = 20; // 50 fps, matching original game

const app = express();
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

let waitingPlayer = null;

function createState() {
  const state = {
    ball:       newBall(),
    slimeLeft:  newSlime(true),
    slimeRight: newSlime(false),
    scoreLeft:  0,
    scoreRight: 0,
    inputLeft:  { movement: 0, jump: false },
    inputRight: { movement: 0, jump: false },
    phase:      'playing',
    leftServes: true,
  };
  initRound(state, true);
  return state;
}

function startGame(playerLeft, playerRight) {
  const state = createState();

  function send(ws, msg) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }
  function broadcast(msg) {
    send(playerLeft, msg);
    send(playerRight, msg);
  }
  function broadcastState() {
    broadcast({
      type:       'state',
      ball:       { x: state.ball.x, y: state.ball.y, velocityX: state.ball.velocityX },
      slimeLeft:  { x: state.slimeLeft.x,  y: state.slimeLeft.y  },
      slimeRight: { x: state.slimeRight.x, y: state.slimeRight.y },
      scoreLeft:  state.scoreLeft,
      scoreRight: state.scoreRight,
      phase:      state.phase,
    });
  }

  send(playerLeft,  { type: 'start', side: 'left'  });
  send(playerRight, { type: 'start', side: 'right' });

  let interval = null;

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
        broadcast({ type: 'game_over', winner: state.scoreLeft >= WIN_AMOUNT ? 'left' : 'right' });
        clearInterval(interval);
        return;
      }

      state.phase = 'point_pause';
      broadcast({ type: 'point', scorer: result === 1 ? 'left' : 'right' });
      setTimeout(() => { startNextPoint(); broadcastState(); }, 700);
      return;
    }

    broadcastState();
  }

  function handleInput(side, data) {
    const input = side === 'left' ? state.inputLeft : state.inputRight;
    if (typeof data.movement === 'number') input.movement = data.movement;
    if (data.jump) input.jump = true;
  }

  playerLeft.on('message',  raw => { try { handleInput('left',  JSON.parse(raw)); } catch (_) {} });
  playerRight.on('message', raw => { try { handleInput('right', JSON.parse(raw)); } catch (_) {} });

  function cleanup() {
    clearInterval(interval);
    broadcast({ type: 'opponent_disconnected' });
  }
  playerLeft.on('close',  cleanup);
  playerRight.on('close', cleanup);

  interval = setInterval(gameTick, TICK_MS);
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'waiting' }));

  if (waitingPlayer && waitingPlayer.readyState === 1) {
    const left = waitingPlayer;
    waitingPlayer = null;
    startGame(left, ws);
  } else {
    waitingPlayer = ws;
    ws.on('close', () => { if (waitingPlayer === ws) waitingPlayer = null; });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Slime server on port ${PORT}`));
