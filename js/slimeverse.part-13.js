function drawWarehouseShelf(cx, sx, floorY, ceilY, itemIdx, isNear) {
  var shelfH  = (floorY - ceilY) * 0.65;
  var shelfTop = floorY - shelfH;
  var shelfW  = 130;
  var levels  = 3;

  // Back panel
  cx.fillStyle = '#38383f';
  cx.strokeStyle = isNear ? 'rgba(180,100,255,.55)' : '#484850';
  cx.lineWidth = isNear ? 2 : 1;
  cx.fillRect(sx - shelfW / 2, shelfTop, shelfW, shelfH);
  cx.strokeRect(sx - shelfW / 2, shelfTop, shelfW, shelfH);
  cx.lineWidth = 1;

  // Vertical support poles
  [-1, 1].forEach(function(side) {
    var px = sx + side * (shelfW / 2 - 5);
    cx.fillStyle = '#555560';
    cx.fillRect(px - 3, shelfTop, 6, shelfH);
  });

  // Shelf boards
  for (var lvl = 0; lvl < levels; lvl++) {
    var boardY = shelfTop + (shelfH / (levels + 1)) * (lvl + 1);
    cx.fillStyle = '#5a5a64';
    cx.fillRect(sx - shelfW / 2, boardY, shelfW, 7);
    cx.strokeStyle = '#747480';
    cx.strokeRect(sx - shelfW / 2, boardY, shelfW, 7);
  }

  // Items on middle shelf
  var item = SV_STORE_ITEMS[itemIdx];
  if (!item) return;
  var midBoardY = shelfTop + (shelfH / (levels + 1)) * 2;

  [-35, 0, 35].forEach(function(ox) {
    var ix = sx + ox;
    cx.fillStyle = '#2a2a32'; cx.beginPath(); cx.arc(ix, midBoardY - 14, 11, Math.PI, TWO_PI); cx.fill();
    drawHatAt(cx, ix, midBoardY - 14, 11, { hat: item.hat, anim: 'none', drawing: [] });
  });

  // Price tag
  cx.fillStyle = '#ffcc00';
  cx.fillRect(sx - 24, shelfTop + (shelfH / (levels + 1)) - 2, 48, 15);
  cx.fillStyle = '#1a1a00'; cx.font = 'bold 10px Courier New'; cx.textAlign = 'center';
  cx.fillText(item.price + ' SC', sx, shelfTop + (shelfH / (levels + 1)) + 11);

  // Item name label
  cx.fillStyle = isNear ? '#cc88ff' : '#66666e'; cx.font = '9px Courier New';
  cx.fillText(item.name.toUpperCase(), sx, shelfTop + 13);

  // Near highlight glow
  if (isNear) {
    cx.shadowColor = 'rgba(180,100,255,.45)'; cx.shadowBlur = 14;
    cx.strokeStyle = 'rgba(180,100,255,.0)'; cx.strokeRect(sx - shelfW / 2, shelfTop, shelfW, shelfH);
    cx.shadowBlur = 0;
  }
  cx.textAlign = 'left';
}

// ── Interior player ─────────────────────────────────────────────────────────
// opts: { color, hat, hatAnim, hatDrawing, name, alpha } for remote players.
// Omit opts (or pass null) for the local player.
function drawStoreInteriorPlayer(cx, sx, floorY, opts) {
  var r     = 28;
  var color = (opts && opts.color)      || playerBodyColor   || '#00ff00';
  var hat   = (opts && opts.hat)        || playerHat         || 'none';
  var hatAn = (opts && opts.hatAnim)    || playerHatAnim     || 'none';
  var hatDr = (opts && opts.hatDrawing) || playerHatDrawing  || [];
  cx.save();
  if (opts && opts.alpha != null) cx.globalAlpha = opts.alpha;
  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, color);
    var imgSc = (r * 2) / tc.width;
    cx.drawImage(tc, sx - r, floorY - tc.height * imgSc, tc.width * imgSc, tc.height * imgSc);
  } else {
    cx.fillStyle = color;
    cx.beginPath(); cx.arc(sx, floorY, r, Math.PI, TWO_PI); cx.fill();
  }
  cx.fillStyle = '#fff';
  cx.beginPath(); cx.arc(sx + r * 0.25, floorY - r * 0.6, r * 0.18, 0, TWO_PI); cx.fill();
  cx.fillStyle = '#000';
  cx.beginPath(); cx.arc(sx + r * 0.30, floorY - r * 0.6, r * 0.08, 0, TWO_PI); cx.fill();
  drawHatAt(cx, sx, floorY - r + 1, r, { hat: hat, anim: hatAn, drawing: hatDr });
  cx.globalAlpha = 1;
  cx.fillStyle = 'rgba(0,0,0,.28)';
  cx.beginPath(); cx.ellipse(sx, floorY + 5, r * 0.75, 5, 0, 0, TWO_PI); cx.fill();
  if (opts && opts.name) {
    cx.font = 'bold 11px Courier New'; cx.textAlign = 'center';
    var tw = cx.measureText(opts.name).width + 10;
    cx.fillStyle = 'rgba(0,0,14,.52)';
    cx.fillRect(sx - tw / 2, floorY - r * 1.85 - 10, tw, 14);
    cx.fillStyle = '#00ffcc';
    cx.fillText(opts.name, sx, floorY - r * 1.85);
    cx.textAlign = 'left';
  }
  cx.restore();
}

// ── Interior HUD ──────────────────────────────────────────────────────────
function drawStoreInteriorHud(cx, w, h, floorY) {
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  // Info bar
  cx.fillStyle = 'rgba(0,0,16,.72)'; cx.strokeStyle = 'rgba(180,100,255,.28)'; cx.lineWidth = Math.max(1, s);
  cx.fillRect(10 * s, 10 * s, 330 * s, 46 * s); cx.strokeRect(10 * s, 10 * s, 330 * s, 46 * s);
  cx.fillStyle = '#cc88ff'; cx.font = 'bold ' + Math.round(14 * s) + 'px Courier New';
  cx.fillText('// GOY SLOP HAT SHOP //', 20 * s, 30 * s);
  cx.fillStyle = '#555'; cx.font = Math.round(11 * s) + 'px Courier New';
  cx.fillText('A/D move  -  E buy/equip  -  ESC exit', 20 * s, 48 * s);

  // Coins
  var _sc = currentAccount ? (Number(currentAccount.coins) || 0) : (totalWins || 0);
  cx.fillStyle = 'rgba(0,0,16,.72)';
  cx.fillRect(w - 180 * s, 10 * s, 170 * s, 30 * s);
  cx.fillStyle = '#ffcc00'; cx.font = 'bold ' + Math.round(14 * s) + 'px Courier New'; cx.textAlign = 'right';
  cx.fillText('SC: ' + _sc, w - 18 * s, 31 * s); cx.textAlign = 'left';

  // Feedback message
  if (svStoreMsg && (Date.now() - svStoreMsgTimer) < 2500) {
    cx.save();
    var _msgA = Math.min(1, (2500 - (Date.now() - svStoreMsgTimer)) / 400);
    cx.globalAlpha = _msgA;
    cx.font = 'bold ' + Math.round(14 * s) + 'px Courier New'; cx.textAlign = 'center';
    cx.fillStyle = 'rgba(0,0,20,.85)';
    var _mw = cx.measureText(svStoreMsg).width + 32 * s;
    cx.fillRect(w/2 - _mw/2, h/2 - 34 * s, _mw, 32 * s);
    cx.fillStyle = '#ffcc44';
    cx.fillText(svStoreMsg, w/2, h/2 - 12 * s);
    cx.textAlign = 'left'; cx.globalAlpha = 1; cx.restore();
  }

  // Shelf proximity prompt
  var nearIdx = svNearestShelf(svStorePlayerX);
  if (nearIdx !== null) {
    var it = SV_STORE_ITEMS[nearIdx % SV_STORE_ITEMS.length];
    if (it) {
      var _owned = currentAccount && Array.isArray(currentAccount.inventory) && currentAccount.inventory.indexOf(it.hat) !== -1;
      cx.save();
      cx.font = 'bold ' + Math.round(14 * s) + 'px Courier New';
      var line1 = it.name + '  —  ' + it.price + ' SC';
      var line2 = _owned ? '[ E ]  EQUIP (OWNED)' : '[ E ]  BUY';
      var pw = Math.max(cx.measureText(line1).width, cx.measureText(line2).width) + 40 * s;
      var phx = (w - pw) / 2;
      cx.fillStyle = 'rgba(0,0,20,.9)'; cx.strokeStyle = _owned ? 'rgba(0,255,180,.72)' : 'rgba(180,100,255,.72)'; cx.lineWidth = Math.max(1.5, 1.5 * s);
      cx.fillRect(phx, floorY - 72 * s, pw, 62 * s); cx.strokeRect(phx, floorY - 72 * s, pw, 62 * s);
      cx.fillStyle = '#cc88ff'; cx.textAlign = 'center';
      cx.fillText(line1, w / 2, floorY - 46 * s);
      cx.fillStyle = _owned ? '#00ffcc' : '#ffcc44'; cx.fillText(line2, w / 2, floorY - 22 * s);
      cx.textAlign = 'left'; cx.restore();
    }
  }
}

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
