// Lobby: lobby select screen and map previews.
// ── map preview thumbnails ────────────────────────────────
var mapPreviews = [];
var mapPreviewBuildStarted = false;
function getMapPreview(id, pw, ph) {
  var offC = document.createElement('canvas');
  offC.width = pw; offC.height = ph;
  var _ctx = ctx, _vw = viewWidth, _vh = viewHeight, _cy = courtYPix;
  ctx = offC.getContext('2d');
  viewWidth = pw; viewHeight = ph; courtYPix = Math.round(ph * 0.78);
  drawMapBackground(id);
  ctx = _ctx; viewWidth = _vw; viewHeight = _vh; courtYPix = _cy;
  return offC.toDataURL();
}
function buildMapPreviews() {
  for (var i = 0; i < 15; i++) mapPreviews[i] = getMapPreview(i, 284, 148);
}
function ensureMapPreviews() {
  if (mapPreviewBuildStarted) return;
  mapPreviewBuildStarted = true;
  var ids = [];
  LOBBY_CATS.forEach(function(cat) {
    cat.ids.forEach(function(id) {
      if (ids.indexOf(id) === -1) ids.push(id);
    });
  });
  var i = 0;
  function buildNext() {
    if (i >= ids.length) return;
    var id = ids[i++];
    if (!mapPreviews[id]) mapPreviews[id] = getMapPreview(id, 284, 148);
    if (showingLobbySelect) renderLobbySelect(currentLobbies);
    var idle = window.requestIdleCallback || function(cb) { return setTimeout(cb, 60); };
    idle(buildNext, { timeout: 250 });
  }
  buildNext();
}

// ── lobby select UI ───────────────────────────────────────
function showLobbySelect() {
  claimScreen('menu');
  if (!lobbySocket || lobbySocket.readyState !== 1) {
    addChatMessage(null, 'Still connecting to server...');
    return;
  }
  showingLobbySelect = true;
  onlineMode = false; isSpectator = false;
  hideSpecBadge();
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  lobbySelectFreshOpen = true;
  renderLobbySelect(currentLobbies);
}
var lobbySelectFreshOpen = false;

// Desert Court (id=6) is hidden from lobby — kept on server for backward compat
var LOBBY_CATS = [
  { label: 'STANDARD',           ids: [0,1,2,3,4],     restricted: false },
  { label: 'PREMIUM',            ids: [5,7,8,9,10],    restricted: false },
  { label: 'CHAMPIONSHIP',       ids: [15],            restricted: false },
];
var MAP_TEXT = {
  0: '#e8f4ff',
  1: '#00ffcc',
  2: '#ffd0e0',
  3: '#ffee66',
  4: '#aaff66',
  5: '#d8f3ff',
  7: '#00ffcc',
  8: '#aaddff',
  9: '#ff6622',
  10: '#00ccff',
  15: '#ff2fb0'
};
