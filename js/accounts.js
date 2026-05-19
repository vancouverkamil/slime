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
  options = options || {};
  options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (accountSessionToken) options.headers.Authorization = 'Bearer ' + accountSessionToken;
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

  var prog = user.progression || (window.SlimeProgression ? window.SlimeProgression.getProgression(user.stats ? user.stats.xp : 0) : null);
  totalWins = user.stats ? user.stats.wins : totalWins;
  myPlayerName = user.displayName || user.username;
  playerBodyColor = user.slime && user.slime.color ? user.slime.color : playerBodyColor;
  playerHat = user.slime && user.slime.hat ? user.slime.hat : playerHat;
  playerHatAnim = user.slime && user.slime.hatAnim ? user.slime.hatAnim : playerHatAnim;
  playerHatDrawing = user.slime && Array.isArray(user.slime.hatDrawing) ? user.slime.hatDrawing : playerHatDrawing;
  if (name) name.textContent = '@' + user.username;
  if (stats) stats.innerHTML =
    (prog ? '<span style="color:#ffd966;">L' + prog.level + '</span> ' : '') +
    '<span>' + (user.stats.matches || 0) + 'M</span> ' +
    '<span style="color:#66ffcc;">' + (user.stats.wins || 0) + 'W</span> ' +
    '<span style="color:#ff66aa;">' + (user.stats.losses || 0) + 'L</span>';
  hatConfigs.left = { hat: playerHat, anim: playerHatAnim, color: playerBodyColor, drawing: playerHatDrawing };
  syncCustomizationUI();
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

function progressionHtml(user) {
  var stats = user.stats || {};
  var p = user.progression || (window.SlimeProgression ? window.SlimeProgression.getProgression(stats.xp || 0) : null);
  if (!p) return '';
  var pct = Math.max(0, Math.min(100, Math.round((p.progressToNext || 0) * 100)));
  var nextText = p.level >= p.maxLevel ? 'MAX LEVEL' : p.currentLevelXp + ' / ' + p.nextLevelXp + ' XP';
  return '<div class="profile-level-row">' +
    '<div class="rank-badge">' + escHtml(p.badge) + '</div>' +
    '<div class="profile-level-main">' +
      '<div><b>LEVEL ' + p.level + '</b><span>' + escHtml(p.rankTitle) + '</span></div>' +
      '<div class="xp-bar"><i style="width:' + pct + '%;"></i></div>' +
      '<div class="profile-sub">' + escHtml(nextText) + (p.unlocks && p.unlocks.goldCrown ? ' · GOLD CROWN UNLOCKED' : ' · GOLD CROWN AT 70') + '</div>' +
    '</div>' +
    '</div>';
}

function renderProfile(user) {
  var stats = user.stats || {};
  var p = user.progression || (window.SlimeProgression ? window.SlimeProgression.getProgression(stats.xp || 0) : { level: 1, rankTitle: 'Recruit' });
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
    progressionHtml(user) +
    '<div class="profile-tabs"><span class="active">STATS</span><span>ACHIEVEMENTS</span></div>' +
    '<div class="profile-grid">' +
    profileStat('Level', p.level) +
    profileStat('Rank', p.rankTitle) +
    profileStat('Total XP', stats.xp || 0) +
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

var INV_HAT_LABELS = {
  devil:      'Devil Horns',
  prismatic:  'Prismatic Crown',
  dragonfire: 'Dragon Horns',
  cosmic:     'Cosmic Crown',
  angelic:    'Triple Halo',
  overlord:   'Overlord Crown',
  crown:      'Royal Crown',
  goldcrown:  'Gold Crown',
  tophat:     'Top Hat',
  cowboy:     'Cowboy Hat',
  halo:       'Halo',
  party:      'Party Hat',
  custom:     'Custom Hat',
};

function openInventory() {
  if (!currentAccount) return;
  var overlay = document.getElementById('InventoryOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  renderInventory(currentAccount);
}

function hideInventory() {
  var overlay = document.getElementById('InventoryOverlay');
  if (overlay) overlay.style.display = 'none';
}

function renderInventory(user) {
  var grid = document.getElementById('InventoryGrid');
  var coinsEl = document.getElementById('InventoryCoins');
  if (!grid) return;
  var coins = user.coins || 1;
  var inv = user.inventory || [];
  if (coinsEl) coinsEl.textContent = 'SC: ' + coins;

  var COLS = 8, ROWS = 4, TOTAL = COLS * ROWS;
  var slots = [];
  // Slot 0: always coin
  slots.push({ type: 'coin', count: coins });
  // Remaining slots: owned hats
  inv.forEach(function(hatId) { slots.push({ type: 'hat', hat: hatId }); });
  // Pad to 32
  while (slots.length < TOTAL) slots.push(null);
  slots = slots.slice(0, TOTAL);

  grid.innerHTML = slots.map(function(s, i) {
    if (!s) return '<div class="inv-slot inv-empty"></div>';
    if (s.type === 'coin') {
      return '<div class="inv-slot inv-coin" title="Slime Coins">' +
        '<div class="inv-icon">&#9679;</div>' +
        '<div class="inv-label">SC: ' + s.count + '</div>' +
        '</div>';
    }
    var label = INV_HAT_LABELS[s.hat] || s.hat;
    return '<div class="inv-slot inv-hat" onclick="equipHatFromInv(\'' + escHtml(s.hat) + '\')" title="' + escHtml(label) + '">' +
      '<div class="inv-icon inv-hat-icon" data-hat="' + escHtml(s.hat) + '"></div>' +
      '<div class="inv-label">' + escHtml(label) + '</div>' +
      '</div>';
  }).join('');

  // Draw hat previews on canvases
  grid.querySelectorAll('.inv-hat-icon').forEach(function(el) {
    var hatId = el.getAttribute('data-hat');
    var c = document.createElement('canvas');
    c.width = 36; c.height = 36;
    var cx2 = c.getContext('2d');
    cx2.fillStyle = '#0a0018'; cx2.fillRect(0, 0, 36, 36);
    drawHatAt(cx2, 18, 30, 13, { hat: hatId, anim: 'none', drawing: [] });
    el.appendChild(c);
  });
}

function equipHatFromInv(hatId) {
  playerHat = hatId;
  try { localStorage.setItem('slimeHat', hatId); } catch(e) {}
  sendCustomization();
  if (typeof syncCustomizationUI === 'function') syncCustomizationUI();
  hideInventory();
}
