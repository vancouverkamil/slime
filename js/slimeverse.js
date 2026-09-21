// ── State ─────────────────────────────────────────────────────────────────
var slimeverseActive    = false;
var slimeversePlayers   = {};
var slimeverseVisualPlayers = {};
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
var SV_COLISEUM_X       = 620;
var SV_COLISEUM_Z       = 115;
var svStoreKeyDebounce  = 0;
var svStoreMsg          = '';
var svStoreMsgTimer     = 0;
var svFinal4Msg         = '';
var svFinal4MsgTimer    = 0;
var svLeaderboard       = [];
var svLeaderboardLoaded = 0;

// Store interior
var svStoreInside       = false;
var svStorePlayerX      = 1050;
var svStorePlayerVx     = 0;
var svStoreCamera       = { x: 0 };
var svStoreTransition   = 0;   // 1→0 fade-in on enter
var SV_STORE_WORLD_W    = 2700;

// Perspective display
var SV_FLOOR_FRAC  = 0.88;
var SV_HORIZ_FRAC  = 0.39;
var SV_FAR_SCALE   = 0.10;   // keep distant players readable while the local avatar feels closer
var SV_PLAYER_SCALE = 1.42;
var SV_WORLD_ZOOM   = 1.34;   // narrow the exterior viewport so the commons feels character-scale
var SV_LANDMARK_SCALE = 2.0;  // oversized social landmarks should dominate the commons skyline

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

var SV_LANTERNS = [
  { x: 230, z: 150 }, { x: 410, z: 120 }, { x: 830, z: 120 }, { x: 1010, z: 150 },
  { x: 1450, z: 95 }, { x: 1620, z: 80 }, { x: 1980, z: 80 }, { x: 2150, z: 95 },
  { x: 2860, z: 125 }, { x: 3020, z: 105 }, { x: 3380, z: 105 }, { x: 3540, z: 125 },
];

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
  var worldVp = viewWidth / SV_WORLD_ZOOM / 2;
  return vp + (worldX - slimeverseCamera.x - worldVp) * (1 - t * 0.88) * SV_WORLD_ZOOM;
}
function svSY(worldY, z) {
  var jumpH = Math.max(0, (slimeverseWorld.floorY || 1980) - (worldY || slimeverseWorld.floorY));
  return svGroundY(z) - jumpH * svScaleAt(z) * 0.45;
}

function refreshSlimeverseLeaderboard() {
  if (Date.now() - svLeaderboardLoaded < 30000) return;
  svLeaderboardLoaded = Date.now();
  accountRequest('/api/leaderboard', { method: 'GET', headers: {} })
    .then(function(body) { svLeaderboard = (body.players || []).slice(0, 10); })
    .catch(function() {});
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
  refreshSlimeverseLeaderboard();
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
  slimeverseVisualPlayers = {};
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'leave_slimeverse' }));
  showLeaveBtn(false);
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  toInitialMenu();
}
