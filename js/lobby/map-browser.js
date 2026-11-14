// Lobby: the map/room browser screen.
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
  10: 'Ocean Court',
  15: 'Championship Court'
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
    var live = room.phase === 'playing' && (room.playerCount || 0) >= 2;
    if (live && room.match) phase = room.match.left + ' ' + (room.match.scoreLeft | 0) + '–' + (room.match.scoreRight | 0) + ' ' + room.match.right;
    return '<button class="map-lobby-row' + (live ? ' is-live' : '') + '" onclick="' + (live ? 'watchMatch(' + room.id + ')' : 'joinRoom(' + room.id + ')') + '">' +
      '<span class="map-lobby-name">Lobby ' + idx + '</span>' +
      '<span class="map-lobby-phase">' + escHtml(phase) + '</span>' +
      '<span class="map-lobby-count">' + (live ? '👁 WATCH' : count) + '</span>' +
    '</button>';
  }).join('');
}

var openMapLobbyId = null;   // the room browser stays open across lobby updates
function showMapLobbyBrowser(mapId) {
  openMapLobbyId = mapId;
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
  openMapLobbyId = null;
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
  if (typeof renderLiveMatchesSection === 'function') html += renderLiveMatchesSection(lobbies);

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
  // Lobby updates arrive on every point now (live scores): keep the scroll
  // position and an open room browser instead of resetting the screen.
  var oldScreen = menuDiv.querySelector('.lobby-select-screen');
  var keepScroll = [menuDiv.scrollTop, oldScreen ? oldScreen.scrollTop : 0];
  menuDiv.innerHTML = html;
  menuDiv.scrollTop = keepScroll[0];
  var newScreen = menuDiv.querySelector('.lobby-select-screen');
  if (newScreen) newScreen.scrollTop = keepScroll[1];
  lobbySelectFreshOpen = false;
  initCardTilt();
  if (openMapLobbyId !== null) showMapLobbyBrowser(openMapLobbyId);
}

// ── holographic card tilt (mouse-tracked, foil-card style) ──
