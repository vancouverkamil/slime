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
    '<div class="home-water-layer"><div class="hwb hwb1"></div><div class="hwb hwb2"></div><div class="hwb hwb3"></div></div>' +
    '<div class="home-showcase">' +
      '<div class="home-spin-stage">' +
        '<canvas id="HomeSlimeCanvas" class="home-slime-canvas" width="220" height="195"></canvas>' +
      '</div>' +
      '<div class="home-pedestal" id="HomePedestal"></div>' +
    '</div>' +
    '<div class="home-title">SLIME</div>' +
    '<div class="home-subtitle">VOLLEYBALL</div>' +
    '<div id="HomeRankRow" class="home-rank-row"></div>' +
    (sessionWins + sessionLosses > 0
      ? '<div class="home-session">SESSION: <span style="color:#007a67;">' + sessionWins + 'W</span> / <span style="color:#c0004a;">' + sessionLosses + 'L</span></div>'
      : '') +
    '<div class="home-hint">Quick Play to start</div>' +
    '</div>';
  showBottomBar();
  setTimeout(initHomeSlimeAnim, 0);
}

function _homeCompRank(wins) {
  if (wins >= 400) return { title: 'DIAMOND',  color: '#1778a0' };
  if (wins >= 150) return { title: 'PLATINUM', color: '#4a6898' };
  if (wins >= 50)  return { title: 'GOLD',     color: '#9a6a00' };
  if (wins >= 10)  return { title: 'SILVER',   color: '#5a7080' };
  return               { title: 'BRONZE',   color: '#8b5520' };
}

function _buildHomeRanksHtml() {
  var prog = null, cr = null, wins = 0;
  if (currentAccount && window.SlimeProgression) {
    var xp = (currentAccount.stats && currentAccount.stats.xp) || 0;
    wins   = (currentAccount.stats && currentAccount.stats.wins) || 0;
    prog = window.SlimeProgression.getProgression(xp);
    cr   = _homeCompRank(wins);
  }
  var pColor = prog ? (prog.prestige ? '#9a6a00' : '#006d5c') : '#7a9ab0';
  var pTitle = prog ? prog.rankTitle : 'UNRANKED';
  var pArrows = prog ? '^'.repeat(prog.badgeArrows) : '--';
  var pLevel  = prog ? 'LVL ' + prog.level : '';
  var cColor  = cr ? cr.color : '#333';
  var cTitle  = cr ? cr.title : 'UNRANKED';
  var cSub    = cr ? wins + ' WINS' : 'LOG IN';
  var cFoot   = cr ? 'LIFETIME' : '';
  return (
    '<div class="home-rank-badge home-rank-prestige">' +
      '<div class="hrb-label">PRESTIGE</div>' +
      '<div class="hrb-title" style="color:' + pColor + '">' + pTitle + '</div>' +
      '<div class="hrb-sub">' + pArrows + '</div>' +
      '<div class="hrb-level">' + pLevel + '</div>' +
    '</div>' +
    '<div class="home-rank-badge home-rank-comp">' +
      '<div class="hrb-label">COMPETITIVE</div>' +
      '<div class="hrb-title" style="color:' + cColor + '">' + cTitle + '</div>' +
      '<div class="hrb-sub" style="color:' + cColor + '">' + cSub + '</div>' +
      '<div class="hrb-level">' + cFoot + '</div>' +
    '</div>'
  );
}

function initHomeSlimeAnim() {
  var homeCanvas = document.getElementById('HomeSlimeCanvas');
  if (!homeCanvas) return;
  var ctx = homeCanvas.getContext('2d');
  var rankRow = document.getElementById('HomeRankRow');
  if (rankRow) rankRow.innerHTML = _buildHomeRanksHtml();
  var ped = document.getElementById('HomePedestal');
  if (ped) {
    ped.style.boxShadow = '0 0 28px 6px ' + playerBodyColor + '55, 0 0 60px 16px ' + playerBodyColor + '1a';
    ped.style.background = 'radial-gradient(ellipse at center, ' + playerBodyColor + '2e 0%, transparent 70%)';
  }
  homeCanvas.style.filter = 'drop-shadow(0 0 16px ' + playerBodyColor + ') drop-shadow(0 0 36px ' + playerBodyColor + '66)';
  (function frame() {
    if (!document.getElementById('HomeSlimeCanvas')) return;
    _drawHomeSlime(ctx, homeCanvas);
    requestAnimationFrame(frame);
  })();
}

function _drawHomeSlime(ctx, cv) {
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  var cx = W / 2, cy = H * 0.64;
  var rPix = Math.min(W * 0.32, H * 0.37);
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

