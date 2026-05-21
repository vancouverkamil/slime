function spawnParticles(x, y, color, count) {
  count = count || 10;
  for (var i = 0; i < count; i++) {
    var a = (i / count) * TWO_PI;
    var sp = 2 + Math.random() * 4;
    particles.push({
      x:x*pixelsPerUnitX, y:courtYPix - y*pixelsPerUnitY,
      vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 2,
      life:1, col:color, r:3+Math.random()*3
    });
  }
}
function tickParticles() {
  particles = particles.filter(function(p) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.06;
    return p.life > 0;
  });
}
function drawParticles() {
  particles.forEach(function(p) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, TWO_PI); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── name tag + streak drawing ─────────────────────────────
function drawOnlineHUD() {
  if (!playerNameLeft || currentRoomId === null) return;
  var now = Date.now();
  ctx.textAlign = 'center';

  function drawTag(slime, name, streak, emote, emoteEnd) {
    var xp = slime.x * pixelsPerUnitX;
    var yp = courtYPix + 8;
    // name pill
    ctx.font = 'bold 10px Courier New';
    var tw = ctx.measureText(name).width + 14;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(xp - tw/2, yp, tw, 14);
    ctx.fillStyle = slime.onLeft ? '#66ffcc' : '#ff66aa';
    ctx.fillText(name, xp, yp + 10);
    // streak
    if (streak >= 2) {
      var sc = streak >= 5 ? '#ff4400' : streak >= 3 ? '#ff9900' : '#ffcc00';
      ctx.font = 'bold 9px Courier New';
      ctx.fillStyle = sc;
      ctx.fillText(streak + 'x STREAK', xp, yp + 23);
    }
    // emote bubble
    if (emote && now < emoteEnd) {
      ctx.font = '20px sans-serif';
      ctx.fillText(emote, xp, courtYPix - slime.y*pixelsPerUnitY - slime.radius*pixelsPerUnitY - 14);
    }
  }

  drawTag(slimeLeft,  playerNameLeft,  leftStreak,  emoteLeft,  emoteLeftEnd);
  drawTag(slimeRight, playerNameRight, rightStreak, emoteRight, emoteRightEnd);

  // rally counter
  if (rallyCount >= 5) {
    ctx.font = 'bold 11px Courier New';
    ctx.fillStyle = rallyCount >= 15 ? '#ff0066' : rallyCount >= 10 ? '#ff6600' : '#ffcc00';
    var rt = 'RALLY ' + rallyCount;
    var rw = ctx.measureText(rt).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(viewWidth/2 - rw/2, 10, rw, 16);
    ctx.fillStyle = rallyCount >= 15 ? '#ff0066' : rallyCount >= 10 ? '#ff6600' : '#ffcc00';
    ctx.fillText(rt, viewWidth/2, 22);
  }

  ctx.textAlign = 'left';
}

// ── name editing ──────────────────────────────────────────
