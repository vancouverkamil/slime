// Game: The Final 4 boss gauntlet.
// ── The Final 4 ───────────────────────────────────────────
function startFinal4() {
  claimScreen('local-match');
  tournamentMode = false; tournamentState = null; tournamentWinPending = false;
  final4Mode = true; final4WinPending = false; final4Index = 0;
  startFinal4Round();
}
function startFinal4Round() {
  var boss = final4AIs[final4Index];
  currentRoomId = null; currentRoomMapId = null;
  localMapId          = boss.mapId;
  newGroundColor      = boss.newGroundColor;
  backTextColor       = boss.backTextColor;
  onePlayer           = true;
  slimeLeftScore      = 0; slimeRightScore = 0;
  localRallyCount = 0; localLastBallSide = null; localPointFlash = null; particles = [];
  shakeFrames = 0; shakeAmt = 0;
  slimeLeft.img       = greenSlimeImage;
  slimeLeft.color     = playerBodyColor;
  slimeLeft.tintColor = playerBodyColor;
  slimeRight.color    = boss.color;
  slimeRight.img      = null;
  slimeRight.tintColor = null;
  legacySkyColor      = '#000'; legacyGroundColor = '#111'; legacyBallColor = '#fff';
  slimeAI             = newSlimeAI(false, boss.name);
  setMentalSlime(slimeAI, boss.level);
  initRound(true); updatesToPaint = 0; updateCount = 0;
  loadOptions(); gameState = GAME_STATE_RUNNING;
  renderBackground();
  canvas.style.display = 'block'; menuDiv.style.display = 'none'; hideBottomBar();
  startLocalGameLoop();
}
