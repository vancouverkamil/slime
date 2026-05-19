function startEditName() {
  var inp = document.getElementById('PlayerNameInput');
  inp.value = myPlayerName;
  document.getElementById('PlayerNameLabel').style.display = 'none';
  document.getElementById('PlayerNameEditBtn').style.display = 'none';
  var ea = document.getElementById('PlayerNameEditArea');
  ea.style.display = 'flex';
  inp.focus(); inp.select();
}
function cancelEditName() {
  document.getElementById('PlayerNameLabel').style.display = 'inline';
  document.getElementById('PlayerNameEditBtn').style.display = 'inline';
  document.getElementById('PlayerNameEditArea').style.display = 'none';
}
function saveName() {
  var name = document.getElementById('PlayerNameInput').value.trim().slice(0, 20);
  if (!name) { cancelEditName(); return; }
  myPlayerName = name;
  localStorage.setItem('slimeName', name);
  document.getElementById('PlayerNameDisplay').textContent = name;
  cancelEditName();
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: name, wins: totalWins, rank: getPlayerRank() }));
  }
}

// ── map preview thumbnails ────────────────────────────────
var mapPreviews = [];
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

// ── online player list ────────────────────────────────────
function updateOnlineList(list) {
  _playerListCache = list;
  var el = document.getElementById('OnlineList');
  if (!el) return;
  el.innerHTML = list.map(function(p, i) {
    var cls = p.status === 'playing' ? ' playing' : p.status === 'spectating' ? ' spectating' : '';
    var tag = p.status === 'playing' ? ' ▶' : p.status === 'spectating' ? ' 👁' : '';
    var rankCol = p.rank==='LIEUTENANT'?'#ffcc00':p.rank==='SERGEANT'?'#aaaaff':p.rank==='CORPORAL'?'#88ffcc':'#555';
    var badge = (p.rank && p.rank !== 'PRIVATE')
      ? '<span style="color:' + rankCol + ';font-size:6px;margin-left:3px;">' + p.rank.slice(0,3) + '</span>'
      : '';
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
  renderLobbySelect(currentLobbies);
}

// Desert Court (id=6) is hidden from lobby — kept on server for backward compat
var LOBBY_CATS = [
  { label: 'STANDARD',           ids: [0,1,2,3,4],     restricted: false },
  { label: 'PREMIUM',            ids: [5,7,8,9,10],    restricted: false },
  { label: 'CLASSIFIED COURTS',  ids: [11,12,13,14],   restricted: true  },
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
function showPlayerTip(idx, el) {
  var p = _playerListCache[idx];
  if (!p) return;
  var tip = document.getElementById('PlayerTooltip');
  if (!tip) return;
  var rankCol = p.rank==='LIEUTENANT'?'#ffcc00':p.rank==='SERGEANT'?'#aaaaff':p.rank==='CORPORAL'?'#88ffcc':'#666';
  var statusLabel = p.status==='playing'?'▶ In Match':p.status==='spectating'?'👁 Watching':'● In Lobby';
  tip.innerHTML =
    '<div style="font-weight:bold;color:#fff;font-size:10px;margin-bottom:5px;letter-spacing:.5px;">' + escHtml(p.name) + '</div>' +
    '<div style="color:' + rankCol + ';letter-spacing:1.5px;font-size:8px;margin-bottom:3px;">' + (p.rank || 'PRIVATE') + '</div>' +
    '<div style="color:#00ffcc;font-size:8px;margin-bottom:3px;">' + (p.wins||0) + ' WIN' + ((p.wins||0)!==1?'S':'') + '</div>' +
    '<div style="color:#777;font-size:8px;margin-bottom:3px;">' + (p.matches||0) + ' MATCH' + ((p.matches||0)!==1?'ES':'') + '</div>' +
    (p.username ? '<div style="color:#444;font-size:7px;margin-bottom:3px;">Click name for profile</div>' : '') +
    '<div style="color:#555;font-size:7px;letter-spacing:.5px;">' + statusLabel + '</div>';
  var r = el.getBoundingClientRect();
  tip.style.left  = Math.max(0, r.left - 155) + 'px';
  tip.style.top   = (r.top - 10) + 'px';
  tip.style.display = 'block';
}
function hidePlayerTip() {
  var tip = document.getElementById('PlayerTooltip');
  if (tip) tip.style.display = 'none';
}

var MAP_ICONS  = ['☀️','🔮','🌅','⛈️','🌿','❄️','🌵','🌆','🌙','🌋','🌊','🏗️','🏰','☢️','💀'];
var MAP_COLORS = ['#1a6bb5','#1e1630','#8b2252','#1c1c38','#1e4806','#b0cce8','#e8871a','#100028','#050a1a','#2a0400','#001428','#0a0a0a','#060a04','#021008','#000000'];
var MAP_TEXT   = ['#e8f4ff','#00ffcc','#ffd0e0','#ffee66','#aaff66','#1a5580','#5a2d00','#00ffcc','#aaddff','#ff6622','#00ccff','#ffcc44','#cc3333','#44ff66','#cc44ff'];

function renderLobbySelect(lobbies) {
  if (!showingLobbySelect) return;
  var rank    = getPlayerRank();
  var rankCol = totalWins >= 10 ? '#ffcc00' : totalWins >= 6 ? '#aaaaff' : totalWins >= 3 ? '#88ffcc' : '#888';

  // Build quick-lookup by room id
  var byId = {};
  lobbies.forEach(function(r) { byId[r.id] = r; });

  var html =
    '<div style="padding:8px;background:#06001a;height:100%;box-sizing:border-box;overflow:hidden;">' +
    '<div style="display:flex;align-items:center;margin-bottom:8px;">' +
      '<div style="color:#fff;font-size:11px;font-weight:bold;letter-spacing:3px;flex:1;' +
        'text-shadow:0 0 10px rgba(255,255,255,.3);">SELECT A COURT</div>' +
      '<div style="font-size:7px;letter-spacing:1.5px;color:' + rankCol + ';white-space:nowrap;">' +
        rank + ' &nbsp;·&nbsp; ' + totalWins + ' WIN' + (totalWins !== 1 ? 'S' : '') + '</div>' +
    '</div>';

  LOBBY_CATS.forEach(function(cat, ci) {
    var catLabelCol = cat.restricted ? 'rgba(255,180,0,.45)' : 'rgba(0,255,200,.28)';
    html += '<div style="margin-bottom:' + (ci < LOBBY_CATS.length - 1 ? '9' : '0') + 'px;">' +
      '<div style="font-size:7px;letter-spacing:2px;color:' + catLabelCol + ';margin-bottom:4px;padding:0 1px;">' +
        cat.label + '</div>' +
      '<div style="display:flex;gap:4px;">';

    cat.ids.forEach(function(id) {
      var r = byId[id];
      if (!r) { html += '<div style="flex:1;"></div>'; return; }
      var isLocked = cat.restricted && totalWins < 10;
      var badge, badgeCol;
      if (isLocked)               { badge = '🔒';  badgeCol = '#886600'; }
      else if (r.phase==='playing'){ badge = '▶';  badgeCol = '#00ff88'; }
      else if (r.playerCount===1) { badge = '⚡'; badgeCol = '#ff9900'; }
      else                        { badge = '';    badgeCol = '#444'; }
      var spec   = r.spectatorCount > 0 ? '👁' + r.spectatorCount : '';
      var txtCol = MAP_TEXT[id] || '#fff';
      var prev   = mapPreviews[id] ? 'url(\'' + mapPreviews[id] + '\')' : 'linear-gradient(#111,#222)';
      var dots   = (r.playerCount >= 1 ? '●' : '○') + (r.playerCount >= 2 ? '●' : '○');
      var clickFn = isLocked ? 'showLockedNotice(' + (10 - totalWins) + ')' : 'joinRoom(' + id + ')';
      var borderBase = isLocked ? 'rgba(180,140,0,.2)' : 'rgba(255,255,255,.1)';
      var borderHov  = isLocked ? 'rgba(255,200,0,.4)' : (txtCol + '66');

      html +=
        '<div style="flex:1;min-width:0;cursor:pointer;border:1px solid ' + borderBase + ';overflow:hidden;' +
          'background:#050014;transition:border-color .14s;" ' +
          'onclick="' + clickFn + '" ' +
          'onmouseover="this.style.borderColor=\'' + borderHov + '\'" ' +
          'onmouseout="this.style.borderColor=\'' + borderBase + '\'">' +
          '<div style="height:38px;background:' + prev + ';background-size:cover;background-position:center;position:relative;">' +
            '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 25%,rgba(0,0,20,.65))' +
              (isLocked ? ',rgba(0,0,0,.35)' : '') + ';"></div>' +
            '<div style="position:absolute;top:2px;left:3px;font-size:11px;">' + MAP_ICONS[id] + '</div>' +
            (badge ? '<div style="position:absolute;bottom:2px;right:3px;font-size:7px;font-weight:bold;color:' + badgeCol + ';">' + badge + spec + '</div>' : '') +
          '</div>' +
          '<div style="padding:2px 4px 3px;background:rgba(0,0,18,.6);">' +
            '<div style="font-size:7px;font-weight:bold;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + (isLocked ? 'rgba(255,180,0,.5)' : txtCol) + ';">' + r.name + '</div>' +
            '<div style="font-size:6px;color:#404040;letter-spacing:.2px;">' + (isLocked ? totalWins + '/10W' : dots + ' ' + r.playerCount + '/2') + '</div>' +
          '</div>' +
        '</div>';
    });

    html += '</div></div>';
  });

  html += '</div>';
  menuDiv.innerHTML = html;
}

function joinRoom(roomId) {
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  showingLobbySelect = false;
  lobbySocket.send(JSON.stringify({ type: 'join_room', roomId: roomId }));
  sendCustomization();
}

function cancelLobbySelect() {
  showingLobbySelect = false;
  showBottomBar(); toInitialMenu();
}

function leaveLobby() {
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
