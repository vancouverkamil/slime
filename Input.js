var DEFAULT_KEYBINDS = {
  p1Left: 65, p1Right: 68, p1Jump: 87,
  p2Left: 37, p2Right: 39, p2Jump: 38
};
var slimeKeybinds = Object.assign({}, DEFAULT_KEYBINDS);
try {
  var savedKeybinds = JSON.parse(localStorage.getItem('slime_keybinds') || '{}');
  Object.keys(DEFAULT_KEYBINDS).forEach(function(id) {
    if (savedKeybinds[id] >= 8 && savedKeybinds[id] <= 222) slimeKeybinds[id] = savedKeybinds[id];
  });
} catch(e) {}

var KEY_A = slimeKeybinds.p1Left;
var KEY_D = slimeKeybinds.p1Right;
var KEY_W = slimeKeybinds.p1Jump;
var KEY_E = 69;

var KEY_SPACE = 32;

var KEY_LEFT  = slimeKeybinds.p2Left;
var KEY_UP    = slimeKeybinds.p2Jump;
var KEY_RIGHT = slimeKeybinds.p2Right;
var KEY_DOWN  = 40;

var _listeningForKeybind = null;

function applySlimeKeybinds() {
  KEY_A = slimeKeybinds.p1Left;
  KEY_D = slimeKeybinds.p1Right;
  KEY_W = slimeKeybinds.p1Jump;
  KEY_LEFT = slimeKeybinds.p2Left;
  KEY_RIGHT = slimeKeybinds.p2Right;
  KEY_UP = slimeKeybinds.p2Jump;
}

function saveSlimeKeybinds() {
  applySlimeKeybinds();
  try { localStorage.setItem('slime_keybinds', JSON.stringify(slimeKeybinds)); } catch(e) {}
  if (typeof renderKeybindControls === 'function') renderKeybindControls();
}

function resetSlimeKeybinds() {
  slimeKeybinds = Object.assign({}, DEFAULT_KEYBINDS);
  keysDown = {};
  _listeningForKeybind = null;
  saveSlimeKeybinds();
}

function startKeybindListen(id) {
  _listeningForKeybind = id;
  if (typeof renderKeybindControls === 'function') renderKeybindControls();
}

function keyCodeLabel(code) {
  var names = {
    8: 'BACKSPACE', 9: 'TAB', 13: 'ENTER', 16: 'SHIFT', 17: 'CTRL', 18: 'ALT',
    20: 'CAPS', 27: 'ESC', 32: 'SPACE', 37: 'LEFT', 38: 'UP', 39: 'RIGHT', 40: 'DOWN',
    46: 'DELETE', 91: 'META', 93: 'META'
  };
  if (names[code]) return names[code];
  if (code >= 48 && code <= 90) return String.fromCharCode(code);
  if (code >= 96 && code <= 105) return 'NUM ' + (code - 96);
  if (code >= 112 && code <= 123) return 'F' + (code - 111);
  return 'KEY ' + code;
}

var keysDown = {};
addEventListener("keydown", function(e) {
  if (_listeningForKeybind) {
    if (e.keyCode !== 27) {
      slimeKeybinds[_listeningForKeybind] = e.keyCode;
      saveSlimeKeybinds();
    } else {
      _listeningForKeybind = null;
      if (typeof renderKeybindControls === 'function') renderKeybindControls();
    }
    e.preventDefault();
    return;
  }
  // ESC: close store or leave slimeverse
  if (e.keyCode === 27) {
    if (typeof svStoreInside !== 'undefined' && svStoreInside) {
      if (typeof exitStoreInterior === 'function') exitStoreInterior();
      e.preventDefault();
    } else if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
      if (typeof leaveSlimeverse === 'function') leaveSlimeverse();
      e.preventDefault();
    }
    return;
  }
  // Prevent page scroll on arrow keys while in slimeverse
  if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
    if (e.keyCode === KEY_UP || e.keyCode === KEY_DOWN) e.preventDefault();
  }
  if (e.keyCode == KEY_SPACE) {
    if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
      keysDown[e.keyCode] = true;
      return;
    }
    spaceKeyDown();
  } else {
    keysDown[e.keyCode] = true;
  }
}, false);
addEventListener("keyup", function(e) {
  keysDown[e.keyCode] = false;
}, false);
