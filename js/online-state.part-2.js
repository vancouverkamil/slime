function updateChatUnreadNote() {
  var note = document.getElementById('ChatUnreadNote');
  if (!note) return;
  note.textContent = chatUnreadCount > 0
    ? (chatUnreadCount + ' new message' + (chatUnreadCount === 1 ? '' : 's') + ' waiting')
    : '';
}
function joinGlobalChat() {
  chatJoined = true;
  chatUnreadCount = 0;
  try { localStorage.setItem('slime_chat_joined', '1'); } catch(e) {}
  applyChatJoinState();
}
function leaveGlobalChat() {
  chatJoined = false;
  try { localStorage.setItem('slime_chat_joined', '0'); } catch(e) {}
  applyChatJoinState();
}
function sendChat() {
  var input = document.getElementById('ChatInput');
  var msg   = (input.value || '').trim();
  if (!msg || !lobbySocket || lobbySocket.readyState !== 1) return;
  lobbySocket.send(JSON.stringify({ type: 'chat', message: msg }));
  input.value = '';
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function addChatMessage(name, text) {
  var log = document.getElementById('ChatLog');
  if (!log) return;
  var div = document.createElement('div');
  div.className = 'chat-msg';
  text = censorProfanity(text);
  div.innerHTML = name
    ? '<span class="chat-name">' + escHtml(name) + '</span>: ' + escHtml(text)
    : '<span class="chat-sys">' + escHtml(text) + '</span>';
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 100) log.removeChild(log.firstChild);
}
function updatePlayerCount(n) {
  var el = document.getElementById('PlayerCountNum');
  if (el) el.textContent = n;
}

// ── online / spectator state ──────────────────────────────
var onlineMode          = false;
var isSpectator         = false;
var mySide              = null;
var onlineInputInterval = null;
var onlinePointText     = null;
var showingLobbySelect  = false;
var currentRoomId       = null;
var onlinePregameState  = null;

// ── online player info ────────────────────────────────────
var playerNameLeft  = 'Player 1';
var playerNameRight = 'Player 2';
var leftStreak      = 0;
var rightStreak     = 0;
var rallyCount      = 0;
var sessionWins     = 0;
var sessionLosses   = 0;

// ── emotes ────────────────────────────────────────────────
var EMOTE_LIST = ['👋','🔥','💪','😎'];
var emoteLeft = null, emoteRight = null;
var emoteLeftEnd = 0, emoteRightEnd = 0;

// ── screen shake ─────────────────────────────────────────
var shakeFrames = 0, shakeAmt = 0;

// ── particles ─────────────────────────────────────────────
var particles = [];
