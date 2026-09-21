function handleSlimeverseMessage(msg) {
  if (msg.type === 'slimeverse_joined') {
    slimeverseActive = true;
    slimeverseSelfId = msg.selfId;
    slimeverseWorld  = msg.world || slimeverseWorld;
    if (msg.player) {
      slimeversePlayers[msg.player.id] = msg.player;
      mvSyncFromServer(mvLocal, msg.player, slimeverseWorld);
    }
    return true;
  }
  if (msg.type === 'slimeverse_state') {
    (msg.players || []).forEach(function(p) {
      slimeversePlayers[p.id] = Object.assign(slimeversePlayers[p.id] || {}, p);
      if (p.id === slimeverseSelfId) mvReconcile(mvLocal, p, 0.06);
    });
    return true;
  }
  if (msg.type === 'slimeverse_leave') {
    delete slimeversePlayers[msg.id];
    delete slimeverseVisualPlayers[msg.id];
    return true;
  }
  if (msg.type === 'slimeverse_customized' && msg.player) {
    slimeversePlayers[msg.player.id] = Object.assign(slimeversePlayers[msg.player.id] || {}, msg.player);
    return true;
  }
  return false;
}

// ── Input (send to server) ────────────────────────────────────────────────
function startSlimeverseInput() {
  if (slimeverseInputInterval) clearInterval(slimeverseInputInterval);
  slimeverseInputInterval = setInterval(function() {
    if (!slimeverseActive || !lobbySocket || lobbySocket.readyState !== 1) return;
    if (svStoreInside) {
      lobbySocket.send(JSON.stringify({ type: 'slimeverse_store_move', storeX: svStorePlayerX }));
      return;
    }
    var inp = mvGetInput();
    lobbySocket.send(JSON.stringify({
      type: 'slimeverse_input',
      left: inp.left, right: inp.right,
      jump: inp.jump, fwd: inp.fwd, back: inp.back,
      x: mvLocal.x, y: mvLocal.y, z: mvLocal.z,
      vx: mvLocal.vx, vy: mvLocal.vy, vz: mvLocal.vz,
    }));
  }, 16);
}

// ── Main render loop ──────────────────────────────────────────────────────
// RAF passes a DOMHighResTimeStamp as the first argument.
