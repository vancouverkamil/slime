var slimeverseActive = false;
var slimeversePlayers = {};
var slimeverseSelfId = null;
var slimeverseWorld = { width: 4500, height: 2250, floorY: 1980 };
var slimeverseInputTimer = null;
var slimeverseFrame = 0;
var slimeverseCamera = { x: 0, y: 0 };

function startSlimeverse() {
  if (!lobbySocket || lobbySocket.readyState !== 1) {
    addChatMessage(null, 'Still connecting to server...');
    return;
  }
  showingLobbySelect = false;
  leaveLobby();
  slimeverseActive = true;
  onlineMode = false;
  isSpectator = false;
  currentRoomId = null;
  hideSpecBadge();
  showLeaveBtn(true);
  hideBottomBar();
  canvas.style.display = 'block';
  menuDiv.style.display = 'none';
  lobbySocket.send(JSON.stringify({ type: 'enter_slimeverse' }));
  sendCustomization();
  startSlimeverseInput();
  requestAnimationFrame(renderSlimeverse);
}

function leaveSlimeverse() {
  if (!slimeverseActive) return;
  slimeverseActive = false;
  if (slimeverseInputTimer) {
    clearInterval(slimeverseInputTimer);
    slimeverseInputTimer = null;
  }
  slimeversePlayers = {};
  if (lobbySocket && lobbySocket.readyState === 1) {
    lobbySocket.send(JSON.stringify({ type: 'leave_slimeverse' }));
  }
  showLeaveBtn(false);
  canvas.style.display = 'none';
  menuDiv.style.display = 'block';
  showBottomBar();
  toInitialMenu();
}

function handleSlimeverseMessage(msg) {
  if (msg.type === 'slimeverse_joined') {
    slimeverseActive = true;
    slimeverseSelfId = msg.selfId;
    slimeverseWorld = msg.world || slimeverseWorld;
    if (msg.player) slimeversePlayers[msg.player.id] = msg.player;
    return true;
  }
  if (msg.type === 'slimeverse_state') {
    (msg.players || []).forEach(function(p) {
      slimeversePlayers[p.id] = Object.assign(slimeversePlayers[p.id] || {}, p);
    });
    return true;
  }
  if (msg.type === 'slimeverse_leave') {
    delete slimeversePlayers[msg.id];
    return true;
  }
  if (msg.type === 'slimeverse_customized' && msg.player) {
    slimeversePlayers[msg.player.id] = Object.assign(slimeversePlayers[msg.player.id] || {}, msg.player);
    return true;
  }
  return false;
}

function startSlimeverseInput() {
  if (slimeverseInputTimer) clearInterval(slimeverseInputTimer);
  slimeverseInputTimer = setInterval(function() {
    if (!slimeverseActive || !lobbySocket || lobbySocket.readyState !== 1) return;
    var left = !!(keysDown[KEY_A] || keysDown[KEY_LEFT]);
    var right = !!(keysDown[KEY_D] || keysDown[KEY_RIGHT]);
    var jump = !!(keysDown[KEY_W] || keysDown[KEY_UP] || keysDown[KEY_SPACE]);
    if (jump) keysDown[KEY_SPACE] = false;
    lobbySocket.send(JSON.stringify({ type: 'slimeverse_input', left, right, jump }));
  }, 50);
}

function renderSlimeverse() {
  if (!slimeverseActive) return;
  slimeverseFrame++;
  var me = slimeversePlayers[slimeverseSelfId];
  if (me) {
    slimeverseCamera.x += ((me.x || 0) - viewWidth / 2 - slimeverseCamera.x) * 0.12;
    slimeverseCamera.y += ((me.y || 0) - viewHeight * 0.62 - slimeverseCamera.y) * 0.12;
  }
  slimeverseCamera.x = Math.max(0, Math.min(slimeverseWorld.width - viewWidth, slimeverseCamera.x));
  slimeverseCamera.y = Math.max(0, Math.min(slimeverseWorld.height - viewHeight, slimeverseCamera.y));

  drawSlimeverseWorld();
  Object.keys(slimeversePlayers)
    .map(function(id) { return slimeversePlayers[id]; })
    .sort(function(a, b) { return (a.y || 0) - (b.y || 0); })
    .forEach(drawSlimeversePlayer);
  drawSlimeverseHud();
  requestAnimationFrame(renderSlimeverse);
}

function svx(x) { return Math.round(x - slimeverseCamera.x); }
function svy(y) { return Math.round(y - slimeverseCamera.y); }

function drawSlimeverseWorld() {
  var t = Date.now() / 1000;
  var cx = ctx;
  var w = viewWidth, h = viewHeight;
  var camX = slimeverseCamera.x, camY = slimeverseCamera.y;

  var bg = cx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#00162b');
  bg.addColorStop(0.45, '#01284a');
  bg.addColorStop(1, '#041225');
  cx.fillStyle = bg;
  cx.fillRect(0, 0, w, h);

  for (var layer = 0; layer < 3; layer++) {
    cx.strokeStyle = layer === 0 ? 'rgba(0,255,220,.08)' : layer === 1 ? 'rgba(110,60,255,.06)' : 'rgba(255,255,255,.045)';
    cx.lineWidth = 1 + layer;
    for (var yy = -80; yy < h + 120; yy += 44 + layer * 18) {
      cx.beginPath();
      for (var x = -30; x <= w + 30; x += 28) {
        var wy = yy + Math.sin((x + camX * (0.18 + layer * 0.06)) / (58 + layer * 24) + t * (0.55 + layer * 0.22)) * (7 + layer * 4);
        if (x === -30) cx.moveTo(x, wy);
        else cx.lineTo(x, wy);
      }
      cx.stroke();
    }
  }

  for (var i = 0; i < 52; i++) {
    var bx = ((i * 313 + Math.floor(t * 20)) % slimeverseWorld.width) - camX;
    var by = ((i * 197 - Math.floor(t * (18 + i % 5))) % slimeverseWorld.height) - camY;
    if (by < -20) by += slimeverseWorld.height;
    var br = 1.5 + (i % 4);
    cx.strokeStyle = 'rgba(190,245,255,' + (0.08 + (i % 3) * 0.035) + ')';
    cx.beginPath();
    cx.arc(bx, by, br, 0, TWO_PI);
    cx.stroke();
  }

  var domeX = svx(slimeverseWorld.width / 2);
  var domeY = svy(slimeverseWorld.floorY + 30);
  var domeR = 720;
  var dome = cx.createRadialGradient(domeX, domeY - domeR * 0.55, domeR * 0.16, domeX, domeY - domeR * 0.38, domeR);
  dome.addColorStop(0, 'rgba(210,255,255,.18)');
  dome.addColorStop(0.68, 'rgba(120,240,255,.055)');
  dome.addColorStop(1, 'rgba(0,255,220,.02)');
  cx.fillStyle = dome;
  cx.beginPath();
  cx.arc(domeX, domeY, domeR, Math.PI, TWO_PI);
  cx.lineTo(domeX + domeR, domeY);
  cx.lineTo(domeX - domeR, domeY);
  cx.closePath();
  cx.fill();
  cx.strokeStyle = 'rgba(170,255,255,.25)';
  cx.lineWidth = 2;
  cx.beginPath();
  cx.arc(domeX, domeY, domeR, Math.PI, TWO_PI);
  cx.stroke();
  cx.lineWidth = 1;

  cx.fillStyle = 'rgba(0,255,200,.075)';
  for (var rib = -5; rib <= 5; rib++) {
    var rx = domeX + rib * 132 - (camX % 20) * 0.05;
    cx.beginPath();
    cx.ellipse(rx, domeY - domeR * 0.36, 15, domeR * 0.58, 0, Math.PI, TWO_PI);
    cx.strokeStyle = 'rgba(170,255,255,.09)';
    cx.stroke();
  }

  var floorY = svy(slimeverseWorld.floorY);
  var floor = cx.createLinearGradient(0, floorY - 24, 0, h);
  floor.addColorStop(0, '#1a4a38');
  floor.addColorStop(0.5, '#0c2a24');
  floor.addColorStop(1, '#061414');
  cx.fillStyle = floor;
  cx.fillRect(0, floorY, w, h - floorY);
  cx.strokeStyle = 'rgba(0,255,200,.28)';
  cx.beginPath();
  cx.moveTo(0, floorY);
  cx.lineTo(w, floorY);
  cx.stroke();

  for (var k = 0; k < 34; k++) {
    var kx = svx((k * 277) % slimeverseWorld.width);
    var kh = 42 + (k % 5) * 24;
    if (kx < -40 || kx > w + 40) continue;
    cx.strokeStyle = 'rgba(0,180,95,.32)';
    cx.lineWidth = 3;
    cx.beginPath();
    cx.moveTo(kx, floorY);
    cx.bezierCurveTo(kx + Math.sin(t + k) * 18, floorY - kh * 0.4, kx - 14, floorY - kh * 0.75, kx + 8, floorY - kh);
    cx.stroke();
    cx.lineWidth = 1;
  }
}

function drawSlimeversePlayer(p) {
  var x = svx(p.x || 0);
  var y = svy(p.y || slimeverseWorld.floorY);
  if (x < -80 || x > viewWidth + 80 || y < -120 || y > viewHeight + 80) return;
  var r = 24;
  var color = p.color || '#00ff00';
  ctx.save();
  ctx.globalAlpha = p.id === slimeverseSelfId ? 1 : 0.86;
  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, color);
    var sc = (r * 2) / tc.width;
    ctx.drawImage(tc, x - r, y - tc.height * sc * 0.72, tc.width * sc, tc.height * sc);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, TWO_PI);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + r * 0.25, y - r * 0.42, r * 0.18, 0, TWO_PI);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.42, r * 0.08, 0, TWO_PI);
  ctx.fill();
  drawHatAt(ctx, x, y - r + 1, r, { hat: p.hat || 'none', anim: p.hatAnim || 'none', drawing: p.hatDrawing || [] });
  var label = (p.name || 'Player') + '  L' + (p.level || 1);
  ctx.font = 'bold 9px Courier New';
  var tw = ctx.measureText(label).width + 14;
  ctx.fillStyle = 'rgba(0,0,14,.52)';
  ctx.fillRect(x - tw / 2, y - 66, tw, 15);
  ctx.fillStyle = p.id === slimeverseSelfId ? '#ffd966' : '#00ffcc';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y - 55);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawSlimeverseHud() {
  ctx.save();
  ctx.font = 'bold 10px Courier New';
  ctx.fillStyle = 'rgba(0,0,16,.62)';
  ctx.fillRect(10, 10, 226, 36);
  ctx.strokeStyle = 'rgba(0,255,200,.22)';
  ctx.strokeRect(10, 10, 226, 36);
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('SLIMEVERSE // GLASS DOME', 20, 24);
  ctx.fillStyle = '#555';
  ctx.fillText('A/D or arrows to move · W/UP/SPACE to jump', 20, 38);
  ctx.restore();
}
