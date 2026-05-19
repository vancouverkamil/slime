function bodyload() {
  var contentDiv = document.getElementById('GameContentDiv');

  canvas = document.createElement('canvas');
  canvas.width = 750; canvas.height = 375;
  canvas.style.position = 'absolute'; canvas.style.left = '0'; canvas.style.top = '0';
  canvas.style.display = 'none';
  ctx = canvas.getContext('2d'); ctx.font = '20px Georgia';
  contentDiv.appendChild(canvas);

  gameWidth = 1000; gameHeight = 1000;
  updateWindowSize(canvas.width, canvas.height);

  menuDiv = document.createElement('div');
  menuDiv.style.position = 'absolute'; menuDiv.style.left = '0'; menuDiv.style.top = '0';
  menuDiv.style.width = '750px'; menuDiv.style.height = '375px';
  menuDiv.style.background = '#05000f';
  contentDiv.appendChild(menuDiv);

  logString = ''; nextSlimeIndex = 0;
  ball       = newLegacyBall(25, '#ff0');
  slimeLeft  = newLegacySlime(true,  100, '#0f0');
  slimeRight = newLegacySlime(false, 100, '#f00');

  ['sky2.jpg','cave.jpg','sunset.jpg'].forEach(function(src) {
    var img = new Image(); img.src = src;
    img.onload = function() {
      backImages[src.replace('.jpg','')] = this;
      if (src === 'sky2.jpg') backImages['sky'] = this;
    };
  });
  var bi = new Image(); bi.src = 'vball.png'; bi.onload = function() { ballImage = this; };
  greenSlimeImage = new Image(); greenSlimeImage.src = 'slime175green.png';
  redSlimeImage   = new Image(); redSlimeImage.src   = 'slime175red.png';

  // Load persisted guest name
  var savedName = localStorage.getItem('slimeName');
  if (savedName) {
    myPlayerName = savedName;
  }
  initProfanityToggle();

  // Load persisted customization
  playerBodyColor = localStorage.getItem('slimeBodyColor') || '#00ff00';
  playerHat       = localStorage.getItem('slimeHat')       || 'none';
  playerHatAnim   = localStorage.getItem('slimeHatAnim')   || 'none';
  try { playerHatDrawing = JSON.parse(localStorage.getItem('slimeHatDrawing') || '[]'); } catch(e) { playerHatDrawing = []; }
  // migrate old format: strokes were plain arrays of points, now wrapped in {pts, color, size, brush}
  playerHatDrawing = playerHatDrawing.map(function(s) {
    return Array.isArray(s) ? {pts:s, color:'#ffffff', size:4, brush:'pen'} : s;
  });
  hatConfigs.left.color = playerBodyColor; hatConfigs.left.hat = playerHat; hatConfigs.left.drawing = playerHatDrawing; hatConfigs.left.anim = playerHatAnim;
  syncCustomizationUI();

  // Pre-render map preview thumbnails for lobby select
  buildMapPreviews();

  // Populate drop selector
  var sel = document.getElementById('DropSelect');
  if (sel) dropNames.forEach(function(name, i) {
    var opt = document.createElement('option'); opt.value = i; opt.textContent = (i+1) + '. ' + name;
    sel.appendChild(opt);
  });

  // ESC key handler
  document.addEventListener('keydown', function(e) {
    if (e.keyCode === 27) {
      if (replayInterval) return;
      if (escMenuOpen) { hideEscMenu(); return; }
      if (onlineMode || isSpectator) { showEscMenu(); return; }
      if (gameState === GAME_STATE_RUNNING || gameState === GAME_STATE_POINT_PAUSE) { showEscMenu(); return; }
    }
  });

  // Init audio context on first click (browser policy)
  document.addEventListener('click', function() { initAC(); }, { once: true });

  // Game scale (fullscreen toggle) — resize canvas if preference is saved
  window.addEventListener('resize', _onWindowResize);
  applyGameScale();
  // Sync scale buttons to saved preference
  var fb = document.getElementById('ScaleFull'), cb = document.getElementById('ScaleCompact');
  if (fb && cb) { fb.classList.toggle('active', gameScale === 'full'); cb.classList.toggle('active', gameScale === 'compact'); }
  var sfx = document.getElementById('GameSfx'), fx = document.getElementById('ScreenFx');
  if (sfx) sfx.checked = gameSfxEnabled;
  if (fx) fx.checked = screenFxEnabled;

  loadAccount().then(function() {
    loadLeaderboard();
    setInterval(loadLeaderboard, 20000);
    toInitialMenu();
    connectLobby();
  });
}
