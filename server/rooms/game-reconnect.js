module.exports = function createDisconnectHandler(options) {
  const { room, bcast, handleInput, pushLobbyState, TICK_MS, buildStateMsg,
    gameTick, send, crypto, RECONNECT_TIMEOUT_MS } = options;
  const onAbandon = options.onAbandon || function() {};
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
    onAbandon(null);
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
    const stayed = room.players[0];
    onAbandon(stayed ? stayed.info.username : null);
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
      send(newWs, { type: 'reconnected', side, roomId: room.id, mapId: room.mapId, nameLeft, nameRight });
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


  return handleDisconnect;
};
