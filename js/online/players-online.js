// Online: the players-online list and player tooltips.
var _playerListCache = [];

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
      ? '<span onclick="showProfile(\'' + escHtml(p.username) + '\')" style="cursor:pointer;color:var(--accent);">' + escHtml(p.name) + '</span>'
      : escHtml(p.name);
    return '<div class="opl' + cls + '" style="display:flex;align-items:center;justify-content:space-between;cursor:default;" ' +
      'onmouseover="showPlayerTip(' + i + ',this)" onmouseout="hidePlayerTip()">' +
      '<span>' + nameHtml + badge + '</span>' +
      (p.watchRoom !== null && p.watchRoom !== undefined && p.name !== myPlayerName
        ? '<button class="opl-watch" onclick="watchMatch(' + (p.watchRoom | 0) + ')" title="Watch this match">WATCH</button>'
        : '<span style="color:var(--text-faint);font-size:var(--fs-2xs);">' + tag + '</span>') +
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
    '<div style="font-weight:bold;color:#fff;font-size:var(--fs-2xs);margin-bottom:5px;letter-spacing:.5px;">' + escHtml(p.name) + '</div>' +
    '<div style="color:var(--gold);font-size:var(--fs-2xs);margin-bottom:3px;">LEVEL ' + (p.level || 1) + '</div>' +
    '<div style="color:' + rankCol + ';letter-spacing:1.5px;font-size:var(--fs-2xs);margin-bottom:3px;">' + escHtml(p.badge || 'REC ^') + ' · ' + escHtml(p.rankTitle || 'Recruit') + '</div>' +
    '<div style="color:var(--accent);font-size:var(--fs-2xs);margin-bottom:3px;">' + (p.wins || 0) + ' WIN' + ((p.wins || 0) !== 1 ? 'S' : '') + '</div>' +
    '<div style="color:var(--text-mute);font-size:var(--fs-2xs);margin-bottom:3px;">' + (p.matches || 0) + ' MATCH' + ((p.matches || 0) !== 1 ? 'ES' : '') + '</div>' +
    (p.username ? '<div style="color:#444;font-size:var(--fs-2xs);margin-bottom:3px;">Click name for profile</div>' : '') +
    '<div style="color:var(--text-faint);font-size:var(--fs-2xs);letter-spacing:.5px;">' + statusLabel + '</div>';
  var r = el.getBoundingClientRect();
  tip.style.left = Math.max(0, r.left - 155) + 'px';
  tip.style.top = (r.top - 10) + 'px';
  tip.style.display = 'block';
}
