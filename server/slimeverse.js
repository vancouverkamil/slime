module.exports = function install(ctx) {
  const { app, accounts, wss, allClients, slimeverseClients, rooms, progression, crypto, WIN_AMOUNT, TICK_MS, RECONNECT_TIMEOUT_MS, SLIMEVERSE_WORLD, RPS_CHOICES, newBall, newSlime, initRound, tick, send, broadcastAll, broadcastRoom, getLobbySnapshot, getPlayerList, getPublicPlayer, pushLobbyState, randomName, makeClientId, getRank, progressionForUser, canUseHat, parseCookies, getReqToken, handleCustomize, relayChat, handleJoinRoom, leaveRoom, handleRankedQueue, cancelRankedQueue, startRoomGame, handleTournamentJoin, handleTournamentReady, handleTournamentLeave, rankedQueue } = ctx;
function broadcastSlimeverse(msg) {
  const str = JSON.stringify(msg);
  slimeverseClients.forEach((_, sws) => {
    if (sws.readyState === 1) sws.send(str);
  });
}

function leaveSlimeverse(ws, info) {
  if (!slimeverseClients.has(ws)) return;
  slimeverseClients.delete(ws);
  if (info.state === 'slimeverse') info.state = 'lobby';
  broadcastSlimeverse({ type: 'slimeverse_leave', id: info.id });
  pushLobbyState();
}

function enterSlimeverse(ws, info) {
  leaveRoom(ws, info, false);
  const spawnIndex = slimeverseClients.size;
  slimeverseClients.set(ws, {
    x: 500 + (spawnIndex % 8) * 85,
    y: SLIMEVERSE_WORLD.floorY,
    z: 200,
    vx: 0,
    vy: 0,
    vz: 0,
    left: false,
    right: false,
    jump: false,
    fwd: false,
    back: false,
    inStore: false,
    storeX: 1050,
    clientPoseAt: 0,
  });
  info.room = null;
  info.role = 'wanderer';
  info.state = 'slimeverse';
  send(ws, {
    type: 'slimeverse_joined',
    selfId: info.id,
    world: SLIMEVERSE_WORLD,
    player: getPublicPlayer(info),
  });
  pushLobbyState();
}

function slimeverseSnapshot() {
  const players = [];
  slimeverseClients.forEach((sv, sws) => {
    const info = allClients.get(sws);
    if (!info) return;
    players.push({
      ...getPublicPlayer(info),
      x: Math.round(sv.x),
      y: Math.round(sv.y),
      z: Math.round(sv.z),
      vx: Math.round(sv.vx * 10) / 10,
      vy: Math.round(sv.vy * 10) / 10,
      vz: Math.round(sv.vz * 10) / 10,
      inStore: !!sv.inStore,
      storeX: sv.storeX || 1050,
    });
  });
  return players;
}

function tickSlimeverse() {
  if (slimeverseClients.size === 0) return;
  const maxZ = SLIMEVERSE_WORLD.maxZ;
  slimeverseClients.forEach((sv) => {
    if (sv.inStore) return;
    if (sv.clientPoseAt && Date.now() - sv.clientPoseAt < 120) return;
    sv.vx = sv.left && !sv.right ? -7 : sv.right && !sv.left ? 7 : 0;
    sv.vz = sv.fwd  && !sv.back ? -8 : sv.back  && !sv.fwd  ? 8 : 0;
    if (sv.jump && sv.y >= SLIMEVERSE_WORLD.floorY) sv.vy = -22;
    sv.jump = false;
    sv.vy = Math.min(26, sv.vy + 1.35);
    sv.x = Math.max(70, Math.min(SLIMEVERSE_WORLD.width - 70, sv.x + sv.vx));
    sv.y += sv.vy;
    sv.z = Math.max(0, Math.min(maxZ, sv.z + sv.vz));
    if (sv.y > SLIMEVERSE_WORLD.floorY) { sv.y = SLIMEVERSE_WORLD.floorY; sv.vy = 0; }
  });
  broadcastSlimeverse({ type: 'slimeverse_state', players: slimeverseSnapshot() });
}

// Simple per-client chat rate limiter: max 5 messages per 3 s
function chatAllowed(info) {
  const now = Date.now();
  if (now > info.chatReset) { info.chatCount = 0; info.chatReset = now + 3000; }
  if (info.chatCount >= 5) return false;
  info.chatCount++;
  return true;
}

  Object.assign(ctx, { broadcastSlimeverse, leaveSlimeverse, enterSlimeverse, slimeverseSnapshot, chatAllowed });
};
