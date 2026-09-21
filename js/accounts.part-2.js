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

function achievementsHtml(user) {
  if (!window.SlimeFeatureCards && typeof SlimeFeatureCards === 'undefined') return '';
  var cards = window.SlimeFeatureCards || SlimeFeatureCards;
  return cards.achievements.map(function(achievement) {
    var unlocked = cards.isAchievementUnlocked(user, achievement.id);
    return '<div class="profile-achievement' + (unlocked ? ' unlocked' : '') + '">' +
      '<b>' + escHtml(achievement.name) + '</b>' +
      '<span>' + escHtml(unlocked ? 'UNLOCKED' : achievement.criteria) + '</span>' +
      '<i>' + escHtml(achievement.reward) + '</i>' +
      '</div>';
  }).join('');
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
      '<span>@' + escHtml(m.opponent || 'guest') + ' / +' + escHtml(m.xpGained || 0) + 'XP' +
        (m.coinsGained ? ' / +' + escHtml(m.coinsGained) + 'SC' : '') + '</span>' +
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
    '<div class="profile-achievements">' + achievementsHtml(user) + '</div>';
}

var profileReturnFocus = null;

function showProfile(username) {
  var overlay = document.getElementById('ProfileOverlay');
  var content = document.getElementById('ProfileContent');
  if (!overlay || !content) return;
  profileReturnFocus = document.activeElement;
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
  if (profileReturnFocus && typeof profileReturnFocus.focus === 'function') profileReturnFocus.focus();
  profileReturnFocus = null;
}
