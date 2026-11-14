// Online: the message router. Every section registers handlers for the server
// messages it owns (core lobby, online match, ranked, tournament) with
// onServerMessage(type, fn); handleServerMessage() dispatches each message to
// exactly one handler. Unknown types are ignored, a failing handler is logged
// without breaking the others, and messages from a finished game are dropped.
var serverMessageHandlers = {};

function onServerMessage(type, fn) {
  if (serverMessageHandlers[type]) console.warn('[net] a second handler was registered for', type);
  serverMessageHandlers[type] = fn;
}

// Messages that belong to one game. A message from any other game (one that has
// already ended, e.g. game 1 of a series while game 2 is starting) is ignored.
var GAME_SCOPED_MESSAGES = { rps_start: 1, rps_locked: 1, rps_result: 1, pregame_countdown: 1, state: 1, point: 1, game_over: 1, emote: 1 };
function isStaleGameMessage(msg) {
  if (!GAME_SCOPED_MESSAGES[msg.type] || msg.gameId == null) return false;
  if (currentGameId == null) { currentGameId = msg.gameId; return false; } // e.g. spectating a game already running
  return msg.gameId !== currentGameId;
}

function handleServerMessage(msg) {
  if (!msg || typeof msg.type !== 'string') return;
  if (isStaleGameMessage(msg)) return;
  var handler = serverMessageHandlers[msg.type];
  if (!handler) return;
  try { handler(msg); }
  catch (err) { console.error('[net] handler failed for', msg.type, err); }
}
