var lobbySocket    = null;
var myPlayerName   = '';
var currentLobbies = [];
var playerBodyColor  = '#00ff00';
var playerHat        = 'none';
var playerHatAnim    = 'none';
var playerHatDrawing = [];
var hatConfigs = {
  left:  { hat: 'none', color: '#00ff00', drawing: [], anim: 'none' },
  right: { hat: 'none', color: '#ff0000', drawing: [], anim: 'none' }
};
var _tintCache = {};
var waitingInterval = null;
var previewAnimInterval = null;
var HAT_ANIM_OPTIONS = [
  { id: 'none',    label: 'None'    },
  { id: 'glow',   label: 'Glow'    },
  { id: 'chaser', label: 'Chaser'  },
  { id: 'rainbow',label: 'Rainbow' },
  { id: 'pulse',  label: 'Pulse'   },
  { id: 'sparkle',label: 'Sparkle' },
  { id: 'wave',   label: 'Wave'    },
];
var BODY_COLORS = ['#00ff00','#00ffcc','#0066ff','#aa00ff','#ff2200','#ff8800','#ff00aa','#eeeeee'];
var HAT_OPTIONS = [
  { id:'none',   label:'None'    },
  { id:'crown',  label:'Crown'   },
  { id:'goldcrown', label:'Gold Crown', minLevel:70 },
  { id:'tophat', label:'Top Hat' },
  { id:'cowboy', label:'Cowboy'  },
  { id:'halo',   label:'Halo'    },
  { id:'party',  label:'Party'   },
  { id:'custom', label:'Custom'  },
];
var profanityFilterEnabled = true;
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
  try { localStorage.setItem('slime_profanity_filter', profanityFilterEnabled ? '1' : '0'); } catch(e) {}
}

function initProfanityToggle() {
  try {
    var saved = localStorage.getItem('slime_profanity_filter');
    if (saved !== null) profanityFilterEnabled = saved !== '0';
  } catch(e) {}
  var el = document.getElementById('ProfanityToggle');
  if (el) el.checked = profanityFilterEnabled;
}

function getTintedCanvas(img, color) {
  var key = (img.src || '') + '|' + color;
  if (_tintCache[key]) return _tintCache[key];
  var oc = document.createElement('canvas');
  oc.width  = img.naturalWidth  || img.width  || 175;
  oc.height = img.naturalHeight || img.height || 175;
  var oc2 = oc.getContext('2d');
  oc2.drawImage(img, 0, 0);
  oc2.globalCompositeOperation = 'source-atop';
  oc2.globalAlpha = 0.62;
  oc2.fillStyle = color;
  oc2.fillRect(0, 0, oc.width, oc.height);
  oc2.globalCompositeOperation = 'source-over';
  oc2.globalAlpha = 1;
  _tintCache[key] = oc;
  return oc;
}

function connectLobby() {
  if (lobbySocket) return;
  var wsUrl = window.SLIME_WS_URL ||
    ((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host);
  if (accountSessionToken) {
    wsUrl += (wsUrl.indexOf('?') === -1 ? '?' : '&') + 'session=' + encodeURIComponent(accountSessionToken);
  }
  try { lobbySocket = new WebSocket(wsUrl); } catch(e) { return; }

  lobbySocket.onmessage = function(e) {
    try { handleServerMessage(JSON.parse(e.data)); } catch(_) {}
  };
  lobbySocket.onclose = function() {
    lobbySocket = null; updatePlayerCount(0);
    if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
      slimeverseActive = false;
      if (slimeverseInputTimer) { clearInterval(slimeverseInputTimer); slimeverseInputTimer = null; }
      canvas.style.display = 'none';
      menuDiv.style.display = 'block';
      showLeaveBtn(false); showBottomBar(); toInitialMenu();
      setTimeout(connectLobby, 2000);
      return;
    }
    if (onlineMode || isSpectator) {
      clearInterval(onlineInputInterval);
      onlineMode = false; isSpectator = false;
      canvas.style.display = 'none';
      menuDiv.style.display = 'block';
      menuDiv.innerHTML = '<div style="text-align:center;padding-top:80px;"><h2>Connection lost</h2></div>';
      hideSpecBadge(); showBottomBar();
      setTimeout(function() { connectLobby(); toInitialMenu(); }, 2000);
    } else {
      setTimeout(connectLobby, 4000);
    }
  };
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
