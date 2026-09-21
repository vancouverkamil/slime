// MapleStory M-style touch overlay: manual left/right + jump, mapped onto the
// same `keysDown` state the desktop keyboard path already drives (Input.js).
// Only ever drives player 1's keys (A/D/W), since online/CPU modes read
// keysDown[KEY_A] for "my slime" regardless of which physical device is used.
(function () {
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  if (!isTouchDevice()) return;

  var overlay;

  function setKey(code, isDown) {
    keysDown[code] = isDown;
  }

  function bind(el, code) {
    var active = false;
    function down(e) {
      e.preventDefault();
      if (active) return;
      active = true;
      setKey(code, true);
      el.classList.add('tc-active');
    }
    function up(e) {
      if (e) e.preventDefault();
      if (!active) return;
      active = false;
      setKey(code, false);
      el.classList.remove('tc-active');
    }
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
  }

  function makeButton(id, className, label) {
    var btn = document.createElement('div');
    if (id) btn.id = id;
    btn.className = 'tc-btn ' + className;
    btn.textContent = label;
    return btn;
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'TouchControls';

    var pad = document.createElement('div');
    pad.id = 'TouchMovePad';
    var leftBtn = makeButton(null, 'tc-left', '◀');
    var rightBtn = makeButton(null, 'tc-right', '▶');
    pad.appendChild(leftBtn);
    pad.appendChild(rightBtn);

    var jumpBtn = makeButton('TouchJumpBtn', 'tc-jump', 'JUMP');

    overlay.appendChild(pad);
    overlay.appendChild(jumpBtn);
    document.body.appendChild(overlay);

    bind(leftBtn, KEY_A);
    bind(rightBtn, KEY_D);
    bind(jumpBtn, KEY_W);
  }

  function gameIsActive() {
    // bootstrap.js toggles the shared `canvas` global's display between the
    // lobby menu and every canvas-rendered mode (local/online/tournament/
    // replay/slimeverse); it's the one signal all of those modes share.
    return !!(window.canvas && window.canvas.style.display === 'block');
  }

  function isPortrait() {
    return !!(window.matchMedia && window.matchMedia('(orientation: portrait)').matches);
  }

  function buildRotateOverlay() {
    var el = document.createElement('div');
    el.id = 'RotateDeviceOverlay';
    el.innerHTML =
      '<div class="rotate-icon">↻</div>' +
      '<div class="rotate-text">ROTATE YOUR DEVICE<br>PLAY IN LANDSCAPE</div>';
    document.body.appendChild(el);
    return el;
  }

  var wasActive = false;
  var rotateOverlay;
  function syncVisibility() {
    var active = gameIsActive();
    var blockedByPortrait = active && isPortrait();

    overlay.style.display = (active && !blockedByPortrait) ? 'flex' : 'none';
    rotateOverlay.style.display = blockedByPortrait ? 'flex' : 'none';
    if (blockedByPortrait) {
      setKey(KEY_A, false);
      setKey(KEY_D, false);
      setKey(KEY_W, false);
    }

    // On narrow/stacked mobile layouts the sidebar sits right below the
    // canvas in normal flow; free that space for the game + touch buttons.
    document.body.classList.toggle('tc-game-active', active);
    if (active && !wasActive) window.scrollTo(0, 0);
    wasActive = active;
  }

  function init() {
    buildOverlay();
    rotateOverlay = buildRotateOverlay();
    syncVisibility();
    setInterval(syncVisibility, 250);
    window.addEventListener('orientationchange', syncVisibility);
    window.addEventListener('resize', syncVisibility);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
