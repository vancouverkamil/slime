// Online: ranked matchmaking queue.
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
