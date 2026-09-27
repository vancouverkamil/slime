// Slimeverse avatars: the identity and physics of a slime wandering the open world.
// An avatar is its own identity, separate from the lobby/match/tournament client
// on the main socket, so nothing done in the Slimeverse can touch a game.

const SLIMEVERSE_WORLD = { width: 4500, height: 2250, floorY: 1980, maxZ: 3000 };
const STORE_WORLD_W = 2700;
const STORE_SPAWN_X = 1050;

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
    x: 500 + (spawnIndex % 8) * 85,
    y: SLIMEVERSE_WORLD.floorY,
    z: 200,
    vx: 0, vy: 0, vz: 0,
    left: false, right: false, jump: false, fwd: false, back: false,
    inStore: false,
    storeX: STORE_SPAWN_X,
    clientPoseAt: 0,
  };
}

function publicAvatar(av) {
  return {
    id: av.id, name: av.name, username: av.username, level: av.level,
    hat: av.hat, hatAnim: av.hatAnim, color: av.color, hatDrawing: av.hatDrawing,
    x: Math.round(av.x), y: Math.round(av.y), z: Math.round(av.z),
    vx: Math.round(av.vx * 10) / 10, vy: Math.round(av.vy * 10) / 10, vz: Math.round(av.vz * 10) / 10,
    inStore: av.inStore, storeX: av.storeX,
  };
}

// The client predicts its own movement; it reports its pose and the server keeps it in bounds.
function applyInput(av, msg) {
  av.left = !!msg.left; av.right = !!msg.right;
  av.fwd = !!msg.fwd; av.back = !!msg.back;
  if (msg.jump) av.jump = true;
  const px = Number(msg.x), py = Number(msg.y), pz = Number(msg.z);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return;
  av.x = clamp(px, 70, SLIMEVERSE_WORLD.width - 70);
  av.y = clamp(py, 0, SLIMEVERSE_WORLD.floorY);
  av.z = clamp(pz, 0, SLIMEVERSE_WORLD.maxZ);
  if (Number.isFinite(Number(msg.vx))) av.vx = clamp(Number(msg.vx), -12, 12);
  if (Number.isFinite(Number(msg.vy))) av.vy = clamp(Number(msg.vy), -30, 30);
  if (Number.isFinite(Number(msg.vz))) av.vz = clamp(Number(msg.vz), -14, 14);
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

function moveInStore(av, storeX) {
  if (av.inStore) av.storeX = clamp(Number(storeX) || STORE_SPAWN_X, 80, STORE_WORLD_W - 80);
}

// Server-side step for avatars whose client has not reported a pose recently.
function stepAvatar(av, now) {
  if (av.inStore) return;
  if (av.clientPoseAt && now - av.clientPoseAt < 120) return;
  const floorY = SLIMEVERSE_WORLD.floorY;
  av.vx = av.left && !av.right ? -7 : av.right && !av.left ? 7 : 0;
  av.vz = av.fwd && !av.back ? -8 : av.back && !av.fwd ? 8 : 0;
  if (av.jump && av.y >= floorY) av.vy = -22;
  av.jump = false;
  av.vy = Math.min(26, av.vy + 1.35);
  av.x = clamp(av.x + av.vx, 70, SLIMEVERSE_WORLD.width - 70);
  av.y += av.vy;
  av.z = clamp(av.z + av.vz, 0, SLIMEVERSE_WORLD.maxZ);
  if (av.y > floorY) { av.y = floorY; av.vy = 0; }
}

module.exports = {
  SLIMEVERSE_WORLD, STORE_SPAWN_X,
  createAvatar, publicAvatar, applyInput, applyAppearance, moveInStore, stepAvatar,
};
