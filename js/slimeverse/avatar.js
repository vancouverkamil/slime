// Slimeverse: drawing slime avatars in the world.
// ── Player (exterior) ─────────────────────────────────────────────────────
function drawSlimeversePlayer(p) {
  var z = p.z || 0, sc = svScaleAt(z);
  if (sc < 0.04) return; // sub-pixel at extreme depth — skip
  var sx = svSX(p.x || 0, z), sy = svSY(p.y || slimeverseWorld.floorY, z);
  if (sx < -100 || sx > viewWidth + 100 || sy < -150 || sy > viewHeight + 100) return;

  var r = 24 * sc * SV_PLAYER_SCALE, color = p.color || '#00ff00';
  ctx.save();
  ctx.globalAlpha = p.id === slimeverseSelfId ? 1 : 0.88;

  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, color);
    var imgSc = (r * 2) / tc.width;
    ctx.drawImage(tc, sx - r, sy - tc.height * imgSc * 0.72, tc.width * imgSc, tc.height * imgSc);
  } else {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx, sy, r, Math.PI, TWO_PI); ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(sx + r * 0.25, sy - r * 0.42, r * 0.18, 0, TWO_PI); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(sx + r * 0.30, sy - r * 0.42, r * 0.08, 0, TWO_PI); ctx.fill();
  drawHatAt(ctx, sx, sy - r + 1, r, { hat: p.hat || 'none', anim: p.hatAnim || 'none', drawing: p.hatDrawing || [] });

  var label = (p.name || 'Player') + '  L' + (p.level || 1);
  var fSz = Math.max(9, Math.round(12 * sc * SV_PLAYER_SCALE));
  ctx.font = 'bold ' + fSz + 'px Courier New';
  var tw = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(0,0,14,.52)';
  ctx.fillRect(sx - tw / 2, sy - r * 1.8 - fSz, tw, fSz + 4);
  ctx.fillStyle = p.id === slimeverseSelfId ? '#ffd966' : '#00ffcc';
  ctx.textAlign = 'center'; ctx.fillText(label, sx, sy - r * 1.8); ctx.textAlign = 'left';
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
