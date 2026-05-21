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
    '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;background:#05000f;overflow:hidden;">' +
    // grid lines
    '<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,255,200,.03) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(0,255,200,.03) 1px,transparent 1px);background-size:30px 30px;"></div>' +
    // title
    '<div style="position:relative;font-size:clamp(120px,20vh,230px);font-weight:bold;color:#00ffcc;letter-spacing:8px;' +
    'text-shadow:0 0 40px rgba(0,255,200,.8),0 0 80px rgba(0,255,200,.3);margin-bottom:clamp(2px,.8vh,12px);">SLIME</div>' +
    '<div style="position:relative;font-size:clamp(30px,5vh,58px);color:#ff00cc;letter-spacing:14px;text-transform:uppercase;' +
    'text-shadow:0 0 18px rgba(255,0,204,.6);margin-bottom:clamp(34px,6vh,70px);">VOLLEYBALL</div>' +
    // session stats
    (sessionWins + sessionLosses > 0
      ? '<div style="position:relative;font-size:clamp(24px,3vh,34px);color:#444;letter-spacing:2px;margin-bottom:14px;">' +
        'SESSION: <span style="color:#66ffcc;">' + sessionWins + 'W</span> / ' +
        '<span style="color:#ff66aa;">' + sessionLosses + 'L</span></div>'
      : '') +
    '<div style="position:relative;font-size:clamp(24px,3vh,34px);color:rgba(0,255,200,.25);letter-spacing:4px;text-transform:uppercase;">' +
    'Use keys 1-4 during game for emotes</div>' +
    '<div style="position:absolute;bottom:clamp(22px,3vh,46px);font-size:clamp(22px,2.6vh,30px);color:#222;letter-spacing:3px;text-transform:uppercase;">Quick Play to start</div>' +
    '</div>';
  showBottomBar();
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
function applyGameScale() {
  var wrapper = document.getElementById('LobbyWrapper');
  var mr      = document.getElementById('MiddleRow');
  var cd      = document.getElementById('ContentDiv');
  var optDiv  = document.getElementById('OptionsDiv');
  if (!wrapper || !mr || !cd) return;

  wrapper.style.width = '100vw';
  wrapper.style.height = '100vh';
  wrapper.style.maxWidth = 'none';
  mr.style.height = '';
  cd.style.width = '';
  cd.style.height = '';

  var sidebar = document.getElementById('Sidebar');
  if (sidebar) sidebar.style.display = gameScale === 'full' ? 'none' : '';

  var nw = Math.max(MIN_VIEW_W, Math.round(cd.clientWidth || cd.offsetWidth || MIN_VIEW_W));
  var nh = Math.max(MIN_VIEW_H, Math.round(cd.clientHeight || cd.offsetHeight || MIN_VIEW_H));

  if (canvas && (canvas.width !== nw || canvas.height !== nh)) {
    canvas.width = nw;
    canvas.height = nh;
  }
  updateWindowSize(nw, nh);
  if (menuDiv) {
    menuDiv.style.width = nw + 'px';
    menuDiv.style.height = nh + 'px';
  }
  if (optDiv) {
    var ow = Math.max(760, Math.min(1280, nw - 56));
    var oh = Math.max(560, Math.min(nh - 56, 900));
    optDiv.style.width = ow + 'px';
    optDiv.style.height = oh + 'px';
    optDiv.style.left = Math.max(14, Math.round((nw - ow) / 2)) + 'px';
    optDiv.style.top = Math.max(14, Math.round((nh - oh) / 2)) + 'px';
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

