function redrawHatCanvas(dc, drawCtx) {
  if (!dc) dc = document.getElementById('HatDrawCanvas');
  if (!dc) return;
  var dctx = drawCtx || (dc._ctx = dc._ctx || dc.getContext('2d'));
  var rw = dc.width, rh = dc.height;
  var guideYpx = rh * GUIDE_Y / (GUIDE_Y + SLIME_REF);
  var gridStep = Math.round(rw / 12);

  dctx.clearRect(0, 0, rw, rh);
  dctx.fillStyle = '#040012'; dctx.fillRect(0, 0, rw, rh);

  // grid
  dctx.strokeStyle = 'rgba(0,255,200,0.06)'; dctx.lineWidth = 0.5;
  for (var gx=0; gx<=rw; gx+=gridStep) { dctx.beginPath(); dctx.moveTo(gx,0); dctx.lineTo(gx,guideYpx); dctx.stroke(); }
  for (var gy=0; gy<=guideYpx; gy+=gridStep) { dctx.beginPath(); dctx.moveTo(0,gy); dctx.lineTo(rw,gy); dctx.stroke(); }

  // center line
  dctx.strokeStyle = 'rgba(0,255,200,0.12)'; dctx.lineWidth = 0.5;
  dctx.beginPath(); dctx.moveTo(rw/2,0); dctx.lineTo(rw/2,guideYpx); dctx.stroke();

  // guide line
  dctx.strokeStyle = 'rgba(0,255,200,0.45)'; dctx.lineWidth = 1.5; dctx.setLineDash([5,3]);
  dctx.beginPath(); dctx.moveTo(0,guideYpx); dctx.lineTo(rw,guideYpx); dctx.stroke();
  dctx.setLineDash([]);

  // slime silhouette
  var slimeCy = rh - 1, slimeR = (rh - guideYpx) * 1.15;
  if (slimeR > 2) {
    dctx.fillStyle = 'rgba(0,200,100,0.18)';
    dctx.beginPath(); dctx.arc(rw/2, slimeCy, slimeR, Math.PI, 0); dctx.fill();
    dctx.strokeStyle = 'rgba(0,255,150,0.25)'; dctx.lineWidth = 1;
    dctx.beginPath(); dctx.arc(rw/2, slimeCy, slimeR, Math.PI, 0); dctx.stroke();
  }

  // stored strokes
  playerHatDrawing.forEach(function(stroke) { _renderStrokeOnCanvas(dctx, stroke, rw, guideYpx); });

  // current stroke (in progress)
  if (_drawing && _drawingCanvas === dc && _currentStroke.length > 1) {
    _renderStrokeOnCanvas(dctx, {pts:_currentStroke, color:_drawColor, size:_drawSize, brush:_drawBrush}, rw, guideYpx);
  }
}

function initHatDrawCanvas(dc) {
  if (!dc) dc = document.getElementById('HatDrawCanvas');
  if (!dc || dc._init) return;
  dc._init = true;
  dc._ctx = dc.getContext('2d');
  redrawHatCanvas(dc, dc._ctx);

  function start(e) {
    _drawing=true; _drawingCanvas=dc;
    _currentStroke=[normalizeDrawPt(e,dc)]; e.preventDefault();
  }
  function move(e) {
    if (!_drawing || _drawingCanvas !== dc) return;
    _currentStroke.push(normalizeDrawPt(e,dc));
    redrawHatCanvas(dc, dc._ctx); e.preventDefault();
  }
  function end(e) {
    if (!_drawing || _drawingCanvas !== dc) return;
    _drawing=false; _drawingCanvas=null;
    if (_currentStroke.length > 1) {
      playerHatDrawing.push({pts:_currentStroke.slice(), color:_drawColor, size:_drawSize, brush:_drawBrush});
      _undoStack = []; // new stroke invalidates redo history
      saveHatDrawing(); updateUndoRedoUI();
    }
    _currentStroke=[];
    redrawHatCanvas(dc, dc._ctx); updateSlimePreview();
  }
  dc.addEventListener('mousedown',start); dc.addEventListener('mousemove',move);
  dc.addEventListener('mouseup',end); dc.addEventListener('mouseleave',end);
  dc.addEventListener('touchstart',start,{passive:false}); dc.addEventListener('touchmove',move,{passive:false});
  dc.addEventListener('touchend',end);
}

function saveHatDrawing() {
  try { localStorage.setItem('slimeHatDrawing', JSON.stringify(playerHatDrawing)); } catch(e) {}
  sendCustomization();
}

function savedHatPayload(name) {
  return {
    name: name,
    hatAnim: playerHatAnim,
    drawBrush: _drawBrush,
    drawSize: _drawSize,
    drawColor: _drawColor,
    drawing: JSON.parse(JSON.stringify(playerHatDrawing || [])),
  };
}

function saveCurrentHatPreset() {
  if (!currentAccount) {
    accountMessage('Login to save hat drawings.', true);
    return;
  }
  if (!playerHatDrawing || playerHatDrawing.length === 0) {
    accountMessage('Draw something before saving.', true);
    return;
  }
  var saved = currentAccount.savedHatDrawings || [];
  if (saved.length >= 5) {
    accountMessage('You can save up to 5 hat drawings.', true);
    return;
  }
  var name = window.prompt('Save hat drawing as:', 'Hat ' + (saved.length + 1));
  if (name === null) return;
  accountRequest('/api/me/hat-drawings', {
    method: 'POST',
    body: JSON.stringify(savedHatPayload(name)),
  }).then(function(body) {
    currentAccount = body.user;
    renderSavedHatDrawings();
    accountMessage('Hat drawing saved.');
  }).catch(function(err) {
    accountMessage(err.message, true);
  });
}

function useHatPreset(id) {
  if (!currentAccount) return;
  var saved = currentAccount.savedHatDrawings || [];
  var preset = null;
  for (var i = 0; i < saved.length; i++) {
    if (saved[i].id === id) { preset = saved[i]; break; }
  }
  if (!preset) return;
  playerHat = 'custom';
  playerHatAnim = preset.hatAnim || 'none';
  playerHatDrawing = JSON.parse(JSON.stringify(preset.drawing || []));
  _drawBrush = preset.drawBrush || 'pen';
  _drawSize = preset.drawSize || 4;
  _drawColor = preset.drawColor || '#ffffff';
  _drawColorIdx = Math.max(0, _drawColors.indexOf(_drawColor));
  _undoStack = [];
  try {
    localStorage.setItem('slimeHat', playerHat);
    localStorage.setItem('slimeHatAnim', playerHatAnim);
    localStorage.setItem('slimeHatDrawing', JSON.stringify(playerHatDrawing));
  } catch(e) {}
  syncCustomizationUI();
  _refreshDrawCanvases();
  updateDrawToolUI();
  updateUndoRedoUI();
  updateSlimePreview();
  sendCustomization();
}

function deleteHatPreset(id) {
  if (!currentAccount) return;
  accountRequest('/api/me/hat-drawings/' + encodeURIComponent(id), {
    method: 'DELETE',
    body: '{}',
  }).then(function(body) {
    currentAccount = body.user;
    renderSavedHatDrawings();
    accountMessage('Hat drawing deleted.');
  }).catch(function(err) {
    accountMessage(err.message, true);
  });
}
