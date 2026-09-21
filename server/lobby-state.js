module.exports = function install(ctx) {
  const { app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES, newBall, newSlime, initRound, tick, broadcastSlimeverse, leaveSlimeverse, enterSlimeverse, slimeverseSnapshot, chatAllowed, parseCookies, getReqToken, handleCustomize, relayChat, handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, startRoomGame, handleTournamentJoin, handleTournamentReady, handleTournamentLeave, rankedQueue } = ctx;
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
    mapId:          r.mapId,
    lobbyIndex:     r.lobbyIndex,
    name:           r.name,
    playerCount:    r.players.length,
    spectatorCount: r.spectators.length,
    phase:          r.phase,
    restricted:     r.mapId >= 11,
  }));
}
function getPlayerList() {
  const list = [];
  allClients.forEach((info) => {
    list.push({
      name: info.name,
      username: info.username || null,
      status: info.state,
      wins: info.wins || 0,
      rank: info.rank || 'PRIVATE',
      level: info.progression ? info.progression.level : 1,
      rankTitle: info.progression ? info.progression.rankTitle : 'Recruit',
      badge: info.progression ? info.progression.badge : 'REC ^',
      prestige: !!(info.progression && info.progression.prestige),
      matches: info.matches || 0,
      account: !!info.userId,
    });
  });
  return list;
}
function getPublicPlayer(info) {
  return {
    id: info.id,
    name: info.name,
    username: info.username || null,
    level: info.progression ? info.progression.level : 1,
    rankTitle: info.progression ? info.progression.rankTitle : 'Recruit',
    badge: info.progression ? info.progression.badge : 'REC ^',
    hat: info.hat || 'none',
    hatAnim: info.hatAnim || 'none',
    color: info.bodyColor || '#00ff00',
    hatDrawing: info.hatDrawing || [],
  };
}
let _lobbyFlushTimer = null;
function pushLobbyState() {
  if (_lobbyFlushTimer) return;
  _lobbyFlushTimer = setTimeout(() => {
    _lobbyFlushTimer = null;
    if (allClients.size === 0) return;
    const msg = JSON.stringify({
      type:         'lobby_list',
      lobbies:      getLobbySnapshot(),
      totalPlayers: allClients.size,
      playerList:   getPlayerList(),
    });
    allClients.forEach((_, ws) => { if (ws.readyState === 1) ws.send(msg); });
  }, 50);
}
function randomName() {
  return 'Player' + (Math.floor(Math.random() * 9000) + 1000);
}
function makeClientId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function getRank(wins) {
  if (wins >= 10) return 'LIEUTENANT';
  if (wins >= 6) return 'SERGEANT';
  if (wins >= 3) return 'CORPORAL';
  return 'PRIVATE';
}

function progressionForUser(user) {
  return progression.getProgression(user && user.stats ? user.stats.xp : 0);
}

function canUseHat(info, hat) {
  return hat !== 'goldcrown' || !!(info.progression && info.progression.unlocks.goldCrown);
}

  Object.assign(ctx, { send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, getPublicPlayer, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat });
};
