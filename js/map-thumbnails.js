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
  10: { slug: 'ocean', sigil: 'SEA', layers: ['water', 'rays', 'bubbles', 'kelp', 'reef'] }
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

function renderMapThumbnail(mapId) {
  switch (mapId) {
    case 0:
      return svgWrap(0,
        '<defs>' +
          '<linearGradient id="mt-sky0" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#123a66"/><stop offset=".38" stop-color="#2e86c9"/>' +
            '<stop offset=".72" stop-color="#8fd6ea"/><stop offset="1" stop-color="#eaf9f2"/>' +
          '</linearGradient>' +
          '<radialGradient id="mt-sun0" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="#fff6c2"/><stop offset=".4" stop-color="#ffe878" stop-opacity=".9"/>' +
            '<stop offset="1" stop-color="#ffe878" stop-opacity="0"/>' +
          '</radialGradient>' +
        '</defs>' +
        '<g data-layer="sky"><rect width="320" height="170" fill="url(#mt-sky0)"/></g>' +
        '<g data-layer="sun"><circle cx="55" cy="42" r="60" fill="url(#mt-sun0)"/><circle cx="55" cy="42" r="21" fill="#fffbe0"/><circle cx="55" cy="42" r="21" fill="none" stroke="#fff" stroke-width="1" opacity=".5"/></g>' +
        '<g data-layer="clouds" class="thumb-drift">' +
          '<ellipse cx="112" cy="44" rx="20" ry="10" fill="#fff" opacity=".92"/><ellipse cx="125" cy="50" rx="38" ry="14" fill="#fff" opacity=".85"/>' +
          '<ellipse cx="125" cy="57" rx="34" ry="7" fill="#bcdcea" opacity=".5"/>' +
          '<ellipse cx="222" cy="58" rx="22" ry="11" fill="#fff" opacity=".8"/><ellipse cx="238" cy="64" rx="46" ry="16" fill="#fff" opacity=".72"/>' +
          '<ellipse cx="238" cy="73" rx="40" ry="8" fill="#bcdcea" opacity=".4"/>' +
        '</g>' +
        '<g data-layer="birds" opacity=".5"><path d="M18 26 q6 -7 12 0 q6 -7 12 0" stroke="#123a66" stroke-width="1.6" fill="none"/><path d="M266 18 q5 -6 10 0 q5 -6 10 0" stroke="#123a66" stroke-width="1.4" fill="none"/></g>' +
        '<g data-layer="hills">' +
          '<path d="M0 108 C45 72 72 96 110 76 C155 51 188 104 226 82 C266 60 287 91 320 74 L320 130 L0 130 Z" fill="#2c7851"/>' +
          '<path d="M0 108 C45 72 72 96 110 76 C155 51 188 104 226 82 C266 60 287 91 320 74" fill="none" stroke="#9be66a" stroke-width="2" opacity=".5"/>' +
          '<path d="M0 123 C52 94 96 121 142 96 C188 72 234 122 320 93 L320 138 L0 138 Z" fill="#1f5e34"/>' +
        '</g>' +
        '<g data-layer="grass">' +
          '<rect y="125" width="320" height="45" fill="#2e7d24"/><path d="M0 126 H320" stroke="#9be66a" stroke-width="3" opacity=".6"/>' +
          '<circle cx="46" cy="150" r="3" fill="#ffe878" opacity=".7"/><circle cx="198" cy="158" r="2.4" fill="#fff" opacity=".55"/><circle cx="270" cy="146" r="3" fill="#ffe878" opacity=".6"/>' +
        '</g>'
      );
    case 1:
      return svgWrap(1,
        '<defs>' +
          '<radialGradient id="mt-glow1a" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#00e5ff" stop-opacity=".55"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></radialGradient>' +
          '<radialGradient id="mt-glow1b" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#c266ff" stop-opacity=".55"/><stop offset="1" stop-color="#c266ff" stop-opacity="0"/></radialGradient>' +
          '<linearGradient id="mt-crys1a" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0090b0"/><stop offset="1" stop-color="#5cf3ff"/></linearGradient>' +
          '<linearGradient id="mt-crys1b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7a20b8"/><stop offset="1" stop-color="#e2a8ff"/></linearGradient>' +
          '<linearGradient id="mt-crys1c" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#00a884"/><stop offset="1" stop-color="#7dffe0"/></linearGradient>' +
        '</defs>' +
        '<g data-layer="stone"><rect width="320" height="170" fill="#080711"/><path d="M0 0 H320 V122 C270 110 230 128 188 116 C135 100 90 126 0 112 Z" fill="#171327"/></g>' +
        '<g data-layer="stalactites"><path d="M18 0 L38 0 L28 48 Z M72 0 L92 0 L82 66 Z M146 0 L174 0 L158 58 Z M236 0 L258 0 L247 72 Z M288 0 L306 0 L298 44 Z" fill="#2b2440"/>' +
          '<path d="M18 0 L28 4 L23 30 Z M146 0 L160 4 L152 34 Z M236 0 L247 4 L242 40 Z" fill="#493a6c" opacity=".6"/></g>' +
        '<g data-layer="glow" class="thumb-pulse"><circle cx="55" cy="106" r="60" fill="url(#mt-glow1a)"/><circle cx="254" cy="106" r="62" fill="url(#mt-glow1b)"/></g>' +
        '<g data-layer="crystals">' +
          '<path d="M38 118 L55 68 L72 118 Z" fill="url(#mt-crys1a)"/><path d="M55 68 L64 118 L72 118 Z" fill="#fff" opacity=".3"/>' +
          '<path d="M235 120 L254 58 L276 120 Z" fill="url(#mt-crys1b)"/><path d="M254 58 L266 120 L276 120 Z" fill="#fff" opacity=".28"/>' +
          '<path d="M155 126 L170 82 L188 126 Z" fill="url(#mt-crys1c)"/><path d="M170 82 L180 126 L188 126 Z" fill="#fff" opacity=".26"/>' +
        '</g>' +
        '<g data-layer="sparkle" class="thumb-twinkle"><circle cx="50" cy="88" r="1.6" fill="#fff"/><circle cx="250" cy="80" r="1.6" fill="#fff"/><circle cx="167" cy="98" r="1.4" fill="#fff"/></g>' +
        '<g data-layer="floor"><rect y="122" width="320" height="48" fill="#100d18"/><path d="M0 126 H320" stroke="#00ffcc" opacity=".28"/><ellipse cx="160" cy="150" rx="90" ry="6" fill="#00e5ff" opacity=".08"/></g>'
      );
    case 2:
      return svgWrap(2,
        '<defs>' +
          '<linearGradient id="mt-dusk2" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#0c0322"/><stop offset=".35" stop-color="#5b1742"/><stop offset=".65" stop-color="#c1436a"/><stop offset="1" stop-color="#ffd25d"/>' +
          '</linearGradient>' +
          '<radialGradient id="mt-sun2" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#ffb13b" stop-opacity=".85"/><stop offset="1" stop-color="#ffb13b" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<g data-layer="sky"><rect width="320" height="170" fill="url(#mt-dusk2)"/></g>' +
        '<g data-layer="sun"><circle cx="160" cy="116" r="78" fill="url(#mt-sun2)"/><circle cx="160" cy="116" r="38" fill="#ffe76c"/></g>' +
        '<g data-layer="rays" class="thumb-breathe"><path d="M160 116 L0 28 L0 62 Z M160 116 L320 20 L320 55 Z M160 116 L82 0 L122 0 Z M160 116 L226 0 L264 0 Z" fill="#ffd866" opacity=".12"/></g>' +
        '<g data-layer="birds" opacity=".5"><path d="M60 60 q5 -6 10 0 q5 -6 10 0" stroke="#1c0a2c" stroke-width="1.4" fill="none"/><path d="M230 46 q5 -6 10 0 q5 -6 10 0" stroke="#1c0a2c" stroke-width="1.4" fill="none"/></g>' +
        '<g data-layer="mountains">' +
          '<path d="M0 122 L40 82 L76 116 L118 70 L170 121 L215 86 L260 120 L320 78 L320 145 L0 145 Z" fill="#37154e"/>' +
          '<path d="M0 122 L40 82 L76 116 L118 70 L170 121 L215 86 L260 120 L320 78" fill="none" stroke="#ff9d6e" stroke-width="1.4" opacity=".45"/>' +
          '<path d="M0 135 L60 98 L113 130 L158 92 L218 136 L276 100 L320 124 L320 170 L0 170 Z" fill="#170721"/>' +
        '</g>' +
        '<g data-layer="ground"><rect y="137" width="320" height="33" fill="#5a2010"/><ellipse cx="160" cy="140" rx="130" ry="5" fill="#ffb13b" opacity=".18"/></g>'
      );
    case 3:
      return svgWrap(3,
        '<defs>' +
          '<linearGradient id="mt-storm3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0e22"/><stop offset="1" stop-color="#1c2447"/></linearGradient>' +
          '<radialGradient id="mt-bolt3" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6a6" stop-opacity=".9"/><stop offset="1" stop-color="#fff6a6" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<g data-layer="sky"><rect width="320" height="170" fill="url(#mt-storm3)"/><rect width="320" height="92" fill="#070914"/></g>' +
        '<g data-layer="clouds" class="thumb-drift">' +
          '<ellipse cx="60" cy="28" rx="34" ry="13" fill="#3d4870"/><ellipse cx="76" cy="34" rx="70" ry="23" fill="#303959"/>' +
          '<ellipse cx="160" cy="20" rx="40" ry="14" fill="#37416a"/><ellipse cx="180" cy="28" rx="92" ry="28" fill="#28314f"/>' +
          '<ellipse cx="278" cy="40" rx="66" ry="22" fill="#333c60"/>' +
        '</g>' +
        '<g data-layer="lightning" class="thumb-lightning"><circle cx="178" cy="70" r="70" fill="url(#mt-bolt3)"/><path d="M178 22 L142 86 H172 L146 142 L218 68 H182 L208 22 Z" fill="#fff6a6"/></g>' +
        '<g data-layer="rain" class="thumb-rain"><path d="M22 42 l-8 28 M58 36 l-8 28 M94 50 l-8 28 M132 38 l-8 28 M210 44 l-8 28 M252 36 l-8 28 M292 52 l-8 28 M8 66 l-6 22 M270 64 l-6 22" stroke="#aac6ff" stroke-width="2" opacity=".5"/></g>' +
        '<g data-layer="ground"><rect y="124" width="320" height="46" fill="#141008"/><ellipse cx="82" cy="138" rx="46" ry="7" fill="#8aa7d8" opacity=".2"/><ellipse cx="240" cy="142" rx="50" ry="8" fill="#8aa7d8" opacity=".18"/><ellipse cx="178" cy="148" rx="30" ry="5" fill="#fff6a6" opacity=".08"/></g>'
      );
    case 4:
      return svgWrap(4,
        '<defs><radialGradient id="mt-shaft4" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="#e3ff9c" stop-opacity=".28"/><stop offset="1" stop-color="#e3ff9c" stop-opacity="0"/></radialGradient></defs>' +
        '<g data-layer="canopy"><rect width="320" height="170" fill="#061404"/><circle cx="36" cy="12" r="54" fill="#143b08"/><circle cx="132" cy="7" r="62" fill="#1d4c0c"/><circle cx="244" cy="10" r="60" fill="#143c08"/><circle cx="90" cy="4" r="30" fill="#2a5c10" opacity=".7"/><circle cx="190" cy="2" r="32" fill="#2a5c10" opacity=".7"/></g>' +
        '<g data-layer="shafts" class="thumb-breathe"><rect x="0" y="0" width="320" height="140" fill="url(#mt-shaft4)"/><path d="M86 0 L122 0 L76 132 L44 132 Z M210 0 L238 0 L260 132 L226 132 Z" fill="#c8ff63" opacity=".14"/></g>' +
        '<g data-layer="motes" class="thumb-twinkle"><circle cx="70" cy="70" r="1.5" fill="#eaffb0"/><circle cx="150" cy="50" r="1.3" fill="#eaffb0"/><circle cx="230" cy="80" r="1.5" fill="#eaffb0"/><circle cx="270" cy="46" r="1.3" fill="#eaffb0"/></g>' +
        '<g data-layer="trunks"><rect x="34" y="38" width="16" height="100" fill="#190b04"/><rect x="34" y="38" width="4" height="100" fill="#3a2410" opacity=".6"/><rect x="148" y="28" width="20" height="112" fill="#160904"/><rect x="148" y="28" width="5" height="112" fill="#3a2410" opacity=".6"/><rect x="270" y="48" width="15" height="92" fill="#190b04"/></g>' +
        '<g data-layer="vines" class="thumb-sway"><path d="M80 0 C72 42 98 68 84 120 M228 0 C218 36 238 68 220 118" stroke="#4ea522" stroke-width="4" fill="none"/><circle cx="84" cy="60" r="4" fill="#6fd42c"/><circle cx="220" cy="76" r="4" fill="#6fd42c"/></g>' +
        '<g data-layer="floor"><rect y="126" width="320" height="44" fill="#130d03"/><path d="M0 126 C60 114 85 132 140 120 C208 107 250 128 320 114 V170 H0 Z" fill="#235c13"/><ellipse cx="70" cy="146" rx="34" ry="8" fill="#c8ff63" opacity=".1"/><ellipse cx="230" cy="152" rx="40" ry="8" fill="#c8ff63" opacity=".08"/></g>'
      );
    case 5:
      return svgWrap(5,
        '<defs><linearGradient id="mt-frost5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081524"/><stop offset="1" stop-color="#123049"/></linearGradient></defs>' +
        '<g data-layer="sky"><rect width="320" height="170" fill="url(#mt-frost5)"/><rect y="76" width="320" height="94" fill="#d8edf6"/></g>' +
        '<g data-layer="aurora" class="thumb-drift"><path d="M0 42 C62 8 112 72 176 34 C224 6 264 32 320 16 L320 52 C250 72 214 45 174 66 C106 102 56 34 0 78 Z" fill="#43ffb4" opacity=".34"/><path d="M0 24 C76 56 112 18 166 30 C224 42 256 18 320 36 L320 60 C250 42 220 70 162 52 C104 34 74 78 0 54 Z" fill="#8b7cff" opacity=".24"/></g>' +
        '<g data-layer="peaks">' +
          '<path d="M0 126 L48 60 L90 126 Z M74 126 L134 44 L198 126 Z M186 126 L260 50 L320 126 Z" fill="#ecfbff"/>' +
          '<path d="M0 126 L48 60 L90 126 M74 126 L134 44 L198 126 M186 126 L260 50 L320 126" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/>' +
          '<path d="M134 44 L198 126 L152 126 Z M260 50 L320 126 L286 126 Z" fill="#9fc7df" opacity=".65"/>' +
        '</g>' +
        '<g data-layer="snow" class="thumb-snow"><circle cx="42" cy="42" r="2" fill="#fff"/><circle cx="116" cy="24" r="1.5" fill="#fff"/><circle cx="228" cy="62" r="2" fill="#fff"/><circle cx="286" cy="34" r="1.5" fill="#fff"/><circle cx="20" cy="70" r="1.2" fill="#fff"/><circle cx="200" cy="18" r="1.2" fill="#fff"/></g>' +
        '<g data-layer="ice"><rect y="126" width="320" height="44" fill="#8fc5df"/><path d="M22 142 H118 M172 136 H280" stroke="#e7fbff" opacity=".55"/><path d="M60 128 L48 168 M240 130 L256 168" stroke="#e7fbff" opacity=".3"/></g>'
      );
    case 7:
      return svgWrap(7,
        '<defs>' +
          '<linearGradient id="mt-city7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160030"/><stop offset="1" stop-color="#090018"/></linearGradient>' +
          '<radialGradient id="mt-signglow7" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#00ffcc" stop-opacity=".5"/><stop offset="1" stop-color="#00ffcc" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<g data-layer="city"><rect width="320" height="170" fill="url(#mt-city7)"/><rect y="122" width="320" height="48" fill="#020006"/></g>' +
        '<g data-layer="towers">' +
          '<rect x="28" y="42" width="42" height="92" fill="#11142a"/><rect x="96" y="20" width="58" height="114" fill="#0d1024"/><rect x="188" y="36" width="44" height="98" fill="#101329"/><rect x="258" y="54" width="34" height="80" fill="#11142a"/>' +
          '<g fill="#ffdd88" opacity=".55">' +
            '<rect x="34" y="50" width="4" height="4"/><rect x="46" y="50" width="4" height="4"/><rect x="58" y="62" width="4" height="4"/><rect x="34" y="74" width="4" height="4"/><rect x="58" y="86" width="4" height="4"/>' +
            '<rect x="104" y="32" width="4" height="4"/><rect x="118" y="32" width="4" height="4"/><rect x="132" y="46" width="4" height="4"/><rect x="104" y="60" width="4" height="4"/><rect x="132" y="74" width="4" height="4"/>' +
            '<rect x="196" y="48" width="4" height="4"/><rect x="212" y="60" width="4" height="4"/><rect x="196" y="76" width="4" height="4"/>' +
          '</g>' +
        '</g>' +
        '<g data-layer="signs" class="thumb-pulse"><circle cx="51" cy="66" r="30" fill="url(#mt-signglow7)"/><circle cx="277" cy="82" r="26" fill="url(#mt-signglow7)"/>' +
          '<path d="M34 66 H68 M104 48 H148 M194 76 H230 M262 82 H292" stroke="#00ffcc" stroke-width="4"/><path d="M102 84 H152 M190 54 H230" stroke="#ff33cc" stroke-width="3"/></g>' +
        '<g data-layer="haze"><ellipse cx="160" cy="126" rx="145" ry="30" fill="#00ffcc" opacity=".1"/></g>' +
        '<g data-layer="street"><path d="M0 134 H320 V170 H0 Z" fill="#05050d"/><path d="M0 140 H320" stroke="#00ffcc" opacity=".28"/><ellipse cx="60" cy="152" rx="20" ry="4" fill="#00ffcc" opacity=".12"/><ellipse cx="280" cy="158" rx="18" ry="4" fill="#ff33cc" opacity=".1"/></g>'
      );
    case 8:
      return svgWrap(8,
        '<defs>' +
          '<radialGradient id="mt-moon8" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#eae7d8"/><stop offset="1" stop-color="#8f8d7e"/></radialGradient>' +
          '<radialGradient id="mt-neb8" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8a5cff" stop-opacity=".35"/><stop offset="1" stop-color="#8a5cff" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<g data-layer="space"><rect width="320" height="170" fill="#000008"/></g>' +
        '<g data-layer="stars" class="thumb-twinkle"><circle cx="30" cy="30" r="1.5" fill="#fff"/><circle cx="92" cy="54" r="1" fill="#fff"/><circle cx="146" cy="24" r="1.5" fill="#fff"/><circle cx="232" cy="46" r="1" fill="#fff"/><circle cx="284" cy="20" r="1.5" fill="#fff"/><circle cx="310" cy="70" r="1" fill="#fff"/><circle cx="18" cy="90" r="1" fill="#fff"/><path d="M186 62 h6 M189 59 v6" stroke="#fff" stroke-width="1"/></g>' +
        '<g data-layer="planet" class="thumb-drift"><circle cx="296" cy="112" r="10" fill="#ff9d6e"/><ellipse cx="296" cy="112" rx="18" ry="4" fill="none" stroke="#ffd39a" stroke-width="1.4" opacity=".7"/></g>' +
        '<g data-layer="moon"><circle cx="70" cy="66" r="38" fill="url(#mt-moon8)"/><circle cx="56" cy="58" r="8" fill="#898779" opacity=".5"/><circle cx="86" cy="78" r="6" fill="#898779" opacity=".45"/><circle cx="70" cy="66" r="38" fill="none" stroke="#fff" stroke-width="1" opacity=".2"/></g>' +
        '<g data-layer="nebula" class="thumb-drift"><ellipse cx="220" cy="58" rx="90" ry="40" fill="url(#mt-neb8)"/></g>' +
        '<g data-layer="ground"><rect y="124" width="320" height="46" fill="#17171d"/><ellipse cx="190" cy="140" rx="44" ry="8" fill="#fff" opacity=".08"/></g>'
      );
    case 9:
      return svgWrap(9,
        '<defs>' +
          '<linearGradient id="mt-sky9" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120000"/><stop offset="1" stop-color="#3a0400"/></linearGradient>' +
          '<radialGradient id="mt-lavaglow9" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff8a00" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>' +
          '<linearGradient id="mt-lava9" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff2a00"/><stop offset="1" stop-color="#ffcf5a"/></linearGradient>' +
        '</defs>' +
        '<g data-layer="sky"><rect width="320" height="170" fill="url(#mt-sky9)"/><rect y="70" width="320" height="100" fill="#5c0b00"/></g>' +
        '<g data-layer="volcano"><path d="M36 130 L92 50 L150 130 Z M170 130 L244 36 L320 130 Z" fill="#180200"/><path d="M92 50 L104 76 L80 76 Z M244 36 L258 66 L230 66 Z" fill="#ff5a00" opacity=".8"/></g>' +
        '<g data-layer="lava" class="thumb-pulse"><circle cx="244" cy="60" r="60" fill="url(#mt-lavaglow9)"/><path d="M238 40 L222 130 H260 Z" fill="url(#mt-lava9)"/></g>' +
        '<g data-layer="embers" class="thumb-embers"><circle cx="60" cy="62" r="2" fill="#ffb22b"/><circle cx="128" cy="30" r="1.5" fill="#ff6a22"/><circle cx="214" cy="70" r="2" fill="#ffd25a"/><circle cx="286" cy="52" r="1.5" fill="#ff6a22"/><circle cx="160" cy="20" r="1.3" fill="#ffb22b"/></g>' +
        '<g data-layer="basalt"><rect y="126" width="320" height="44" fill="#130100"/><path d="M18 142 C82 132 108 154 160 140 C210 126 250 148 304 136" stroke="#ff6a00" stroke-width="4" opacity=".6" fill="none"/><path d="M18 142 C82 132 108 154 160 140 C210 126 250 148 304 136" stroke="#ffd25a" stroke-width="1" opacity=".4" fill="none"/></g>'
      );
    case 10:
      return svgWrap(10,
        '<defs><linearGradient id="mt-water10" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#004d78"/><stop offset="1" stop-color="#001c30"/></linearGradient></defs>' +
        '<g data-layer="water"><rect width="320" height="170" fill="url(#mt-water10)"/><rect y="86" width="320" height="84" fill="#063720"/></g>' +
        '<g data-layer="rays" class="thumb-breathe"><path d="M50 0 L86 0 L48 128 L16 128 Z M192 0 L224 0 L244 130 L210 130 Z" fill="#9beeff" opacity=".18"/><path d="M120 0 L140 0 L118 100 L98 100 Z" fill="#9beeff" opacity=".1"/></g>' +
        '<g data-layer="bubbles" class="thumb-bubbles"><circle cx="74" cy="82" r="4" fill="#c9f6ff" opacity=".5"/><circle cx="142" cy="56" r="3" fill="#c9f6ff" opacity=".45"/><circle cx="234" cy="90" r="4" fill="#c9f6ff" opacity=".5"/><circle cx="278" cy="58" r="3" fill="#c9f6ff" opacity=".4"/><circle cx="200" cy="40" r="2" fill="#c9f6ff" opacity=".4"/></g>' +
        '<g data-layer="kelp" class="thumb-sway"><path d="M42 130 C28 96 52 82 40 48 M272 132 C252 98 286 82 270 56" stroke="#16a760" stroke-width="7" fill="none"/><path d="M42 130 C28 96 52 82 40 48" stroke="#3fe08a" stroke-width="2" opacity=".5" fill="none"/></g>' +
        '<g data-layer="reef"><rect y="126" width="320" height="44" fill="#0a2b18"/><circle cx="126" cy="134" r="15" fill="#ff6d75" opacity=".62"/><circle cx="202" cy="138" r="13" fill="#ffaa4a" opacity=".55"/><circle cx="126" cy="128" r="6" fill="#ffb8c0" opacity=".5"/></g>'
      );
    default:
      return renderMapThumbnail(0);
  }
}
