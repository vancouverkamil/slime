// Customization: Hat Studio brushes, undo/redo, saved drawings, full-screen mode.
function renderSavedHatDrawings() {
  var wrap = document.getElementById('SavedHatDrawings');
  if (!wrap) return;
  if (!currentAccount) {
    wrap.innerHTML = '<div class="saved-hats-empty">Login to save up to 5 custom hats.</div>';
    return;
  }
  var saved = currentAccount.savedHatDrawings || [];
  var html = '<div class="saved-hats-title">Saved Custom Hats <span>' + saved.length + '/5</span></div>';
  html += saved.map(function(item, i) {
    return '<div class="saved-hat-row">' +
      '<div class="saved-hat-preview" data-saved-hat="' + escHtml(item.id) + '"></div>' +
      '<div class="saved-hat-meta"><b>' + escHtml(item.name || ('Hat ' + (i + 1))) + '</b><span>' +
        escHtml((item.hatAnim || 'none').toUpperCase()) + ' / ' + escHtml((item.drawBrush || 'pen').toUpperCase()) +
      '</span></div>' +
      '<button class="hat-opt" onclick="useHatPreset(\'' + escHtml(item.id) + '\')">USE</button>' +
      '<button class="hat-opt danger" onclick="deleteHatPreset(\'' + escHtml(item.id) + '\')">DEL</button>' +
      '</div>';
  }).join('');
  if (saved.length === 0) html += '<div class="saved-hats-empty">No saved custom hats yet.</div>';
  wrap.innerHTML = html;
  saved.forEach(function(item) {
    var el = wrap.querySelector('[data-saved-hat="' + item.id + '"]');
    if (!el) return;
    var c = document.createElement('canvas');
    c.width = 44; c.height = 34;
    var cx = c.getContext('2d');
    cx.fillStyle = '#040012'; cx.fillRect(0, 0, c.width, c.height);
    drawHatAt(cx, 22, 29, 13, { hat: 'custom', anim: 'none', drawing: item.drawing || [] });
    el.appendChild(c);
  });
}

function clearHatDrawing() {
  playerHatDrawing = []; _currentStroke = []; _undoStack = [];
  try { localStorage.removeItem('slimeHatDrawing'); } catch(e) {}
  _refreshDrawCanvases();
  updateSlimePreview(); sendCustomization(); updateUndoRedoUI();
}

function setDrawBrush(b) {
  _drawBrush = b; updateDrawToolUI();
}
function setDrawSize(s) {
  _drawSize = s; updateDrawToolUI();
}
function cycleDrawColor() {
  _drawColorIdx = (_drawColorIdx + 1) % _drawColors.length;
  _drawColor = _drawColors[_drawColorIdx];
  updateDrawToolUI();
}
function updateDrawToolUI() {
  var brushes = ['Pen','Marker','Eraser'];
  var brushKeys = ['pen','marker','eraser'];
  brushKeys.forEach(function(k, i) {
    var el  = document.getElementById('DrawBrush'  + brushes[i]);
    var el2 = document.getElementById('FSDrawBrush'+ brushes[i]);
    if (el)  el.classList.toggle('active',  _drawBrush === k);
    if (el2) el2.classList.toggle('active', _drawBrush === k);
  });
  var sizes = [['S',2],['M',5],['L',11],['XL',22]];
  sizes.forEach(function(p) {
    var el  = document.getElementById('DrawSize'  + p[0]);
    var el2 = document.getElementById('FSDrawSize'+ p[0]);
    if (el)  el.classList.toggle('active',  _drawSize === p[1]);
    if (el2) el2.classList.toggle('active', _drawSize === p[1]);
  });
  var dot  = document.getElementById('DrawColorDot');
  var dot2 = document.getElementById('FSDrawColorDot');
  if (dot)  dot.style.background  = _drawColor;
  if (dot2) dot2.style.background = _drawColor;
}

function openHatFullscreen() {
  var ov = document.getElementById('HatFullscreenOverlay');
  if (!ov) return;
  ov.classList.add('fs-open');
  var fc = document.getElementById('HatFullscreenCanvas');
  if (fc) { initHatDrawCanvas(fc); redrawHatCanvas(fc, fc._ctx || fc.getContext('2d')); }
  updateDrawToolUI();
}
function closeHatFullscreen() {
  var ov = document.getElementById('HatFullscreenOverlay');
  if (ov) ov.classList.remove('fs-open');
  var dc = document.getElementById('HatDrawCanvas');
  if (dc) redrawHatCanvas(dc, dc._ctx || dc.getContext('2d'));
  updateSlimePreview();
}

// ── options panel navigation ───────────────────────────────

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
