// WebSocket/API backend URL for online multiplayer.
// Local/self-hosted builds use the same origin. Production static builds should
// define window.SLIME_BACKEND_URL before this file loads.
(function() {
  var host = window.location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  var backend = window.SLIME_BACKEND_URL || '';
  window.slimeAssetUrl = function(path) {
    if (window.SLIME_SUPABASE_FUNCTION_ASSETS) return '?file=' + path;
    return path;
  };
  if (isLocal || !backend) {
    window.SLIME_WS_URL = null;
    window.SLIME_API_URL = '';
    window.SLIME_BACKEND_DISABLED = !isLocal && !backend;
    return;
  }
  window.SLIME_BACKEND_DISABLED = false;
  window.SLIME_WS_URL = backend.replace(/^http/, 'ws');
  window.SLIME_API_URL = Object.prototype.hasOwnProperty.call(window, 'SLIME_API_URL_OVERRIDE')
    ? window.SLIME_API_URL_OVERRIDE
    : backend;
})();
