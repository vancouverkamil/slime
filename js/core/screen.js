// Core: screen ownership and scene lifetimes.
// One scene owns the game canvas at a time: the menu, a local match, an online
// match, the replay, a tournament screen, or the Slimeverse. Claiming the screen
// disposes the previous scene first: its intervals, timeouts and listeners are
// cancelled and its onExit cleanup runs. So two modes can never run at once, and
// nothing a finished scene scheduled (a replay's "press any key" handler, a
// waiting-room loop...) can fire into the next one.
var screenOwner = null;

function createScene(name, release) {
  var timers = [], listeners = [], exits = [];
  var scene = {
    name: name,
    disposed: false,
    isCurrent: function() { return !scene.disposed && screenOwner === scene; },
    interval: function(fn, ms) {
      var id = setInterval(function() { if (!scene.disposed) fn(); }, ms);
      timers.push(id);
      return id;
    },
    timeout: function(fn, ms) {
      var id = setTimeout(function() { if (!scene.disposed) fn(); }, ms);
      timers.push(id);
      return id;
    },
    listen: function(target, type, fn) {
      target.addEventListener(type, fn);
      listeners.push([target, type, fn]);
    },
    onExit: function(fn) { exits.push(fn); },
    dispose: function() {
      if (scene.disposed) return;
      scene.disposed = true;
      timers.forEach(function(id) { clearInterval(id); clearTimeout(id); });
      listeners.forEach(function(l) { l[0].removeEventListener(l[1], l[2]); });
      exits.forEach(function(fn) {
        try { fn(); } catch (err) { console.error('[screen] exit cleanup failed for', name, err); }
      });
      // release() stops the owner's own loops/sockets only; it must not navigate or
      // touch shared page chrome, because the new owner is already setting that up.
      if (release) release();
    },
  };
  return scene;
}

// Returns the new scene, so the caller can register what it owns on it.
function claimScreen(name, release) {
  var prev = screenOwner;
  screenOwner = createScene(name, release);
  if (prev) prev.dispose();
  return screenOwner;
}

// End the named scene (if it still owns the screen) without starting another.
function releaseScreen(name) {
  if (!screenOwner || screenOwner.name !== name) return;
  var scene = screenOwner;
  screenOwner = null;
  scene.dispose();
}

function currentScreenOwner() {
  return screenOwner ? screenOwner.name : null;
}

// Every local (on-device) match starts through here.
function startLocalGameLoop() {
  var scene = claimScreen('local-match');
  if (gameIntervalObject) clearInterval(gameIntervalObject);
  gameIntervalObject = scene.interval(gameIteration, 20);
  scene.onExit(function() {
    if (gameIntervalObject) { clearInterval(gameIntervalObject); gameIntervalObject = null; }
  });
}
