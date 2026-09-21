function drawStoreInteriorScene() {
  var cx = ctx, w = viewWidth, h = viewHeight;
  var floorY = h * 0.76;
  var ceilY  = h * 0.07;
  var camX   = svStoreCamera.x;

  // Base fill
  cx.fillStyle = '#1c1c22'; cx.fillRect(0, 0, w, h);

  // ── Back wall ──────────────────────────────────────────────────────
  var wallG = cx.createLinearGradient(0, ceilY, 0, floorY);
  wallG.addColorStop(0, '#28282f'); wallG.addColorStop(1, '#1e1e24');
  cx.fillStyle = wallG; cx.fillRect(0, ceilY, w, floorY - ceilY);

  // Subtle horizontal panel lines on wall
  cx.strokeStyle = 'rgba(255,255,255,.022)'; cx.lineWidth = 1;
  for (var py = ceilY + 44; py < floorY; py += 52) {
    cx.beginPath(); cx.moveTo(0, py); cx.lineTo(w, py); cx.stroke();
  }

  // ── Ceiling ────────────────────────────────────────────────────────
  cx.fillStyle = '#111116'; cx.fillRect(0, 0, w, ceilY + 12);
  cx.fillStyle = '#191920';
  for (var beam = 0; beam < 4; beam++) cx.fillRect(0, ceilY - 2 + beam * 7, w, 4);
  cx.strokeStyle = 'rgba(255,255,255,.07)'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(0, ceilY); cx.lineTo(w, ceilY); cx.stroke(); cx.lineWidth = 1;

  // ── Industrial pendant lights ──────────────────────────────────────
  var lightStep = 280;
  var firstLight = Math.floor(camX / lightStep) * lightStep - lightStep;
  for (var lx = firstLight; lx < camX + w + lightStep; lx += lightStep) {
    var lsx = lx - camX;
    if (lsx < -120 || lsx > w + 120) continue;

    // Cord
    cx.strokeStyle = 'rgba(90,90,100,.55)'; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(lsx, ceilY); cx.lineTo(lsx, ceilY + 36); cx.stroke();

    // Fixture
    cx.fillStyle = '#666672';
    cx.fillRect(lsx - 30, ceilY + 34, 60, 10);
    cx.strokeStyle = '#888890'; cx.lineWidth = 1;
    cx.strokeRect(lsx - 30, ceilY + 34, 60, 10);

    // Ceiling bounce
    var cgrd = cx.createRadialGradient(lsx, ceilY + 39, 0, lsx, ceilY + 39, 52);
    cgrd.addColorStop(0, 'rgba(255,245,200,.16)'); cgrd.addColorStop(1, 'rgba(255,245,200,0)');
    cx.fillStyle = cgrd; cx.fillRect(lsx - 52, ceilY, 104, 44);

    // Light cone to floor
    cx.beginPath();
    cx.moveTo(lsx - 30, ceilY + 44);
    cx.lineTo(lsx - 150, floorY);
    cx.lineTo(lsx + 150, floorY);
    cx.lineTo(lsx + 30, ceilY + 44);
    cx.closePath();
    var lcone = cx.createLinearGradient(lsx, ceilY + 44, lsx, floorY);
    lcone.addColorStop(0, 'rgba(255,245,200,.09)'); lcone.addColorStop(1, 'rgba(255,245,200,.03)');
    cx.fillStyle = lcone; cx.fill();
  }

  // ── Shelving units ─────────────────────────────────────────────────
  SV_SHELF_X.forEach(function(worldX, idx) {
    var screenX = worldX - camX;
    if (screenX < -200 || screenX > w + 200) return;
    var isNear = Math.abs(svStorePlayerX - worldX) < 110;
    drawWarehouseShelf(cx, screenX, floorY, ceilY, idx % SV_STORE_ITEMS.length, isNear);
  });

  // ── Floor ──────────────────────────────────────────────────────────
  var floorG = cx.createLinearGradient(0, floorY, 0, h);
  floorG.addColorStop(0, '#3c3c44'); floorG.addColorStop(0.35, '#2e2e36'); floorG.addColorStop(1, '#252530');
  cx.fillStyle = floorG; cx.fillRect(0, floorY, w, h - floorY);

  // Tile grid
  cx.strokeStyle = 'rgba(255,255,255,.038)'; cx.lineWidth = 1;
  var tileSize = 80, tileOff = camX % tileSize;
  for (var tx = -tileOff; tx < w + tileSize; tx += tileSize) {
    cx.beginPath(); cx.moveTo(tx, floorY); cx.lineTo(tx, h); cx.stroke();
  }
  for (var ty = floorY + 32; ty < h; ty += 64) {
    cx.beginPath(); cx.moveTo(0, ty); cx.lineTo(w, ty); cx.stroke();
  }

  // Safety stripe
  cx.strokeStyle = 'rgba(255,200,0,.48)'; cx.lineWidth = 10;
  cx.setLineDash([30, 20]);
  cx.beginPath(); cx.moveTo(0, floorY + 5); cx.lineTo(w, floorY + 5); cx.stroke();
  cx.setLineDash([]); cx.lineWidth = 1;

  // ── Aisle sign ──────────────────────────────────────────────────────
  cx.fillStyle = 'rgba(0,20,40,.88)'; cx.strokeStyle = 'rgba(0,255,200,.32)'; cx.lineWidth = 1;
  cx.fillRect(w * 0.22, ceilY + 13, w * 0.56, 24);
  cx.strokeRect(w * 0.22, ceilY + 13, w * 0.56, 24);
  cx.fillStyle = '#00ffcc'; cx.font = 'bold 13px Courier New'; cx.textAlign = 'center';
  cx.fillText('// GOY SLOP HAT SHOP //', w / 2, ceilY + 32); cx.textAlign = 'left';

  // ── Players ──────────────────────────────────────────────────────────
  // Sort: draw players farther from local player first (crude depth)
  var storePlayers = [];
  Object.keys(slimeversePlayers).forEach(function(id) {
    if (id === slimeverseSelfId) return;
    var p = slimeversePlayers[id];
    if (p && p.inStore) storePlayers.push(p);
  });
  storePlayers.sort(function(a, b) {
    return Math.abs((b.storeX || 1050) - svStorePlayerX) - Math.abs((a.storeX || 1050) - svStorePlayerX);
  });
  storePlayers.forEach(function(p) {
    var psx = (p.storeX || 1050) - camX;
    if (psx < -120 || psx > w + 120) return;
    drawStoreInteriorPlayer(cx, psx, floorY, {
      color: p.color, hat: p.hat, hatAnim: p.hatAnim, hatDrawing: p.hatDrawing,
      name: p.name || 'Player', alpha: 0.88,
    });
  });
  // Local player drawn last (always on top)
  drawStoreInteriorPlayer(cx, svStorePlayerX - camX, floorY);

  // ── HUD ─────────────────────────────────────────────────────────────
  drawStoreInteriorHud(cx, w, h, floorY);
}

// ── Warehouse shelf ────────────────────────────────────────────────────────
