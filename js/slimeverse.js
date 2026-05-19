// ── State ─────────────────────────────────────────────────────────────────
var slimeverseActive    = false;
var slimeversePlayers   = {};
var slimeverseSelfId    = null;
var slimeverseWorld     = { width: 4500, height: 2250, floorY: 1980, maxZ: 600 };
var slimeverseInputInterval = null;
var slimeverseFrame     = 0;
var slimeverseCamera    = { x: 0 };

// Store exterior
var SV_STORE_X          = 1800;
var SV_STORE_Z          = 60;
var svStoreKeyDebounce  = 0;

// Store interior
var svStoreInside       = false;
var svStorePlayerX      = 1050;
var svStorePlayerVx     = 0;
var svStoreCamera       = { x: 0 };
var svStoreTransition   = 0;   // 1→0 fade-in on enter
var SV_STORE_WORLD_W    = 2700;

// Perspective display
var SV_FLOOR_FRAC  = 0.82;
var SV_HORIZ_FRAC  = 0.37;
var SV_FAR_SCALE   = 0.28;

var SV_STORE_ITEMS = [
  { hat: 'party',  name: 'Party Hat',   price: 5  },
  { hat: 'tophat', name: 'Top Hat',     price: 10 },
  { hat: 'halo',   name: 'Halo',        price: 15 },
  { hat: 'cowboy', name: 'Cowboy Hat',  price: 25 },
  { hat: 'crown',  name: 'Royal Crown', price: 50 },
];

// Shelf world-X positions (one per item type)
var SV_SHELF_X = [250, 650, 1050, 1450, 1850, 2250];

// ── Perspective helpers ───────────────────────────────────────────────────
function svDepthT(z) { return Math.max(0, Math.min(1, (z || 0) / (slimeverseWorld.maxZ || 600))); }
function svGroundY(z) { return viewHeight * (SV_FLOOR_FRAC + (SV_HORIZ_FRAC - SV_FLOOR_FRAC) * svDepthT(z)); }
function svScaleAt(z) { return 1.0 - (1.0 - SV_FAR_SCALE) * svDepthT(z); }
function svSX(worldX, z) {
  var t = svDepthT(z), vp = viewWidth / 2;
  return vp + (worldX - slimeverseCamera.x - vp) * (1 - t * 0.55);
}
function svSY(worldY, z) {
  var jumpH = Math.max(0, (slimeverseWorld.floorY || 1980) - (worldY || slimeverseWorld.floorY));
  return svGroundY(z) - jumpH * svScaleAt(z) * 0.45;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
function startSlimeverse() {
  if (!lobbySocket || lobbySocket.readyState !== 1) {
    addChatMessage(null, 'Still connecting to server...');
    return;
  }
  showingLobbySelect = false;
  leaveLobby();
  slimeverseActive  = true;
  svStoreInside     = false;
  svStoreTransition = 0;
  onlineMode = false; isSpectator = false; currentRoomId = null;
  hideSpecBadge(); showLeaveBtn(true); hideBottomBar();
  canvas.style.display = 'block';
  menuDiv.style.display = 'none';
  lobbySocket.send(JSON.stringify({ type: 'enter_slimeverse' }));
  sendCustomization();
  startSlimeverseInput();
  requestAnimationFrame(renderSlimeverse);
}

function leaveSlimeverse() {
  if (!slimeverseActive) return;
  slimeverseActive  = false;
  svStoreInside     = false;
  svStoreTransition = 0;
  if (slimeverseInputInterval) { clearInterval(slimeverseInputInterval); slimeverseInputInterval = null; }
  slimeversePlayers = {};
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'leave_slimeverse' }));
  showLeaveBtn(false);
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  toInitialMenu();
}

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
  if (msg.type === 'slimeverse_leave') { delete slimeversePlayers[msg.id]; return true; }
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
    if (svStoreInside) return;
    var inp = mvGetInput();
    lobbySocket.send(JSON.stringify({
      type: 'slimeverse_input',
      left: inp.left, right: inp.right,
      jump: inp.jump, fwd: inp.fwd, back: inp.back,
    }));
  }, 16);
}

// ── Main render loop ──────────────────────────────────────────────────────
function renderSlimeverse() {
  if (!slimeverseActive) return;

  // ── Store interior branch ─────────────────────────────────────────────
  if (svStoreInside) {
    var sl = !!(keysDown[KEY_A] || keysDown[KEY_LEFT]);
    var sr = !!(keysDown[KEY_D] || keysDown[KEY_RIGHT]);
    svStorePlayerVx = (sl && !sr) ? -5 : (sr && !sl) ? 5 : 0;
    svStorePlayerX = Math.max(80, Math.min(SV_STORE_WORLD_W - 80, svStorePlayerX + svStorePlayerVx));
    svStoreCamera.x += (svStorePlayerX - viewWidth / 2 - svStoreCamera.x) * 0.15;
    svStoreCamera.x = Math.max(0, Math.min(SV_STORE_WORLD_W - viewWidth, svStoreCamera.x));

    // E key — equip item from nearest shelf
    var now0 = Date.now();
    if (keysDown[KEY_E] && now0 - svStoreKeyDebounce > 200) {
      var nearIdx = svNearestShelf(svStorePlayerX);
      if (nearIdx !== null) {
        keysDown[KEY_E] = false;
        svStoreKeyDebounce = now0;
        var it = SV_STORE_ITEMS[nearIdx % SV_STORE_ITEMS.length];
        if (it) {
          playerHat = it.hat;
          try { localStorage.setItem('slimeHat', it.hat); } catch(e2) {}
          sendCustomization();
          if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
        }
      }
    }

    drawStoreInteriorScene();
    if (svStoreTransition > 0) {
      svStoreTransition = Math.max(0, svStoreTransition - 0.055);
      ctx.fillStyle = 'rgba(0,0,0,' + svStoreTransition + ')';
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    requestAnimationFrame(renderSlimeverse);
    return;
  }

  // ── Slimeverse exterior ───────────────────────────────────────────────
  slimeverseFrame++;

  // Client-side prediction tick (runs every RAF frame ~16ms — silky smooth)
  var inp = mvGetInput();
  mvApplyInput(mvLocal, inp);
  mvStep(mvLocal, slimeverseWorld);

  // Camera tracks local predicted position (instant, no wait for server round-trip)
  slimeverseCamera.x += (mvLocal.x - viewWidth / 2 - slimeverseCamera.x) * 0.15;
  slimeverseCamera.x = Math.max(0, Math.min(slimeverseWorld.width - viewWidth, slimeverseCamera.x));

  drawSlimeverseWorld();

  // Draw all players — use predicted local state for self
  var selfP = slimeversePlayers[slimeverseSelfId];
  Object.keys(slimeversePlayers)
    .map(function(id) { return slimeversePlayers[id]; })
    .sort(function(a, b) { return (b.z || 0) - (a.z || 0); })
    .forEach(function(p) {
      if (p.id === slimeverseSelfId) {
        drawSlimeversePlayer(Object.assign({}, p, { x: mvLocal.x, y: mvLocal.y, z: mvLocal.z }));
      } else {
        drawSlimeversePlayer(p);
      }
    });

  // Store proximity prompt
  var dx = Math.abs(mvLocal.x - SV_STORE_X);
  var dz = Math.abs(mvLocal.z - SV_STORE_Z);
  if (dz < 90 && dx < 240) {
    drawStoreEnterPrompt();
    var now = Date.now();
    if (keysDown[KEY_E] && now - svStoreKeyDebounce > 200) {
      keysDown[KEY_E] = false;
      svStoreKeyDebounce = now;
      enterStoreInterior();
    }
  }

  drawSlimeverseHud();
  requestAnimationFrame(renderSlimeverse);
}

// ── World drawing ─────────────────────────────────────────────────────────
function drawSlimeverseWorld() {
  var cx = ctx, w = viewWidth, h = viewHeight;
  var hY = viewHeight * SV_HORIZ_FRAC;
  var floorFY = viewHeight * SV_FLOOR_FRAC;
  var vp = w / 2, camX = slimeverseCamera.x;

  // Sky
  var skyG = cx.createLinearGradient(0, 0, 0, hY + 30);
  skyG.addColorStop(0, '#00162b'); skyG.addColorStop(0.65, '#01284a'); skyG.addColorStop(1, '#042038');
  cx.fillStyle = skyG; cx.fillRect(0, 0, w, hY + 30);

  // Stars
  for (var s = 0; s < 55; s++) {
    var sx = (((s * 313 - camX * 0.04) % (w * 1.8)) + w * 1.8) % (w * 1.8) - w * 0.4;
    var sy2 = (s * 197) % (hY * 0.92);
    cx.strokeStyle = 'rgba(190,245,255,' + (0.07 + (s % 4) * 0.025) + ')';
    cx.beginPath(); cx.arc(sx, sy2, 0.8 + (s % 3) * 0.45, 0, TWO_PI); cx.stroke();
  }

  // Horizon glow
  var hgG = cx.createLinearGradient(0, hY - 18, 0, hY + 28);
  hgG.addColorStop(0, 'rgba(0,200,160,0)');
  hgG.addColorStop(0.5, 'rgba(0,255,200,.07)');
  hgG.addColorStop(1, 'rgba(0,255,200,0)');
  cx.fillStyle = hgG; cx.fillRect(0, hY - 18, w, 46);

  // Below-floor fill
  cx.fillStyle = '#0a1a14'; cx.fillRect(0, floorFY, w, h - floorFY);

  // Perspective floor trapezoid
  var floorG = cx.createLinearGradient(0, floorFY, 0, hY);
  floorG.addColorStop(0, '#18402e'); floorG.addColorStop(1, '#0a1a14');
  cx.fillStyle = floorG;
  cx.beginPath();
  cx.moveTo(0, floorFY); cx.lineTo(w, floorFY);
  cx.lineTo(vp + w * 0.65, hY); cx.lineTo(vp - w * 0.65, hY);
  cx.closePath(); cx.fill();

  // Depth grid — horizontal lines
  cx.lineWidth = 1;
  for (var d = 0; d <= 14; d++) {
    var frac = d / 14;
    var ly = floorFY + (hY - floorFY) * frac;
    cx.strokeStyle = 'rgba(0,255,200,' + (0.04 + (1 - frac) * 0.04) + ')';
    cx.beginPath();
    cx.moveTo(vp + (0 - vp) * frac, ly);
    cx.lineTo(vp + (w - vp) * frac, ly);
    cx.stroke();
  }
  // Convergence lines
  cx.strokeStyle = 'rgba(0,255,200,.04)';
  for (var vl = 0; vl <= 16; vl++) {
    cx.beginPath(); cx.moveTo((vl / 16) * w, floorFY); cx.lineTo(vp, hY); cx.stroke();
  }
  // Front edge
  cx.strokeStyle = 'rgba(0,255,200,.28)'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(0, floorFY); cx.lineTo(w, floorFY); cx.stroke();
  cx.lineWidth = 1;

  // Store building
  drawSlimeverseStoreBuilding(svSX(SV_STORE_X, SV_STORE_Z), svGroundY(SV_STORE_Z), svScaleAt(SV_STORE_Z));
}

// ── Store building (exterior) ─────────────────────────────────────────────
function drawSlimeverseStoreBuilding(bx, by, sc) {
  var cx = ctx;
  var bw = 145 * sc, bh = 115 * sc, roofH = 38 * sc;

  // Shadow
  cx.fillStyle = 'rgba(0,0,0,.22)';
  cx.beginPath();
  cx.ellipse(bx, by + 3 * sc, bw * 0.52, 7 * sc, 0, 0, TWO_PI);
  cx.fill();

  // Body
  cx.fillStyle = '#1a0a35';
  cx.strokeStyle = 'rgba(180,100,255,.5)';
  cx.lineWidth = 1.5 * sc;
  cx.fillRect(bx - bw / 2, by - bh, bw, bh);
  cx.strokeRect(bx - bw / 2, by - bh, bw, bh);

  // Roof
  cx.fillStyle = '#280a50'; cx.strokeStyle = 'rgba(200,120,255,.6)';
  cx.beginPath();
  cx.moveTo(bx - bw / 2 - 10 * sc, by - bh);
  cx.lineTo(bx, by - bh - roofH);
  cx.lineTo(bx + bw / 2 + 10 * sc, by - bh);
  cx.closePath(); cx.fill(); cx.stroke();

  // Sign
  var sgW = bw * 0.86, sgH = 18 * sc;
  cx.fillStyle = '#0d0022'; cx.strokeStyle = 'rgba(255,180,0,.55)';
  cx.fillRect(bx - sgW / 2, by - bh + 8 * sc, sgW, sgH);
  cx.strokeRect(bx - sgW / 2, by - bh + 8 * sc, sgW, sgH);
  cx.fillStyle = '#ffcc00'; cx.textAlign = 'center';
  cx.font = 'bold ' + Math.max(6, Math.round(9 * sc)) + 'px Courier New';
  cx.fillText('GENERAL STORE', bx, by - bh + 8 * sc + sgH * 0.7);

  // Door
  var dw = 30 * sc, dh = 46 * sc;
  cx.fillStyle = '#080015'; cx.strokeStyle = 'rgba(140,80,255,.45)';
  cx.fillRect(bx - dw / 2, by - dh, dw, dh);
  cx.strokeRect(bx - dw / 2, by - dh, dw, dh);
  cx.fillStyle = 'rgba(255,180,0,.7)';
  cx.beginPath(); cx.arc(bx + dw * 0.28, by - dh * 0.42, 2 * sc, 0, TWO_PI); cx.fill();

  // Windows
  [-0.31, 0.31].forEach(function(side) {
    var wx = bx + side * bw, wy = by - bh + 40 * sc, ww = 24 * sc, wh = 22 * sc;
    cx.fillStyle = 'rgba(180,100,255,.1)'; cx.strokeStyle = 'rgba(180,100,255,.4)';
    cx.fillRect(wx - ww / 2, wy, ww, wh); cx.strokeRect(wx - ww / 2, wy, ww, wh);
    cx.strokeStyle = 'rgba(180,100,255,.18)';
    cx.beginPath();
    cx.moveTo(wx, wy); cx.lineTo(wx, wy + wh);
    cx.moveTo(wx - ww / 2, wy + wh / 2); cx.lineTo(wx + ww / 2, wy + wh / 2);
    cx.stroke();
  });

  // Glow
  cx.shadowColor = 'rgba(160,80,255,.3)'; cx.shadowBlur = 16 * sc;
  cx.strokeStyle = 'rgba(180,100,255,.0)'; cx.strokeRect(bx - bw / 2, by - bh, bw, bh);
  cx.shadowBlur = 0; cx.textAlign = 'left'; cx.lineWidth = 1;
}

// ── Player (exterior) ─────────────────────────────────────────────────────
function drawSlimeversePlayer(p) {
  var z = p.z || 0, sc = svScaleAt(z);
  var sx = svSX(p.x || 0, z), sy = svSY(p.y || slimeverseWorld.floorY, z);
  if (sx < -100 || sx > viewWidth + 100 || sy < -150 || sy > viewHeight + 100) return;

  var r = 24 * sc, color = p.color || '#00ff00';
  ctx.save();
  ctx.globalAlpha = p.id === slimeverseSelfId ? 1 : 0.88;

  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, color);
    var imgSc = (r * 2) / tc.width;
    ctx.drawImage(tc, sx - r, sy - tc.height * imgSc * 0.72, tc.width * imgSc, tc.height * imgSc);
  } else {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx, sy, r, Math.PI, TWO_PI); ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx + r * 0.25, sy - r * 0.42, r * 0.18, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(sx + r * 0.30, sy - r * 0.42, r * 0.08, 0, TWO_PI); ctx.fill();
  drawHatAt(ctx, sx, sy - r + 1, r, { hat: p.hat || 'none', anim: p.hatAnim || 'none', drawing: p.hatDrawing || [] });

  var label = (p.name || 'Player') + '  L' + (p.level || 1);
  var fSz = Math.max(6, Math.round(9 * sc));
  ctx.font = 'bold ' + fSz + 'px Courier New';
  var tw = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(0,0,14,.52)';
  ctx.fillRect(sx - tw / 2, sy - r * 1.8 - fSz, tw, fSz + 4);
  ctx.fillStyle = p.id === slimeverseSelfId ? '#ffd966' : '#00ffcc';
  ctx.textAlign = 'center'; ctx.fillText(label, sx, sy - r * 1.8); ctx.textAlign = 'left';
  ctx.restore();
}

// ── Store enter prompt ────────────────────────────────────────────────────
function drawStoreEnterPrompt() {
  var cx = ctx, px = viewWidth / 2, py = viewHeight * SV_FLOOR_FRAC - 24;
  var msg = 'PRESS  E  TO ENTER STORE';
  cx.save(); cx.font = 'bold 9px Courier New';
  var tw = cx.measureText(msg).width + 22;
  cx.fillStyle = 'rgba(0,0,20,.72)'; cx.strokeStyle = 'rgba(180,100,255,.65)'; cx.lineWidth = 1;
  cx.fillRect(px - tw / 2, py - 15, tw, 18); cx.strokeRect(px - tw / 2, py - 15, tw, 18);
  cx.fillStyle = '#cc88ff'; cx.textAlign = 'center'; cx.fillText(msg, px, py - 1);
  cx.textAlign = 'left'; cx.restore();
}

// ── Store enter / exit ────────────────────────────────────────────────────
function enterStoreInterior() {
  svStoreInside     = true;
  svStorePlayerX    = 1050;   // start near Halo shelf (middle of store)
  svStorePlayerVx   = 0;
  svStoreCamera.x   = Math.max(0, Math.min(SV_STORE_WORLD_W - viewWidth, svStorePlayerX - viewWidth / 2));
  svStoreTransition = 1.0;    // black → clear fade
}

function exitStoreInterior() {
  svStoreInside = false;
  // Snap local physics back to store entrance so the player reappears there
  var me = slimeversePlayers[slimeverseSelfId];
  if (me) { mvLocal.x = me.x || SV_STORE_X; mvLocal.z = me.z || SV_STORE_Z; }
}

// ── Store interior scene ──────────────────────────────────────────────────
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
  cx.fillStyle = '#00ffcc'; cx.font = 'bold 10px Courier New'; cx.textAlign = 'center';
  cx.fillText('// HAT & COSMETICS EMPORIUM //', w / 2, ceilY + 30); cx.textAlign = 'left';

  // ── Player slime ────────────────────────────────────────────────────
  drawStoreInteriorPlayer(cx, svStorePlayerX - camX, floorY);

  // ── HUD ─────────────────────────────────────────────────────────────
  drawStoreInteriorHud(cx, w, h, floorY);
}

// ── Warehouse shelf ────────────────────────────────────────────────────────
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
  cx.fillStyle = '#1a1a00'; cx.font = 'bold 8px Courier New'; cx.textAlign = 'center';
  cx.fillText(item.price + ' SC', sx, shelfTop + (shelfH / (levels + 1)) + 10);

  // Item name label
  cx.fillStyle = isNear ? '#cc88ff' : '#66666e'; cx.font = '7px Courier New';
  cx.fillText(item.name.toUpperCase(), sx, shelfTop + 11);

  // Near highlight glow
  if (isNear) {
    cx.shadowColor = 'rgba(180,100,255,.45)'; cx.shadowBlur = 14;
    cx.strokeStyle = 'rgba(180,100,255,.0)'; cx.strokeRect(sx - shelfW / 2, shelfTop, shelfW, shelfH);
    cx.shadowBlur = 0;
  }
  cx.textAlign = 'left';
}

// ── Interior player ───────────────────────────────────────────────────────
function drawStoreInteriorPlayer(cx, sx, floorY) {
  var r = 28;
  cx.save();
  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, playerBodyColor);
    var imgSc = (r * 2) / tc.width;
    cx.drawImage(tc, sx - r, floorY - tc.height * imgSc, tc.width * imgSc, tc.height * imgSc);
  } else {
    cx.fillStyle = playerBodyColor || '#00ff00';
    cx.beginPath(); cx.arc(sx, floorY, r, Math.PI, TWO_PI); cx.fill();
  }
  cx.fillStyle = '#fff';
  cx.beginPath(); cx.arc(sx + r * 0.25, floorY - r * 0.6, r * 0.18, 0, TWO_PI); cx.fill();
  cx.fillStyle = '#000';
  cx.beginPath(); cx.arc(sx + r * 0.30, floorY - r * 0.6, r * 0.08, 0, TWO_PI); cx.fill();
  drawHatAt(cx, sx, floorY - r + 1, r,
    { hat: playerHat || 'none', anim: playerHatAnim || 'none', drawing: playerHatDrawing || [] });
  // Floor shadow
  cx.fillStyle = 'rgba(0,0,0,.28)';
  cx.beginPath(); cx.ellipse(sx, floorY + 5, r * 0.75, 5, 0, 0, TWO_PI); cx.fill();
  cx.restore();
}

// ── Interior HUD ──────────────────────────────────────────────────────────
function drawStoreInteriorHud(cx, w, h, floorY) {
  // Info bar
  cx.fillStyle = 'rgba(0,0,16,.72)'; cx.strokeStyle = 'rgba(180,100,255,.28)'; cx.lineWidth = 1;
  cx.fillRect(10, 10, 290, 36); cx.strokeRect(10, 10, 290, 36);
  cx.fillStyle = '#cc88ff'; cx.font = 'bold 9px Courier New';
  cx.fillText('// GENERAL STORE // WAREHOUSE', 20, 24);
  cx.fillStyle = '#444'; cx.font = '8px Courier New';
  cx.fillText('A/D move  ·  E equip item  ·  ESC exit', 20, 38);

  // Coins
  cx.fillStyle = 'rgba(0,0,16,.72)';
  cx.fillRect(w - 140, 10, 130, 22);
  cx.fillStyle = '#ffcc00'; cx.font = 'bold 9px Courier New'; cx.textAlign = 'right';
  cx.fillText('SC: ' + (totalWins || 0), w - 16, 25); cx.textAlign = 'left';

  // Shelf proximity prompt
  var nearIdx = svNearestShelf(svStorePlayerX);
  if (nearIdx !== null) {
    var it = SV_STORE_ITEMS[nearIdx % SV_STORE_ITEMS.length];
    if (it) {
      cx.save();
      cx.font = 'bold 9px Courier New';
      var line1 = it.name + '  —  ' + it.price + ' SC';
      var line2 = '[ E ]  EQUIP';
      var pw = Math.max(cx.measureText(line1).width, cx.measureText(line2).width) + 32;
      var phx = (w - pw) / 2;
      cx.fillStyle = 'rgba(0,0,20,.88)'; cx.strokeStyle = 'rgba(180,100,255,.72)'; cx.lineWidth = 1;
      cx.fillRect(phx, floorY - 58, pw, 50); cx.strokeRect(phx, floorY - 58, pw, 50);
      cx.fillStyle = '#cc88ff'; cx.textAlign = 'center';
      cx.fillText(line1, w / 2, floorY - 38);
      cx.fillStyle = '#00ffcc'; cx.fillText(line2, w / 2, floorY - 20);
      cx.textAlign = 'left'; cx.restore();
    }
  }
}

// ── Exterior HUD ──────────────────────────────────────────────────────────
function drawSlimeverseHud() {
  ctx.save();
  ctx.font = 'bold 9px Courier New';
  ctx.fillStyle = 'rgba(0,0,16,.62)'; ctx.strokeStyle = 'rgba(0,255,200,.2)';
  ctx.fillRect(10, 10, 320, 36); ctx.strokeRect(10, 10, 320, 36);
  ctx.fillStyle = '#00ffcc'; ctx.fillText('SLIMEVERSE // GLASS DOME', 20, 24);
  ctx.fillStyle = '#444'; ctx.font = '8px Courier New';
  ctx.fillText('A/D move  ·  W/SPC jump  ·  UP/DN depth  ·  E store  ·  ESC exit', 20, 38);
  ctx.restore();
}

// ── Helpers ───────────────────────────────────────────────────────────────
function svNearestShelf(playerX) {
  var best = null, bestDist = Infinity;
  SV_SHELF_X.forEach(function(wx, i) {
    var d = Math.abs(playerX - wx);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return bestDist < 110 ? best : null;
}
