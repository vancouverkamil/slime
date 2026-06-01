function getActiveCallingCard() {
  var id = 'rookie-grit';
  try { id = localStorage.getItem('slime_calling_card') || id; } catch(e) {}
  if (!SlimeFeatureCards.isCardUnlocked(currentAccount, id)) id = 'rookie-grit';
  return SlimeFeatureCards.cardById(id);
}

function setActiveCallingCard(id) {
  try { localStorage.setItem('slime_calling_card', id); } catch(e) {}
}

function playerCardHtml(opts) {
  opts = opts || {};
  var prog = opts.progression || (currentAccount && currentAccount.progression) || null;
  var emblem = opts.emblem || SlimeFeatureCards.emblemForProgression(prog);
  var card = opts.card || getActiveCallingCard();
  var name = opts.name || myPlayerName || 'Player';
  var level = prog && prog.level ? prog.level : (opts.level || 1);
  var color = opts.color || playerBodyColor || '#00ff00';
  var sideClass = opts.side === 'right' ? ' right' : '';
  return '<div class="calling-card' + sideClass + '" style="--card-accent:' + escHtml(card.accent) + ';">' +
    '<div class="calling-card-noise"></div>' +
    '<div class="calling-card-rank">' + escHtml(emblem.label) + '</div>' +
    '<div class="calling-card-slime" style="background:' + escHtml(color) + ';"></div>' +
    '<div class="calling-card-main">' +
      '<div class="calling-card-name">' + escHtml(name) + '</div>' +
      '<div class="calling-card-title">' + escHtml(card.name) + ' / L' + escHtml(level) + '</div>' +
      '<div class="calling-card-sub">' + escHtml(card.title) + '</div>' +
    '</div>' +
  '</div>';
}

function opponentCardHtml(name, color, level) {
  return playerCardHtml({
    name: name || 'Opponent',
    color: color || '#ff335f',
    level: level || 1,
    side: 'right',
    card: SlimeFeatureCards.cardById(level >= 4 ? 'final-four' : 'mud-line'),
    emblem: { label: level >= 4 ? 'BOS' : 'CPU' },
  });
}

function renderCallingCardPicker() {
  var cards = SlimeFeatureCards.callingCards;
  var active = getActiveCallingCard().id;
  return '<div class="feature-panel-title">Calling Cards</div>' +
    '<div class="calling-card-picker">' +
    cards.map(function(card) {
      var cls = card.id === active ? ' active' : '';
      var locked = !SlimeFeatureCards.isCardUnlocked(currentAccount, card.id);
      return '<button class="calling-card-option' + cls + (locked ? ' locked' : '') + '" onclick="chooseCallingCard(\'' + escHtml(card.id) + '\')" style="--card-accent:' + escHtml(card.accent) + ';">' +
        '<b>' + escHtml(card.name) + '</b><span>' + escHtml(locked ? 'LOCKED / ' + card.unlock : card.unlock) + '</span>' +
      '</button>';
    }).join('') +
    '</div>';
}

function chooseCallingCard(id) {
  if (!SlimeFeatureCards.isCardUnlocked(currentAccount, id)) {
    accountMessage('Unlock this calling card through achievements first.', true);
    return;
  }
  setActiveCallingCard(id);
  if (typeof showProgressionHub === 'function') showProgressionHub();
}

function renderUnlockRoadmap() {
  return '<div class="feature-panel-title">Unlock Roadmap</div>' +
    '<div class="unlock-list">' +
    SlimeFeatureCards.achievements.map(function(a) {
      var unlocked = SlimeFeatureCards.isAchievementUnlocked(currentAccount, a.id);
      return '<div class="unlock-row' + (unlocked ? ' unlocked' : '') + '">' +
        '<b>' + escHtml(a.name) + '</b>' +
        '<span>' + escHtml(a.criteria) + '</span>' +
        '<i>' + escHtml((unlocked ? 'UNLOCKED / ' : '') + a.reward) + '</i>' +
      '</div>';
    }).join('') +
    '</div>';
}

function showProgressionHub() {
  if (!menuDiv) return;
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  menuDiv.innerHTML =
    '<div class="feature-screen">' +
      '<div class="feature-header">' +
        '<div><span>Identity</span><b>Cards / Emblems</b></div>' +
        '<button class="feature-back" onclick="toInitialMenu()">BACK</button>' +
      '</div>' +
      '<div class="identity-preview">' +
        playerCardHtml({ name: currentAccount ? currentAccount.displayName : myPlayerName }) +
      '</div>' +
      '<div class="feature-grid two">' +
        '<div class="feature-panel">' + renderCallingCardPicker() + '</div>' +
        '<div class="feature-panel">' + renderUnlockRoadmap() + '</div>' +
      '</div>' +
    '</div>';
  showBottomBar();
}
