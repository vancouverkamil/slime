// Game: shared local-match state, win tracking and ranks.
var physicsLog = 0;
var TWO_PI = Math.PI * 2;
var WIN_AMOUNT = 7;

var GAME_STATE_RUNNING = 1, GAME_STATE_POINT_PAUSE = 2,
    GAME_STATE_MENU_PAUSE = 3, GAME_STATE_MENU_PAUSE_BETWEEN_POINTS = 4,
    GAME_STATE_SHOW_WINNER = 5;

var menuDiv, smallMenuDiv, onePlayer, nextSlimeIndex, gameState;
var ctx, canvas, viewWidth, viewHeight, courtYPix, pixelsPerUnitX, pixelsPerUnitY;
var updatesToPaint, legacySkyColor, legacyGroundColor, legacyBallColor, newGroundColor;
var backImage, backTextColor, backImages = {}, ballImage, gameIntervalObject, endOfPointText;
var greenSlimeImage, redSlimeImage, legacyGraphics;
var gameWidth, gameHeight, ball, slimeLeft, slimeRight, slimeLeftScore, slimeRightScore;
var slimeAI, updateCount, leftWon, slowMotion, logString;
var final4Mode = false, final4Index = 0, final4WinPending = false;
var localMapId = null;
var gameScale = (typeof localStorage !== 'undefined' && localStorage.getItem('slime_scale')) || 'compact';
var gameSfxEnabled = (typeof localStorage === 'undefined' || localStorage.getItem('slime_sfx') !== 'off');
var screenFxEnabled = (typeof localStorage === 'undefined' || localStorage.getItem('slime_screenFx') !== 'off');
var localRallyCount = 0, localLastBallSide = null, localPointFlash = null, localPointFlashEnd = 0;

var totalWins = 0;
try { totalWins = parseInt(localStorage.getItem('slime_totalWins') || '0') || 0; } catch(e) {}
function recordWin() {
  totalWins++;
  try { localStorage.setItem('slime_totalWins', totalWins); } catch(e){}
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type: 'set_name', name: myPlayerName, wins: totalWins, rank: getPlayerRank() }));
}
function getPlayerRank() {
  if (totalWins >= 10) return 'LIEUTENANT';
  if (totalWins >= 6)  return 'SERGEANT';
  if (totalWins >= 3)  return 'CORPORAL';
  return 'PRIVATE';
}
function showLockedNotice(need) {
  addChatMessage(null, 'Classified court — earn ' + need + ' more win' + (need !== 1 ? 's' : '') + ' to reach Lieutenant rank.');
}

function log(msg) { logString += msg + '\n'; }
