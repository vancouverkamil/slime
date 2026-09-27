// Core: shared page chrome: bottom bar, leave button, spectator badge, canvas size.
function updateWindowSize(w, h) {
  viewWidth = w; viewHeight = h;
  pixelsPerUnitX = w / gameWidth; pixelsPerUnitY = h / gameHeight;
  courtYPix = 4 * viewHeight / 5;
}

// ── bottom bar & leave helpers ────────────────────────────
function showBottomBar() {
  var b = document.getElementById('BottomBar');
  if (b) b.style.display = 'flex';
  if (typeof applyGameScale === 'function') setTimeout(applyGameScale, 0);
}
function hideBottomBar() {
  var b = document.getElementById('BottomBar');
  if (b) b.style.display = 'none';
  if (typeof applyGameScale === 'function') setTimeout(applyGameScale, 0);
}
function showLeaveBtn(v) { var b = document.getElementById('LeaveRoomBtn'); if(b) b.style.display = v ? 'block' : 'none'; }

// ── spectator badge ───────────────────────────────────────
function showSpecBadge() {
  var el = document.getElementById('SpecBadge');
  if (!el) {
    el = document.createElement('div');
    el.id = 'SpecBadge'; el.className = 'spec-overlay';
    document.getElementById('ContentDiv').appendChild(el);
  }
  el.innerHTML = '<span>👁 WATCHING</span>' + (tournamentSpectateMatchId
    ? '<button class="spec-exit-btn" onclick="exitTournamentSpectate()">EXIT SPECTATING</button>' : '');
  el.style.display = 'block';
}
function hideSpecBadge() {
  var el = document.getElementById('SpecBadge');
  if (el) el.style.display = 'none';
}

// ── lobby websocket ───────────────────────────────────────
