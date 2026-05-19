var KEY_A = 65;
var KEY_D = 68;
var KEY_W = 87;
var KEY_E = 69;

var KEY_SPACE = 32;

var KEY_LEFT  = 37;
var KEY_UP    = 38;
var KEY_RIGHT = 39;
var KEY_DOWN  = 40;


var keysDown = {};
addEventListener("keydown", function(e) {
  // ESC: close store or leave slimeverse
  if (e.keyCode === 27) {
    if (typeof slimeverseActive !== 'undefined' && slimeverseActive) {
      if (typeof slimeverseStoreOpen !== 'undefined' && slimeverseStoreOpen) {
        if (typeof closeSlimeverseStore === 'function') closeSlimeverseStore();
      } else {
        if (typeof leaveSlimeverse === 'function') leaveSlimeverse();
      }
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
