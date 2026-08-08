// ── new preference state ──────────────────────────────────
var screenShakeEnabled = typeof localStorage === 'undefined' || localStorage.getItem('slime_screenShake') !== 'off';
var showPingEnabled    = typeof localStorage !== 'undefined' && localStorage.getItem('slime_showPing') === 'on';
var showFPSEnabled     = typeof localStorage !== 'undefined' && localStorage.getItem('slime_showFPS') === 'on';
var showRallyCounter   = typeof localStorage !== 'undefined' && localStorage.getItem('slime_rallyCounter') === 'on';
var pointFlashEnabled  = typeof localStorage === 'undefined' || localStorage.getItem('slime_pointFlash') !== 'off';

function setScreenShakePref(v) { screenShakeEnabled = v; try { localStorage.setItem('slime_screenShake', v ? 'on' : 'off'); } catch(e) {} }
function setShowPingPref(v)    { showPingEnabled    = v; try { localStorage.setItem('slime_showPing',    v ? 'on' : 'off'); } catch(e) {} }
function setShowFPSPref(v)     { showFPSEnabled     = v; try { localStorage.setItem('slime_showFPS',     v ? 'on' : 'off'); } catch(e) {} }
function setRallyCounterPref(v){ showRallyCounter   = v; try { localStorage.setItem('slime_rallyCounter',v ? 'on' : 'off'); } catch(e) {} }
function setPointFlashPref(v)  { pointFlashEnabled  = v; try { localStorage.setItem('slime_pointFlash',  v ? 'on' : 'off'); } catch(e) {} }
var _optSections = ['slime','hat','studio','audio','display','gameplay','controls'];
function showOptSection(sec) {
  _activeOptSection = sec;
  _optSections.forEach(function(s) {
    var content = document.getElementById('OptSection_' + s);
    var nav     = document.getElementById('OptNav_' + s);
    if (content) content.style.display = s === sec ? 'block' : 'none';
    if (nav)     nav.classList.toggle('opt-nav-active', s === sec);
  });
  if (sec === 'slime') initColorPicker();
  if (sec === 'studio') {
    var dc = document.getElementById('HatDrawCanvas');
    initHatDrawCanvas(dc);
    if (dc) redrawHatCanvas(dc, dc._ctx || dc.getContext('2d'));
    var snc = document.getElementById('StudioNotCustom');
    if (snc) snc.style.display = playerHat !== 'custom' ? 'block' : 'none';
    renderSavedHatDrawings();
    updateUndoRedoUI();
  }
  if (sec === 'display') {
    var sst = document.getElementById('ScreenShakeToggle'); if (sst) sst.checked = screenShakeEnabled;
    var spt = document.getElementById('ShowPingToggle');    if (spt) spt.checked = showPingEnabled;
    var sft = document.getElementById('ShowFPSToggle');     if (sft) sft.checked = showFPSEnabled;
  }
  if (sec === 'gameplay') {
    if (typeof syncProfanityToggles === 'function') syncProfanityToggles();
    var rct = document.getElementById('RallyCounterToggle'); if (rct) rct.checked = showRallyCounter;
    var ppt = document.getElementById('PointFlashToggle');   if (ppt) ppt.checked = pointFlashEnabled;
    var ov  = document.getElementById('OptVersion');         if (ov)  ov.textContent  = (typeof window !== 'undefined' && window.SLIME_VERSION) || '—';
    var osr = document.getElementById('OptServerRegion');    if (osr) osr.textContent = 'Railway';
    var opd = document.getElementById('OptPingDisplay');     if (opd) opd.textContent = (typeof lastPingMs !== 'undefined' && lastPingMs > 0) ? lastPingMs + ' ms' : '—';
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
  initColorPicker();

  // Color swatches — all 8
  var sc = document.getElementById('ColorSwatches');
  if (sc) {
    sc.innerHTML = '';
    BODY_COLORS.forEach(function(col) {
      var d = document.createElement('div');
      d.className = 'swatch' + (col === playerBodyColor ? ' active' : '');
      d.style.background = col; d.title = col;
      d.onclick = function() { setBodyColorHex(col); syncCustomizationUI(); };
      sc.appendChild(d);
    });
  }

  // Body overlay picker
  var bop = document.getElementById('BodyOverlayPicker');
  if (bop) {
    bop.innerHTML = '';
    BODY_OVERLAYS.forEach(function(o) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (o.id === playerBodyOverlay ? ' active' : '');
      b.textContent = o.label;
      b.onclick = function() {
        playerBodyOverlay = o.id;
        try { localStorage.setItem('slimeBodyOverlay', o.id); } catch(e) {}
        syncCustomizationUI(); updateSlimePreview();
      };
      bop.appendChild(b);
    });
  }

  // Free hats
  var hp = document.getElementById('HatPicker');
  if (hp) {
    hp.innerHTML = '';
    HAT_OPTIONS.filter(function(h) { return !h.shopPrice; }).forEach(function(h) {
      var b = document.createElement('button');
      var locked = h.minLevel && !hasHatUnlock(h.id);
      b.className = 'hat-opt' + (h.id === playerHat ? ' active' : '') + (locked ? ' locked' : '');
      b.textContent = locked ? h.label + '  L' + h.minLevel : h.label;
      if (locked) b.title = 'Reach level ' + h.minLevel + ' to unlock.';
      b.onclick = function() {
        if (locked) { accountMessage('Reach level ' + h.minLevel + ' to unlock.', true); return; }
        playerHat = h.id; try { localStorage.setItem('slimeHat', h.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      hp.appendChild(b);
    });
  }

  // Shop hats
  var shp = document.getElementById('ShopHatPicker');
  if (shp) {
    shp.innerHTML = '';
    HAT_OPTIONS.filter(function(h) { return h.shopPrice; }).forEach(function(h) {
      var owned = hasHatUnlock(h.id);
      var b = document.createElement('button');
      b.className = 'hat-opt' + (h.id === playerHat ? ' active' : '') + (!owned ? ' locked' : '');
      b.textContent = owned ? h.label : h.label + '  ' + h.shopPrice + ' SC';
      if (!owned) b.title = 'Buy in Slimeverse Hat Shop for ' + h.shopPrice + ' SC';
      b.onclick = function() {
        if (!owned) { accountMessage('Visit the Slimeverse Hat Shop to unlock ' + h.label + '.', true); return; }
        playerHat = h.id; try { localStorage.setItem('slimeHat', h.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      shp.appendChild(b);
    });
  }

  var snc = document.getElementById('StudioNotCustom');
  if (snc) snc.style.display = playerHat !== 'custom' ? 'block' : 'none';

  var as = document.getElementById('HatAnimSection');
  if (as) as.style.display = playerHat !== 'none' ? 'block' : 'none';
  var ap = document.getElementById('HatAnimPicker');
  if (ap) {
    ap.innerHTML = '';
    HAT_ANIM_OPTIONS.forEach(function(a) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (a.id === playerHatAnim ? ' active' : '');
      b.textContent = a.label;
      b.onclick = function() {
        playerHatAnim = a.id; try { localStorage.setItem('slimeHatAnim', a.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      ap.appendChild(b);
    });
  }

  // Trail picker
  var tp = document.getElementById('TrailPicker');
  if (tp) {
    tp.innerHTML = '';
    TRAIL_OPTIONS.forEach(function(o) {
      var b = document.createElement('button');
      b.className = 'hat-opt' + (o.id === playerTrail ? ' active' : '');
      b.textContent = o.label;
      b.onclick = function() {
        playerTrail = o.id;
        try { localStorage.setItem('slimeTrail', o.id); } catch(e) {}
        syncCustomizationUI(); sendCustomization();
      };
      tp.appendChild(b);
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

// ── web audio dubstep drops ───────────────────────────────
