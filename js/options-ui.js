var _optSections = ['color','hat','studio','audio','display'];
function showOptSection(sec) {
  _activeOptSection = sec;
  _optSections.forEach(function(s) {
    var content = document.getElementById('OptSection_' + s);
    var nav     = document.getElementById('OptNav_' + s);
    if (content) content.style.display = s === sec ? 'block' : 'none';
    if (nav)     nav.classList.toggle('opt-nav-active', s === sec);
  });
  if (sec === 'color') {
    initColorPicker();
  }
  if (sec === 'studio') {
    var dc = document.getElementById('HatDrawCanvas');
    initHatDrawCanvas(dc);
    if (dc) redrawHatCanvas(dc, dc._ctx || dc.getContext('2d'));
    var snc = document.getElementById('StudioNotCustom');
    if (snc) snc.style.display = playerHat !== 'custom' ? 'block' : 'none';
    renderSavedHatDrawings();
    updateUndoRedoUI();
  }
}

// ── undo / redo ────────────────────────────────────────────
function hatUndo() {
  if (playerHatDrawing.length === 0) return;
  _undoStack.push(playerHatDrawing.pop());
  _refreshDrawCanvases();
  saveHatDrawing(); updateSlimePreview(); updateUndoRedoUI();
}
function hatRedo() {
  if (_undoStack.length === 0) return;
  playerHatDrawing.push(_undoStack.pop());
  _refreshDrawCanvases();
  saveHatDrawing(); updateSlimePreview(); updateUndoRedoUI();
}
function _refreshDrawCanvases() {
  var dc = document.getElementById('HatDrawCanvas');
  if (dc) redrawHatCanvas(dc, dc._ctx || dc.getContext('2d'));
  var fc = document.getElementById('HatFullscreenCanvas');
  if (fc && fc._init) redrawHatCanvas(fc, fc._ctx || fc.getContext('2d'));
}
function updateUndoRedoUI() {
  var canUndo = playerHatDrawing.length > 0;
  var canRedo = _undoStack.length > 0;
  ['DrawUndo','FSDrawUndo'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.opacity = canUndo ? '1' : '0.3';
    el.style.cursor  = canUndo ? 'pointer' : 'default';
  });
  ['DrawRedo','FSDrawRedo'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.opacity = canRedo ? '1' : '0.3';
    el.style.cursor  = canRedo ? 'pointer' : 'default';
  });
}

function syncCustomizationUI() {
  // Initialize HSV color picker (lazy — only if DOM is ready)
  initColorPicker();
  // Quick preset swatches (subset of BODY_COLORS)
  var sc = document.getElementById('ColorSwatches');
  if (sc) {
    sc.innerHTML = '';
    BODY_COLORS.slice(0,6).forEach(function(col) {
      var d = document.createElement('div');
      d.className = 'swatch' + (col === playerBodyColor ? ' active' : '');
      d.style.background = col;
      d.title = col;
      d.onclick = function() { setBodyColorHex(col); syncCustomizationUI(); };
      sc.appendChild(d);
    });
  }
  var hp = document.getElementById('HatPicker');
  if (hp) {
    hp.innerHTML = '';
    HAT_OPTIONS.forEach(function(h) {
      var b = document.createElement('button');
      var locked = h.minLevel && !hasHatUnlock(h.id);
      b.className = 'hat-opt' + (h.id === playerHat ? ' active' : '') + (locked ? ' locked' : '');
      b.textContent = locked ? h.label + ' L' + h.minLevel : h.label;
      if (locked) b.title = 'Reach level ' + h.minLevel + ' to unlock.';
      b.onclick = function() {
        if (locked) {
          accountMessage('Gold Crown unlocks at level ' + h.minLevel + '.', true);
          return;
        }
        playerHat = h.id; localStorage.setItem('slimeHat', h.id);
        syncCustomizationUI(); sendCustomization();
      };
      hp.appendChild(b);
    });
  }
  // Update Hat Studio "not custom" notice
  var snc = document.getElementById('StudioNotCustom');
  if (snc) snc.style.display = playerHat !== 'custom' ? 'block' : 'none';

  var as = document.getElementById('HatAnimSection');
  if (as) as.style.display = (playerHat !== 'none') ? 'block' : 'none';
  var ap = document.getElementById('HatAnimPicker');
  if (ap) {
    ap.innerHTML = '';
    HAT_ANIM_OPTIONS.forEach(function(a) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (a.id === playerHatAnim ? ' active' : '');
      b.textContent = a.label;
      b.onclick = function() {
        playerHatAnim = a.id; localStorage.setItem('slimeHatAnim', a.id);
        syncCustomizationUI(); sendCustomization();
      };
      ap.appendChild(b);
    });
  }

  if (playerHatAnim !== 'none' && playerHat !== 'none') startPreviewAnim();
  else stopPreviewAnim();
  renderSavedHatDrawings();
}

function startPreviewAnim() {
  if (previewAnimInterval) return;
  previewAnimInterval = setInterval(updateSlimePreview, 50);
}
function stopPreviewAnim() {
  if (previewAnimInterval) { clearInterval(previewAnimInterval); previewAnimInterval = null; }
  updateSlimePreview();
}

function endMatchEarly() {
  clearInterval(gameIntervalObject); gameIntervalObject = null;
  gameState = GAME_STATE_MENU_PAUSE;
  final4Mode = false; final4WinPending = false; final4Index = 0; localMapId = null;
  toInitialMenu(); showBottomBar();
}

// ── esc pause menu ────────────────────────────────────────
var escMenuOpen = false;

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

// ── web audio dubstep drops ───────────────────────────────
