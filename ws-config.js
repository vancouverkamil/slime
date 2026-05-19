// WebSocket server URL for online multiplayer.
// Local/self-hosted builds use the same origin; static hosted builds use the
// deployed websocket server.
(function() {
  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  var isRender = host === 'slime-7wuo.onrender.com';
  window.SLIME_WS_URL = (isLocal || isRender) ? null : 'wss://slime-7wuo.onrender.com';
  window.SLIME_API_URL = (isLocal || isRender) ? '' : 'https://slime-7wuo.onrender.com';
})();
