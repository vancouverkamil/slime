var currentAccount = null;

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
  options = options || {};
  options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  options.credentials = 'include';
  return fetch(accountUrl(url), options).then(function(res) {
    return res.json().then(function(body) {
      if (!res.ok) throw new Error(body.error || 'Request failed.');
      return body;
    });
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

  totalWins = user.stats ? user.stats.wins : totalWins;
  myPlayerName = user.displayName || user.username;
  playerBodyColor = user.slime && user.slime.color ? user.slime.color : playerBodyColor;
  playerHat = user.slime && user.slime.hat ? user.slime.hat : playerHat;
  playerHatAnim = user.slime && user.slime.hatAnim ? user.slime.hatAnim : playerHatAnim;
  playerHatDrawing = user.slime && Array.isArray(user.slime.hatDrawing) ? user.slime.hatDrawing : playerHatDrawing;
  if (name) name.textContent = '@' + user.username;
  if (stats) stats.innerHTML =
    '<span>' + (user.stats.matches || 0) + 'M</span> ' +
    '<span style="color:#66ffcc;">' + (user.stats.wins || 0) + 'W</span> ' +
    '<span style="color:#ff66aa;">' + (user.stats.losses || 0) + 'L</span>';
  var nd = document.getElementById('PlayerNameDisplay');
  if (nd) nd.textContent = myPlayerName;
  hatConfigs.left = { hat: playerHat, anim: playerHatAnim, color: playerBodyColor, drawing: playerHatDrawing };
  syncCustomizationUI();
  sendCustomization();
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
      applyAccount(body.user);
      accountMessage('');
      reconnectLobby();
    })
    .catch(function(err) { accountMessage(err.message, true); });
}

function accountRegister() {
  accountMessage('Creating account...');
  accountRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(accountPayload()) })
    .then(function(body) {
      applyAccount(body.user);
      accountMessage('');
      reconnectLobby();
    })
    .catch(function(err) { accountMessage(err.message, true); });
}

function accountLogout() {
  accountRequest('/api/auth/logout', { method: 'POST', body: '{}' })
    .then(function() {
      currentAccount = null;
      applyAccount(null);
      reconnectLobby();
    });
}

function reconnectLobby() {
  if (lobbySocket) {
    try { lobbySocket.close(); } catch(e) {}
    lobbySocket = null;
  }
  setTimeout(connectLobby, 150);
}

function profileStat(label, value) {
  return '<div class="profile-stat"><b>' + escHtml(value) + '</b><span>' + escHtml(label) + '</span></div>';
}

function renderSlimePreviewHtml(user) {
  var slime = user.slime || {};
  var color = slime.color || '#00ff00';
  var hat = slime.hat && slime.hat !== 'none' ? slime.hat : 'no hat';
  return '<div class="profile-slime">' +
    '<div class="profile-slime-body" style="background:' + escHtml(color) + ';"></div>' +
    '<div class="profile-slime-eye"></div>' +
    '<div class="profile-slime-hat">' + escHtml(hat).toUpperCase() + '</div>' +
    '</div>';
}

function renderProfile(user) {
  var stats = user.stats || {};
  var matches = stats.matches || 0;
  var winRate = matches ? Math.round((stats.wins || 0) * 100 / matches) + '%' : '0%';
  var recent = (user.recentMatches || []).map(function(m) {
    return '<div class="profile-match ' + (m.result === 'win' ? 'win' : 'loss') + '">' +
      '<span>' + escHtml(m.result.toUpperCase()) + '</span>' +
      '<span>' + escHtml(m.scoreFor + '-' + m.scoreAgainst) + '</span>' +
      '<span>@' + escHtml(m.opponent || 'guest') + '</span>' +
      '</div>';
  }).join('') || '<div class="profile-empty">No online matches yet.</div>';
  return '<div class="profile-head">' +
    renderSlimePreviewHtml(user) +
    '<div><div class="profile-name">@' + escHtml(user.username) + '</div>' +
    '<div class="profile-sub">Joined ' + escHtml(String(user.createdAt || '').slice(0, 10)) + '</div></div>' +
    '</div>' +
    '<div class="profile-tabs"><span class="active">STATS</span><span>ACHIEVEMENTS</span></div>' +
    '<div class="profile-grid">' +
    profileStat('Matches', matches) +
    profileStat('Wins', stats.wins || 0) +
    profileStat('Losses', stats.losses || 0) +
    profileStat('Win Rate', winRate) +
    profileStat('Points For', stats.pointsFor || 0) +
    profileStat('Points Against', stats.pointsAgainst || 0) +
    '</div>' +
    '<div class="profile-section-title">Recent Matches</div>' +
    '<div class="profile-matches">' + recent + '</div>' +
    '<div class="profile-section-title">Achievements</div>' +
    '<div class="profile-empty">Achievement slots are ready. Unlock rules come next.</div>';
}

function showProfile(username) {
  var overlay = document.getElementById('ProfileOverlay');
  var content = document.getElementById('ProfileContent');
  if (!overlay || !content) return;
  overlay.style.display = 'flex';
  content.innerHTML = '<div class="profile-empty">Loading profile...</div>';
  accountRequest('/api/profiles/' + encodeURIComponent(username), { method: 'GET', headers: {} })
    .then(function(body) { content.innerHTML = renderProfile(body.user); })
    .catch(function(err) { content.innerHTML = '<div class="profile-empty">' + escHtml(err.message) + '</div>'; });
}

function showMyProfile() {
  if (currentAccount) showProfile(currentAccount.username);
}

function hideProfile() {
  var overlay = document.getElementById('ProfileOverlay');
  if (overlay) overlay.style.display = 'none';
}
