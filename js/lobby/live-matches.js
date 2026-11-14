// Lobby: spectate mode. The LIVE NOW list at the top of the Quick Play screen
// (every 1v1 being played, friends first, with the live score), and the
// spectator bar while watching (who is playing, the score, how many watch,
// NEXT MATCH and LEAVE). Watching goes through watchMatch() in rooms.js.

function liveMatchList(lobbies) {
  var friends = liveFriendNames();
  return (lobbies || []).filter(function(r) { return r.match; }).map(function(r) {
    var m = r.match;
    return { room: r, match: m, friend: !!((m.leftUser && friends[m.leftUser]) || (m.rightUser && friends[m.rightUser])) };
  }).sort(function(a, b) { return (b.friend - a.friend) || ((b.room.spectatorCount || 0) - (a.room.spectatorCount || 0)) || (a.room.id - b.room.id); });
}

function liveFriendNames() {
  var out = {};
  var o = typeof socialState !== 'undefined' && socialState.overview;
  if (o && o.friends) o.friends.forEach(function(f) { out[f.username] = true; });
  return out;
}

function liveCourtName(room) {
  var mapId = typeof room.mapId === 'number' ? room.mapId : room.id;
  var name = (typeof MAP_NAMES !== 'undefined' && MAP_NAMES[mapId]) || room.name || 'Court';
  return name + ' · Lobby ' + ((room.lobbyIndex || 0) + 1);
}

// The LIVE NOW section (HTML), shown above the courts on the Quick Play screen.
function renderLiveMatchesSection(lobbies) {
  var live = liveMatchList(lobbies);
  var html = '<div class="live-section">' +
    '<div class="live-section-title"><span class="live-dot"></span>LIVE NOW <span class="live-count">' + live.length + '</span>' +
    '<span class="live-section-sub">Watch any 1v1 being played</span></div>';
  if (!live.length) return html + '<div class="live-empty">No matches being played right now. Matches show up here the moment they start.</div></div>';
  html += '<div class="live-grid">' + live.slice(0, 12).map(function(it) {
    var m = it.match, r = it.room;
    return '<div class="live-card' + (it.friend ? ' is-friend' : '') + '">' +
      '<div class="live-card-top">' +
        (it.friend ? '<span class="live-tag friend">FRIEND</span>' : '') +
        '<span class="live-tag mode">' + escHtml(m.mode) + '</span>' +
        '<span class="live-watchers">👁 ' + (r.spectatorCount || 0) + '</span>' +
      '</div>' +
      '<div class="live-vs">' +
        '<span class="live-name left">' + escHtml(m.left) + '</span>' +
        '<span class="live-score">' + (m.scoreLeft | 0) + ' – ' + (m.scoreRight | 0) + '</span>' +
        '<span class="live-name right">' + escHtml(m.right) + '</span>' +
      '</div>' +
      '<div class="live-court">' + escHtml(liveCourtName(r)) + '</div>' +
      '<button class="live-watch" onclick="watchMatch(' + (r.id | 0) + ')">WATCH</button>' +
    '</div>';
  }).join('') + '</div></div>';
  return html;
}

// ── spectator bar ─────────────────────────────────────────
function renderSpecBadge() {
  var el = document.getElementById('SpecBadge');
  if (!el || el.style.display === 'none') return;
  if (typeof tournamentSpectateMatchId !== 'undefined' && tournamentSpectateMatchId) {
    el.innerHTML = '<span>👁 WATCHING</span><button class="spec-exit-btn" onclick="exitTournamentSpectate()">EXIT SPECTATING</button>';
    return;
  }
  var room = (currentLobbies || []).filter(function(r) { return r.id === currentRoomId; })[0];
  var m = room && room.match;
  var others = liveMatchList(currentLobbies).filter(function(it) { return it.room.id !== currentRoomId; });
  el.innerHTML =
    '<span class="spec-eye">👁 WATCHING</span>' +
    (m ? '<span class="spec-match">' + escHtml(m.left) + ' <b>' + (m.scoreLeft | 0) + ' – ' + (m.scoreRight | 0) + '</b> ' + escHtml(m.right) + '</span>'
       : '<span class="spec-match">waiting for the next game</span>') +
    (room ? '<span class="spec-viewers">' + (room.spectatorCount || 0) + ' watching</span>' : '') +
    (others.length ? '<button class="spec-btn" onclick="watchNextLiveMatch()">NEXT MATCH (' + others.length + ')</button>' : '') +
    '<button class="spec-exit-btn" onclick="leaveLobby()">LEAVE</button>';
}

// Hop to another live match (friends first).
function watchNextLiveMatch() {
  var others = liveMatchList(currentLobbies).filter(function(it) { return it.room.id !== currentRoomId; });
  if (others.length) watchMatch(others[0].room.id);
}
