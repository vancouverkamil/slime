// Multiverse Physics — client-side prediction for the Slimeverse.
// Mirrors the volleyball game's instant-response physics pattern so movement
// feels identical: no lerp build-up, direct velocity, same gravity curve.

var MV_MOVE_VX  = 7;     // horizontal speed  (volleyball uses 8; slightly lower for open world)
var MV_MOVE_VZ  = 5;     // depth speed
var MV_JUMP_VY  = -22;   // initial jump velocity  (upward = negative; gravity adds each tick)
var MV_GRAVITY  = 1.35;  // gravity per tick  (matches server tickSlimeverse)

// Local predicted player state — updated every RAF frame before rendering.
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

// Gentle correction toward the authoritative server position.
// X: suppressed while the player is actively pressing left/right so client
// prediction dominates during movement (avoids mid-run snap). Hard-snap only
// for genuine teleports (400+ units = spawn / respawn, never normal drift).
function mvReconcile(local, server, alpha) {
  var movingX = !!(keysDown[KEY_A] || keysDown[KEY_LEFT] || keysDown[KEY_D] || keysDown[KEY_RIGHT]);
  if (!movingX) local.x += (server.x - local.x) * alpha;
  if (Math.abs(local.x - server.x) > 400) local.x = server.x;
  local.y += (server.y - local.y) * alpha;
  local.z += (server.z - local.z) * alpha;
  if (Math.abs(local.z - server.z) > 70) local.z = server.z;
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
