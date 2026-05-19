function spaceKeyDown() {
  if (onlineMode || isSpectator || showingLobbySelect) return;
  if (gameState === GAME_STATE_SHOW_WINNER) {
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
  hideSpecBadge(); showLeaveBtn(false); particles = [];
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;background:#05000f;overflow:hidden;">' +
    // grid lines
    '<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(0,255,200,.03) 1px,transparent 1px),' +
    'linear-gradient(90deg,rgba(0,255,200,.03) 1px,transparent 1px);background-size:30px 30px;"></div>' +
    // title
    '<div style="position:relative;font-size:54px;font-weight:bold;color:#00ffcc;letter-spacing:6px;' +
    'text-shadow:0 0 30px rgba(0,255,200,.8),0 0 60px rgba(0,255,200,.3);margin-bottom:4px;">SLIME</div>' +
    '<div style="position:relative;font-size:11px;color:#ff00cc;letter-spacing:10px;text-transform:uppercase;' +
    'text-shadow:0 0 12px rgba(255,0,204,.6);margin-bottom:28px;">VOLLEYBALL</div>' +
    // session stats
    (sessionWins + sessionLosses > 0
      ? '<div style="position:relative;font-size:10px;color:#444;letter-spacing:2px;margin-bottom:10px;">' +
        'SESSION: <span style="color:#66ffcc;">' + sessionWins + 'W</span> / ' +
        '<span style="color:#ff66aa;">' + sessionLosses + 'L</span></div>'
      : '') +
    '<div style="position:relative;font-size:10px;color:rgba(0,255,200,.25);letter-spacing:4px;text-transform:uppercase;">' +
    'Use keys 1-4 during game for emotes</div>' +
    '<div style="position:absolute;bottom:12px;font-size:9px;color:#222;letter-spacing:3px;text-transform:uppercase;">Quick Play to start</div>' +
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
var SIDEBAR_W = 290, COMPACT_W = 750, COMPACT_H = 375;

function setGameScale(s) {
  gameScale = s;
  try { localStorage.setItem('slime_scale', s); } catch(e){}
  var fb = document.getElementById('ScaleFull'), cb = document.getElementById('ScaleCompact');
  if (fb) { fb.classList.toggle('active', s === 'full'); cb.classList.toggle('active', s === 'compact'); }
  applyGameScale();
}
function applyGameScale() {
  var wrapper = document.getElementById('LobbyWrapper');
  var mr      = document.getElementById('MiddleRow');
  var cd      = document.getElementById('ContentDiv');
  var optDiv  = document.getElementById('OptionsDiv');
  if (!wrapper || !mr || !cd) return;

  if (gameScale === 'full') {
    var topH  = (document.getElementById('TopBar') || {}).offsetHeight || 28;
    var botH  = (document.getElementById('BottomBar') || {}).offsetHeight || 0;
    // Leave sidebar beside the content area
    var nw = Math.max(500, window.innerWidth - SIDEBAR_W);
    var nh = Math.max(280, window.innerHeight - topH - botH - 4);

    wrapper.style.width = (nw + SIDEBAR_W) + 'px';
    wrapper.style.maxWidth = 'none';
    mr.style.height = nh + 'px';
    cd.style.width  = nw + 'px';
    cd.style.height = nh + 'px';
    if (canvas)  { canvas.width = nw; canvas.height = nh; updateWindowSize(nw, nh); }
    if (menuDiv) { menuDiv.style.width = nw + 'px'; menuDiv.style.height = nh + 'px'; }
    // Re-centre OptionsDiv within the (now larger) ContentDiv
    if (optDiv) { var ol = Math.max(0, Math.round((nw - 620) / 2)); optDiv.style.left = ol + 'px'; optDiv.style.height = Math.min(nh, 520) + 'px'; }
  } else {
    wrapper.style.width = '1040px';
    wrapper.style.maxWidth = '';
    mr.style.height = COMPACT_H + 'px';
    cd.style.width  = COMPACT_W + 'px';
    cd.style.height = COMPACT_H + 'px';
    if (canvas)  { canvas.width = COMPACT_W; canvas.height = COMPACT_H; updateWindowSize(COMPACT_W, COMPACT_H); }
    if (menuDiv) { menuDiv.style.width = COMPACT_W + 'px'; menuDiv.style.height = COMPACT_H + 'px'; }
    if (optDiv)  { optDiv.style.left = Math.round((COMPACT_W - 620) / 2) + 'px'; optDiv.style.height = COMPACT_H + 'px'; }
  }
}
function _onWindowResize() { if (gameScale === 'full') applyGameScale(); }

// ── The Final 4 ───────────────────────────────────────────
function startFinal4() {
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

