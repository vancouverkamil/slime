var currentAccount = null;
var accountSessionToken = (typeof localStorage !== 'undefined' && localStorage.getItem('slime_session_token')) || '';

function accountMessage(text, bad) {
  var el = document.getElementById('AccountMessage');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = bad ? '#ff66aa' : '#00ffcc';
}

function accountPayload() {
  return {
    username: (document.getElementById('AccountUser') || {}).value || '',
    password: (document.getElementById('AccountPass') || {}).value || '',
  };
}

function accountRequest(url, options) {
  if (window.SLIME_BACKEND_DISABLED) return Promise.reject(new Error('Online backend is not connected.'));
  options = options || {};
  options.headers = Object.assign({}, options.headers || {});
  if (accountSessionToken) {
    if ((options.method || 'GET').toUpperCase() === 'GET') {
      url += (url.indexOf('?') === -1 ? '?' : '&') + 'session=' + encodeURIComponent(accountSessionToken);
    } else if (typeof options.body === 'string') {
      try {
        var body = JSON.parse(options.body || '{}');
        body._session = accountSessionToken;
        options.body = JSON.stringify(body);
      } catch(e) {}
    }
  }
  if (typeof options.body === 'string') options.headers['Content-Type'] = 'text/plain';
  options.credentials = 'include';
  return fetch(accountUrl(url), options).then(function(res) {
    return res.json().then(function(body) {
      if (!res.ok) throw new Error(body.error || 'Request failed.');
      return body;
    }).catch(function(err) {
      if (err instanceof SyntaxError) throw new Error('Server unavailable. Please try again.');
      throw err;
    });
  }).catch(function(err) {
    if (err.name === 'TypeError') throw new Error('Server unavailable. Please try again.');
    throw err;
  });
}

function accountUrl(path) {
  return (window.SLIME_API_URL || '') + path;
}

function applyAccount(user) {
  currentAccount = user || null;
  var guest = document.getElementById('AccountGuest');
  var signed = document.getElementById('AccountSignedIn');
  var name = document.getElementById('AccountName');
  var stats = document.getElementById('AccountStats');
  if (guest) guest.style.display = user ? 'none' : 'block';
  if (signed) signed.style.display = user ? 'block' : 'none';
  if (!user) return;

  var prog = user.progression || (window.SlimeProgression ? window.SlimeProgression.getProgression(user.stats ? user.stats.xp : 0) : null);
  totalWins = user.stats ? user.stats.wins : totalWins;
  myPlayerName = user.displayName || user.username;
  playerBodyColor  = user.slime && user.slime.color    ? user.slime.color    : playerBodyColor;
  playerHat        = user.slime && user.slime.hat      ? user.slime.hat      : playerHat;
  playerHatAnim    = user.slime && user.slime.hatAnim  ? user.slime.hatAnim  : playerHatAnim;
  playerHatDrawing = user.slime && Array.isArray(user.slime.hatDrawing) ? user.slime.hatDrawing : playerHatDrawing;
  if (user.slime && user.slime.trail) { playerTrail = user.slime.trail; try { localStorage.setItem('slimeTrail', playerTrail); } catch(e) {} }
  if (name) name.textContent = '@' + user.username;
  if (stats) stats.innerHTML =
    (prog ? '<span style="color:#ffd966;">L' + prog.level + '</span> ' : '') +
    '<span>' + (user.stats.matches || 0) + 'M</span> ' +
    '<span style="color:#66ffcc;">' + (user.stats.wins || 0) + 'W</span> ' +
    '<span style="color:#ff66aa;">' + (user.stats.losses || 0) + 'L</span>';
  hatConfigs.left = { hat: playerHat, anim: playerHatAnim, color: playerBodyColor, drawing: playerHatDrawing };
  syncCustomizationUI();
  renderSavedHatDrawings();
  var rankRow = document.getElementById('HomeRankRow');
  if (rankRow && typeof _buildHomeRanksHtml === 'function') rankRow.innerHTML = _buildHomeRanksHtml();
  sendCustomization();
  loadLeaderboard();
}

function storeAccountToken(token) {
  accountSessionToken = token || '';
  try {
    if (accountSessionToken) localStorage.setItem('slime_session_token', accountSessionToken);
    else localStorage.removeItem('slime_session_token');
  } catch(e) {}
}

function loadAccount() {
  return accountRequest('/api/me', { method: 'GET', headers: {} })
    .then(function(body) { applyAccount(body.user); })
    .catch(function() { applyAccount(null); });
}

function accountLogin() {
  accountMessage('Signing in...');
  accountRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(accountPayload()) })
    .then(function(body) {
      storeAccountToken(body.token);
      applyAccount(body.user);
      accountMessage('');
      loadLeaderboard();
      reconnectLobby();
    })
    .catch(function(err) { accountMessage(err.message, true); });
}

function accountRegister() {
  accountMessage('Creating account...');
  accountRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(accountPayload()) })
    .then(function(body) {
      storeAccountToken(body.token);
      applyAccount(body.user);
      accountMessage('');
      loadLeaderboard();
      reconnectLobby();
    })
    .catch(function(err) { accountMessage(err.message, true); });
}

function accountLogout() {
  accountRequest('/api/auth/logout', { method: 'POST', body: '{}' })
    .then(function() {
      storeAccountToken('');
      currentAccount = null;
      applyAccount(null);
      loadLeaderboard();
      reconnectLobby();
    });
}

function loadLeaderboard() {
  return accountRequest('/api/leaderboard', { method: 'GET', headers: {} })
    .then(function(body) { renderLeaderboard(body.players || []); })
    .catch(function() { renderLeaderboard([]); });
}

function renderLeaderboard(players) {
  var list = document.getElementById('LeaderboardList');
  if (!list) return;
  list.innerHTML = players.map(function(user, i) {
    var stats = user.stats || {};
    var p = user.progression || (window.SlimeProgression ? window.SlimeProgression.getProgression(stats.xp || 0) : { level: 1 });
    var mine = currentAccount && currentAccount.username === user.username ? ' mine' : '';
    return '<div class="lb-row' + mine + '" onclick="showProfile(\'' + escHtml(user.username) + '\')">' +
      '<span class="lb-rank">' + (i + 1) + '</span>' +
      '<span class="lb-name">@' + escHtml(user.username) + '</span>' +
      '<span class="lb-level">L' + (p.level || 1) + '</span>' +
      '<span class="lb-xp">' + (stats.xp || 0) + ' XP</span>' +
      '</div>';
  }).join('') || '<div class="lb-empty">No accounts yet.</div>';
}

function reconnectLobby() {
  if (lobbySocket) {
    var stale = lobbySocket;
    lobbySocket = null;
    stale.onclose = null;
    try { stale.close(); } catch(e) {}
  }
  setTimeout(connectLobby, 150);
}

function profileStat(label, value) {
  return '<div class="profile-stat"><b>' + escHtml(value) + '</b><span>' + escHtml(label) + '</span></div>';
}
