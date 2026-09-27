// Multiverse Physics — client-side prediction for the Slimeverse.
// Mirrors the volleyball game's instant-response physics pattern so movement
// feels identical: no lerp build-up, direct velocity, same gravity curve.

var MV_MOVE_VX  = 7;     // horizontal speed  (volleyball uses 8; slightly lower for open world)
var MV_MOVE_VZ  = 8;     // depth speed (world is 3000 deep; 8 px/tick reaches far end in ~6 s)
var MV_JUMP_VY  = -22;   // initial jump velocity  (upward = negative; gravity adds each tick)
var MV_GRAVITY  = 1.35;  // gravity per tick  (matches server tickSlimeverse)

// Local predicted player state — stepped at a fixed 16ms rate (not every RAF frame).
var mvLocal = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onFloor: true };

// ── Core functions ─────────────────────────────────────────────────────────

// Apply input with instant velocity — exactly like applyInput() in physics.js.
// No acceleration curve; the feel is immediate, which is what makes volleyball snappy.
function mvApplyInput(s, input) {
  s.vx = (input.left && !input.right) ? -MV_MOVE_VX
       : (input.right && !input.left) ?  MV_MOVE_VX : 0;
  s.vz = (input.fwd  && !input.back)  ? -MV_MOVE_VZ
       : (input.back  && !input.fwd)  ?  MV_MOVE_VZ : 0;
  if (input.jump && s.onFloor) {
    s.vy = MV_JUMP_VY;
    s.onFloor = false;
  }
}

// Step physics — mirrors stepSlime() + gravity from physics.js.
function mvStep(s, world) {
  s.vy = Math.min(26, s.vy + MV_GRAVITY);
  s.x  = Math.max(70, Math.min((world.width  || 4500) - 70, s.x + s.vx));
  s.y += s.vy;
  s.z  = Math.max(0,  Math.min((world.maxZ   || 600),       s.z + s.vz));
  if (s.y >= (world.floorY || 1980)) {
    s.y = world.floorY || 1980;
    s.vy = 0;
    s.onFloor = true;
  }
}

function mvReconcile(local, server, alpha) {
  var dx = server.x - local.x;
  var dz = server.z - local.z;
  var dy = server.y - local.y;
  // Slimeverse is a social world, not an authoritative match. Small server
  // drift is expected from packet delay and should never tug the local avatar.
  // Only impossible spawn/teleport-scale differences are accepted.
  if (Math.abs(dx) > 1400 || Math.abs(dz) > 1000 || Math.abs(dy) > 900) {
    local.x = server.x;
    local.y = server.y;
    local.z = server.z;
    if ('vx' in local) local.vx = server.vx || 0;
    if ('vy' in local) local.vy = server.vy || 0;
    if ('vz' in local) local.vz = server.vz || 0;
    if ('onFloor' in local) local.onFloor = local.y >= 1980;
    return;
  }
}

function mvRenderState(local, remainderMs, world) {
  var portion = Math.max(0, Math.min(1, Number(remainderMs || 0) / 16));
  return {
    x: Math.max(70, Math.min((world.width || 4500) - 70, local.x + local.vx * portion)),
    y: Math.min(world.floorY || 1980, local.y + local.vy * portion),
    z: Math.max(0, Math.min(world.maxZ || 600, local.z + local.vz * portion)),
  };
}

// Hard-sync from a server player snapshot (used on join and respawn).
function mvSyncFromServer(local, server, world) {
  local.x = server.x || 0;
  local.y = server.y || (world ? world.floorY : 1980);
  local.z = server.z || 200;
  local.vx = server.vx || 0;
  local.vy = server.vy || 0;
  local.vz = server.vz || 0;
  local.onFloor = (local.y >= ((world && world.floorY) || 1980));
}

// Read current key state into an input snapshot.
function mvGetInput() {
  return {
    left:  !!(keysDown[KEY_A]     || keysDown[KEY_LEFT]),
    right: !!(keysDown[KEY_D]     || keysDown[KEY_RIGHT]),
    jump:  !!(keysDown[KEY_W]     || keysDown[KEY_SPACE]),
    fwd:   !!keysDown[KEY_DOWN],
    back:  !!keysDown[KEY_UP],
  };
}
