function _drawHomeSlime(ctx, cv) {
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  var cx = W / 2, cy = H * 0.78;
  var rPix = Math.min(W * 0.28, H * 0.30);
  var t = Date.now();

  // Aura glow
  var aura = ctx.createRadialGradient(cx, cy - rPix * 0.3, 0, cx, cy - rPix * 0.3, rPix * 1.7);
  aura.addColorStop(0, playerBodyColor + '25');
  aura.addColorStop(0.6, playerBodyColor + '0a');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, W, H);

  // Orbit ring
  var rp = (t / 1800) % (Math.PI * 2);
  ctx.save();
  ctx.strokeStyle = playerBodyColor; ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.28 + 0.14 * Math.abs(Math.sin(rp));
  ctx.shadowColor = playerBodyColor; ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.ellipse(cx, cy - rPix * 0.18, rPix * 1.08, rPix * 0.22 * Math.abs(Math.sin(rp)) + 2, 0, 0, TWO_PI);
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.restore();

  // Slime body with glow
  ctx.save();
  ctx.shadowColor = playerBodyColor; ctx.shadowBlur = rPix * 0.52;
  ctx.fillStyle = playerBodyColor;
  ctx.beginPath(); ctx.arc(cx, cy, rPix, Math.PI, TWO_PI, false); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Body overlay
  drawBodyOverlay(ctx, cx, cy, rPix, playerBodyOverlay);

  // Glossy shine
  var shine = ctx.createRadialGradient(cx - rPix * 0.26, cy - rPix * 0.44, rPix * 0.04, cx - rPix * 0.26, cy - rPix * 0.44, rPix * 0.66);
  shine.addColorStop(0, 'rgba(255,255,255,0.30)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.save();
  ctx.fillStyle = shine;
  ctx.beginPath(); ctx.arc(cx, cy, rPix, Math.PI, TWO_PI, false); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Eye
  var eyeX = cx + rPix * 0.28, eyeY = cy - rPix * 0.44;
  ctx.save();
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 5;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(eyeX, eyeY, rPix * 0.24, 0, TWO_PI); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(eyeX + rPix * 0.07, eyeY + rPix * 0.02, rPix * 0.13, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(eyeX + rPix * 0.01, eyeY - rPix * 0.05, rPix * 0.044, 0, TWO_PI); ctx.fill();
  ctx.restore();

  // Hat
  drawHatAt(ctx, cx, cy - rPix, rPix, { hat: playerHat, anim: playerHatAnim, drawing: playerHatDrawing });

  // Floating particles
  for (var i = 0; i < 6; i++) {
    var pf = (t / 2200 / 1 + i / 6) % 1;
    var px = cx + Math.sin(i * 1.1 + t / 1100) * rPix * 0.78;
    var py = cy - pf * rPix * 2.1 - rPix * 0.38;
    var pa = Math.min(1, pf * 5) * Math.min(1, (1 - pf) * 5) * 0.55;
    var pr = 1.4 + 1.2 * Math.sin(pf * Math.PI);
    ctx.save();
    ctx.globalAlpha = pa;
    ctx.fillStyle = playerBodyColor; ctx.shadowColor = playerBodyColor; ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, TWO_PI); ctx.fill();
    ctx.restore();
  }

  // Ground shadow oval
  ctx.save();
  var gsh = ctx.createRadialGradient(cx, cy + 4, 0, cx, cy + 4, rPix * 0.88);
  gsh.addColorStop(0, 'rgba(0,0,0,0.28)'); gsh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gsh;
  ctx.beginPath(); ctx.ellipse(cx, cy + 5, rPix * 0.88, rPix * 0.13, 0, 0, TWO_PI); ctx.fill();
  ctx.restore();
}

var _lazyScriptPromises = {};
function loadLazyScript(src) {
  if (_lazyScriptPromises[src]) return _lazyScriptPromises[src];
  _lazyScriptPromises[src] = new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = window.slimeAssetUrl ? window.slimeAssetUrl(src) : src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error('Failed to load ' + src)); };
    document.head.appendChild(s);
  });
  return _lazyScriptPromises[src];
}

// Slimeverse is split into part files; every one must load, in order, before it starts.
var SLIMEVERSE_SCRIPTS = ['js/multiverse-physics.js', 'js/slimeverse.js'];
for (var _svp = 2; _svp <= 14; _svp++) SLIMEVERSE_SCRIPTS.push('js/slimeverse.part-' + _svp + '.js');
function ensureSlimeverseLoaded() {
  if (typeof startSlimeverse === 'function' && typeof startSlimeverseInput === 'function') return Promise.resolve();
  return SLIMEVERSE_SCRIPTS.reduce(function(chain, src) {
    return chain.then(function() { return loadLazyScript(src); });
  }, Promise.resolve());
}

function enterSlimeverseEye(btn) {
  if (btn && btn.classList) {
    btn.classList.remove('eyeActivated');
    void btn.offsetWidth;
    btn.classList.add('eyeActivated');
  }
  ensureSlimeverseLoaded()
    .then(function() { setTimeout(startSlimeverse, 620); })
    .catch(function() { addChatMessage(null, 'Could not load Slimeverse.'); });
}

function loadOptions() {
  legacyGraphics = document.getElementById('LegacyGraphics').checked;
  slowMotion     = false;
  physicsLog     = 0;
  var sfx = document.getElementById('GameSfx');
  var fx  = document.getElementById('ScreenFx');
  if (sfx) gameSfxEnabled = sfx.checked;
  if (fx)  screenFxEnabled = fx.checked;
}
function showOptions() {
  if (gameState === GAME_STATE_RUNNING)      gameState = GAME_STATE_MENU_PAUSE;
  else if (gameState === GAME_STATE_POINT_PAUSE) gameState = GAME_STATE_MENU_PAUSE_BETWEEN_POINTS;
  document.getElementById('OptionsDiv').style.display = 'block';
  showOptSection(_activeOptSection || 'slime');
  syncCustomizationUI();
  updateUndoRedoUI();
}
function hideOptions() {
  document.getElementById('OptionsDiv').style.display = 'none';
  if (gameState === GAME_STATE_MENU_PAUSE) { updateCount = 0; gameState = GAME_STATE_RUNNING; }
  else if (gameState === GAME_STATE_MENU_PAUSE_BETWEEN_POINTS) startNextPoint();
  loadOptions();
}

// ── Game scale / fullscreen ────────────────────────────────
var MIN_VIEW_W = 720, MIN_VIEW_H = 420;

function setGameScale(s) {
  gameScale = s;
  try { localStorage.setItem('slime_scale', s); } catch(e){}
  syncScaleButtons();
  applyGameScale();
}
function syncScaleButtons() {
  var fb = document.getElementById('ScaleFull');
  var cb = document.getElementById('ScaleCompact');
  if (fb) fb.classList.toggle('active', gameScale === 'full');
  if (cb) cb.classList.toggle('active', gameScale === 'compact');
}
function calculateOverlayBounds(width, height) {
  var margin = Math.max(14, Math.min(28, Math.floor(Math.min(width, height) * 0.04)));
  var overlayWidth = Math.max(0, Math.min(1280, width - margin * 2));
  var overlayHeight = Math.max(0, Math.min(900, height - margin * 2));
  return {
    width: overlayWidth,
    height: overlayHeight,
    left: Math.max(0, Math.round((width - overlayWidth) / 2)),
    top: Math.max(0, Math.round((height - overlayHeight) / 2)),
  };
}
