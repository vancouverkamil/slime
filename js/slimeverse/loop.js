// Slimeverse: the render/physics loop (exterior and shop interior).
function renderSlimeverse(ts) {
  if (!slimeverseActive) return;
  // Safety net: if another mode took the screen without claiming it, stop the world.
  if (currentScreenOwner() !== 'slimeverse') { stopSlimeverse(); return; }

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

    handleStoreShelfKey();

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
  // Refresh velocity before render extrapolation so releasing or changing
  // direction between fixed ticks does not draw a tiny overshoot then snap back.
  mvApplyInput(mvLocal, inp);
  var mvRender = mvRenderState(mvLocal, mvAccum, slimeverseWorld);

  // Camera tracks local predicted position without easing, so stopping movement
  // does not make the avatar drift backward while the camera catches up.
  var svVisibleWorldW = viewWidth / SV_WORLD_ZOOM;
  slimeverseCamera.x = mvRender.x - svVisibleWorldW / 2;
  slimeverseCamera.x = Math.max(0, Math.min(slimeverseWorld.width - svVisibleWorldW, slimeverseCamera.x));

  drawSlimeverseWorld();

  // Draw all players — use predicted local state for self
  Object.keys(slimeversePlayers)
    .map(function(id) { return slimeversePlayers[id]; })
    .sort(function(a, b) { return (b.z || 0) - (a.z || 0); })
    .forEach(function(p) {
      if (p.id === slimeverseSelfId) {
        drawSlimeversePlayer(Object.assign({}, p, { x: mvRender.x, y: mvRender.y, z: mvRender.z }));
      } else {
        drawSlimeversePlayer(smoothSlimeverseRemotePlayer(p));
      }
    });

  // Store proximity prompt
  var dx = Math.abs(mvLocal.x - SV_STORE_X);
  var dz = Math.abs(mvLocal.z - SV_STORE_Z);
  if (dz < 90 * SV_LANDMARK_SCALE && dx < 240 * SV_LANDMARK_SCALE) {
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
  if (f4dz < 125 * SV_LANDMARK_SCALE && f4dx < 190 * SV_LANDMARK_SCALE) {
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
function smoothSlimeverseRemotePlayer(player) {
  var visual = slimeverseVisualPlayers[player.id];
  if (!visual) {
    visual = slimeverseVisualPlayers[player.id] = Object.assign({}, player);
    return visual;
  }
  var x = Number(visual.x) || 0;
  var y = Number(visual.y);
  var z = Number(visual.z) || 0;
  if (!Number.isFinite(y)) y = slimeverseWorld.floorY;
  Object.assign(visual, player);
  visual.x = x + ((Number(player.x) || 0) - x) * 0.28;
  visual.y = y + ((Number(player.y) || slimeverseWorld.floorY) - y) * 0.34;
  visual.z = z + ((Number(player.z) || 0) - z) * 0.28;
  return visual;
}
