// ── State ─────────────────────────────────────────────────────────────────
var slimeverseActive    = false;
var slimeversePlayers   = {};
var slimeverseSelfId    = null;
var slimeverseWorld     = { width: 4500, height: 2250, floorY: 1980, maxZ: 3000 };
var slimeverseInputInterval = null;
var slimeverseFrame     = 0;
var slimeverseCamera    = { x: 0 };

// Fixed-timestep accumulator — physics steps at exactly 16 ms regardless of
// monitor refresh rate.  mvLastTime = 0 means "initialise on next frame".
var mvLastTime = 0;
var mvAccum    = 0;

// Store exterior
var SV_STORE_X          = 1800;
var SV_STORE_Z          = 60;
var SV_FINAL4_X         = 3200;
var SV_FINAL4_Z         = 95;
var svStoreKeyDebounce  = 0;
var svStoreMsg          = '';
var svStoreMsgTimer     = 0;
var svFinal4Msg         = '';
var svFinal4MsgTimer    = 0;

// Store interior
var svStoreInside       = false;
var svStorePlayerX      = 1050;
var svStorePlayerVx     = 0;
var svStoreCamera       = { x: 0 };
var svStoreTransition   = 0;   // 1→0 fade-in on enter
var SV_STORE_WORLD_W    = 2700;

// Perspective display
var SV_FLOOR_FRAC  = 0.82;
var SV_HORIZ_FRAC  = 0.36;
var SV_FAR_SCALE   = 0.05;   // at maxZ the player is ~5% size (1-2 px radius)

var SV_STORE_ITEMS = [
  { hat: 'devil',      name: 'Devil Horns',     price: 400  },
  { hat: 'prismatic',  name: 'Prismatic Crown',  price: 600  },
  { hat: 'dragonfire', name: 'Dragon Horns',     price: 800  },
  { hat: 'cosmic',     name: 'Cosmic Crown',     price: 1200 },
  { hat: 'angelic',    name: 'Triple Halo',      price: 1500 },
  { hat: 'overlord',   name: 'Overlord Crown',   price: 2500 },
];

// Shelf world-X positions (one per item type)
var SV_SHELF_X = [250, 650, 1050, 1450, 1850, 2250];

// ── Render time (RAF timestamp, used for animations) ─────────────────────
var svRenderTime = 0;

// ── Seeded decorations (deterministic so they're identical every session) ─
var SV_BUSHES = (function() {
  var out = [], seed = 12345;
  function rng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
  for (var i = 0; i < 90; i++) {
    out.push({ x: 150 + rng() * 4200, z: 25 + rng() * 2850, r: 22 + rng() * 52, phase: rng() * 6.28, speed: 0.5 + rng() * 0.8 });
  }
  return out.sort(function(a, b) { return b.z - a.z; }); // far → near draw order
})();

var SV_FIREFLIES = (function() {
  var out = [], seed = 99887;
  function rng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
  for (var i = 0; i < 45; i++) {
    out.push({ x: 200 + rng() * 4100, z: 60 + rng() * 1800, phase: rng() * 6.28, speed: 0.35 + rng() * 0.9 });
  }
  return out;
})();

// ── Perspective helpers ───────────────────────────────────────────────────
// sqrt curve: objects compress quickly toward horizon, spreading near the camera —
// this matches true perspective far better than a linear map, especially with a
// deep world (maxZ 3000).  At t=1 the player is SV_FAR_SCALE × normal size.
function svDepthT(z) {
  var maxZ = slimeverseWorld.maxZ || 3000;
  return Math.sqrt(Math.max(0, Math.min(1, (z || 0) / maxZ)));
}
function svGroundY(z) { return viewHeight * (SV_FLOOR_FRAC + (SV_HORIZ_FRAC - SV_FLOOR_FRAC) * svDepthT(z)); }
function svScaleAt(z) { return 1.0 - (1.0 - SV_FAR_SCALE) * svDepthT(z); }
function svSX(worldX, z) {
  var t = svDepthT(z), vp = viewWidth / 2;
  return vp + (worldX - slimeverseCamera.x - vp) * (1 - t * 0.88);
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
  mvLastTime = 0; mvAccum = 0;
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
    if (svStoreInside) {
      lobbySocket.send(JSON.stringify({ type: 'slimeverse_store_move', storeX: svStorePlayerX }));
      return;
    }
    var inp = mvGetInput();
    lobbySocket.send(JSON.stringify({
      type: 'slimeverse_input',
      left: inp.left, right: inp.right,
      jump: inp.jump, fwd: inp.fwd, back: inp.back,
    }));
  }, 16);
}

// ── Main render loop ──────────────────────────────────────────────────────
// RAF passes a DOMHighResTimeStamp as the first argument.
function renderSlimeverse(ts) {
  if (!slimeverseActive) return;

  // ── Store interior branch ─────────────────────────────────────────────
  if (svStoreInside) {
    // Keep mvLastTime current so exiting the store doesn't spike the accumulator.
    mvLastTime = ts || 0;

    var sl = !!(keysDown[KEY_A] || keysDown[KEY_LEFT]);
    var sr = !!(keysDown[KEY_D] || keysDown[KEY_RIGHT]);
    svStorePlayerVx = (sl && !sr) ? -5 : (sr && !sl) ? 5 : 0;
    svStorePlayerX = Math.max(80, Math.min(SV_STORE_WORLD_W - 80, svStorePlayerX + svStorePlayerVx));
    svStoreCamera.x += (svStorePlayerX - viewWidth / 2 - svStoreCamera.x) * 0.15;
    svStoreCamera.x = Math.max(0, Math.min(SV_STORE_WORLD_W - viewWidth, svStoreCamera.x));

    // E key — buy / equip item from nearest shelf
    var now0 = Date.now();
    if (keysDown[KEY_E] && now0 - svStoreKeyDebounce > 200) {
      var nearIdx = svNearestShelf(svStorePlayerX);
      if (nearIdx !== null) {
        keysDown[KEY_E] = false;
        svStoreKeyDebounce = now0;
        var it = SV_STORE_ITEMS[nearIdx % SV_STORE_ITEMS.length];
        if (it) {
          var alreadyOwned = currentAccount && Array.isArray(currentAccount.inventory) && currentAccount.inventory.indexOf(it.hat) !== -1;
          if (alreadyOwned) {
            // Just equip — already owned
            playerHat = it.hat;
            try { localStorage.setItem('slimeHat', it.hat); } catch(e2) {}
            sendCustomization();
            if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
            svStoreMsg = 'EQUIPPED: ' + it.name.toUpperCase();
            svStoreMsgTimer = Date.now();
          } else if (!currentAccount) {
            svStoreMsg = 'LOG IN TO BUY ITEMS';
            svStoreMsgTimer = Date.now();
          } else {
            var _coins = currentAccount.coins || 1;
            if (_coins < it.price) {
              svStoreMsg = 'NOT ENOUGH SC  (NEED ' + it.price + ')';
              svStoreMsgTimer = Date.now();
            } else {
              svStoreMsg = 'BUYING...';
              svStoreMsgTimer = Date.now();
              (function(hatId, hatName) {
                accountRequest('/api/me/buy', { method: 'POST', body: JSON.stringify({ hat: hatId }) })
                  .then(function(body) {
                    currentAccount = body.user;
                    playerHat = hatId;
                    try { localStorage.setItem('slimeHat', hatId); } catch(e3) {}
                    sendCustomization();
                    if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
                    svStoreMsg = 'BOUGHT: ' + hatName.toUpperCase() + '!';
                    svStoreMsgTimer = Date.now();
                  })
                  .catch(function(err) {
                    svStoreMsg = (err && err.message) ? err.message.toUpperCase() : 'BUY FAILED';
                    svStoreMsgTimer = Date.now();
                  });
              })(it.hat, it.name);
            }
          }
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
  svRenderTime = ts; // drives bush sway, firefly flicker, grass animation

  // ── Fixed-timestep physics accumulator ───────────────────────────────
  // Runs physics at exactly 16 ms per step regardless of monitor refresh rate.
  // Without this, a 144 Hz display runs ~2.3× more steps than the server,
  // accumulating 500+ px of drift and triggering the hard-snap every ~1 s.
  if (mvLastTime === 0) mvLastTime = ts;
  var dt = ts - mvLastTime;
  mvLastTime = ts;
  // Clamp to 5 steps max — prevents a spiral of death after a long pause.
  if (dt > 80) dt = 80;
  mvAccum += dt;

  var inp = mvGetInput();
  while (mvAccum >= 16) {
    mvApplyInput(mvLocal, inp);
    mvStep(mvLocal, slimeverseWorld);
    mvAccum -= 16;
  }

  // Camera tracks local predicted position (instant, no wait for server round-trip)
  slimeverseCamera.x += (mvLocal.x - viewWidth / 2 - slimeverseCamera.x) * 0.15;
  slimeverseCamera.x = Math.max(0, Math.min(slimeverseWorld.width - viewWidth, slimeverseCamera.x));

  drawSlimeverseWorld();

  // Draw all players — use predicted local state for self
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

  var f4dx = Math.abs(mvLocal.x - SV_FINAL4_X);
  var f4dz = Math.abs(mvLocal.z - SV_FINAL4_Z);
  if (f4dz < 125 && f4dx < 190) {
    drawFinal4GatePrompt();
    var nowF4 = Date.now();
    if (keysDown[KEY_E] && nowF4 - svStoreKeyDebounce > 260) {
      keysDown[KEY_E] = false;
      svStoreKeyDebounce = nowF4;
      tryEnterFinal4Tower();
    }
  }

  drawSlimeverseHud();
  requestAnimationFrame(renderSlimeverse);
}

// ── World drawing ─────────────────────────────────────────────────────────
function drawSlimeverseWorld() {
  var cx = ctx, w = viewWidth, h = viewHeight;
  var hY     = h * SV_HORIZ_FRAC;
  var floorFY = h * SV_FLOOR_FRAC;
  var vp = w / 2, camX = slimeverseCamera.x;
  var t = svRenderTime;

  // ── Deep night sky ───────────────────────────────────────────────────
  var skyG = cx.createLinearGradient(0, 0, 0, hY + 55);
  skyG.addColorStop(0,    '#000d1a');
  skyG.addColorStop(0.25, '#001226');
  skyG.addColorStop(0.62, '#011b38');
  skyG.addColorStop(0.88, '#012640');
  skyG.addColorStop(1,    '#021c2c');
  cx.fillStyle = skyG; cx.fillRect(0, 0, w, hY + 55);

  // ── Moon (parallax-scrolls slowly) ───────────────────────────────────
  var moonX = w * 0.74 - camX * 0.007;
  var moonY = hY * 0.30;
  var moonR = 28;
  var mg = cx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 5);
  mg.addColorStop(0, 'rgba(210,240,165,.20)'); mg.addColorStop(1, 'rgba(210,240,165,0)');
  cx.fillStyle = mg; cx.fillRect(moonX - moonR * 5, moonY - moonR * 5, moonR * 10, moonR * 10);
  cx.fillStyle = '#cce89e';
  cx.beginPath(); cx.arc(moonX, moonY, moonR, 0, TWO_PI); cx.fill();
  cx.fillStyle = '#011b38'; // crescent bite
  cx.beginPath(); cx.arc(moonX + 9, moonY - 4, moonR * 0.82, 0, TWO_PI); cx.fill();

  // ── Stars (twinkling, parallax) ───────────────────────────────────────
  for (var s = 0; s < 120; s++) {
    var sx = (((s * 317 - camX * 0.018) % (w * 2.4)) + w * 2.4) % (w * 2.4) - w * 0.7;
    var sy2 = (s * 193) % (hY * 0.88);
    var twinkle = 0.42 + 0.58 * Math.sin(t * 0.00185 * (0.4 + (s % 7) * 0.25) + s * 1.9);
    cx.fillStyle = 'rgba(210,240,255,' + ((0.04 + (s % 6) * 0.016) * twinkle).toFixed(3) + ')';
    cx.beginPath(); cx.arc(sx, sy2, 0.45 + (s % 4) * 0.38, 0, TWO_PI); cx.fill();
  }

  // ── Atmospheric horizon glow ──────────────────────────────────────────
  var hazeG = cx.createLinearGradient(0, hY - 80, 0, hY + 120);
  hazeG.addColorStop(0,    'rgba(0,50,28,0)');
  hazeG.addColorStop(0.35, 'rgba(0,90,48,.09)');
  hazeG.addColorStop(0.60, 'rgba(0,140,72,.22)');
  hazeG.addColorStop(0.80, 'rgba(0,110,58,.14)');
  hazeG.addColorStop(1,    'rgba(0,50,28,0)');
  cx.fillStyle = hazeG; cx.fillRect(0, hY - 80, w, 200);

  // ── Grass ground trapezoid ────────────────────────────────────────────
  var gndG = cx.createLinearGradient(0, floorFY, 0, hY);
  gndG.addColorStop(0,    '#236630');
  gndG.addColorStop(0.20, '#1d5828');
  gndG.addColorStop(0.52, '#144022');
  gndG.addColorStop(0.80, '#0c2c18');
  gndG.addColorStop(1,    '#071c10');
  cx.fillStyle = gndG;
  cx.beginPath();
  cx.moveTo(0, floorFY); cx.lineTo(w, floorFY);
  cx.lineTo(vp + w * 0.72, hY); cx.lineTo(vp - w * 0.72, hY);
  cx.closePath(); cx.fill();

  // Near-ground continuation below the frame
  cx.fillStyle = '#236630'; cx.fillRect(0, floorFY, w, h - floorFY);

  // ── Horizon fog band ──────────────────────────────────────────────────
  var fogG = cx.createLinearGradient(0, hY - 6, 0, hY + 95);
  fogG.addColorStop(0, 'rgba(18,68,34,.72)');
  fogG.addColorStop(0.45, 'rgba(18,68,34,.40)');
  fogG.addColorStop(1, 'rgba(18,68,34,0)');
  cx.fillStyle = fogG; cx.fillRect(0, hY - 6, w, 101);

  // ── Depth grid — subtle dark-green horizontal lines ───────────────────
  cx.lineWidth = 1;
  for (var d = 0; d <= 22; d++) {
    var frac = d / 22;
    var ly = floorFY + (hY - floorFY) * frac;
    cx.strokeStyle = 'rgba(0,100,40,' + (0.03 + (1 - frac) * 0.07) + ')';
    cx.beginPath();
    cx.moveTo(vp + (0 - vp) * frac, ly);
    cx.lineTo(vp + (w - vp) * frac, ly);
    cx.stroke();
  }

  // ── Convergence lines (world-tiled, scroll with camera) ──────────────
  var floorTile = 200, floorOff = camX % floorTile;
  cx.strokeStyle = 'rgba(0,80,30,.05)';
  for (var vl = -1; vl <= Math.ceil(w / floorTile) + 1; vl++) {
    var clineX = vl * floorTile - floorOff;
    cx.beginPath(); cx.moveTo(clineX, floorFY); cx.lineTo(vp, hY); cx.stroke();
  }

  // ── Animated grass blades along near edge ────────────────────────────
  var bladeTile = 13, bladeOff = (camX * 0.994) % bladeTile;
  for (var gi = -2; gi <= Math.ceil(w / bladeTile) + 2; gi++) {
    var gx = gi * bladeTile - bladeOff;
    var bh2 = 7 + ((gi * 7 + 3) % 5) * 2.4;
    var lean = Math.sin(t * 0.0016 + gi * 0.85) * 3.8;
    cx.strokeStyle = gi % 3 === 0 ? 'rgba(55,210,85,.30)' : 'rgba(40,165,62,.22)';
    cx.lineWidth = gi % 4 === 0 ? 1.5 : 1;
    cx.beginPath();
    cx.moveTo(gx, floorFY);
    cx.quadraticCurveTo(gx + lean * 0.55, floorFY - bh2 * 0.6, gx + lean, floorFY - bh2);
    cx.stroke();
  }
  cx.lineWidth = 1;

  // ── Near-edge highlight ───────────────────────────────────────────────
  cx.strokeStyle = 'rgba(72,235,112,.42)'; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(0, floorFY); cx.lineTo(w, floorFY); cx.stroke();
  cx.lineWidth = 1;

  // ── Depth-sorted bushes (far → near for correct occlusion) ───────────
  SV_BUSHES.forEach(function(b) {
    var bsc = svScaleAt(b.z);
    if (bsc < 0.055) return;
    var bsx = svSX(b.x, b.z);
    var bsy = svGroundY(b.z);
    if (bsx < -280 || bsx > w + 280) return;
    drawSVBush(cx, b, bsx, bsy, bsc, t);
  });

  // ── Fireflies ─────────────────────────────────────────────────────────
  drawSVFireflies(cx, t, w, hY);

  // ── Final 4 grounds and tower ─────────────────────────────────────────
  drawFinal4MysticGround(cx, w, h, hY, floorFY, vp, camX, t);

  // ── Store building ─────────────────────────────────────────────────────
  drawSlimeverseStoreBuilding(svSX(SV_STORE_X, SV_STORE_Z), svGroundY(SV_STORE_Z), svScaleAt(SV_STORE_Z));
  drawFinal4Tower(svSX(SV_FINAL4_X, SV_FINAL4_Z), svGroundY(SV_FINAL4_Z), svScaleAt(SV_FINAL4_Z), t);
}

// ── Bush decorator ─────────────────────────────────────────────────────────
function drawSVBush(cx, b, sx, groundY, sc, t) {
  var r = b.r * sc;
  if (r < 1.5) return;
  var sway = Math.sin(t * 0.0009 * b.speed + b.phase) * r * 0.07;
  var hue  = 112 + ((b.phase * 18) | 0) % 20;
  var lBase = Math.round(14 + sc * 11);

  cx.save();
  // Ground shadow
  cx.fillStyle = 'rgba(0,0,0,.17)';
  cx.beginPath(); cx.ellipse(sx + sway * 0.3, groundY + sc * 1.5, r * 0.88, r * 0.19, 0, 0, TWO_PI); cx.fill();
  // Dark base sphere
  cx.fillStyle = 'hsl(' + hue + ',54%,' + lBase + '%)';
  cx.beginPath(); cx.arc(sx + sway, groundY - r * 0.48, r, 0, TWO_PI); cx.fill();
  // Right lobe (lighter)
  cx.fillStyle = 'hsl(' + hue + ',62%,' + (lBase + 8) + '%)';
  cx.beginPath(); cx.arc(sx + sway + r * 0.30, groundY - r * 0.59, r * 0.70, 0, TWO_PI); cx.fill();
  // Left lobe
  cx.fillStyle = 'hsl(' + hue + ',57%,' + (lBase + 5) + '%)';
  cx.beginPath(); cx.arc(sx + sway - r * 0.28, groundY - r * 0.55, r * 0.60, 0, TWO_PI); cx.fill();
  // Top specular highlight
  cx.fillStyle = 'hsl(' + (hue + 5) + ',68%,' + (lBase + 15) + '%)';
  cx.beginPath(); cx.arc(sx + sway + r * 0.07, groundY - r * 0.73, r * 0.38, 0, TWO_PI); cx.fill();
  cx.restore();
}

// ── Firefly particles ──────────────────────────────────────────────────────
function drawSVFireflies(cx, t, w, hY) {
  SV_FIREFLIES.forEach(function(f) {
    var fsc = svScaleAt(f.z);
    if (fsc < 0.10) return;
    // Organic Lissajous drift
    var wx  = f.x + Math.sin(t * 0.00048 * f.speed + f.phase) * 95
                  + Math.sin(t * 0.00079 * f.speed + f.phase * 2.1) * 38;
    var fsx = svSX(wx, f.z);
    if (fsx < -40 || fsx > w + 40) return;
    var gndY = svGroundY(f.z);
    var fsy  = gndY - (26 + Math.sin(t * 0.00062 * f.speed + f.phase * 3.1) * 15) * fsc;
    if (fsy < hY) return;
    // Pulsing brightness
    var pulse  = 0.5 + 0.5 * Math.sin(t * 0.00275 * f.speed + f.phase);
    var alpha  = Math.max(0.05, pulse);
    var dotR   = (1.6 + fsc * 1.8) * (0.55 + pulse * 0.45);
    var glowR  = dotR * 7;
    // Outer glow (radial gradient)
    var grd = cx.createRadialGradient(fsx, fsy, 0, fsx, fsy, glowR);
    grd.addColorStop(0,   'rgba(155,255,75,'  + (alpha * 0.62).toFixed(3) + ')');
    grd.addColorStop(0.38,'rgba(90,255,45,'   + (alpha * 0.24).toFixed(3) + ')');
    grd.addColorStop(1,   'rgba(30,200,20,0)');
    cx.fillStyle = grd; cx.fillRect(fsx - glowR, fsy - glowR, glowR * 2, glowR * 2);
    // Bright core
    cx.fillStyle = 'rgba(215,255,140,' + Math.min(1, alpha * 1.5).toFixed(3) + ')';
    cx.beginPath(); cx.arc(fsx, fsy, dotR, 0, TWO_PI); cx.fill();
  });
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
  cx.font = 'bold ' + Math.max(7, Math.round(11 * sc)) + 'px Courier New';
  cx.fillText('GOY SLOP HAT SHOP', bx, by - bh + 8 * sc + sgH * 0.72);

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

// ── Final 4 tower exterior ────────────────────────────────────────────────
function drawFinal4MysticGround(cx, w, h, hY, floorFY, vp, camX, t) {
  var sx = svSX(SV_FINAL4_X, SV_FINAL4_Z);
  var sy = svGroundY(SV_FINAL4_Z);
  var sc = svScaleAt(SV_FINAL4_Z);
  if (sx < -320 || sx > w + 320) return;

  cx.save();

  // Grass gives way to a black-rock island around the tower.
  var islandW = 420 * sc, islandH = 68 * sc;
  var rg = cx.createRadialGradient(sx, sy - 8 * sc, 10 * sc, sx, sy, islandW * 0.62);
  rg.addColorStop(0, 'rgba(90,70,130,.62)');
  rg.addColorStop(0.42, 'rgba(28,24,42,.92)');
  rg.addColorStop(0.72, 'rgba(12,12,18,.96)');
  rg.addColorStop(1, 'rgba(10,30,16,0)');
  cx.fillStyle = rg;
  cx.beginPath(); cx.ellipse(sx, sy + 3 * sc, islandW * 0.62, islandH, 0, 0, TWO_PI); cx.fill();

  // Shining pathway from the mystical stones toward the camera.
  var nearY = floorFY + (h - floorFY) * 0.68;
  var pathTopW = 42 * sc, pathBotW = 210;
  var pg = cx.createLinearGradient(sx, sy, sx, nearY);
  pg.addColorStop(0, 'rgba(180,125,255,.62)');
  pg.addColorStop(0.48, 'rgba(82,255,222,.26)');
  pg.addColorStop(1, 'rgba(180,125,255,.04)');
  cx.fillStyle = pg;
  cx.beginPath();
  cx.moveTo(sx - pathTopW, sy + 2 * sc);
  cx.lineTo(sx + pathTopW, sy + 2 * sc);
  cx.lineTo(vp + pathBotW * 0.5, nearY);
  cx.lineTo(vp - pathBotW * 0.5, nearY);
  cx.closePath(); cx.fill();

  cx.strokeStyle = 'rgba(190,255,235,.32)';
  cx.lineWidth = 1.2;
  cx.beginPath(); cx.moveTo(sx - pathTopW, sy + 2 * sc); cx.lineTo(vp - pathBotW * 0.5, nearY); cx.stroke();
  cx.beginPath(); cx.moveTo(sx + pathTopW, sy + 2 * sc); cx.lineTo(vp + pathBotW * 0.5, nearY); cx.stroke();

  // Floating rune stones along the path.
  for (var i = 0; i < 14; i++) {
    var p = i / 13;
    var wob = Math.sin(t * 0.0014 + i * 1.7) * 3;
    var px = sx + (vp - sx) * p + (i % 2 ? -1 : 1) * (28 + p * 80) + Math.sin(i * 2.3) * 9;
    var py = sy + (nearY - sy) * p + wob;
    var rr = (5 + (i % 4) * 2) * (0.85 - p * 0.32);
    cx.fillStyle = i % 3 === 0 ? 'rgba(82,255,222,.72)' : 'rgba(182,126,255,.66)';
    cx.beginPath();
    cx.moveTo(px, py - rr);
    cx.lineTo(px + rr * 0.82, py);
    cx.lineTo(px, py + rr);
    cx.lineTo(px - rr * 0.82, py);
    cx.closePath(); cx.fill();
    cx.shadowColor = 'rgba(130,255,230,.45)'; cx.shadowBlur = 10;
    cx.strokeStyle = 'rgba(230,255,245,.3)'; cx.stroke();
    cx.shadowBlur = 0;
  }

  cx.restore();
}

function drawFinal4Tower(bx, by, sc, t) {
  var cx = ctx;
  var bw = 138 * sc;
  var floorH = 78 * sc;
  var floors = 4;
  var baseH = floorH * floors;
  var topY = by - baseH - 10 * sc;

  cx.save();

  // Shadow and energy plume.
  cx.fillStyle = 'rgba(0,0,0,.38)';
  cx.beginPath(); cx.ellipse(bx, by + 6 * sc, bw * 0.72, 11 * sc, 0, 0, TWO_PI); cx.fill();
  var aura = cx.createRadialGradient(bx, by - baseH * 0.55, 8 * sc, bx, by - baseH * 0.55, 185 * sc);
  aura.addColorStop(0, 'rgba(160,90,255,.20)');
  aura.addColorStop(0.55, 'rgba(60,255,230,.08)');
  aura.addColorStop(1, 'rgba(60,255,230,0)');
  cx.fillStyle = aura;
  cx.fillRect(bx - 205 * sc, topY - 130 * sc, 410 * sc, baseH + 175 * sc);

  // Galaxy projection cast into the sky from the top platform.
  drawFinal4SkyProjection(cx, bx, topY, sc, t);
  drawFinal4OuterFrame(cx, bx, by, bw, floorH, sc, t);

  // Stepped pyramid shell backing.
  var shell = cx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
  shell.addColorStop(0, '#08070d');
  shell.addColorStop(0.35, '#1b1428');
  shell.addColorStop(0.65, '#07070d');
  shell.addColorStop(1, '#241433');
  cx.fillStyle = shell;
  cx.strokeStyle = 'rgba(190,130,255,.55)';
  cx.lineWidth = Math.max(1, 1.7 * sc);
  cx.beginPath();
  cx.moveTo(bx - bw * 0.56, by);
  cx.lineTo(bx - bw * 0.49, by - floorH);
  cx.lineTo(bx - bw * 0.42, by - floorH * 2);
  cx.lineTo(bx - bw * 0.34, by - floorH * 3);
  cx.lineTo(bx - bw * 0.25, by - floorH * 4);
  cx.lineTo(bx + bw * 0.25, by - floorH * 4);
  cx.lineTo(bx + bw * 0.34, by - floorH * 3);
  cx.lineTo(bx + bw * 0.42, by - floorH * 2);
  cx.lineTo(bx + bw * 0.49, by - floorH);
  cx.lineTo(bx + bw * 0.56, by);
  cx.closePath(); cx.fill(); cx.stroke();

  for (var i = 0; i < floors; i++) {
    var y = by - floorH * (i + 1);
    drawFinal4Floor(cx, bx, y, bw, floorH, sc, i + 1, t, topY);
  }

  // Vertical ribs.
  cx.strokeStyle = 'rgba(230,210,255,.22)';
  cx.lineWidth = Math.max(1, sc);
  [-0.36, -0.16, 0.16, 0.36].forEach(function(k) {
    cx.beginPath();
    cx.moveTo(bx + bw * k * 0.68, by - baseH + 4 * sc);
    cx.lineTo(bx + bw * k, by - 6 * sc);
    cx.stroke();
  });

  // Door / gate.
  var doorW = 42 * sc, doorH = 48 * sc;
  var dg = cx.createLinearGradient(0, by - doorH, 0, by);
  dg.addColorStop(0, '#0b0712');
  dg.addColorStop(0.58, '#1b0f2d');
  dg.addColorStop(1, '#030204');
  cx.fillStyle = dg;
  cx.strokeStyle = 'rgba(210,155,255,.8)';
  cx.fillRect(bx - doorW / 2, by - doorH, doorW, doorH);
  cx.strokeRect(bx - doorW / 2, by - doorH, doorW, doorH);
  cx.fillStyle = 'rgba(255,220,120,.82)';
  cx.beginPath(); cx.arc(bx + doorW * 0.28, by - doorH * 0.45, 2.2 * sc, 0, TWO_PI); cx.fill();

  // Sign.
  var signW = bw * 0.76, signH = 16 * sc;
  cx.fillStyle = '#050409';
  cx.strokeStyle = 'rgba(255,80,35,.72)';
  cx.fillRect(bx - signW / 2, by - baseH - 2 * sc, signW, signH);
  cx.strokeRect(bx - signW / 2, by - baseH - 2 * sc, signW, signH);
  cx.fillStyle = '#ff5b2d';
  cx.textAlign = 'center';
  cx.font = 'bold ' + Math.max(7, Math.round(10 * sc)) + 'px Courier New';
  cx.fillText('THE FINAL 4', bx, by - baseH + 10 * sc);

  cx.textAlign = 'left';
  cx.shadowBlur = 0;
  cx.lineWidth = 1;
  cx.restore();
}

function drawFinal4SkyProjection(cx, bx, topY, sc, t) {
  var py = topY - 92 * sc;
  var coneTop = py + 60 * sc;
  cx.save();
  cx.beginPath();
  cx.moveTo(bx - 14 * sc, topY + 8 * sc);
  cx.lineTo(bx + 14 * sc, topY + 8 * sc);
  cx.lineTo(bx + 92 * sc, coneTop);
  cx.lineTo(bx - 92 * sc, coneTop);
  cx.closePath();
  var cone = cx.createLinearGradient(bx, topY, bx, coneTop);
  cone.addColorStop(0, 'rgba(150,255,245,.26)');
  cone.addColorStop(0.5, 'rgba(120,120,255,.10)');
  cone.addColorStop(1, 'rgba(90,60,255,0)');
  cx.fillStyle = cone; cx.fill();

  var rg = cx.createRadialGradient(bx, py, 2 * sc, bx, py, 88 * sc);
  rg.addColorStop(0, 'rgba(255,255,255,.88)');
  rg.addColorStop(0.14, 'rgba(110,255,244,.62)');
  rg.addColorStop(0.36, 'rgba(92,55,255,.38)');
  rg.addColorStop(0.70, 'rgba(12,6,60,.22)');
  rg.addColorStop(1, 'rgba(10,5,40,0)');
  cx.fillStyle = rg;
  cx.beginPath(); cx.ellipse(bx, py, 92 * sc, 48 * sc, Math.sin(t * 0.0007) * 0.18, 0, TWO_PI); cx.fill();

  cx.strokeStyle = 'rgba(190,230,255,.60)';
  cx.lineWidth = Math.max(1, sc);
  cx.beginPath(); cx.ellipse(bx, py, 72 * sc, 24 * sc, Math.sin(t * 0.001) * 0.35, 0, TWO_PI); cx.stroke();
  cx.beginPath(); cx.ellipse(bx, py, 38 * sc, 54 * sc, -0.8, 0, TWO_PI); cx.stroke();
  cx.strokeStyle = 'rgba(255,255,255,.38)';
  cx.beginPath(); cx.ellipse(bx, py, 26 * sc, 18 * sc, t * 0.0007, 0, TWO_PI); cx.stroke();
  for (var star = 0; star < 46; star++) {
    var a = star * 2.399 + t * 0.00035;
    var rr = (8 + (star * 11) % 72) * sc;
    var sx = bx + Math.cos(a) * rr;
    var sy = py + Math.sin(a * 0.73) * rr * 0.42;
    cx.fillStyle = star % 7 === 0 ? 'rgba(255,220,120,.95)' : 'rgba(220,240,255,.78)';
    cx.beginPath(); cx.arc(sx, sy, (0.8 + (star % 3) * 0.35) * sc, 0, TWO_PI); cx.fill();
  }
  cx.restore();
}

function drawFinal4OuterFrame(cx, bx, by, bw, floorH, sc, t) {
  cx.save();
  var baseY = by;
  var topY = by - floorH * 4 - 10 * sc;

  // Massive outside buttresses that make the tower feel built, not stacked.
  [-1, 1].forEach(function(side) {
    var outerX = bx + side * bw * 0.78;
    var innerX = bx + side * bw * 0.43;
    var footX = bx + side * bw * 0.95;
    var g = cx.createLinearGradient(innerX, topY, footX, baseY);
    g.addColorStop(0, '#170d27');
    g.addColorStop(0.48, side < 0 ? '#07050a' : '#231034');
    g.addColorStop(1, '#050306');
    cx.fillStyle = g;
    cx.strokeStyle = 'rgba(170,120,255,.35)';
    cx.beginPath();
    cx.moveTo(innerX, topY + 68 * sc);
    cx.lineTo(outerX, topY + 92 * sc);
    cx.lineTo(footX, baseY - 6 * sc);
    cx.lineTo(bx + side * bw * 0.56, baseY);
    cx.closePath(); cx.fill(); cx.stroke();

    // Embedded vertical glow seams.
    cx.strokeStyle = side < 0 ? 'rgba(255,80,35,.24)' : 'rgba(120,255,245,.24)';
    cx.beginPath();
    cx.moveTo(outerX + side * 4 * sc, topY + 105 * sc);
    cx.lineTo(footX - side * 13 * sc, baseY - 28 * sc);
    cx.stroke();
  });

  // Suspended chains/bridges between the outer structures and the tower.
  cx.strokeStyle = 'rgba(205,185,255,.25)';
  cx.lineWidth = Math.max(1, sc);
  [0.92, 1.75, 2.62].forEach(function(mult, idx) {
    var cy = by - floorH * mult;
    [-1, 1].forEach(function(side) {
      var startX = bx + side * bw * (0.37 - idx * 0.04);
      var endX = bx + side * bw * (0.72 + idx * 0.04);
      cx.beginPath();
      cx.moveTo(startX, cy);
      cx.quadraticCurveTo((startX + endX) / 2, cy + (8 + idx * 4) * sc, endX, cy + 2 * sc);
      cx.stroke();
      for (var link = 0; link < 5; link++) {
        var p = link / 4;
        var lx = startX + (endX - startX) * p;
        var ly = cy + Math.sin(p * Math.PI) * (8 + idx * 4) * sc;
        cx.strokeRect(lx - 2 * sc, ly - 3 * sc, 4 * sc, 6 * sc);
      }
    });
  });

  // Floating black stones orbit the upper portal.
  for (var i = 0; i < 10; i++) {
    var a = i * 0.628 + t * 0.00045;
    var rx = (72 + (i % 3) * 12) * sc;
    var ry = (26 + (i % 2) * 8) * sc;
    var sx = bx + Math.cos(a) * rx;
    var sy = topY - 4 * sc + Math.sin(a * 1.4) * ry;
    var r = (4 + (i % 4)) * sc;
    cx.fillStyle = '#08070c';
    cx.strokeStyle = 'rgba(160,255,245,.32)';
    cx.beginPath();
    cx.moveTo(sx, sy - r);
    cx.lineTo(sx + r * 0.9, sy - r * 0.1);
    cx.lineTo(sx + r * 0.4, sy + r);
    cx.lineTo(sx - r * 0.8, sy + r * 0.35);
    cx.closePath(); cx.fill(); cx.stroke();
  }

  cx.restore();
}

function drawFinal4Floor(cx, bx, y, bw, floorH, sc, floorNum, t, topY) {
  var widthScale = [1.00, 0.86, 0.70, 0.50][floorNum - 1];
  var depth = (15 - floorNum * 2) * sc;
  var w = bw * widthScale;
  var h = floorH * (floorNum === 4 ? 0.78 : 0.86);
  var x = bx - w / 2;
  var yy = y + (floorH - h) * 0.42;
  var skew = depth * 0.62;

  drawFinal4LayerShell(cx, x, yy, w, h, depth, skew, sc, floorNum);
  drawFinal4Balconies(cx, bx, x, yy, w, h, sc, floorNum, t);

  cx.save();
  cx.beginPath();
  drawFinal4FloorPath(cx, x, yy, w, h, sc, floorNum);
  cx.clip();

  if (floorNum === 1) {
    // Obsidian manor.
    var g1 = cx.createLinearGradient(0, yy, 0, yy + h);
    g1.addColorStop(0, '#18101d'); g1.addColorStop(0.55, '#0b0710'); g1.addColorStop(1, '#020203');
    cx.fillStyle = g1; cx.fillRect(x, yy, w, h);
    cx.fillStyle = 'rgba(120,95,160,.22)';
    for (var c = 0; c < 5; c++) {
      var colX = x + 12 * sc + c * w / 5;
      cx.fillRect(colX, yy + 10 * sc, 9 * sc, h - 14 * sc);
      cx.strokeStyle = 'rgba(220,210,255,.16)';
      cx.strokeRect(colX, yy + 10 * sc, 9 * sc, h - 14 * sc);
    }
    cx.fillStyle = 'rgba(255,230,160,.18)';
    for (var win = 0; win < 3; win++) cx.fillRect(x + 27 * sc + win * 43 * sc, yy + 20 * sc, 18 * sc, 24 * sc);
    drawFinal4RecessedWindows(cx, x, yy, w, h, sc, 4, 'rgba(255,230,160,.22)');
  } else if (floorNum === 2) {
    // Hell titan.
    var g2 = cx.createLinearGradient(0, yy, 0, yy + h);
    g2.addColorStop(0, '#3d0700'); g2.addColorStop(0.52, '#180000'); g2.addColorStop(1, '#050000');
    cx.fillStyle = g2; cx.fillRect(x, yy, w, h);
    for (var flame = 0; flame < 8; flame++) {
      var fx = x + 10 * sc + flame * 18 * sc;
      var fh = (18 + Math.sin(t * 0.006 + flame) * 8) * sc;
      cx.fillStyle = flame % 2 ? 'rgba(255,190,40,.82)' : 'rgba(255,70,12,.72)';
      cx.beginPath();
      cx.moveTo(fx, yy + h);
      cx.quadraticCurveTo(fx + 8 * sc, yy + h - fh, fx + 15 * sc, yy + h);
      cx.closePath(); cx.fill();
    }
    cx.fillStyle = 'rgba(230,215,190,.60)';
    for (var skull = 0; skull < 5; skull++) {
      var skx = x + 20 * sc + skull * 31 * sc, sky = yy + 19 * sc;
      cx.beginPath(); cx.arc(skx, sky, 7 * sc, 0, TWO_PI); cx.fill();
      cx.fillStyle = '#160000';
      cx.beginPath(); cx.arc(skx - 2 * sc, sky, 1.7 * sc, 0, TWO_PI); cx.arc(skx + 2 * sc, sky, 1.7 * sc, 0, TWO_PI); cx.fill();
      cx.fillStyle = 'rgba(230,215,190,.60)';
      cx.fillRect(skx - 4 * sc, sky + 5 * sc, 8 * sc, 5 * sc);
    }
    drawFinal4RecessedWindows(cx, x, yy, w, h, sc, 3, 'rgba(255,72,18,.24)');
  } else if (floorNum === 3) {
    // AI light ascended.
    var g3 = cx.createLinearGradient(x, yy, x + w, yy + h);
    g3.addColorStop(0, '#021019'); g3.addColorStop(0.45, '#dfffff'); g3.addColorStop(0.56, '#70f7ff'); g3.addColorStop(1, '#05081a');
    cx.fillStyle = g3; cx.fillRect(x, yy, w, h);
    cx.strokeStyle = 'rgba(255,255,255,.72)';
    cx.lineWidth = Math.max(1, sc);
    for (var beam = 0; beam < 9; beam++) {
      var by1 = yy + (beam * 13 + t * 0.018) % h;
      cx.beginPath(); cx.moveTo(x, by1); cx.lineTo(x + w, yy + h - by1 + yy); cx.stroke();
    }
    var core = cx.createRadialGradient(bx, yy + h * 0.45, 0, bx, yy + h * 0.45, 54 * sc);
    core.addColorStop(0, 'rgba(255,255,255,.95)');
    core.addColorStop(0.3, 'rgba(130,255,255,.45)');
    core.addColorStop(1, 'rgba(130,255,255,0)');
    cx.fillStyle = core; cx.fillRect(x, yy, w, h);
    drawFinal4RecessedWindows(cx, x, yy, w, h, sc, 5, 'rgba(235,255,255,.52)');
  } else {
    // Projector room: the galaxy lives in the sky above, not on the wall.
    var g4 = cx.createLinearGradient(0, yy, 0, yy + h);
    g4.addColorStop(0, '#16122b'); g4.addColorStop(0.48, '#080713'); g4.addColorStop(1, '#020207');
    cx.fillStyle = g4; cx.fillRect(x, yy, w, h);
    cx.fillStyle = '#090711';
    cx.fillRect(bx - 16 * sc, yy + h - 22 * sc, 32 * sc, 16 * sc);
    cx.strokeStyle = 'rgba(160,255,245,.58)';
    cx.strokeRect(bx - 16 * sc, yy + h - 22 * sc, 32 * sc, 16 * sc);
    cx.fillStyle = 'rgba(130,255,245,.72)';
    cx.beginPath(); cx.arc(bx, yy + h - 23 * sc, 5 * sc, 0, TWO_PI); cx.fill();
    cx.strokeStyle = 'rgba(130,255,245,.35)';
    cx.beginPath(); cx.moveTo(bx, yy + h - 28 * sc); cx.lineTo(bx, yy - 8 * sc); cx.stroke();
    // Open arches show this is a portal chamber, not a screen.
    cx.strokeStyle = 'rgba(180,255,245,.45)';
    [-0.24, 0.24].forEach(function(k) {
      var ax = bx + w * k;
      cx.beginPath();
      cx.moveTo(ax - 8 * sc, yy + h * 0.72);
      cx.lineTo(ax - 8 * sc, yy + h * 0.40);
      cx.quadraticCurveTo(ax, yy + h * 0.24, ax + 8 * sc, yy + h * 0.40);
      cx.lineTo(ax + 8 * sc, yy + h * 0.72);
      cx.stroke();
    });
  }

  cx.restore();

  // Face frame.
  cx.strokeStyle = 'rgba(210,155,255,.46)';
  cx.beginPath(); drawFinal4FloorPath(cx, x, yy, w, h, sc, floorNum); cx.stroke();
}

function drawFinal4FloorPath(cx, x, yy, w, h, sc, floorNum) {
  if (floorNum === 1) {
    cx.moveTo(x, yy + h);
    cx.lineTo(x, yy + 13 * sc);
    cx.quadraticCurveTo(x + w * 0.5, yy - 8 * sc, x + w, yy + 13 * sc);
    cx.lineTo(x + w, yy + h);
    cx.closePath();
  } else if (floorNum === 2) {
    cx.moveTo(x - 4 * sc, yy + h);
    cx.lineTo(x, yy + 9 * sc);
    cx.lineTo(x + w * 0.18, yy);
    cx.lineTo(x + w * 0.82, yy);
    cx.lineTo(x + w, yy + 9 * sc);
    cx.lineTo(x + w + 4 * sc, yy + h);
    cx.closePath();
  } else if (floorNum === 3) {
    cx.moveTo(x + w * 0.08, yy + h);
    cx.lineTo(x, yy + h * 0.30);
    cx.lineTo(x + w * 0.17, yy);
    cx.lineTo(x + w * 0.83, yy);
    cx.lineTo(x + w, yy + h * 0.30);
    cx.lineTo(x + w * 0.92, yy + h);
    cx.closePath();
  } else {
    cx.moveTo(x + w * 0.10, yy + h);
    cx.lineTo(x, yy + h * 0.50);
    cx.lineTo(x + w * 0.5, yy - 10 * sc);
    cx.lineTo(x + w, yy + h * 0.50);
    cx.lineTo(x + w * 0.90, yy + h);
    cx.closePath();
  }
}

function drawFinal4LayerShell(cx, x, yy, w, h, depth, skew, sc, floorNum) {
  cx.save();
  // Rear side face.
  var sideG = cx.createLinearGradient(x + w, yy, x + w + depth, yy + h);
  sideG.addColorStop(0, floorNum === 2 ? '#230300' : '#100a18');
  sideG.addColorStop(1, '#030306');
  cx.fillStyle = sideG;
  cx.strokeStyle = 'rgba(0,0,0,.34)';
  cx.beginPath();
  cx.moveTo(x + w, yy + 10 * sc);
  cx.lineTo(x + w + depth, yy + 10 * sc - skew);
  cx.lineTo(x + w + depth, yy + h - skew);
  cx.lineTo(x + w, yy + h);
  cx.closePath(); cx.fill(); cx.stroke();

  // Upper cap creates a physical ledge.
  var capG = cx.createLinearGradient(0, yy - skew, 0, yy + 8 * sc);
  capG.addColorStop(0, floorNum === 3 ? '#cfffff' : '#362b49');
  capG.addColorStop(1, '#07060a');
  cx.fillStyle = capG;
  cx.beginPath();
  cx.moveTo(x, yy + 10 * sc);
  cx.lineTo(x + depth, yy + 10 * sc - skew);
  cx.lineTo(x + w + depth, yy + 10 * sc - skew);
  cx.lineTo(x + w, yy + 10 * sc);
  cx.closePath(); cx.fill();

  // Ledge slab and lower shadow.
  cx.fillStyle = floorNum === 2 ? '#270500' : '#09070d';
  cx.fillRect(x - 8 * sc, yy + h - 5 * sc, w + depth + 16 * sc, 7 * sc);
  cx.fillStyle = 'rgba(0,0,0,.35)';
  cx.fillRect(x - 7 * sc, yy + h + 2 * sc, w + depth + 13 * sc, 5 * sc);
  cx.restore();
}

function drawFinal4RecessedWindows(cx, x, yy, w, h, sc, count, glow) {
  for (var i = 0; i < count; i++) {
    var wx = x + w * (i + 1) / (count + 1);
    var ww = Math.max(5 * sc, w / (count + 3) * 0.42);
    var wh = h * 0.34;
    var wy = yy + h * 0.36;
    cx.fillStyle = 'rgba(0,0,0,.42)';
    cx.fillRect(wx - ww / 2 - 2 * sc, wy - 2 * sc, ww + 4 * sc, wh + 4 * sc);
    cx.fillStyle = glow;
    cx.fillRect(wx - ww / 2, wy, ww, wh);
    cx.strokeStyle = 'rgba(255,255,255,.14)';
    cx.strokeRect(wx - ww / 2, wy, ww, wh);
  }
}

function drawFinal4Balconies(cx, bx, x, yy, w, h, sc, floorNum, t) {
  cx.save();
  if (floorNum === 1) {
    // Manor porch and side wings.
    cx.fillStyle = '#07050b';
    cx.strokeStyle = 'rgba(210,190,255,.25)';
    cx.fillRect(x - 20 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.strokeRect(x - 20 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.fillRect(x + w - 2 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.strokeRect(x + w - 2 * sc, yy + h * 0.48, 22 * sc, h * 0.42);
    cx.fillStyle = 'rgba(0,0,0,.5)';
    cx.fillRect(x - 13 * sc, yy + h - 8 * sc, w + 26 * sc, 8 * sc);
    // Oversized estate balconies and pillars.
    [-1, 1].forEach(function(side) {
      var px = side < 0 ? x - 42 * sc : x + w + 42 * sc;
      cx.fillStyle = '#09060d';
      cx.fillRect(px - 13 * sc, yy + h * 0.40, 26 * sc, h * 0.48);
      cx.strokeStyle = 'rgba(210,190,255,.28)';
      cx.strokeRect(px - 13 * sc, yy + h * 0.40, 26 * sc, h * 0.48);
      for (var p = 0; p < 3; p++) {
        cx.fillStyle = '#17101d';
        cx.fillRect(px - 10 * sc + p * 8 * sc, yy + h * 0.44, 3 * sc, h * 0.38);
      }
      cx.fillStyle = '#050306';
      cx.beginPath();
      cx.moveTo(px - 18 * sc, yy + h * 0.40);
      cx.lineTo(px, yy + h * 0.24);
      cx.lineTo(px + 18 * sc, yy + h * 0.40);
      cx.closePath(); cx.fill(); cx.stroke();
    });
  } else if (floorNum === 2) {
    // Horned hell balconies.
    cx.fillStyle = '#190000';
    cx.strokeStyle = 'rgba(255,90,25,.50)';
    [-1, 1].forEach(function(side) {
      cx.beginPath();
      cx.moveTo(side < 0 ? x : x + w, yy + h * 0.52);
      cx.lineTo(side < 0 ? x - 30 * sc : x + w + 30 * sc, yy + h * 0.60);
      cx.lineTo(side < 0 ? x - 18 * sc : x + w + 18 * sc, yy + h * 0.78);
      cx.lineTo(side < 0 ? x : x + w, yy + h * 0.74);
      cx.closePath(); cx.fill(); cx.stroke();
      cx.fillStyle = 'rgba(255,85,15,.82)';
      cx.beginPath();
      cx.moveTo(side < 0 ? x - 16 * sc : x + w + 16 * sc, yy + h * 0.58);
      cx.lineTo(side < 0 ? x - 27 * sc : x + w + 27 * sc, yy + h * 0.40);
      cx.lineTo(side < 0 ? x - 8 * sc : x + w + 8 * sc, yy + h * 0.54);
      cx.closePath(); cx.fill();
      cx.fillStyle = '#190000';
    });
    // Burning side towers.
    [-1, 1].forEach(function(side) {
      var tx = side < 0 ? x - 50 * sc : x + w + 50 * sc;
      cx.fillStyle = '#120000';
      cx.strokeStyle = 'rgba(255,90,25,.46)';
      cx.fillRect(tx - 9 * sc, yy + h * 0.18, 18 * sc, h * 0.66);
      cx.strokeRect(tx - 9 * sc, yy + h * 0.18, 18 * sc, h * 0.66);
      cx.fillStyle = 'rgba(255,90,20,.82)';
      cx.beginPath();
      cx.moveTo(tx - 8 * sc, yy + h * 0.18);
      cx.quadraticCurveTo(tx, yy - (10 + Math.sin(t * 0.004) * 6) * sc, tx + 8 * sc, yy + h * 0.18);
      cx.closePath(); cx.fill();
    });
  } else if (floorNum === 3) {
    // Floating AI light outriggers.
    [-1, 1].forEach(function(side) {
      var ox = side < 0 ? x - 25 * sc : x + w + 25 * sc;
      var oy = yy + h * 0.45 + Math.sin(t * 0.002 + side) * 2 * sc;
      cx.strokeStyle = 'rgba(210,255,255,.42)';
      cx.beginPath(); cx.moveTo(side < 0 ? x + 3 * sc : x + w - 3 * sc, yy + h * 0.45); cx.lineTo(ox, oy); cx.stroke();
      cx.fillStyle = 'rgba(210,255,255,.82)';
      cx.beginPath(); cx.rect(ox - 7 * sc, oy - 7 * sc, 14 * sc, 14 * sc); cx.fill();
      cx.strokeStyle = 'rgba(80,255,255,.85)'; cx.strokeRect(ox - 7 * sc, oy - 7 * sc, 14 * sc, 14 * sc);
    });
    // Wide luminous ring deck.
    cx.strokeStyle = 'rgba(210,255,255,.45)';
    cx.lineWidth = Math.max(1, sc);
    cx.beginPath();
    cx.ellipse(bx, yy + h * 0.58, w * 0.82, h * 0.20, 0, 0, TWO_PI);
    cx.stroke();
    cx.strokeStyle = 'rgba(120,255,255,.24)';
    cx.beginPath();
    cx.ellipse(bx, yy + h * 0.58, w * 1.03, h * 0.28, 0, 0, TWO_PI);
    cx.stroke();
  } else {
    // Small open roof deck around the projector.
    cx.fillStyle = 'rgba(5,4,12,.92)';
    cx.strokeStyle = 'rgba(140,255,245,.55)';
    cx.fillRect(x - 10 * sc, yy + h - 10 * sc, w + 20 * sc, 10 * sc);
    cx.strokeRect(x - 10 * sc, yy + h - 10 * sc, w + 20 * sc, 10 * sc);
    // Portal machinery arms reaching out from the roof.
    [-1, 1].forEach(function(side) {
      cx.strokeStyle = 'rgba(150,255,245,.52)';
      cx.lineWidth = Math.max(1, 2 * sc);
      cx.beginPath();
      cx.moveTo(bx + side * w * 0.24, yy + h - 10 * sc);
      cx.lineTo(bx + side * w * 0.72, yy + h * 0.36);
      cx.stroke();
      cx.fillStyle = 'rgba(160,255,245,.76)';
      cx.beginPath(); cx.arc(bx + side * w * 0.72, yy + h * 0.36, 5 * sc, 0, TWO_PI); cx.fill();
    });
  }
  cx.restore();
}

// ── Player (exterior) ─────────────────────────────────────────────────────
function drawSlimeversePlayer(p) {
  var z = p.z || 0, sc = svScaleAt(z);
  if (sc < 0.04) return; // sub-pixel at extreme depth — skip
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
  var fSz = Math.max(8, Math.round(11 * sc));
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
  var msg = 'PRESS  E  TO  ENTER  SHOP';
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  cx.save(); cx.font = 'bold ' + Math.round(13 * s) + 'px Courier New';
  var tw = cx.measureText(msg).width + 24 * s;
  cx.fillStyle = 'rgba(0,0,20,.72)'; cx.strokeStyle = 'rgba(180,100,255,.65)'; cx.lineWidth = Math.max(1, s);
  cx.fillRect(px - tw / 2, py - 18 * s, tw, 24 * s); cx.strokeRect(px - tw / 2, py - 18 * s, tw, 24 * s);
  cx.fillStyle = '#cc88ff'; cx.textAlign = 'center'; cx.fillText(msg, px, py);
  cx.textAlign = 'left'; cx.restore();
}

function getSlimeversePlayerLevel() {
  if (currentAccount && currentAccount.progression && currentAccount.progression.level) {
    return currentAccount.progression.level || 1;
  }
  if (currentAccount && currentAccount.stats && window.SlimeProgression) {
    return window.SlimeProgression.getProgression(currentAccount.stats.xp || 0).level || 1;
  }
  return 1;
}

function drawFinal4GatePrompt() {
  var cx = ctx, px = viewWidth / 2, py = viewHeight * SV_FLOOR_FRAC - 54;
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  var level = getSlimeversePlayerLevel();
  var ready = level >= 70;
  var msg = ready
    ? 'PRESS  E  TO  ENTER  THE  FINAL 4'
    : 'FIRST PRESTIGE REQUIRED  //  LEVEL 70';
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
  var level = getSlimeversePlayerLevel();
  if (level < 70) {
    svFinal4Msg = 'YOU ARE LEVEL ' + level + ' / 70';
    svFinal4MsgTimer = Date.now();
    return;
  }
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
  var _sc = currentAccount ? (currentAccount.coins || 1) : (totalWins || 0);
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
  ctx.save();
  ctx.font = 'bold ' + Math.round(14 * s) + 'px Courier New';
  ctx.fillStyle = 'rgba(0,0,16,.62)'; ctx.strokeStyle = 'rgba(0,255,200,.2)';
  ctx.lineWidth = Math.max(1, s);
  ctx.fillRect(10 * s, 10 * s, 520 * s, 48 * s); ctx.strokeRect(10 * s, 10 * s, 520 * s, 48 * s);
  ctx.fillStyle = '#00ffcc'; ctx.fillText('SLIMEVERSE // GLASS DOME', 20 * s, 31 * s);
  ctx.fillStyle = '#555'; ctx.font = Math.round(11 * s) + 'px Courier New';
  ctx.fillText('A/D move  -  W/SPC jump  -  UP/DN depth  -  E interact  -  ESC exit', 20 * s, 50 * s);
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
