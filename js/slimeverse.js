var slimeverseActive = false;
var slimeversePlayers = {};
var slimeverseSelfId = null;
var slimeverseWorld = { width: 4500, height: 2250, floorY: 1980, maxZ: 600 };
var slimeverseInputInterval = null;
var slimeverseFrame = 0;
var slimeverseCamera = { x: 0 };
var slimeverseStoreOpen = false;
var svStoreSelectedIdx = 0;
var svStoreKeyDebounce = 0;

// Perspective display constants
var SV_FLOOR_FRAC  = 0.82;  // screen-Y fraction where z=0 (front) renders
var SV_HORIZ_FRAC  = 0.37;  // screen-Y fraction for the horizon (z=maxZ)
var SV_FAR_SCALE   = 0.28;  // player scale at max depth

// Store world position (near-front so player reaches it by pressing DOWN)
var SV_STORE_X = 1800;
var SV_STORE_Z = 60;

var SV_STORE_ITEMS = [
  { hat: 'party',  name: 'Party Hat',   price: 5  },
  { hat: 'tophat', name: 'Top Hat',     price: 10 },
  { hat: 'halo',   name: 'Halo',        price: 15 },
  { hat: 'cowboy', name: 'Cowboy Hat',  price: 25 },
  { hat: 'crown',  name: 'Royal Crown', price: 50 },
];

// ── Perspective helpers ───────────────────────────────────────
function svDepthT(z) {
  return Math.max(0, Math.min(1, (z || 0) / (slimeverseWorld.maxZ || 600)));
}
function svGroundY(z) {
  return viewHeight * (SV_FLOOR_FRAC + (SV_HORIZ_FRAC - SV_FLOOR_FRAC) * svDepthT(z));
}
function svScaleAt(z) {
  return 1.0 - (1.0 - SV_FAR_SCALE) * svDepthT(z);
}
function svSX(worldX, z) {
  var t = svDepthT(z);
  var rawX = worldX - slimeverseCamera.x;
  var vp = viewWidth / 2;
  return vp + (rawX - vp) * (1 - t * 0.55);
}
function svSY(worldY, z) {
  var groundY = svGroundY(z);
  var jumpH = Math.max(0, (slimeverseWorld.floorY || 1980) - (worldY || slimeverseWorld.floorY));
  return groundY - jumpH * svScaleAt(z) * 0.45;
}

// ── Lifecycle ─────────────────────────────────────────────────
function startSlimeverse() {
  if (!lobbySocket || lobbySocket.readyState !== 1) {
    addChatMessage(null, 'Still connecting to server...');
    return;
  }
  showingLobbySelect = false;
  leaveLobby();
  slimeverseActive = true;
  slimeverseStoreOpen = false;
  onlineMode = false;
  isSpectator = false;
  currentRoomId = null;
  hideSpecBadge();
  showLeaveBtn(true);
  hideBottomBar();
  canvas.style.display = 'block';
  menuDiv.style.display = 'none';
  lobbySocket.send(JSON.stringify({ type: 'enter_slimeverse' }));
  sendCustomization();
  startSlimeverseInput();
  requestAnimationFrame(renderSlimeverse);
}

function leaveSlimeverse() {
  if (!slimeverseActive) return;
  slimeverseActive = false;
  slimeverseStoreOpen = false;
  if (slimeverseInputInterval) {
    clearInterval(slimeverseInputInterval);
    slimeverseInputInterval = null;
  }
  slimeversePlayers = {};
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'leave_slimeverse' }));
  }
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
    slimeverseWorld = msg.world || slimeverseWorld;
    if (msg.player) slimeversePlayers[msg.player.id] = msg.player;
    return true;
  }
  if (msg.type === 'slimeverse_state') {
    (msg.players || []).forEach(function(p) {
      slimeversePlayers[p.id] = Object.assign(slimeversePlayers[p.id] || {}, p);
    });
    return true;
  }
  if (msg.type === 'slimeverse_leave') {
    delete slimeversePlayers[msg.id];
    return true;
  }
  if (msg.type === 'slimeverse_customized' && msg.player) {
    slimeversePlayers[msg.player.id] = Object.assign(slimeversePlayers[msg.player.id] || {}, msg.player);
    return true;
  }
  return false;
}

// ── Input ─────────────────────────────────────────────────────
function startSlimeverseInput() {
  if (slimeverseInputInterval) clearInterval(slimeverseInputInterval);
  slimeverseInputInterval = setInterval(function() {
    if (!slimeverseActive || !lobbySocket || lobbySocket.readyState !== 1) return;
    if (slimeverseStoreOpen) return;
    var left = !!(keysDown[KEY_A] || keysDown[KEY_LEFT]);
    var right = !!(keysDown[KEY_D] || keysDown[KEY_RIGHT]);
    var jump  = !!(keysDown[KEY_W] || keysDown[KEY_SPACE]);
    var fwd   = !!keysDown[KEY_DOWN];  // toward camera = decrease z
    var back  = !!keysDown[KEY_UP];    // away from camera = increase z
    if (jump) { keysDown[KEY_W] = false; keysDown[KEY_SPACE] = false; }
    lobbySocket.send(JSON.stringify({ type: 'slimeverse_input', left, right, jump, fwd, back }));
  }, 16);
}

// ── Render loop ───────────────────────────────────────────────
function renderSlimeverse() {
  if (!slimeverseActive) return;
  slimeverseFrame++;

  var me = slimeversePlayers[slimeverseSelfId];
  if (me) {
    slimeverseCamera.x += ((me.x || 0) - viewWidth / 2 - slimeverseCamera.x) * 0.12;
  }
  slimeverseCamera.x = Math.max(0, Math.min(slimeverseWorld.width - viewWidth, slimeverseCamera.x));

  drawSlimeverseWorld();

  // Draw players far-to-near so near players render on top
  Object.keys(slimeversePlayers)
    .map(function(id) { return slimeversePlayers[id]; })
    .sort(function(a, b) { return (b.z || 0) - (a.z || 0); })
    .forEach(drawSlimeversePlayer);

  // Store proximity check
  if (me && !slimeverseStoreOpen) {
    var dz = Math.abs((me.z || 0) - SV_STORE_Z);
    var dx = Math.abs((me.x || 0) - SV_STORE_X);
    if (dz < 90 && dx < 230) {
      drawStoreEnterPrompt();
      var now = Date.now();
      if (keysDown[KEY_E] && now - svStoreKeyDebounce > 200) {
        keysDown[KEY_E] = false;
        svStoreKeyDebounce = now;
        openSlimeverseStore();
      }
    }
  }

  // Store UI + navigation when open
  if (slimeverseStoreOpen) {
    var now2 = Date.now();
    if (now2 - svStoreKeyDebounce > 150) {
      if (keysDown[KEY_UP]) {
        keysDown[KEY_UP] = false;
        svStoreSelectedIdx = Math.max(0, svStoreSelectedIdx - 1);
        svStoreKeyDebounce = now2;
      } else if (keysDown[KEY_DOWN]) {
        keysDown[KEY_DOWN] = false;
        svStoreSelectedIdx = Math.min(SV_STORE_ITEMS.length - 1, svStoreSelectedIdx + 1);
        svStoreKeyDebounce = now2;
      } else if (keysDown[KEY_E]) {
        keysDown[KEY_E] = false;
        svStoreKeyDebounce = now2;
        var item = SV_STORE_ITEMS[svStoreSelectedIdx];
        if (item) {
          playerHat = item.hat;
          try { localStorage.setItem('slimeHat', item.hat); } catch(e) {}
          sendCustomization();
          if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
        }
      }
    }
    drawStoreUI();
  }

  drawSlimeverseHud();
  requestAnimationFrame(renderSlimeverse);
}

// ── World drawing ─────────────────────────────────────────────
function drawSlimeverseWorld() {
  var cx = ctx;
  var w = viewWidth, h = viewHeight;
  var t = Date.now() / 1000;
  var camX = slimeverseCamera.x;

  var hY = viewHeight * SV_HORIZ_FRAC;
  var floorFY = viewHeight * SV_FLOOR_FRAC;
  var vp = w / 2;

  // Sky
  var skyG = cx.createLinearGradient(0, 0, 0, hY + 30);
  skyG.addColorStop(0, '#00162b');
  skyG.addColorStop(0.65, '#01284a');
  skyG.addColorStop(1, '#042038');
  cx.fillStyle = skyG;
  cx.fillRect(0, 0, w, hY + 30);

  // Stars (parallax)
  for (var s = 0; s < 55; s++) {
    var sx = (((s * 313 - camX * 0.04) % (w * 1.8)) + w * 1.8) % (w * 1.8) - w * 0.4;
    var sy2 = (s * 197) % (hY * 0.92);
    cx.strokeStyle = 'rgba(190,245,255,' + (0.07 + (s % 4) * 0.025) + ')';
    cx.beginPath();
    cx.arc(sx, sy2, 0.8 + (s % 3) * 0.45, 0, TWO_PI);
    cx.stroke();
  }

  // Horizon glow
  var hgG = cx.createLinearGradient(0, hY - 18, 0, hY + 28);
  hgG.addColorStop(0, 'rgba(0,200,160,0)');
  hgG.addColorStop(0.5, 'rgba(0,255,200,.07)');
  hgG.addColorStop(1, 'rgba(0,255,200,0)');
  cx.fillStyle = hgG;
  cx.fillRect(0, hY - 18, w, 46);

  // Floor below front edge (solid fill to screen bottom)
  cx.fillStyle = '#0a1a14';
  cx.fillRect(0, floorFY, w, h - floorFY);

  // Perspective floor trapezoid
  var floorG = cx.createLinearGradient(0, floorFY, 0, hY);
  floorG.addColorStop(0, '#18402e');
  floorG.addColorStop(1, '#0a1a14');
  cx.fillStyle = floorG;
  cx.beginPath();
  cx.moveTo(0, floorFY);
  cx.lineTo(w, floorFY);
  cx.lineTo(vp + w * 0.65, hY);
  cx.lineTo(vp - w * 0.65, hY);
  cx.closePath();
  cx.fill();

  // Grid depth lines (horizontal)
  cx.lineWidth = 1;
  for (var d = 0; d <= 14; d++) {
    var frac = d / 14;
    var ly = floorFY + (hY - floorFY) * frac;
    var lLeft  = vp + (0 - vp) * frac;
    var lRight = vp + (w - vp) * frac;
    cx.strokeStyle = 'rgba(0,255,200,' + (0.04 + (1 - frac) * 0.04) + ')';
    cx.beginPath();
    cx.moveTo(lLeft, ly);
    cx.lineTo(lRight, ly);
    cx.stroke();
  }

  // Grid vertical lines (converge to vanishing point)
  cx.strokeStyle = 'rgba(0,255,200,.04)';
  for (var vl = 0; vl <= 16; vl++) {
    var bx2 = (vl / 16) * w;
    cx.beginPath();
    cx.moveTo(bx2, floorFY);
    cx.lineTo(vp, hY);
    cx.stroke();
  }

  // Front edge line
  cx.strokeStyle = 'rgba(0,255,200,.28)';
  cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(0, floorFY);
  cx.lineTo(w, floorFY);
  cx.stroke();
  cx.lineWidth = 1;

  // Store building
  var storeSX = svSX(SV_STORE_X, SV_STORE_Z);
  var storeGY = svGroundY(SV_STORE_Z);
  var storeSc = svScaleAt(SV_STORE_Z);
  drawSlimeverseStoreBuilding(storeSX, storeGY, storeSc);
}

// ── Store building ────────────────────────────────────────────
function drawSlimeverseStoreBuilding(bx, by, sc) {
  var cx = ctx;
  var bw = 145 * sc, bh = 115 * sc, roofH = 38 * sc;

  // Shadow
  cx.fillStyle = 'rgba(0,0,0,.25)';
  cx.beginPath();
  cx.ellipse(bx, by + 3 * sc, bw * 0.55, 8 * sc, 0, 0, TWO_PI);
  cx.fill();

  // Body
  cx.fillStyle = '#1a0a35';
  cx.strokeStyle = 'rgba(180,100,255,.5)';
  cx.lineWidth = 1.5 * sc;
  cx.fillRect(bx - bw / 2, by - bh, bw, bh);
  cx.strokeRect(bx - bw / 2, by - bh, bw, bh);

  // Roof triangle
  cx.fillStyle = '#280a50';
  cx.strokeStyle = 'rgba(200,120,255,.6)';
  cx.beginPath();
  cx.moveTo(bx - bw / 2 - 10 * sc, by - bh);
  cx.lineTo(bx, by - bh - roofH);
  cx.lineTo(bx + bw / 2 + 10 * sc, by - bh);
  cx.closePath();
  cx.fill();
  cx.stroke();

  // Sign banner
  var sgW = bw * 0.86, sgH = 18 * sc;
  cx.fillStyle = '#0d0022';
  cx.strokeStyle = 'rgba(255,180,0,.55)';
  cx.fillRect(bx - sgW / 2, by - bh + 8 * sc, sgW, sgH);
  cx.strokeRect(bx - sgW / 2, by - bh + 8 * sc, sgW, sgH);
  cx.fillStyle = '#ffcc00';
  cx.font = 'bold ' + Math.max(6, Math.round(9 * sc)) + 'px Courier New';
  cx.textAlign = 'center';
  cx.fillText('GENERAL STORE', bx, by - bh + 8 * sc + sgH * 0.7);

  // Door
  var dw = 30 * sc, dh = 46 * sc;
  cx.fillStyle = '#080015';
  cx.strokeStyle = 'rgba(140,80,255,.45)';
  cx.fillRect(bx - dw / 2, by - dh, dw, dh);
  cx.strokeRect(bx - dw / 2, by - dh, dw, dh);
  // Door knob
  cx.fillStyle = 'rgba(255,180,0,.7)';
  cx.beginPath();
  cx.arc(bx + dw * 0.28, by - dh * 0.42, 2 * sc, 0, TWO_PI);
  cx.fill();

  // Windows
  [-0.31, 0.31].forEach(function(side) {
    var wx = bx + side * bw, wy = by - bh + 40 * sc;
    var ww = 24 * sc, wh = 22 * sc;
    cx.fillStyle = 'rgba(180,100,255,.1)';
    cx.strokeStyle = 'rgba(180,100,255,.4)';
    cx.fillRect(wx - ww / 2, wy, ww, wh);
    cx.strokeRect(wx - ww / 2, wy, ww, wh);
    cx.strokeStyle = 'rgba(180,100,255,.18)';
    cx.beginPath();
    cx.moveTo(wx, wy);
    cx.lineTo(wx, wy + wh);
    cx.moveTo(wx - ww / 2, wy + wh / 2);
    cx.lineTo(wx + ww / 2, wy + wh / 2);
    cx.stroke();
  });

  // Ambient glow
  cx.shadowColor = 'rgba(160,80,255,.35)';
  cx.shadowBlur = 18 * sc;
  cx.strokeStyle = 'rgba(180,100,255,.0)';
  cx.strokeRect(bx - bw / 2, by - bh, bw, bh);
  cx.shadowBlur = 0;

  cx.textAlign = 'left';
  cx.lineWidth = 1;
}

// ── Player ────────────────────────────────────────────────────
function drawSlimeversePlayer(p) {
  var z = p.z || 0;
  var sc = svScaleAt(z);
  var sx = svSX(p.x || 0, z);
  var sy = svSY(p.y || slimeverseWorld.floorY, z);

  if (sx < -100 || sx > viewWidth + 100 || sy < -150 || sy > viewHeight + 100) return;

  var r = 24 * sc;
  var color = p.color || '#00ff00';
  ctx.save();
  ctx.globalAlpha = p.id === slimeverseSelfId ? 1 : 0.88;

  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, color);
    var imgSc = (r * 2) / tc.width;
    ctx.drawImage(tc, sx - r, sy - tc.height * imgSc * 0.72, tc.width * imgSc, tc.height * imgSc);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, r, Math.PI, TWO_PI);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sx + r * 0.25, sy - r * 0.42, r * 0.18, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(sx + r * 0.30, sy - r * 0.42, r * 0.08, 0, TWO_PI);
  ctx.fill();

  drawHatAt(ctx, sx, sy - r + 1, r, { hat: p.hat || 'none', anim: p.hatAnim || 'none', drawing: p.hatDrawing || [] });

  // Name label
  var label = (p.name || 'Player') + '  L' + (p.level || 1);
  var fSz = Math.max(6, Math.round(9 * sc));
  ctx.font = 'bold ' + fSz + 'px Courier New';
  var tw = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(0,0,14,.52)';
  ctx.fillRect(sx - tw / 2, sy - r * 1.8 - fSz, tw, fSz + 4);
  ctx.fillStyle = p.id === slimeverseSelfId ? '#ffd966' : '#00ffcc';
  ctx.textAlign = 'center';
  ctx.fillText(label, sx, sy - r * 1.8);
  ctx.textAlign = 'left';

  ctx.restore();
}

// ── Store UI ──────────────────────────────────────────────────
function drawStoreEnterPrompt() {
  var cx = ctx;
  var px = viewWidth / 2, py = viewHeight * SV_FLOOR_FRAC - 24;
  var msg = 'PRESS  E  TO ENTER STORE';
  cx.save();
  cx.font = 'bold 9px Courier New';
  var tw = cx.measureText(msg).width + 22;
  cx.fillStyle = 'rgba(0,0,20,.72)';
  cx.strokeStyle = 'rgba(180,100,255,.65)';
  cx.lineWidth = 1;
  cx.fillRect(px - tw / 2, py - 15, tw, 18);
  cx.strokeRect(px - tw / 2, py - 15, tw, 18);
  cx.fillStyle = '#cc88ff';
  cx.textAlign = 'center';
  cx.fillText(msg, px, py - 1);
  cx.textAlign = 'left';
  cx.restore();
}

function openSlimeverseStore() {
  slimeverseStoreOpen = true;
  svStoreSelectedIdx = 0;
}

function closeSlimeverseStore() {
  slimeverseStoreOpen = false;
}

function drawStoreUI() {
  var cx = ctx;
  var w = viewWidth, h = viewHeight;
  var panW = Math.min(480, w - 40);
  var itemH = 40;
  var panH = Math.min(60 + SV_STORE_ITEMS.length * itemH + 30, h - 40);
  var px = (w - panW) / 2, py = (h - panH) / 2;

  // Dim backdrop
  cx.fillStyle = 'rgba(0,0,18,.85)';
  cx.fillRect(0, 0, w, h);

  // Panel
  cx.fillStyle = '#080018';
  cx.strokeStyle = 'rgba(180,100,255,.55)';
  cx.lineWidth = 2;
  cx.fillRect(px, py, panW, panH);
  cx.strokeRect(px, py, panW, panH);
  cx.lineWidth = 1;

  // Corner accents
  var ca = 12;
  cx.strokeStyle = 'rgba(255,180,0,.5)';
  [[px, py], [px + panW, py], [px, py + panH], [px + panW, py + panH]].forEach(function(c, i) {
    var sx2 = i % 2 === 0 ? 1 : -1, sy3 = i < 2 ? 1 : -1;
    cx.beginPath();
    cx.moveTo(c[0], c[1] + sy3 * ca);
    cx.lineTo(c[0], c[1]);
    cx.lineTo(c[0] + sx2 * ca, c[1]);
    cx.stroke();
  });

  // Title
  cx.textAlign = 'center';
  cx.fillStyle = '#cc88ff';
  cx.font = 'bold 12px Courier New';
  cx.fillText('// GENERAL STORE //', px + panW / 2, py + 22);

  // Currency display
  cx.font = '8px Courier New';
  cx.fillStyle = '#ffcc00';
  cx.fillText('SC (Slime Coins): ' + (totalWins || 0), px + panW / 2, py + 36);

  // Item list
  var listX = px + 18, listY = py + 52;
  SV_STORE_ITEMS.forEach(function(item, i) {
    var iy = listY + i * itemH;
    var isSel = i === svStoreSelectedIdx;
    var canAfford = (totalWins || 0) >= item.price;

    cx.fillStyle = isSel ? 'rgba(180,100,255,.16)' : 'rgba(255,255,255,.025)';
    cx.strokeStyle = isSel ? 'rgba(180,100,255,.7)' : 'rgba(255,255,255,.07)';
    cx.lineWidth = isSel ? 1.5 : 1;
    cx.fillRect(listX, iy, panW - 36, itemH - 5);
    cx.strokeRect(listX, iy, panW - 36, itemH - 5);

    // Hat preview icon
    drawHatAt(cx, listX + 22, iy + (itemH - 5) * 0.52, 13, { hat: item.hat, anim: 'none', drawing: [] });

    // Name
    cx.textAlign = 'left';
    cx.fillStyle = isSel ? '#cc88ff' : (canAfford ? '#888' : '#444');
    cx.font = 'bold 9px Courier New';
    cx.fillText(item.name, listX + 42, iy + 14);

    // Price
    cx.fillStyle = canAfford ? '#ffcc00' : '#555';
    cx.font = '8px Courier New';
    cx.fillText(item.price + ' SC', listX + 42, iy + 26);

    // Equip hint
    if (isSel) {
      cx.fillStyle = '#00ffcc';
      cx.textAlign = 'right';
      cx.fillText('[ E ] EQUIP', listX + panW - 54, iy + 20);
    }
  });

  // Controls footer
  cx.textAlign = 'center';
  cx.fillStyle = '#2a2a2a';
  cx.font = '8px Courier New';
  cx.fillText('UP / DOWN to browse   ·   E to equip   ·   ESC to close', px + panW / 2, py + panH - 10);
  cx.textAlign = 'left';
}

// ── HUD ───────────────────────────────────────────────────────
function drawSlimeverseHud() {
  ctx.save();
  ctx.font = 'bold 9px Courier New';
  ctx.fillStyle = 'rgba(0,0,16,.62)';
  ctx.fillRect(10, 10, 318, 36);
  ctx.strokeStyle = 'rgba(0,255,200,.2)';
  ctx.strokeRect(10, 10, 318, 36);
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('SLIMEVERSE // GLASS DOME', 20, 24);
  ctx.fillStyle = '#444';
  ctx.fillText('A/D move  W/SPC jump  UP/DN depth  E store  ESC exit', 20, 38);
  ctx.restore();
}
