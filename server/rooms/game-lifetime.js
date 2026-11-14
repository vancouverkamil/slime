// One game played in a room. Rooms are reused, so everything a game schedules
// (its tick loop, RPS/countdown/point timers, socket listeners) is owned here,
// and dispose() cancels all of it. After dispose, callbacks from that game are
// no-ops, so nothing from a finished game can fire into the next game played in
// the same room, or touch a player who has moved on (e.g. game 2 of a series).
let lastGameId = 0;

function createGame(room) {
  const game = {
    id: ++lastGameId,
    room,
    disposed: false,
    timers: new Set(),
    listeners: [],
  };

  // A game is current while it is the room's game and has not been disposed.
  game.isCurrent = () => !game.disposed && room.game === game;

  game.later = (ms, fn) => {
    const t = setTimeout(() => { game.timers.delete(t); if (game.isCurrent()) fn(); }, ms);
    game.timers.add(t);
    return t;
  };

  game.every = (ms, fn) => {
    const t = setInterval(() => { if (game.isCurrent()) fn(); }, ms);
    game.timers.add(t);
    return t;
  };

  game.cancel = (t) => { clearTimeout(t); clearInterval(t); game.timers.delete(t); };

  game.listen = (ws, event, fn) => {
    const handler = (...args) => { if (game.isCurrent()) fn(...args); };
    ws.on(event, handler);
    game.listeners.push({ ws, event, handler });
  };

  game.dispose = () => {
    if (game.disposed) return;
    game.disposed = true;
    game.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    game.timers.clear();
    game.listeners.forEach(({ ws, event, handler }) => {
      if (typeof ws.off === 'function') ws.off(event, handler);
      else if (typeof ws.removeListener === 'function') ws.removeListener(event, handler);
    });
    game.listeners = [];
    if (room.game === game) room.game = null;
  };

  room.game = game;
  return game;
}

module.exports = { createGame };
