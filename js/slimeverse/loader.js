// ── Slimeverse loader ─────────────────────────────────────
// The Slimeverse is loaded on demand the first time a player opens it. This is
// the one list of its component files, in load order.
var SLIMEVERSE_SCRIPTS = [
  'js/slimeverse/state.js',
  'js/slimeverse/prediction.js',
  'js/slimeverse/network.js',
  'js/slimeverse/lifecycle.js',
  'js/slimeverse/loop.js',
  'js/slimeverse/world.js',
  'js/slimeverse/world-props.js',
  'js/slimeverse/store-building.js',
  'js/slimeverse/final4-tower.js',
  'js/slimeverse/final4-tower-frame.js',
  'js/slimeverse/final4-tower-floors.js',
  'js/slimeverse/avatar.js',
  'js/slimeverse/portals.js',
  'js/slimeverse/hud.js',
  'js/slimeverse/store-interior.js',
  'js/slimeverse/store-shelves.js',
  'js/slimeverse/store-purchase.js',
];

var _lazyScriptPromises = {};
function loadLazyScript(src) {
  if (_lazyScriptPromises[src]) return _lazyScriptPromises[src];
  _lazyScriptPromises[src] = new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = window.slimeAssetUrl ? window.slimeAssetUrl(src) : src;
    s.onload = resolve;
    s.onerror = function() {
      delete _lazyScriptPromises[src]; // allow a retry after a network hiccup
      reject(new Error('Failed to load ' + src));
    };
    document.head.appendChild(s);
  });
  return _lazyScriptPromises[src];
}

var _slimeverseLoaded = null;
function ensureSlimeverseLoaded() {
  if (!_slimeverseLoaded) {
    _slimeverseLoaded = SLIMEVERSE_SCRIPTS.reduce(function(chain, src) {
      return chain.then(function() { return loadLazyScript(src); });
    }, Promise.resolve());
    _slimeverseLoaded.catch(function() { _slimeverseLoaded = null; });
  }
  return _slimeverseLoaded;
}

function enterSlimeverseEye(btn) {
  if (btn && btn.classList) {
    btn.classList.remove('eyeActivated');
    void btn.offsetWidth;
    btn.classList.add('eyeActivated');
  }
  ensureSlimeverseLoaded()
    .then(function() { setTimeout(startSlimeverse, 620); })
    .catch(function() { addChatMessage(null, 'Could not load Slimeverse.'); });
}
