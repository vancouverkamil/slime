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

// ── The Final 4 ───────────────────────────────────────────
function startFinal4() {
  tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  final4Mode = true; final4WinPending = false; final4Index = 0;
  startFinal4Round();
}
function startFinal4Round() {
  var boss = final4AIs[final4Index];
  currentRoomId = null; currentRoomMapId = null;
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

// ── Ranked queue ──────────────────────────────────────────
var _rqTimerInterval = null, _rqStartTime = 0;

function joinRankedQueue() {
  if (!currentAccount) {
    showOptions(); showOptSection('slime');
    accountMessage('Sign in to play ranked.', true);
    return;
  }
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  lobbySocket.send(JSON.stringify({ type: 'ranked_queue' }));
}

function cancelRankedQueue() {
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'ranked_queue_cancel' }));
  stopRankedQueueUI();
  toInitialMenu();
}

function showRankedQueueUI() {
  canvas.style.display = 'none'; menuDiv.style.display = 'block';
  _rqStartTime = Date.now();
  var tier = '—';
  if (currentAccount && currentAccount.ranked && window.SlimeProgression) {
    var rt = window.SlimeProgression.getRankedTier(currentAccount.ranked.rating, currentAccount.ranked.placementsLeft);
    tier = rt.label + ' &nbsp; ' + currentAccount.ranked.rating + ' LP';
  }
  menuDiv.innerHTML =
    '<div class="ranked-queue-screen">' +
    '<div class="rq-crown">&#9819;</div>' +
    '<div class="rq-title">FINDING MATCH</div>' +
    '<div class="rq-sub">Searching for an opponent&hellip;</div>' +
    '<div class="rq-timer" id="RqTimer">0:00</div>' +
    '<div class="rq-rank" id="RqRank">' + tier + '</div>' +
    '<div style="margin-top:clamp(14px,2vh,24px)">' +
    '<button class="hat-opt" onclick="cancelRankedQueue()">&#10005;&nbsp; CANCEL</button>' +
    '</div></div>';
  showBottomBar();
  if (_rqTimerInterval) clearInterval(_rqTimerInterval);
  _rqTimerInterval = setInterval(function() {
    var el = document.getElementById('RqTimer');
    if (!el) { clearInterval(_rqTimerInterval); return; }
    var s = Math.floor((Date.now() - _rqStartTime) / 1000);
    el.textContent = Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  }, 1000);
}

function stopRankedQueueUI() {
  if (_rqTimerInterval) { clearInterval(_rqTimerInterval); _rqTimerInterval = null; }
}
