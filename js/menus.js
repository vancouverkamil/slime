function spaceKeyDown() {
  if (onlineMode || isSpectator || showingLobbySelect) return;
  if (gameState === GAME_STATE_SHOW_WINNER) {
    if (tournamentMode) { tournamentContinueAfterMatch(); return; }
    if (final4WinPending) { final4WinPending = false; toInitialMenu(); return; }
    if (final4Mode) { startFinal4Round(); return; }
    if (onePlayer && nextSlimeIndex >= slimeAIs.length) {
      nextSlimeIndex = 0; toInitialMenu();
    } else {
      start(onePlayer);
    }
  }
}

// ── local game start ──────────────────────────────────────
function start(startAsOnePlayer) {
  currentRoomId = null; localMapId = null;
  tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  final4Mode = false; final4WinPending = false;
  onePlayer = startAsOnePlayer;
  slimeLeftScore = 0; slimeRightScore = 0;
  localRallyCount = 0; localLastBallSide = null; localPointFlash = null; particles = [];
  shakeFrames = 0; shakeAmt = 0;
  slimeLeft.img = greenSlimeImage;
  slimeLeft.color = playerBodyColor;
  slimeLeft.tintColor = playerBodyColor;
  if (onePlayer) {
    var p = slimeAIs[nextSlimeIndex];
    slimeRight.color = p.color; legacySkyColor = p.legacySkyColor;
    backImage = backImages[p.backImageName]; backTextColor = p.backTextColor;
    legacyGroundColor = p.legacyGroundColor; legacyBallColor = p.legacyBallColor;
    newGroundColor = p.newGroundColor; slimeRight.img = null;
    slimeAI = newSlimeAI(false, p.name); p.initAI(slimeAI);
  } else {
    legacySkyColor = '#00f'; backImage = backImages['sky'];
    backTextColor = '#000'; legacyGroundColor = '#888';
    legacyBallColor = '#fff'; newGroundColor = '#ca6';
    slimeRight.img = redSlimeImage; slimeAI = null;
  }
  initRound(true); updatesToPaint = 0; updateCount = 0;
  loadOptions(); gameState = GAME_STATE_RUNNING;
  renderBackground();
  canvas.style.display = 'block'; menuDiv.style.display = 'none'; hideBottomBar();
  gameIntervalObject = setInterval(gameIteration, 20);
}

function toInitialMenu() {
  onlineMode = false; isSpectator = false; showingLobbySelect = false;
  currentRoomId = null; localMapId = null;
  final4Mode = false; final4WinPending = false;
  tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  hideSpecBadge(); showLeaveBtn(false); particles = [];
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div class="home-screen">' +
    '<div class="home-grid"></div>' +
    '<div class="home-title">SLIME</div>' +
    '<div class="home-subtitle">VOLLEYBALL</div>' +
    (sessionWins + sessionLosses > 0
      ? '<div class="home-session">' +
        'SESSION: <span style="color:#66ffcc;">' + sessionWins + 'W</span> / ' +
        '<span style="color:#ff66aa;">' + sessionLosses + 'L</span></div>'
      : '') +
    '<div class="home-emotes">' +
    'Use keys 1-4 during game for emotes</div>' +
    '<div class="home-hint">Quick Play to start</div>' +
    '</div>';
  showBottomBar();
}

function enterSlimeverseEye(btn) {
  if (btn && btn.classList) {
    btn.classList.remove('eyeActivated');
    void btn.offsetWidth;
    btn.classList.add('eyeActivated');
  }
  setTimeout(startSlimeverse, 620);
}

function loadOptions() {
  legacyGraphics = document.getElementById('LegacyGraphics').checked;
  slowMotion     = document.getElementById('SlowMotion').checked;
  physicsLog     = document.getElementById('PhysicsLog').checked ? 120 : 0;
  var sfx = document.getElementById('GameSfx');
  var fx  = document.getElementById('ScreenFx');
  if (sfx) gameSfxEnabled = sfx.checked;
  if (fx)  screenFxEnabled = fx.checked;
}
function showOptions() {
  if (gameState === GAME_STATE_RUNNING)      gameState = GAME_STATE_MENU_PAUSE;
  else if (gameState === GAME_STATE_POINT_PAUSE) gameState = GAME_STATE_MENU_PAUSE_BETWEEN_POINTS;
  document.getElementById('OptionsDiv').style.display = 'block';
  showOptSection(_activeOptSection || 'color');
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
function applyGameScale() {
  var wrapper = document.getElementById('LobbyWrapper');
  var mr      = document.getElementById('MiddleRow');
  var cd      = document.getElementById('ContentDiv');
  var optDiv  = document.getElementById('OptionsDiv');
  if (!wrapper || !mr || !cd) return;

  wrapper.style.width = '100vw';
  wrapper.style.height = window.innerWidth <= 960 ? 'auto' : '100vh';
  wrapper.style.minHeight = '100vh';
  wrapper.style.maxWidth = 'none';
  mr.style.height = '';
  cd.style.width = '';
  cd.style.height = '';

  var sidebar = document.getElementById('Sidebar');
  if (sidebar) sidebar.style.display = gameScale === 'full' ? 'none' : '';

  var nw = Math.max(1, Math.round(cd.clientWidth || cd.offsetWidth || MIN_VIEW_W));
  var nh = Math.max(1, Math.round(cd.clientHeight || cd.offsetHeight || MIN_VIEW_H));

  if (canvas && (canvas.width !== nw || canvas.height !== nh)) {
    canvas.width = nw;
    canvas.height = nh;
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

// ── The Final 4 ───────────────────────────────────────────
function startFinal4() {
  tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  final4Mode = true; final4WinPending = false; final4Index = 0;
  startFinal4Round();
}
function startFinal4Round() {
  var boss = final4AIs[final4Index];
  currentRoomId = null;
  localMapId          = boss.mapId;
  newGroundColor      = boss.newGroundColor;
  backTextColor       = boss.backTextColor;
  onePlayer           = true;
  slimeLeftScore      = 0; slimeRightScore = 0;
  localRallyCount = 0; localLastBallSide = null; localPointFlash = null; particles = [];
  shakeFrames = 0; shakeAmt = 0;
  slimeLeft.img       = greenSlimeImage;
  slimeLeft.color     = playerBodyColor;
  slimeLeft.tintColor = playerBodyColor;
  slimeRight.color    = boss.color;
  slimeRight.img      = null;
  slimeRight.tintColor = null;
  legacySkyColor      = '#000'; legacyGroundColor = '#111'; legacyBallColor = '#fff';
  slimeAI             = newSlimeAI(false, boss.name);
  setMentalSlime(slimeAI, boss.level);
  initRound(true); updatesToPaint = 0; updateCount = 0;
  loadOptions(); gameState = GAME_STATE_RUNNING;
  renderBackground();
  canvas.style.display = 'block'; menuDiv.style.display = 'none'; hideBottomBar();
  if (gameIntervalObject) clearInterval(gameIntervalObject);
  gameIntervalObject = setInterval(gameIteration, 20);
}

