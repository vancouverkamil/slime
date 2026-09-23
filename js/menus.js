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
  currentRoomId = null; currentRoomMapId = null; localMapId = null;
  if (!tournamentState || tournamentState.kind !== 'online') {
    tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  }
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
    // Local 1v1 duels play out on the Championship Court (used unless
    // the Legacy Graphics option is on, which keeps the plain sky look above).
    localMapId = 15;
  }
  initRound(true); updatesToPaint = 0; updateCount = 0;
  loadOptions(); gameState = GAME_STATE_RUNNING;
  renderBackground();
  canvas.style.display = 'block'; menuDiv.style.display = 'none'; hideBottomBar();
  gameIntervalObject = setInterval(gameIteration, 20);
}

function toInitialMenu() {
  onlineMode = false; isSpectator = false; showingLobbySelect = false;
  currentRoomId = null; currentRoomMapId = null; localMapId = null;
  final4Mode = false; final4WinPending = false;
  tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  tournamentSpectateMatchId = null; hideSpecBadge();
  if (typeof hideEscMenu === 'function') hideEscMenu(); showLeaveBtn(false); particles = [];
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div class="home-screen">' +
    '<div class="home-grid"></div>' +
    '<div class="home-water-layer"><div class="hwb hwb1"></div><div class="hwb hwb2"></div><div class="hwb hwb3"></div></div>' +
    '<div class="home-showcase">' +
      '<div class="home-spin-stage">' +
        '<canvas id="HomeSlimeCanvas" class="home-slime-canvas" width="220" height="280"></canvas>' +
      '</div>' +
      '<div class="home-pedestal" id="HomePedestal"></div>' +
    '</div>' +
    '<div class="home-title">SLIME</div>' +
    '<div class="home-subtitle">VOLLEYBALL</div>' +
    '<div id="HomeRankRow" class="home-rank-row"></div>' +
    (sessionWins + sessionLosses > 0
      ? '<div class="home-session">SESSION: <span style="color:var(--accent-soft);">' + sessionWins + 'W</span> / <span style="color:var(--danger);">' + sessionLosses + 'L</span></div>'
      : '') +
    '<div class="home-hint">Quick Play to start</div>' +
    '</div>';
  showBottomBar();
  setTimeout(initHomeSlimeAnim, 0);
}

function _buildHomeRanksHtml() {
  var prog = null, rt = null;
  if (currentAccount && window.SlimeProgression) {
    var xp = (currentAccount.stats && currentAccount.stats.xp) || 0;
    prog = window.SlimeProgression.getProgression(xp);
    if (currentAccount.ranked) {
      rt = window.SlimeProgression.getRankedTier(currentAccount.ranked.rating, currentAccount.ranked.placementsLeft);
    }
  }

  // Prestige badge
  var pColor  = prog ? (prog.prestige ? '#ffd700' : '#00ffcc') : '#333';
  var pTitle  = prog ? prog.rankTitle : 'UNRANKED';
  var pArrows = prog ? '^'.repeat(prog.badgeArrows) : '--';
  var pLevel  = prog ? 'LVL ' + prog.level : '';

  // Ranked badge
  var rColor, rTitle, rSub, rFoot;
  if (rt) {
    rColor = rt.color;
    rTitle = rt.label.toUpperCase();
    rSub   = rt.placementsLeft > 0
      ? (5 - rt.placementsLeft) + '/5 PLACEMENT'
      : rt.rating + ' LP';
    rFoot  = 'SEASON 1';
    var rd = currentAccount.ranked;
    if (rd && rt.placementsLeft === 0) rFoot = (rd.wins||0) + 'W  ' + (rd.losses||0) + 'L';
  } else {
    rColor = '#333'; rTitle = 'UNRANKED'; rSub = 'PLAY RANKED'; rFoot = '';
  }

  return (
    '<div class="home-rank-badge home-rank-prestige">' +
      '<div class="hrb-label">PRESTIGE</div>' +
      '<div class="hrb-title" style="color:' + pColor + '">' + pTitle + '</div>' +
      '<div class="hrb-sub">' + pArrows + '</div>' +
      '<div class="hrb-level">' + pLevel + '</div>' +
    '</div>' +
    '<div class="home-rank-badge home-rank-comp">' +
      '<div class="hrb-label">RANKED</div>' +
      '<div class="hrb-title" style="color:' + rColor + ';text-shadow:0 0 12px ' + rColor + '">' + rTitle + '</div>' +
      '<div class="hrb-sub" style="color:' + rColor + '">' + rSub + '</div>' +
      '<div class="hrb-level">' + rFoot + '</div>' +
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
