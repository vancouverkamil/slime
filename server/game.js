const createRpsController = require('./game-rps');
const createDisconnectHandler = require('./game-reconnect');

module.exports = function install(ctx) {
  const { accounts, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS,
    RPS_CHOICES, newBall, newSlime, initRound, tick, send, broadcastRoom,
    pushLobbyState, getRank, progressionForUser } = ctx;
function startRoomGame(room) {
  room.state = createState();
  room.state.mapId = room.mapId;
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

  const { sendRpsPrompt, handleRpsChoice } = createRpsController({
    room, bcast, startNextPoint, broadcastState, RPS_CHOICES,
  });

  function endRoomGame() {
    clearInterval(room.interval);
    room.interval = null;
    room.state    = null;
    room.phase    = 'empty';
    room.ranked   = false; // otherwise later Quick Play games in this room count as ranked
    room.tournament = null;
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
        const tourn = room.tournament, winnerName = (winner === 'left' ? left : right).info.username;
        endRoomGame();
        if (tourn && ctx.onTournamentGameOver) ctx.onTournamentGameOver(tourn, winnerName);
        return;
      }
      room.state.phase = 'point_pause';
      bcast({ type: 'point', scorer: result === 1 ? 'left' : 'right' });
      if (room.tournament && ctx.onTournamentPoint) ctx.onTournamentPoint(room.tournament, room.state.scoreLeft, room.state.scoreRight);
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

  const handleDisconnect = createDisconnectHandler({
    room, bcast, handleInput, pushLobbyState, TICK_MS, buildStateMsg,
    gameTick, send, crypto, RECONNECT_TIMEOUT_MS,
    onAbandon(remainingUsername) {
      if (!room.tournament || !ctx.onTournamentRoomAbandoned) return;
      const t = room.tournament; room.tournament = null;
      ctx.onTournamentRoomAbandoned(t, remainingUsername);
    },
  });

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

  Object.assign(ctx, { startRoomGame, buildStateMsg, createState });
};
