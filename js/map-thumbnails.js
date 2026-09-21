var MAP_THUMBNAIL_ASSETS = {
  0: { slug: 'sky', sigil: 'SKY', layers: ['sky', 'sun', 'clouds', 'hills', 'grass'] },
  1: { slug: 'cave', sigil: 'CRY', layers: ['stone', 'stalactites', 'crystals', 'glow', 'floor'] },
  2: { slug: 'sunset', sigil: 'DUSK', layers: ['sky', 'sun', 'rays', 'mountains', 'ground'] },
  3: { slug: 'storm', sigil: 'STM', layers: ['sky', 'clouds', 'lightning', 'rain', 'ground'] },
  4: { slug: 'jungle', sigil: 'JNG', layers: ['canopy', 'shafts', 'trunks', 'vines', 'floor'] },
  5: { slug: 'frozen', sigil: 'ICE', layers: ['sky', 'aurora', 'peaks', 'snow', 'ice'] },
  7: { slug: 'neon', sigil: 'NEO', layers: ['city', 'towers', 'signs', 'haze', 'street'] },
  8: { slug: 'space', sigil: 'LUN', layers: ['space', 'stars', 'moon', 'nebula', 'ground'] },
  9: { slug: 'volcano', sigil: 'VOL', layers: ['sky', 'volcano', 'lava', 'embers', 'basalt'] },
  10: { slug: 'ocean', sigil: 'SEA', layers: ['water', 'rays', 'bubbles', 'kelp', 'reef'] },
  15: { slug: 'championship', sigil: 'CHMP', layers: ['sky', 'skyline', 'crowd', 'spotlights', 'floor'] }
};

function getMapThumbnailAsset(mapId) {
  return MAP_THUMBNAIL_ASSETS[mapId] || MAP_THUMBNAIL_ASSETS[0];
}

function svgWrap(mapId, body) {
  var asset = getMapThumbnailAsset(mapId);
  var badgeW = asset.sigil.length * 11 + 24;
  return '<span class="map-thumb map-thumb-' + asset.slug + '" data-map-id="' + mapId + '">' +
    '<svg class="map-thumb-svg" viewBox="0 0 320 170" role="img" aria-label="' + asset.slug + ' map preview">' +
      body +
      '<rect class="thumb-vignette" x="0" y="0" width="320" height="170"></rect>' +
      '<path class="thumb-gloss" d="M-30 0 L150 0 L50 170 L-110 170 Z"></path>' +
      '<rect class="thumb-frame" x="1" y="1" width="318" height="168"></rect>' +
      '<g class="thumb-sigil-badge"><rect x="8" y="132" width="' + badgeW + '" height="22" rx="2"></rect><text class="thumb-sigil" x="18" y="147">' + asset.sigil + '</text></g>' +
    '</svg>' +
  '</span>';
}
