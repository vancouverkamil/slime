function svNearestShelf(playerX) {
  var best = null, bestDist = Infinity;
  SV_SHELF_X.forEach(function(wx, i) {
    var d = Math.abs(playerX - wx);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return bestDist < 110 ? best : null;
}
