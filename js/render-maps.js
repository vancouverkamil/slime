function _sr(seed) { var s = (seed * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; }

var mapBackgroundCache = {};
var mapBackgroundCacheOrder = [];
var MAP_BACKGROUND_CACHE_LIMIT = 8;

function drawMapBackgroundRaw(id) {
  var renderer = MAP_RENDERERS[id] || MAP_RENDERERS[7];
  renderer(viewWidth, viewHeight, courtYPix, ctx);
}

var MAP_RENDERERS = [drawMap0, drawMap1, drawMap2, drawMap3, drawMap4, drawMap5, drawMap6, drawMap7, drawMap8, drawMap9, drawMap10, drawMap11, drawMap12, drawMap13, drawMap14, drawMap15];

function _cacheMapBackground(id, w, h, gy) {
  var key = [id, w, h, gy].join(':');
  if (mapBackgroundCache[key]) return mapBackgroundCache[key];

  var oldCtx = ctx, oldW = viewWidth, oldH = viewHeight, oldGy = courtYPix, oldText = backTextColor;
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  ctx = c.getContext('2d');
  viewWidth = w; viewHeight = h; courtYPix = gy;
  backTextColor = oldText;
  drawMapBackgroundRaw(id);
  var entry = { canvas: c, textColor: backTextColor };
  ctx = oldCtx; viewWidth = oldW; viewHeight = oldH; courtYPix = oldGy; backTextColor = oldText;

  mapBackgroundCache[key] = entry;
  mapBackgroundCacheOrder.push(key);
  while (mapBackgroundCacheOrder.length > MAP_BACKGROUND_CACHE_LIMIT) {
    delete mapBackgroundCache[mapBackgroundCacheOrder.shift()];
  }
  return entry;
}

function clearMapBackgroundCache() {
  mapBackgroundCache = {};
  mapBackgroundCacheOrder = [];
}

function drawMapBackground(id) {
  var w = Math.max(1, Math.round(viewWidth || 1));
  var h = Math.max(1, Math.round(viewHeight || 1));
  var gy = Math.max(1, Math.round(courtYPix || 1));
  var bg = _cacheMapBackground(id, w, h, gy);
  ctx.drawImage(bg.canvas, 0, 0);
  backTextColor = bg.textColor;
}

