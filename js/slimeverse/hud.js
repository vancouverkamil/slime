// Slimeverse: the town HUD. A slim bar on top (where you are, who is here)
// and the controls along the bottom, so the building signs stay visible.
function drawSlimeverseHud(myX) {
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  var area = slimeTown ? slimeTown.districtAt(myX).toUpperCase() : 'SUNSET BAY';
  var live = Object.keys(slimeversePlayers).length;
  var title = 'SLIMEVERSE // ' + area;
  var count = '   LIVE ' + live;
  ctx.save();
  ctx.font = 'bold ' + Math.round(12 * s) + 'px Courier New';
  var tw = ctx.measureText(title).width;
  var cw = ctx.measureText(count).width;
  ctx.fillStyle = 'rgba(0,10,20,.66)'; ctx.strokeStyle = 'rgba(0,255,200,.25)'; ctx.lineWidth = Math.max(1, s);
  ctx.fillRect(8 * s, 8 * s, tw + cw + 20 * s, 24 * s); ctx.strokeRect(8 * s, 8 * s, tw + cw + 20 * s, 24 * s);
  ctx.fillStyle = '#00ffcc'; ctx.fillText(title, 18 * s, 25 * s);
  ctx.fillStyle = '#9bea80'; ctx.fillText(count, 18 * s + tw, 25 * s);
  var help = 'ARROWS/WASD move  -  SPACE jump  -  walk into HAT SHOP / FINAL 4  -  ESC exit';
  ctx.font = Math.round(11 * s) + 'px Courier New';
  var hw = ctx.measureText(help).width + 16 * s;
  ctx.fillStyle = 'rgba(0,10,20,.6)';
  ctx.fillRect(viewWidth / 2 - hw / 2, viewHeight - 24 * s, hw, 18 * s);
  ctx.fillStyle = '#9fb8b0'; ctx.textAlign = 'center';
  ctx.fillText(help, viewWidth / 2, viewHeight - 11 * s);
  ctx.restore();
}
