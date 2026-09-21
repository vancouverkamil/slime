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
];
var _playerListCache = [];

// ── dev menu ──────────────────────────────────────────────
function toggleDevMenu() {
  var d = document.getElementById('DevMenuDiv');
  if (!d) return;
  if (d.style.display === 'block') { d.style.display = 'none'; return; }
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: ' + getPlayerRank() + '  |  WINS: ' + totalWins;
  d.style.display = 'block';
}
function devUnlockAll() {
  totalWins = 999;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: ' + getPlayerRank() + '  |  WINS: ' + totalWins;
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
}
function devSetRank(rank) {
  var w = rank === 'SERGEANT' ? 6 : rank === 'CORPORAL' ? 3 : 0;
  totalWins = w;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: ' + getPlayerRank() + '  |  WINS: ' + totalWins;
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
}
function devReset() {
  totalWins = 0;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
  var sl = document.getElementById('DevStatusLine');
  if (sl) sl.textContent = 'RANK: PRIVATE  |  WINS: 0';
  if (showingLobbySelect) renderLobbySelect(currentLobbies);
}
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); toggleDevMenu(); }
  var studioOpen = (document.getElementById('OptionsDiv') || {}).style &&
                   document.getElementById('OptionsDiv').style.display !== 'none' &&
                   _activeOptSection === 'studio';
  var fsOpen = (document.getElementById('HatFullscreenOverlay') || {}).classList &&
               document.getElementById('HatFullscreenOverlay').classList.contains('fs-open');
  if (studioOpen || fsOpen) {
    if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); hatUndo(); }
    if (e.ctrlKey && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { e.preventDefault(); hatRedo(); }
  }
});

// ── player tooltip ────────────────────────────────────────
function hidePlayerTip() {
  var tip = document.getElementById('PlayerTooltip');
  if (tip) tip.style.display = 'none';
}

function updateOnlineList(list) {
  _playerListCache = list;
  var el = document.getElementById('OnlineList');
  if (!el) return;
  el.innerHTML = list.map(function(p, i) {
    var cls = p.status === 'playing' ? ' playing' : p.status === 'spectating' ? ' spectating' : '';
    var tag = p.status === 'playing' ? '&gt;' : p.status === 'spectating' ? 'EYE' : '';
    var rankCol = p.prestige ? '#ffd966' : p.account ? '#00ffcc' : '#555';
    var badge = '<span class="level-badge" style="color:' + rankCol + ';">L' + (p.level || 1) + ' ' + escHtml(p.badge || 'REC ^') + '</span>';
    var nameHtml = p.username
      ? '<span onclick="showProfile(\'' + escHtml(p.username) + '\')" style="cursor:pointer;color:#00ffcc;">' + escHtml(p.name) + '</span>'
      : escHtml(p.name);
    return '<div class="opl' + cls + '" style="display:flex;align-items:center;justify-content:space-between;cursor:default;" ' +
      'onmouseover="showPlayerTip(' + i + ',this)" onmouseout="hidePlayerTip()">' +
      '<span>' + nameHtml + badge + '</span>' +
      '<span style="color:#555;font-size:8px;">' + tag + '</span>' +
      '</div>';
  }).join('');
}

function showPlayerTip(idx, el) {
  var p = _playerListCache[idx];
  if (!p) return;
  var tip = document.getElementById('PlayerTooltip');
  if (!tip) return;
  var rankCol = p.prestige ? '#ffd966' : p.account ? '#00ffcc' : '#666';
  var statusLabel = p.status === 'playing' ? '> In Match' : p.status === 'spectating' ? 'Watching' : 'In Lobby';
  tip.innerHTML =
    '<div style="font-weight:bold;color:#fff;font-size:10px;margin-bottom:5px;letter-spacing:.5px;">' + escHtml(p.name) + '</div>' +
    '<div style="color:#ffd966;font-size:10px;margin-bottom:3px;">LEVEL ' + (p.level || 1) + '</div>' +
    '<div style="color:' + rankCol + ';letter-spacing:1.5px;font-size:8px;margin-bottom:3px;">' + escHtml(p.badge || 'REC ^') + ' · ' + escHtml(p.rankTitle || 'Recruit') + '</div>' +
    '<div style="color:#00ffcc;font-size:8px;margin-bottom:3px;">' + (p.wins || 0) + ' WIN' + ((p.wins || 0) !== 1 ? 'S' : '') + '</div>' +
    '<div style="color:#777;font-size:8px;margin-bottom:3px;">' + (p.matches || 0) + ' MATCH' + ((p.matches || 0) !== 1 ? 'ES' : '') + '</div>' +
    (p.username ? '<div style="color:#444;font-size:7px;margin-bottom:3px;">Click name for profile</div>' : '') +
    '<div style="color:#555;font-size:7px;letter-spacing:.5px;">' + statusLabel + '</div>';
  var r = el.getBoundingClientRect();
  tip.style.left = Math.max(0, r.left - 155) + 'px';
  tip.style.top = (r.top - 10) + 'px';
  tip.style.display = 'block';
}

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
  10: '#00ccff'
};
