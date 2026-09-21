function drawFinal4GatePrompt() {
  var cx = ctx, px = viewWidth / 2, py = viewHeight * SV_FLOOR_FRAC - 54;
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  var ready = true;
  var msg = 'PRESS  E  TO  ENTER  THE  FINAL 4';
  cx.save();
  cx.font = 'bold ' + Math.round(13 * s) + 'px Courier New';
  var tw = cx.measureText(msg).width + 30 * s;
  cx.fillStyle = 'rgba(0,0,20,.82)';
  cx.strokeStyle = ready ? 'rgba(255,210,90,.84)' : 'rgba(210,120,255,.70)';
  cx.lineWidth = Math.max(1, s);
  cx.fillRect(px - tw / 2, py - 20 * s, tw, 28 * s);
  cx.strokeRect(px - tw / 2, py - 20 * s, tw, 28 * s);
  cx.fillStyle = ready ? '#ffd966' : '#cc88ff';
  cx.textAlign = 'center';
  cx.fillText(msg, px, py);

  if (svFinal4Msg && Date.now() - svFinal4MsgTimer < 2200) {
    var msg2 = svFinal4Msg;
    var tw2 = cx.measureText(msg2).width + 26 * s;
    cx.fillStyle = 'rgba(0,0,20,.86)';
    cx.strokeStyle = 'rgba(255,80,80,.55)';
    cx.fillRect(px - tw2 / 2, py + 14 * s, tw2, 26 * s);
    cx.strokeRect(px - tw2 / 2, py + 14 * s, tw2, 26 * s);
    cx.fillStyle = '#ff7777';
    cx.fillText(msg2, px, py + 33 * s);
  }
  cx.textAlign = 'left';
  cx.restore();
}

function tryEnterFinal4Tower() {
  slimeverseActive = false;
  svStoreInside = false;
  if (slimeverseInputInterval) { clearInterval(slimeverseInputInterval); slimeverseInputInterval = null; }
  slimeversePlayers = {};
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'leave_slimeverse' }));
  showLeaveBtn(false);
  startFinal4();
}

// ── Store enter / exit ────────────────────────────────────────────────────
function enterStoreInterior() {
  svStoreInside     = true;
  svStorePlayerX    = 1050;
  svStorePlayerVx   = 0;
  svStoreCamera.x   = Math.max(0, Math.min(SV_STORE_WORLD_W - viewWidth, svStorePlayerX - viewWidth / 2));
  svStoreTransition = 1.0;
  mvLastTime = 0; mvAccum = 0; // reset so exterior timing is clean when we return
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'slimeverse_enter_store' }));
}

function exitStoreInterior() {
  svStoreInside = false;
  mvLastTime = 0; mvAccum = 0; // reset — store branch kept mvLastTime current so this is safe
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'slimeverse_exit_store' }));
  var me = slimeversePlayers[slimeverseSelfId];
  if (me) { mvLocal.x = me.x || SV_STORE_X; mvLocal.z = me.z || SV_STORE_Z; }
}

// ── Store interior scene ──────────────────────────────────────────────────
