// Game: tinted slime sprite cache.
var _tintCache = {};
function getTintedCanvas(img, color) {
  var key = (img.src || '') + '|' + color;
  if (_tintCache[key]) return _tintCache[key];
  var oc = document.createElement('canvas');
  oc.width  = img.naturalWidth  || img.width  || 175;
  oc.height = img.naturalHeight || img.height || 175;
  var oc2 = oc.getContext('2d');
  oc2.drawImage(img, 0, 0);
  oc2.globalCompositeOperation = 'source-atop';
  oc2.globalAlpha = 0.62;
  oc2.fillStyle = color;
  oc2.fillRect(0, 0, oc.width, oc.height);
  oc2.globalCompositeOperation = 'source-over';
  oc2.globalAlpha = 1;
  _tintCache[key] = oc;
  return oc;
}
