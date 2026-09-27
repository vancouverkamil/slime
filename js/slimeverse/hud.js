// Slimeverse: the world HUD.
// ── Exterior HUD ──────────────────────────────────────────────────────────
function drawSlimeverseHud() {
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  refreshSlimeverseLeaderboard();
  ctx.save();
  var panelW = Math.min(570 * s, viewWidth - 20 * s);
  var panelH = 78 * s;
  var activePlayers = Object.keys(slimeversePlayers).length;
  ctx.fillStyle = 'rgba(0,10,20,.76)'; ctx.strokeStyle = 'rgba(0,255,200,.28)';
  ctx.lineWidth = Math.max(1, s);
  ctx.fillRect(10 * s, 10 * s, panelW, panelH); ctx.strokeRect(10 * s, 10 * s, panelW, panelH);
  ctx.fillStyle = 'rgba(90,255,190,.08)'; ctx.fillRect(10 * s, 10 * s, 7 * s, panelH);
  ctx.fillStyle = '#00ffcc'; ctx.font = 'bold ' + Math.round(15 * s) + 'px Courier New';
  ctx.fillText('SLIMEVERSE // MOONLIT COMMONS', 26 * s, 33 * s);
  ctx.fillStyle = '#9bea80'; ctx.font = 'bold ' + Math.round(10 * s) + 'px Courier New';
  ctx.fillText('LIVE ' + activePlayers + '  //  COLISEUM BOARD ONLINE  //  FIREFLY HOUR', 26 * s, 51 * s);
  ctx.fillStyle = '#668078'; ctx.font = Math.round(10 * s) + 'px Courier New';
  ctx.fillText('A/D move  -  W/SPC jump  -  UP/DN depth  -  E interact  -  ESC exit', 26 * s, 71 * s);
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────────────
