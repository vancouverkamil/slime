// Online: global chat and the profanity filter.
var profanityFilterEnabled = (typeof localStorage === 'undefined' || localStorage.getItem('slime_profanity') !== 'off');
var chatJoined = (typeof localStorage !== 'undefined' && localStorage.getItem('slime_chat_joined') === '1');
var chatUnreadCount = 0;
var PROFANITY_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'cunt', 'pussy',
  'slut', 'whore', 'fag', 'nigger', 'retard'
];

function censorProfanity(text) {
  if (!profanityFilterEnabled) return text;
  var out = String(text || '');
  PROFANITY_WORDS.forEach(function(word) {
    var re = new RegExp('\\b' + word + '\\b', 'ig');
    out = out.replace(re, function(match) {
      return match.charAt(0) + Array(match.length).join('*');
    });
  });
  return out;
}

function setProfanityFilter(on) {
  profanityFilterEnabled = !!on;
  try {
    localStorage.setItem('slime_profanity', profanityFilterEnabled ? 'on' : 'off');
    localStorage.setItem('slime_profanity_filter', profanityFilterEnabled ? '1' : '0');
  } catch(e) {}
  syncProfanityToggles();
}

function syncProfanityToggles() {
  var toggles = document.querySelectorAll('.profanity-toggle');
  for (var i = 0; i < toggles.length; i++) toggles[i].checked = profanityFilterEnabled;
}

function initProfanityToggle() {
  try {
    var saved = localStorage.getItem('slime_profanity');
    var legacy = localStorage.getItem('slime_profanity_filter');
    if (saved !== null) profanityFilterEnabled = saved !== 'off';
    else if (legacy !== null) profanityFilterEnabled = legacy !== '0';
  } catch(e) {}
  syncProfanityToggles();
}

function applyChatJoinState() {
  var section = document.getElementById('ChatSection');
  if (!section) return;
  section.classList.toggle('chat-locked', !chatJoined);
  updateChatUnreadNote();
}
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
