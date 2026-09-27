// ── Slimeverse network ────────────────────────────────────
// The Slimeverse has its own socket (/slimeverse) and its own server-side
// identity. The lobby socket that carries matches, ranked and tournaments
// never sees Slimeverse traffic, and this socket never sees game traffic.
var slimeverseSocket = null;

function slimeverseSocketUrl() {
  var base = window.SLIME_WS_URL ||
    ((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host);
  var params = [];
  if (accountSessionToken) params.push('session=' + encodeURIComponent(accountSessionToken));
  if (!currentAccount && myPlayerName) params.push('name=' + encodeURIComponent(myPlayerName));
  return base.replace(/\/+$/, '') + '/slimeverse' + (params.length ? '?' + params.join('&') : '');
}

function svSend(msg) {
  if (slimeverseSocket && slimeverseSocket.readyState === 1) slimeverseSocket.send(JSON.stringify(msg));
}

function connectSlimeverse() {
  disconnectSlimeverse();
  var sock;
  try { sock = new WebSocket(slimeverseSocketUrl()); } catch (e) { return false; }
  slimeverseSocket = sock;
  sock.onopen = function() { sendSlimeverseAppearance(); };
  sock.onmessage = function(e) {
    if (sock !== slimeverseSocket) return;
    try { handleSlimeverseMessage(JSON.parse(e.data)); } catch (_) {}
  };
  sock.onclose = function() {
    if (sock !== slimeverseSocket) return; // closed on purpose by disconnectSlimeverse
    slimeverseSocket = null;
    if (slimeverseActive) {
      addChatMessage(null, 'Lost connection to the Slimeverse.');
      leaveSlimeverse();
    }
  };
  return true;
}

function disconnectSlimeverse() {
  var sock = slimeverseSocket;
  slimeverseSocket = null;
  if (sock) try { sock.close(); } catch (e) {}
}

// Your slime's look is shared with the rest of the site (it is saved on your
// account); only its presence and position in the world are Slimeverse-only.
function sendSlimeverseAppearance() {
  svSend({ type: 'appearance', hat: playerHat, hatAnim: playerHatAnim, color: playerBodyColor, hatDrawing: playerHatDrawing });
}

function handleSlimeverseMessage(msg) {
  if (msg.type === 'welcome') {
    slimeverseSelfId = msg.selfId;
    slimeverseWorld  = msg.world || slimeverseWorld;
    if (msg.player) {
      slimeversePlayers[msg.player.id] = msg.player;
      mvSyncFromServer(mvLocal, msg.player, slimeverseWorld);
    }
  } else if (msg.type === 'state') {
    (msg.players || []).forEach(function(p) {
      slimeversePlayers[p.id] = Object.assign(slimeversePlayers[p.id] || {}, p);
      if (p.id === slimeverseSelfId) mvReconcile(mvLocal, p, 0.06);
    });
  } else if (msg.type === 'leave') {
    delete slimeversePlayers[msg.id];
    delete slimeverseVisualPlayers[msg.id];
  } else if (msg.type === 'appearance' && msg.player) {
    slimeversePlayers[msg.player.id] = Object.assign(slimeversePlayers[msg.player.id] || {}, msg.player);
  }
}

// ── Input (send to server) ────────────────────────────────
function startSlimeverseInput() {
  if (slimeverseInputInterval) clearInterval(slimeverseInputInterval);
  slimeverseInputInterval = setInterval(function() {
    // Wait for the server's welcome (which sets our spawn point) before reporting a pose.
    if (!slimeverseActive || !slimeverseSelfId) return;
    if (svStoreInside) {
      svSend({ type: 'store_move', storeX: svStorePlayerX });
      return;
    }
    var inp = mvGetInput();
    svSend({
      type: 'input',
      left: inp.left, right: inp.right,
      jump: inp.jump, fwd: inp.fwd, back: inp.back,
      x: mvLocal.x, y: mvLocal.y, z: mvLocal.z,
      vx: mvLocal.vx, vy: mvLocal.vy, vz: mvLocal.vz,
    });
  }, 16);
}
