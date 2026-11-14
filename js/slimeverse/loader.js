// ── Slimeverse loader ─────────────────────────────────────
// The Slimeverse is loaded on demand the first time a player opens it. This is
// the one list of its component files, in load order.
var SLIMEVERSE_SCRIPTS = [
  'js/slimeverse/state.js',
  'js/slimeverse/prediction.js',
  'js/slimeverse/network.js',
  'js/slimeverse/lifecycle.js',
  'js/slimeverse/loop.js',
  'js/slimeverse/avatar.js',
  'js/slimeverse/hud.js',
  'js/slimeverse/buildings.js',
];
// The world itself: Money Radar's neo-zen pixel town (ES modules + art in js/slimeverse/town/).
var SLIMEVERSE_TOWN_MODULE = 'js/slimeverse/town/slime_town.js';

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
    }, Promise.resolve()).then(loadSlimeverseTown);
    _slimeverseLoaded.catch(function() { _slimeverseLoaded = null; });
  }
  return _slimeverseLoaded;
}

// Build the town once (its art is ~200 small PNGs); later visits reuse it.
function loadSlimeverseTown() {
  if (slimeTown) return slimeTown;
  var src = window.slimeAssetUrl ? window.slimeAssetUrl(SLIMEVERSE_TOWN_MODULE) : SLIMEVERSE_TOWN_MODULE;
  window.SLIME_TOWN_ASSETS = new URL('js/slimeverse/town/assets/', document.baseURI).href;
  return import(new URL(src, document.baseURI).href).then(function(mod) {
    return mod.createSlimeTown();
  }).then(function(town) { slimeTown = town; return town; });
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
