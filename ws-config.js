// WebSocket server URL for online multiplayer.
// Local/self-hosted builds use the same origin; static hosted builds use the
// deployed websocket server.
(function() {
  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  window.SLIME_WS_URL = isLocal ? null : 'wss://slime-7wuo.onrender.com';
})();
