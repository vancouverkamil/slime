// Slimeverse: the render/physics loop. Physics steps at a fixed 16 ms (same as
// the server); the town is drawn every animation frame.
function renderSlimeverse(ts) {
  if (!slimeverseActive) return;
  // Safety net: if another mode took the screen without claiming it, stop the world.
  if (currentScreenOwner() !== 'slimeverse') { stopSlimeverse(); return; }
  requestAnimationFrame(renderSlimeverse);
  if (!slimeTown) return;

  slimeverseFrame++;
  svRenderTime = ts;
  if (mvLastTime === 0) mvLastTime = ts;
  var dt = ts - mvLastTime;
  mvLastTime = ts;
  if (dt > 80) dt = 80; // no spiral of death after a long pause
  mvAccum += dt;

  // Standing still while the shop panel is open.
  var inp = svShopOpen ? { left: false, right: false, up: false, down: false, jump: false } : mvGetInput();
  var ready = !!slimeverseSelfId;
  while (mvAccum >= 16) {
    if (ready) { mvApplyInput(mvLocal, inp); mvStep(mvLocal, slimeverseWorld, slimeTown.move); }
    mvAccum -= 16;
  }
  if (ready) checkSlimeverseDoors(mvLocal.x, mvLocal.z, inp);
  if (!slimeverseActive) return;   // the FINAL 4 door just left the Slimeverse
  var me = mvRenderState(mvLocal, mvAccum);
  var self = slimeversePlayers[slimeverseSelfId] || {};

  var others = [];
  Object.keys(slimeversePlayers).forEach(function(id) {
    if (id === slimeverseSelfId) return;
    var v = smoothSlimeverseRemotePlayer(slimeversePlayers[id]);
    others.push({ id: id, x: v.x, y: v.z, hop: mvServerHop(v.y), p: v });
  });

  slimeTown.frame(ctx, viewWidth, viewHeight, dt / 1000,
    { x: me.x, y: me.z, hop: me.y, p: Object.assign({}, self, slimeverseOwnLook()) }, others);

  others.forEach(function(o) { drawSlimeverseNameTag(o.p, o.x, o.y, o.hop, false); });
  if (ready) drawSlimeverseNameTag(Object.assign({}, self, { name: self.name || myPlayerName }), me.x, me.z, me.y, true);
  if (ready) drawSlimeverseDoorHint(me.x, me.z);
  drawSlimeverseHud(me.x);
}

// Your own look comes from your settings right away, not after a server round trip.
function slimeverseOwnLook() {
  return { color: playerBodyColor, hat: playerHat, hatAnim: playerHatAnim, hatDrawing: playerHatDrawing };
}

// Other players: ease toward each new snapshot so 60 Hz drawing hides the network steps.
function smoothSlimeverseRemotePlayer(player) {
  var visual = slimeverseVisualPlayers[player.id];
  if (!visual) return (slimeverseVisualPlayers[player.id] = Object.assign({}, player));
  var x = Number(visual.x) || 0, y = Number(visual.y) || 0, z = Number(visual.z) || 0;
  Object.assign(visual, player);
  visual.x = x + ((Number(player.x) || 0) - x) * 0.28;
  visual.y = y + ((Number(player.y) || 0) - y) * 0.34;
  visual.z = z + ((Number(player.z) || 0) - z) * 0.28;
  return visual;
}
