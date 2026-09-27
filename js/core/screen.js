// ── Screen ownership ──────────────────────────────────────
// One mode owns the game canvas at a time: the menu, a local match, an online
// match, a tournament screen, or the Slimeverse. Claiming the screen stops the
// previous owner first, so two modes (e.g. the Slimeverse and a tournament
// match) can never run their loops, input or sockets at the same time.
var screenOwner = null;

// release() stops the owner's own loops/sockets only; it must not navigate or
// touch shared page chrome, because the new owner is already setting that up.
function claimScreen(name, release) {
  var prev = screenOwner;
  screenOwner = { name: name, release: release || null };
  if (prev && prev.name !== name && prev.release) prev.release();
}

function releaseScreen(name) {
  if (screenOwner && screenOwner.name === name) screenOwner = null;
}

function currentScreenOwner() {
  return screenOwner ? screenOwner.name : null;
}

// Every local (on-device) match starts through here.
function startLocalGameLoop() {
  claimScreen('local-match');
  if (gameIntervalObject) clearInterval(gameIntervalObject);
  gameIntervalObject = setInterval(gameIteration, 20);
}
