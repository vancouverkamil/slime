var _drawing = false, _currentStroke = [], _drawingCanvas = null;

// Hat coordinate: x in [0,1] → [-1.25*r, 1.25*r]; y in [0,1] where 1=slime top, 0=topmost.
// DRAW_W/GUIDE_Y are the baseline canvas dimensions used for brush-size scaling only.
// Normalization uses actual canvas display dimensions so any canvas size works.
var DRAW_W   = 140;
var GUIDE_Y  = 140;
var SLIME_REF = 24;

// Drawing tool state
var _drawColor   = '#ffffff';
var _drawBrush   = 'pen';    // 'pen' | 'marker' | 'eraser'
var _drawSize    = 4;        // brush size in px at DRAW_W baseline
var _drawColorIdx = 0;
var _drawColors  = ['#ffffff','#ffff00','#ff4444','#44ff88','#44aaff','#ff44ff','#ff8800','#aaaaaa'];
var _undoStack   = [];       // popped strokes for redo

// Options panel navigation
var _activeOptSection = 'color';

// Color picker state
var _cpHue = 120, _cpSat = 1.0, _cpVal = 1.0;
var _cpSVDown = false, _cpHSDown = false;

function hsvToHex(h, s, v) {
  var i = Math.floor(h / 60) % 6, f = h/60 - Math.floor(h/60);
  var p = v*(1-s), q = v*(1-f*s), t = v*(1-(1-f)*s);
  var rgb = [[v,t,p],[q,v,p],[p,v,t],[p,q,v],[t,p,v],[v,p,q]][i];
  return '#' + rgb.map(function(x){ return ('0'+Math.round(x*255).toString(16)).slice(-2); }).join('');
}
function hexToHsv(hex) {
  hex = (hex||'#00ff00').replace(/^#/,'');
  if (hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r=parseInt(hex.slice(0,2),16)/255, g=parseInt(hex.slice(2,4),16)/255, b=parseInt(hex.slice(4,6),16)/255;
  var max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  var h=0, s=max?d/max:0, v=max;
  if (d) { if(max===r) h=((g-b)/d+6)%6*60; else if(max===g) h=((b-r)/d+2)*60; else h=((r-g)/d+4)*60; }
  return {h:h,s:s,v:v};
}
function drawSVSquare() {
  var cv = document.getElementById('ColorSVCanvas'); if (!cv) return;
  var c = cv.getContext('2d'), w = cv.width, h = cv.height;
  var hg = c.createLinearGradient(0,0,w,0);
  hg.addColorStop(0,'#ffffff'); hg.addColorStop(1, hsvToHex(_cpHue,1,1));
  c.fillStyle = hg; c.fillRect(0,0,w,h);
  var vg = c.createLinearGradient(0,0,0,h);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,1)');
  c.fillStyle = vg; c.fillRect(0,0,w,h);
  var cx2 = _cpSat*w, cy2 = (1-_cpVal)*h;
  c.strokeStyle = _cpVal > 0.4 ? '#000' : '#fff'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(cx2,cy2,5,0,Math.PI*2); c.stroke();
  c.strokeStyle = _cpVal > 0.4 ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.6)'; c.lineWidth = 1;
  c.beginPath(); c.arc(cx2,cy2,7,0,Math.PI*2); c.stroke();
}
function drawHueStrip() {
  var cv = document.getElementById('ColorHueStrip'); if (!cv) return;
  var c = cv.getContext('2d'), w = cv.width, h = cv.height;
  var g = c.createLinearGradient(0,0,w,0);
  for (var i=0;i<=360;i+=30) g.addColorStop(i/360, hsvToHex(i,1,1));
  c.fillStyle = g; c.fillRect(0,0,w,h);
  var x = (_cpHue/360)*w;
  c.strokeStyle = '#fff'; c.lineWidth = 2;
  c.strokeRect(x-2, 0, 4, h);
}
function _cpUpdate() {
  playerBodyColor = hsvToHex(_cpHue,_cpSat,_cpVal);
  localStorage.setItem('slimeBodyColor', playerBodyColor);
  var pb = document.getElementById('ColorPreviewBox'); if (pb) pb.style.background = playerBodyColor;
  var hi = document.getElementById('ColorHexInput'); if (hi) hi.value = playerBodyColor;
  updateSlimePreview(); sendCustomization();
}
function applyColorHex(hex) {
  hex = hex.trim(); if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  var hsv = hexToHsv(hex); _cpHue=hsv.h; _cpSat=hsv.s; _cpVal=hsv.v;
  drawSVSquare(); drawHueStrip(); _cpUpdate();
}
function setBodyColorHex(hex) {
  var hsv = hexToHsv(hex); _cpHue=hsv.h; _cpSat=hsv.s; _cpVal=hsv.v;
  drawSVSquare(); drawHueStrip(); _cpUpdate();
}
function initColorPicker() {
  var sv = document.getElementById('ColorSVCanvas');
  var hs = document.getElementById('ColorHueStrip');
  if (!sv || sv._cpInit) return;
  sv._cpInit = true;
  var hsv = hexToHsv(playerBodyColor||'#00ff00');
  _cpHue=hsv.h; _cpSat=hsv.s; _cpVal=hsv.v;
  drawSVSquare(); drawHueStrip();
  var pb = document.getElementById('ColorPreviewBox'); if (pb) pb.style.background = playerBodyColor||'#00ff00';
  var hi = document.getElementById('ColorHexInput'); if (hi) hi.value = playerBodyColor||'#00ff00';
  function pickSV(e) {
    var rect=sv.getBoundingClientRect();
    var ex=e.touches?e.touches[0].clientX:e.clientX, ey=e.touches?e.touches[0].clientY:e.clientY;
    _cpSat=Math.max(0,Math.min(1,(ex-rect.left)/rect.width));
    _cpVal=Math.max(0,Math.min(1,1-(ey-rect.top)/rect.height));
    drawSVSquare(); drawHueStrip(); _cpUpdate();
  }
  function pickHS(e) {
    var rect=hs.getBoundingClientRect();
    var ex=e.touches?e.touches[0].clientX:e.clientX;
    _cpHue=Math.max(0,Math.min(360,((ex-rect.left)/rect.width)*360));
    drawSVSquare(); drawHueStrip(); _cpUpdate();
  }
  sv.addEventListener('mousedown',function(e){_cpSVDown=true;pickSV(e);});
  sv.addEventListener('touchstart',function(e){_cpSVDown=true;pickSV(e);e.preventDefault();},{passive:false});
  sv.addEventListener('touchmove',function(e){if(_cpSVDown)pickSV(e);e.preventDefault();},{passive:false});
  sv.addEventListener('touchend',function(){_cpSVDown=false;});
  hs.addEventListener('mousedown',function(e){_cpHSDown=true;pickHS(e);});
  hs.addEventListener('touchstart',function(e){_cpHSDown=true;pickHS(e);e.preventDefault();},{passive:false});
  hs.addEventListener('touchmove',function(e){if(_cpHSDown)pickHS(e);e.preventDefault();},{passive:false});
  hs.addEventListener('touchend',function(){_cpHSDown=false;});
  document.addEventListener('mousemove',function(e){if(_cpSVDown)pickSV(e);else if(_cpHSDown)pickHS(e);});
  document.addEventListener('mouseup',function(){_cpSVDown=false;_cpHSDown=false;});
}

function normalizeDrawPt(e, dc) {
  var rect = dc.getBoundingClientRect();
  var ex = e.touches ? e.touches[0].clientX : e.clientX;
  var ey = e.touches ? e.touches[0].clientY : e.clientY;
  var guideH = rect.height * GUIDE_Y / (GUIDE_Y + SLIME_REF);
  return {
    x: Math.max(0, Math.min(1, (ex - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (ey - rect.top)  / guideH))
  };
}

function _renderStrokeOnCanvas(dctx, stroke, rw, guideYpx) {
  var pts = stroke.pts !== undefined ? stroke.pts : stroke;
  if (!pts || pts.length < 2) return;
  var color = stroke.color || '#ffffff';
  var sz = stroke.size || 2;
  var brush = stroke.brush || 'pen';
  dctx.save();
  dctx.lineWidth = sz * (rw / DRAW_W);
  dctx.lineCap = 'round'; dctx.lineJoin = 'round';
  dctx.globalAlpha = (brush === 'marker') ? 0.5 : 1.0;
  dctx.strokeStyle = (brush === 'eraser') ? '#040012' : color;
  dctx.beginPath();
  dctx.moveTo(pts[0].x * rw, pts[0].y * guideYpx);
  for (var i=1; i<pts.length; i++) dctx.lineTo(pts[i].x * rw, pts[i].y * guideYpx);
  dctx.stroke();
  dctx.restore();
}

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
