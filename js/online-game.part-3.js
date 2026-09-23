function showReconnectOverlay(seconds) {
  hideReconnectOverlay();
  _rcOverlay = document.createElement('div');
  _rcOverlay.id = 'ReconnectOverlay';
  var remaining = seconds;
  _rcOverlay.innerHTML =
    '<div class="rco-icon">&#9203;</div>' +
    '<div class="rco-title">OPPONENT DISCONNECTED</div>' +
    '<div class="rco-sub">Waiting for them to reconnect&hellip;</div>' +
    '<div class="rco-timer" id="RcoTimer">' + remaining + 's</div>';
  var parent = document.getElementById('ContentDiv') || document.getElementById('GameContentDiv') || document.body;
  parent.appendChild(_rcOverlay);
  _rcTimer = setInterval(function() {
    remaining = Math.max(0, remaining - 1);
    var el = document.getElementById('RcoTimer');
    if (el) el.textContent = remaining + 's';
    if (remaining <= 0) { clearInterval(_rcTimer); _rcTimer = null; }
  }, 1000);
}

function hideReconnectOverlay() {
  if (_rcTimer) { clearInterval(_rcTimer); _rcTimer = null; }
  if (_rcOverlay) {
    if (_rcOverlay.parentNode) _rcOverlay.parentNode.removeChild(_rcOverlay);
    _rcOverlay = null;
  }
}

function ensurePregameOverlay() {
  var el = document.getElementById('PregameOverlay');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'PregameOverlay';
  el.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:12',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,18,.42)',
    'pointer-events:auto'
  ].join(';');
  var parent = document.getElementById('ContentDiv') || document.getElementById('GameContentDiv') || document.body;
  parent.appendChild(el);
  return el;
}

function hidePregameOverlay() {
  onlinePregameState = null;
  var el = document.getElementById('PregameOverlay');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function rpsLabel(choice) {
  return choice === 'rock' ? 'ROCK' : choice === 'paper' ? 'PAPER' : choice === 'scissors' ? 'SCISSORS' : '...';
}

function rpsStatusLine() {
  var left = onlinePregameState && onlinePregameState.locked && onlinePregameState.locked.left;
  var right = onlinePregameState && onlinePregameState.locked && onlinePregameState.locked.right;
  return '<div style="display:flex;justify-content:center;gap:18px;margin-top:16px;color:var(--text-mute);font-size:var(--fs-2xs);letter-spacing:2px;">' +
    '<span>' + escHtml(playerNameLeft || 'Player 1') + ': ' + (left ? '<b style="color:var(--accent);">LOCKED</b>' : 'CHOOSING') + '</span>' +
    '<span>' + escHtml(playerNameRight || 'Player 2') + ': ' + (right ? '<b style="color:var(--danger);">LOCKED</b>' : 'CHOOSING') + '</span>' +
  '</div>';
}

function renderRpsOverlay(body) {
  var el = ensurePregameOverlay();
  el.innerHTML =
    '<div style="width:min(560px,90vw);border:1px solid rgba(var(--accent-rgb),.34);background:rgba(3,0,18,.92);box-shadow:0 0 40px rgba(var(--accent-rgb),.14);padding:28px 30px;text-align:center;font-family:Courier New,monospace;">' +
      '<div style="color:var(--accent);font-size:var(--fs-sm);letter-spacing:4px;margin-bottom:8px;">FIRST SERVE</div>' +
      '<div style="color:#fff;font-size:28px;font-weight:bold;letter-spacing:3px;margin-bottom:8px;">ROCK PAPER SCISSORS</div>' +
      body +
    '</div>';
}

function showRpsOverlay(msg) {
  onlinePregameState = { locked: {}, choice: null, reason: msg && msg.reason };
  var note = msg && msg.reason === 'tie'
    ? '<div style="color:var(--gold);font-size:var(--fs-xs);letter-spacing:2px;margin-bottom:18px;">TIE - PICK AGAIN</div>'
    : '<div style="color:#666;font-size:var(--fs-xs);letter-spacing:1px;margin-bottom:18px;">Choices are hidden until both players lock in.</div>';
  var body = note;
  if (isSpectator) {
    body += '<div style="color:#aaa;font-size:var(--fs-sm);letter-spacing:2px;">PLAYERS ARE CHOOSING...</div>' + rpsStatusLine();
  } else {
    body += '<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">' +
      ['rock','paper','scissors'].map(function(choice) {
        return '<button class="hat-opt" style="font-size:var(--fs-sm);padding:11px 16px;min-width:120px;" onclick="sendRpsChoice(\'' + choice + '\')">' + rpsLabel(choice) + '</button>';
      }).join('') +
    '</div>' + rpsStatusLine();
  }
  renderRpsOverlay(body);
}

function sendRpsChoice(choice) {
  if (!onlinePregameState || onlinePregameState.choice) return;
  onlinePregameState.choice = choice;
  onlinePregameState.locked = onlinePregameState.locked || {};
  onlinePregameState.locked[mySide] = true;
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'rps_choice', choice: choice }));
  }
  renderRpsOverlay(
    '<div style="color:var(--gold);font-size:var(--fs-md);letter-spacing:2px;margin:12px 0;">YOU CHOSE ' + rpsLabel(choice) + '</div>' +
    '<div style="color:#666;font-size:var(--fs-xs);letter-spacing:1px;">Waiting for opponent...</div>' +
    rpsStatusLine()
  );
}

function updateRpsLocked(side) {
  if (!onlinePregameState) onlinePregameState = { locked: {} };
  onlinePregameState.locked[side] = true;
  if (!onlinePregameState.choice && !isSpectator) return;
  var choiceText = onlinePregameState.choice
    ? '<div style="color:var(--gold);font-size:var(--fs-md);letter-spacing:2px;margin:12px 0;">YOU CHOSE ' + rpsLabel(onlinePregameState.choice) + '</div>'
    : '<div style="color:#aaa;font-size:var(--fs-sm);letter-spacing:2px;">PLAYERS ARE CHOOSING...</div>';
  renderRpsOverlay(choiceText + rpsStatusLine());
}

function showRpsResult(msg) {
  if (!onlinePregameState) onlinePregameState = { locked: {} };
  var leftChoice = msg.choices ? msg.choices.left : null;
  var rightChoice = msg.choices ? msg.choices.right : null;
  var result = msg.tie
    ? '<div style="color:var(--gold);font-size:20px;font-weight:bold;letter-spacing:3px;margin:12px 0;">TIE</div>'
    : '<div style="color:var(--accent);font-size:20px;font-weight:bold;letter-spacing:3px;margin:12px 0;">' + escHtml(msg.winner === 'left' ? playerNameLeft : playerNameRight) + ' SERVES</div>';
  renderRpsOverlay(
    '<div style="display:flex;justify-content:center;gap:24px;color:#aaa;font-size:var(--fs-sm);letter-spacing:2px;margin:12px 0;">' +
      '<span>' + escHtml(playerNameLeft || 'Player 1') + ': <b style="color:var(--accent);">' + rpsLabel(leftChoice) + '</b></span>' +
      '<span>' + escHtml(playerNameRight || 'Player 2') + ': <b style="color:var(--danger);">' + rpsLabel(rightChoice) + '</b></span>' +
    '</div>' +
    result +
    '<div style="color:#666;font-size:var(--fs-xs);letter-spacing:1px;">' + (msg.tie ? 'Choose again...' : 'Get ready...') + '</div>'
  );
}

function showPregameCountdown(n) {
  renderRpsOverlay(
    '<div style="color:#666;font-size:var(--fs-xs);letter-spacing:2px;margin-bottom:12px;">BALL DROPS IN</div>' +
    '<div style="color:#fff;font-size:72px;font-weight:bold;line-height:1;text-shadow:0 0 24px rgba(var(--accent-rgb),.45);">' + escHtml(n) + '</div>'
  );
}
