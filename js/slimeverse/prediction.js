// Slimeverse physics: your slime in the town, predicted on your own screen.
// The feel is the volleyball slime's: instant velocity, no acceleration curve,
// and the same jump shape (up and down in ~0.52 s), scaled to town pixels.
// Collision with walls, water and buildings comes from the town (move()).

var MV_MOVE      = 1.6;    // town px per 16 ms tick (~100 px/s, a bit quicker than a town walker)
var MV_JUMP_VY   = 2.7;    // initial hop speed (up = positive height)
var MV_GRAVITY   = 0.166;  // per tick: a ~22 px hop that lasts as long as a volleyball jump
var MV_DIAGONAL  = Math.SQRT1_2;

// Local predicted player state, stepped at a fixed 16 ms rate.
var mvLocal = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onFloor: true };

function mvApplyInput(s, input) {
  var ix = (input.left && !input.right) ? -1 : (input.right && !input.left) ? 1 : 0;
  var iz = (input.up && !input.down) ? -1 : (input.down && !input.up) ? 1 : 0;
  var k = ix && iz ? MV_DIAGONAL : 1;
  s.vx = ix * MV_MOVE * k;
  s.vz = iz * MV_MOVE * k;
  if (input.jump && s.onFloor) {
    s.vy = MV_JUMP_VY;
    s.onFloor = false;
  }
}

// move(x, z, dx, dz) -> {x, z} applies the town's collision; without it the slime
// only stays inside the map.
function mvStep(s, world, move) {
  if (s.vx || s.vz) {
    if (move) {
      var m = move(s.x, s.z, s.vx, s.vz);
      s.x = m.x; s.z = m.y;
    } else {
      s.x = Math.max(0, Math.min(world.width, s.x + s.vx));
      s.z = Math.max(0, Math.min(world.depth, s.z + s.vz));
    }
  }
  if (!s.onFloor || s.vy) {
    s.vy -= MV_GRAVITY;
    s.y += s.vy;
    if (s.y <= 0) { s.y = 0; s.vy = 0; s.onFloor = true; }
  }
}

// Social world, not a match: small server drift never tugs your slime.
// Only a teleport-sized difference (spawn, server correction) is accepted.
function mvReconcile(local, server) {
  if (Math.abs(server.x - local.x) > 400 || Math.abs(server.z - local.z) > 300) mvSyncFromServer(local, server);
}

// Where to draw between fixed steps (no overshoot past a wall: the step decides).
function mvRenderState(local, remainderMs) {
  var portion = Math.max(0, Math.min(1, Number(remainderMs || 0) / 16));
  var hop = local.onFloor ? 0 : Math.max(0, local.y + (local.vy - MV_GRAVITY) * portion);
  return { x: local.x, y: hop, z: local.z };
}

// Hop height from a server snapshot. A server still on the old street's units
// reports y = 1980 for "on the ground": anything above a real hop means grounded.
var MV_MAX_HOP = 40;
function mvServerHop(y) {
  var h = Number(y) || 0;
  return h > MV_MAX_HOP || h < 0 ? 0 : h;
}

function mvSyncFromServer(local, server) {
  local.x = Number(server.x) || 0;
  local.z = Number(server.z) || 0;
  local.y = mvServerHop(server.y);
  local.vx = 0; local.vz = 0; local.vy = 0;
  local.onFloor = local.y <= 0;
}

// Arrows or WASD walk the town; Space jumps.
function mvGetInput() {
  return {
    left:  !!(keysDown[KEY_A] || keysDown[KEY_LEFT]),
    right: !!(keysDown[KEY_D] || keysDown[KEY_RIGHT]),
    up:    !!(keysDown[KEY_W] || keysDown[KEY_UP]),
    down:  !!(keysDown[83]    || keysDown[KEY_DOWN]),
    jump:  !!keysDown[KEY_SPACE],
  };
}
