// Online: the lobby socket (matches, ranked, tournaments, chat).
var lobbySocket    = null;
var myPlayerName   = '';
var currentLobbies = [];
var waitingInterval = null;
function connectLobby() {
  if (lobbySocket) return;
  if (window.SLIME_BACKEND_DISABLED) {
    updatePlayerCount(0);
    return;
  }
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
    if (onlineMode || isSpectator) {
      // Save rejoin info if we were mid-game so we can auto-rejoin
      if (onlineMode && currentRoomId !== null) {
        var rjToken = null;
        try { rjToken = localStorage.getItem('slime_rejoinToken'); } catch(e) {}
        if (rjToken) {
          try {
            localStorage.setItem('slime_pendingRejoinRoom',  String(currentRoomId));
            localStorage.setItem('slime_pendingRejoinToken', rjToken);
          } catch(e) {}
        }
      }
      if (typeof onlineInputInterval !== 'undefined') clearInterval(onlineInputInterval);
      onlineMode = false; isSpectator = false;
      canvas.style.display = 'none';
      menuDiv.style.display = 'block';
      menuDiv.innerHTML = '<div style="text-align:center;padding:80px 20px"><div style="color:#ff6666;font-size:clamp(14px,1.4vw,22px);letter-spacing:4px;margin-bottom:10px;">CONNECTION LOST</div><div style="color:#444;font-size:clamp(13px,1vw,15px);letter-spacing:2px;">Reconnecting&hellip;</div></div>';
      hideSpecBadge(); showBottomBar();
      setTimeout(connectLobby, 2000);
    } else {
      setTimeout(connectLobby, 4000);
    }
  };
}
