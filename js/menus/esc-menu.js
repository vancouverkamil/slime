// Menus: ESC pause menu and ending a match early.
function endMatchEarly() {
  clearInterval(gameIntervalObject); gameIntervalObject = null;
  gameState = GAME_STATE_MENU_PAUSE;
  final4Mode = false; final4WinPending = false; final4Index = 0; localMapId = null;
  toInitialMenu(); showBottomBar();
}

// ── esc pause menu ────────────────────────────────────────
var escMenuOpen = false;

function hideTopOverlay() {
  var inventory = document.getElementById('InventoryOverlay');
  if (inventory && inventory.style.display !== 'none' && inventory.style.display !== '') {
    hideInventory();
    return true;
  }
  var profile = document.getElementById('ProfileOverlay');
  if (profile && profile.style.display !== 'none' && profile.style.display !== '') {
    hideProfile();
    return true;
  }
  var fullscreen = document.getElementById('HatFullscreenOverlay');
  if (fullscreen && fullscreen.classList.contains('fs-open')) {
    closeHatFullscreen();
    return true;
  }
  var options = document.getElementById('OptionsDiv');
  if (options && options.style.display !== 'none') {
    hideOptions();
    return true;
  }
  return false;
}

function showEscMenu() {
  if (replayInterval) return;
  escMenuOpen = true;
  if (!onlineMode && !isSpectator) {
    if (gameState === GAME_STATE_RUNNING) gameState = GAME_STATE_MENU_PAUSE;
    else if (gameState === GAME_STATE_POINT_PAUSE) gameState = GAME_STATE_MENU_PAUSE_BETWEEN_POINTS;
  }
  var el = document.getElementById('EscMenu');
  if (!el) return;
  var inner;
  if (onlineMode || isSpectator) {
    inner = '<div class="esc-title">// PAUSED //</div>' +
      '<button class="eBtn" onclick="hideEscMenu()">&#9654;&nbsp; RESUME</button>' +
      '<button class="eBtn danger" onclick="hideEscMenu();leaveLobby();">&#8592;&nbsp; LEAVE MATCH</button>';
  } else {
    inner = '<div class="esc-title">// PAUSED //</div>' +
      '<button class="eBtn" onclick="hideEscMenu()">&#9654;&nbsp; RESUME</button>' +
      '<button class="eBtn" onclick="hideEscMenu();showOptions();">&#9881;&nbsp; OPTIONS</button>' +
      '<button class="eBtn danger" onclick="hideEscMenu();endMatchEarly();">&#8592;&nbsp; QUIT TO MENU</button>';
  }
  el.innerHTML = inner;
  el.style.display = 'flex';
}

function hideEscMenu() {
  escMenuOpen = false;
  var el = document.getElementById('EscMenu');
  if (el) el.style.display = 'none';
  if (!onlineMode && !isSpectator) {
    if (gameState === GAME_STATE_MENU_PAUSE) { updateCount = 0; gameState = GAME_STATE_RUNNING; }
    else if (gameState === GAME_STATE_MENU_PAUSE_BETWEEN_POINTS) startNextPoint();
  }
}
