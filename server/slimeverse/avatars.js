// Slimeverse avatars: the identity and physics of a slime exploring the town
// (Money Radar's neo-zen pixel town, js/slimeverse/town/). An avatar is its own
// identity, separate from the lobby/match/tournament client on the main socket,
// so nothing done in the Slimeverse can touch a game.
// Units are town pixels: x across, z = feet row down the map, y = jump height.

const SLIMEVERSE_WORLD = { width: 1536, depth: 640 };
const SPAWN = { x: 728, z: 204 };   // the clear lane in front of the doors (tile row 12), by the town's default spawn
const MOVE = 1.6, JUMP_VY = 2.7, GRAVITY = 0.166, MAX_HOP = 40; // same as js/slimeverse/prediction.js

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function createAvatar({ user, profile, level, spawnIndex, guestName }) {
  const slime = profile && profile.slime ? profile.slime : {};
  return {
    id: 'sv-' + Math.random().toString(36).slice(2, 10),
    userId: user ? user.id : null,
    username: user ? user.username : null,
    name: user ? user.displayName : guestName,
    level: level || 1,
    hat: slime.hat || 'none',
    hatAnim: slime.hatAnim || 'none',
    color: slime.color || '#00ff00',
    hatDrawing: Array.isArray(slime.hatDrawing) ? slime.hatDrawing : [],
    x: SPAWN.x + ((spawnIndex % 8) - 4) * 14,   // side by side along the boulevard
    y: 0,
    z: SPAWN.z,
    vx: 0, vy: 0, vz: 0,
    left: false, right: false, jump: false, fwd: false, back: false,
    clientPoseAt: 0,
  };
}

function publicAvatar(av) {
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    id: av.id, name: av.name, username: av.username, level: av.level,
    hat: av.hat, hatAnim: av.hatAnim, color: av.color, hatDrawing: av.hatDrawing,
    x: r1(av.x), y: r1(av.y), z: r1(av.z),
    vx: r1(av.vx), vy: r1(av.vy), vz: r1(av.vz),
  };
}

// The client predicts its own movement (with the town's walls); it reports its
// pose and the server keeps it inside the town.
function applyInput(av, msg) {
  av.left = !!msg.left; av.right = !!msg.right;
  av.fwd = !!msg.fwd; av.back = !!msg.back;
  if (msg.jump) av.jump = true;
  const px = Number(msg.x), py = Number(msg.y), pz = Number(msg.z);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return;
  av.x = clamp(px, 0, SLIMEVERSE_WORLD.width);
  av.y = clamp(py, 0, MAX_HOP);
  av.z = clamp(pz, 0, SLIMEVERSE_WORLD.depth);
  if (Number.isFinite(Number(msg.vx))) av.vx = clamp(Number(msg.vx), -4, 4);
  if (Number.isFinite(Number(msg.vy))) av.vy = clamp(Number(msg.vy), -6, 6);
  if (Number.isFinite(Number(msg.vz))) av.vz = clamp(Number(msg.vz), -4, 4);
  av.jump = false;
  av.clientPoseAt = Date.now();
}

function applyAppearance(av, msg, canUseHat) {
  const hat = String(msg.hat || 'none').slice(0, 20);
  av.hat = canUseHat(hat) ? hat : 'none';
  av.hatAnim = String(msg.hatAnim || 'none').slice(0, 20);
  av.color = String(msg.color || '#00ff00').slice(0, 20);
  av.hatDrawing = Array.isArray(msg.hatDrawing) ? msg.hatDrawing.slice(0, 300) : [];
}

// Server-side step for avatars whose client has not reported a pose recently
// (no walls here: only the reporting client knows the town's collision).
function stepAvatar(av, now) {
  if (av.clientPoseAt && now - av.clientPoseAt < 120) return;
  av.vx = av.left && !av.right ? -MOVE : av.right && !av.left ? MOVE : 0;
  av.vz = av.fwd && !av.back ? -MOVE : av.back && !av.fwd ? MOVE : 0;
  if (av.jump && av.y <= 0) av.vy = JUMP_VY;
  av.jump = false;
  if (av.y > 0 || av.vy) {
    av.vy -= GRAVITY;
    av.y += av.vy;
    if (av.y <= 0) { av.y = 0; av.vy = 0; }
  }
  av.x = clamp(av.x + av.vx, 0, SLIMEVERSE_WORLD.width);
  av.z = clamp(av.z + av.vz, 0, SLIMEVERSE_WORLD.depth);
}

module.exports = {
  SLIMEVERSE_WORLD,
  createAvatar, publicAvatar, applyInput, applyAppearance, stepAvatar,
};
