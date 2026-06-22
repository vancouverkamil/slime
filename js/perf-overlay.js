var perfOverlayEnabled = typeof localStorage !== 'undefined' && localStorage.getItem('slime_perf_overlay') === 'on';
var perfOverlayEl = null;
var perfFps = 0;
var perfFrameMs = 0;
var perfLastFrame = 0;
var perfFrames = 0;
var perfLastSample = 0;
var lastPingMs = 0;
var perfPingTimer = null;

function setPerfOverlayEnabled(on) {
  perfOverlayEnabled = !!on;
  try { localStorage.setItem('slime_perf_overlay', perfOverlayEnabled ? 'on' : 'off'); } catch(e) {}
  if (perfOverlayEnabled) {
    ensurePerfOverlay();
  } else if (perfOverlayEl) {
    perfOverlayEl.style.display = 'none';
  }
}

function ensurePerfOverlay() {
  if (perfOverlayEl) {
    perfOverlayEl.style.display = perfOverlayEnabled ? 'block' : 'none';
    return perfOverlayEl;
  }
  perfOverlayEl = document.createElement('div');
  perfOverlayEl.id = 'PerfOverlay';
  perfOverlayEl.style.cssText = [
    'position:fixed',
    'right:10px',
    'top:10px',
    'z-index:99999',
    'display:none',
    'min-width:150px',
    'padding:8px 10px',
    'background:rgba(0,0,0,.72)',
    'border:1px solid rgba(0,255,200,.35)',
    'color:#00ffcc',
    'font:10px Courier New,monospace',
    'line-height:1.45',
    'pointer-events:none',
    'box-shadow:0 0 16px rgba(0,255,200,.15)'
  ].join(';');
  document.body.appendChild(perfOverlayEl);
  perfOverlayEl.style.display = perfOverlayEnabled ? 'block' : 'none';
  return perfOverlayEl;
}

function perfSocketState() {
  if (!lobbySocket) return 'closed';
  return ['connecting', 'open', 'closing', 'closed'][lobbySocket.readyState] || String(lobbySocket.readyState);
}

function updatePerfOverlay() {
  if (!perfOverlayEnabled) return;
  ensurePerfOverlay();
  var room = currentRoomId === null ? '-' : currentRoomId;
  var inSlimeverse = typeof slimeverseActive !== 'undefined' && slimeverseActive;
  var mode = onlineMode ? 'online' : isSpectator ? 'spectate' : inSlimeverse ? 'slimeverse' : gameState === GAME_STATE_RUNNING ? 'local' : 'menu';
  perfOverlayEl.innerHTML =
    'FPS ' + perfFps + ' / ' + perfFrameMs.toFixed(1) + 'ms<br>' +
    'WS ' + perfSocketState() + ' / ' + (lastPingMs || '-') + 'ms<br>' +
    'Mode ' + mode + '<br>' +
    'Room ' + room + '<br>' +
    'Players ' + (document.getElementById('PlayerCountNum') || {}).textContent;
}

function perfFrame(now) {
  if (perfLastFrame) perfFrameMs = now - perfLastFrame;
  perfLastFrame = now;
  perfFrames++;
  if (!perfLastSample) perfLastSample = now;
  if (now - perfLastSample >= 500) {
    perfFps = Math.round(perfFrames * 1000 / (now - perfLastSample));
    perfFrames = 0;
    perfLastSample = now;
    updatePerfOverlay();
  }
  requestAnimationFrame(perfFrame);
}

function sendPerfPing() {
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  try { lobbySocket.send(JSON.stringify({ type: 'perf_ping', t: Date.now() })); } catch(e) {}
}

function handlePerfPong(msg) {
  if (!msg || !msg.t) return;
  lastPingMs = Math.max(0, Date.now() - msg.t);
  updatePerfOverlay();
}

function initPerfOverlay() {
  requestAnimationFrame(perfFrame);
  if (perfPingTimer) clearInterval(perfPingTimer);
  perfPingTimer = setInterval(sendPerfPing, 3000);
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
      e.preventDefault();
      setPerfOverlayEnabled(!perfOverlayEnabled);
    }
  });
  if (perfOverlayEnabled) ensurePerfOverlay();
}
