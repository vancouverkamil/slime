// Slimeverse: name tags over slimes (the slimes themselves are drawn inside
// the town by js/slimeverse/town/slime_town.js so they sort and light with it).
function drawSlimeverseNameTag(p, x, z, hop, isSelf) {
  var pos = slimeTown.toScreen(x, z - (hop || 0));
  var r = slimeTown.slimeRadius * pos.scale;
  if (pos.x < -80 || pos.x > viewWidth + 80 || pos.y < -60 || pos.y > viewHeight + 60) return;
  var label = (p.name || 'Player') + '  L' + (p.level || (isSelf ? getSlimeversePlayerLevel() : 1));
  var s = typeof uiScale === 'function' ? uiScale() : 1;
  var fSz = Math.max(10, Math.round(11 * s));
  var top = pos.y - r * 2.2;
  ctx.save();
  ctx.font = 'bold ' + fSz + 'px Courier New';
  var tw = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(0,0,14,.55)';
  ctx.fillRect(pos.x - tw / 2, top - fSz, tw, fSz + 4);
  ctx.fillStyle = isSelf ? '#ffd966' : '#00ffcc';
  ctx.textAlign = 'center'; ctx.fillText(label, pos.x, top);
  ctx.restore();
}

function getSlimeversePlayerLevel() {
  if (currentAccount && currentAccount.progression && currentAccount.progression.level) {
    return currentAccount.progression.level || 1;
  }
  if (currentAccount && currentAccount.stats && window.SlimeProgression) {
    return window.SlimeProgression.getProgression(currentAccount.stats.xp || 0).level || 1;
  }
  return 1;
}
