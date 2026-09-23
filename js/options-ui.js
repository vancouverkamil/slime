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
  if (sec === 'controls') renderKeybindControls();
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
