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
var MAP_NAMES = {
  0: 'Sky Court',
  1: 'Cave Court',
  2: 'Sunset Court',
  3: 'Storm Court',
  4: 'Jungle Court',
  5: 'Frozen Court',
  7: 'Neon Court',
  8: 'Space Court',
  9: 'Volcano Court',
  10: 'Ocean Court'
};

function getMapLobbyGroups(lobbies) {
  var groups = {};
  lobbies.forEach(function(room) {
    var mapId = typeof room.mapId === 'number' ? room.mapId : room.id;
    if (!groups[mapId]) groups[mapId] = [];
    groups[mapId].push(room);
  });
  Object.keys(groups).forEach(function(mapId) {
    groups[mapId].sort(function(a, b) {
      return (a.lobbyIndex || 0) - (b.lobbyIndex || 0);
    });
  });
  return groups;
}

function getPrimaryMapRoom(mapId, rooms) {
  return (rooms && rooms[0]) || {
    id: mapId,
    mapId: mapId,
    lobbyIndex: 0,
    name: 'Court ' + mapId,
    playerCount: 0,
    spectatorCount: 0,
    phase: 'empty'
  };
}

function getMapOccupancy(rooms) {
  return (rooms || []).reduce(function(total, room) {
    return total + (room.playerCount || 0);
  }, 0);
}

function renderLobbyRows(mapId, rooms) {
  var list = (rooms || []).slice();
  for (var i = list.length; i < 10; i++) {
    list.push({
      id: mapId * 10 + i,
      mapId: mapId,
      lobbyIndex: i,
      name: MAP_NAMES[mapId] || 'Court ' + mapId,
      playerCount: 0,
      spectatorCount: 0,
      phase: 'empty'
    });
  }
  return list.slice(0, 10).map(function(room) {
    var idx = (room.lobbyIndex || 0) + 1;
    var count = (room.playerCount || 0) + '/2';
    var phase = room.phase === 'playing' ? 'IN MATCH' : room.phase === 'waiting' ? 'WAITING' : 'EMPTY';
    var disabled = room.phase === 'playing' && (room.playerCount || 0) >= 2;
    return '<button class="map-lobby-row' + (disabled ? ' is-full' : '') + '" onclick="' + (disabled ? '' : 'joinRoom(' + room.id + ')') + '">' +
      '<span class="map-lobby-name">Lobby ' + idx + '</span>' +
      '<span class="map-lobby-phase">' + phase + '</span>' +
      '<span class="map-lobby-count">' + count + '</span>' +
    '</button>';
  }).join('');
}

function showMapLobbyBrowser(mapId) {
  var groups = getMapLobbyGroups(currentLobbies || []);
  var rooms = groups[mapId] || [];
  var primary = getPrimaryMapRoom(mapId, rooms);
  var title = primary.name || 'Court ' + mapId;
  var panel = document.getElementById('MapLobbyBrowser');
  if (!panel && menuDiv) {
    panel = document.createElement('div');
    panel.id = 'MapLobbyBrowser';
    menuDiv.appendChild(panel);
  }
  if (!panel) return;
  panel.innerHTML =
    '<div class="map-lobby-panel">' +
      '<div class="map-lobby-head">' +
        '<div><b>' + escHtml(title) + '</b><span>Choose an open lobby</span></div>' +
        '<button onclick="hideMapLobbyBrowser()">CLOSE</button>' +
      '</div>' +
      '<div class="map-lobby-list">' + renderLobbyRows(mapId, rooms) + '</div>' +
    '</div>';
  panel.className = 'is-open';
}

function hideMapLobbyBrowser() {
  var panel = document.getElementById('MapLobbyBrowser');
  if (panel) panel.className = '';
}

function renderLobbySelect(lobbies) {
  if (!showingLobbySelect) return;
  var rank    = getPlayerRank();
  var rankCol = totalWins >= 10 ? '#ffcc00' : totalWins >= 6 ? '#aaaaff' : totalWins >= 3 ? '#88ffcc' : '#888';
  var groups = getMapLobbyGroups(lobbies || []);

  var html =
    '<div class="lobby-select-screen' + (lobbySelectFreshOpen ? ' first-open' : '') + '">' +
    '<div class="lobby-select-head">' +
      '<div class="lobby-select-heading">' +
        '<div class="lobby-select-title">SELECT A COURT</div>' +
        '<div class="lobby-select-sub">Choose your arena</div>' +
      '</div>' +
      '<div class="lobby-select-rank" style="--rank-col:' + rankCol + ';">' +
        '<span class="lobby-select-rank-name">' + rank + '</span>' +
        '<span class="lobby-select-rank-wins">' + totalWins + ' WIN' + (totalWins !== 1 ? 'S' : '') + '</span>' +
      '</div>' +
    '</div>';

  LOBBY_CATS.forEach(function(cat, ci) {
    html += '<div class="lobby-map-section' + (ci === LOBBY_CATS.length - 1 ? ' is-last' : '') + '">' +
      '<div class="lobby-map-section-title">' + cat.label + '</div>' +
      '<div class="lobby-map-grid">';

    cat.ids.forEach(function(id) {
      var rooms = groups[id] || [];
      var r = getPrimaryMapRoom(id, rooms);
      var isLocked = cat.restricted && totalWins < 10;
      var txtCol = MAP_TEXT[id] || '#fff';
      var occupied = getMapOccupancy(rooms);
      var openLobbies = rooms.filter(function(room) { return (room.playerCount || 0) < 2; }).length || 10;
      var clickFn = isLocked ? 'showLockedNotice(' + (10 - totalWins) + ')' : 'joinRoom(' + id + ')';

      html +=
        '<div class="lobby-map-card' + (isLocked ? ' is-locked' : '') + '" style="--map-text:' + txtCol + ';">' +
          '<button class="lobby-map-art" onclick="' + (isLocked ? clickFn : 'showMapLobbyBrowser(' + id + ')') + '">' +
            (typeof renderMapThumbnail === 'function' ? renderMapThumbnail(id) : '') +
          '</button>' +
          '<div class="lobby-map-body">' +
            '<div class="lobby-map-name">' + escHtml(r.name) + '</div>' +
            '<button class="lobby-map-open" onclick="' + (isLocked ? clickFn : 'showMapLobbyBrowser(' + id + ')') + '">' +
              (isLocked ? totalWins + '/10 WINS' : 'LOBBIES') +
            '</button>' +
            '<div class="lobby-map-meta">' + (isLocked ? 'Locked court' : openLobbies + ' open - ' + occupied + ' players') + '</div>' +
          '</div>' +
        '</div>';
    });

    html += '</div></div>';
  });

  html += '</div>';
  menuDiv.innerHTML = html;
  lobbySelectFreshOpen = false;
  initCardTilt();
}

// ── holographic card tilt (mouse-tracked, foil-card style) ──
function initCardTilt() {
  if (window.matchMedia && !window.matchMedia('(pointer:fine)').matches) return;
  var cards = menuDiv.querySelectorAll('.lobby-map-card');
  for (var i = 0; i < cards.length; i++) {
    (function(card) {
      card.addEventListener('mousemove', function(e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.style.setProperty('--ry', ((px - 0.5) * 16) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 12) + 'deg');
        card.classList.add('is-tilting');
      });
      card.addEventListener('mouseleave', function() {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    })(cards[i]);
  }
}

function joinRoom(roomId) {
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  showingLobbySelect = false;
  lobbySocket.send(JSON.stringify({ type: 'join_room', roomId: roomId }));
  sendCustomization();
}

function leaveLobby() {
  if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
    leaveSlimeverse();
    return;
  }
  showingLobbySelect = false; onlineMode = false; isSpectator = false;
  if (waitingInterval) { clearInterval(waitingInterval); waitingInterval = null; }
  if (onlineInputInterval) { clearInterval(onlineInputInterval); onlineInputInterval = null; }
  hideSpecBadge(); showLeaveBtn(false);
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'leave_room' }));
  }
  showBottomBar(); toInitialMenu();
}

// ── server message handler ────────────────────────────────
