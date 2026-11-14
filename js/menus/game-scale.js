// Menus: game size / fullscreen scaling.
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

function applyGameScale() {
  var wrapper = document.getElementById('LobbyWrapper');
  var mr      = document.getElementById('MiddleRow');
  var cd      = document.getElementById('ContentDiv');
  var gc      = document.getElementById('GameContentDiv');
  var optDiv  = document.getElementById('OptionsDiv');
  if (!wrapper || !mr || !cd || !gc) return;

  wrapper.style.width = '100vw';
  wrapper.style.height = window.innerWidth <= 960 ? 'auto' : '100vh';
  wrapper.style.minHeight = '100vh';
  wrapper.style.maxWidth = 'none';
  mr.style.height = '';
  cd.style.width = '';
  cd.style.height = '';

  var sidebar = document.getElementById('Sidebar');
  if (sidebar) sidebar.style.display = gameScale === 'full' ? 'none' : '';

  var availableW = Math.max(1, Math.round(cd.clientWidth || cd.offsetWidth || MIN_VIEW_W));
  var availableH = Math.max(1, Math.round(cd.clientHeight || cd.offsetHeight || MIN_VIEW_H));
  var minAspect = 16 / 9;
  // While a match is on screen, keep the court's shape the same whether or not
  // the bottom bar is showing: shape the stage for the height it would have
  // without the bar, then scale it down to fit. (Court height scales with the
  // canvas, so a shorter canvas would squash slimes, jumps and the ball.)
  var bar = document.getElementById('BottomBar');
  var matchOnScreen = canvas && canvas.style.display === 'block';
  var barH = matchOnScreen && bar && bar.style.display !== 'none' ? bar.offsetHeight : 0;
  var aspect = Math.max(minAspect, availableW / (availableH + barH));
  var stageW = Math.min(availableW, Math.round(availableH * aspect));
  var stageH = Math.round(stageW / aspect);
  stageW = Math.max(320, stageW);
  stageH = Math.max(180, stageH);
  var nw = stageW;
  var nh = stageH;
  gc.style.width = stageW + 'px';
  gc.style.height = stageH + 'px';
  gc.style.left = Math.max(0, Math.round((availableW - stageW) / 2)) + 'px';
  gc.style.top = Math.max(0, Math.round((availableH - stageH) / 2)) + 'px';

  if (canvas && (canvas.width !== nw || canvas.height !== nh)) {
    canvas.width = nw;
    canvas.height = nh;
    if (typeof clearMapBackgroundCache === 'function') clearMapBackgroundCache();
  }
  updateWindowSize(nw, nh);
  if (menuDiv) {
    menuDiv.style.width = '100%';
    menuDiv.style.height = '100%';
  }
  if (optDiv) {
    var bounds = calculateOverlayBounds(nw, nh);
    optDiv.style.width = bounds.width + 'px';
    optDiv.style.height = bounds.height + 'px';
    optDiv.style.left = bounds.left + 'px';
    optDiv.style.top = bounds.top + 'px';
  }
}
function _onWindowResize() { applyGameScale(); }
