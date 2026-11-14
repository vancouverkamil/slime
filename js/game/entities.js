// Game: creating slimes and the ball, and drawing slime trails.
function newLegacyBall(radius, color) {
  return {
    radius:radius, color:color, x:0, y:0, velocityX:0, velocityY:0, rotation:0,
    render: function() {
      var xPix = this.x * pixelsPerUnitX;
      var yPix = courtYPix - (this.y * pixelsPerUnitY);
      var rPix = this.radius * pixelsPerUnitY + 2;
      if (ballImage && !legacyGraphics) {
        this.rotation = (this.rotation + this.velocityX / 100) % TWO_PI;
        ctx.translate(xPix, yPix); ctx.rotate(this.rotation);
        var ballArtScale = Math.max(1, Math.min(2.75, (viewHeight || 375) / 375));
        var bw = ballImage.width * ballArtScale;
        var bh = ballImage.height * ballArtScale;
        ctx.drawImage(ballImage, -bw / 2, -bh / 2, bw, bh);
        ctx.setTransform(1,0,0,1,0,0);
      } else {
        ctx.fillStyle = legacyBallColor;
        ctx.beginPath(); ctx.arc(xPix, yPix, rPix, 0, TWO_PI); ctx.fill();
      }
    }
  };
}

function drawSlimeTrail(trailCtx, trail, type, color, rPix) {
  if (!trail || trail.length < 2) return;
  trailCtx.save();
  if (type === 'comet' || type === 'neon') {
    var glow = type === 'neon' ? 14 : 6;
    trailCtx.shadowColor = color; trailCtx.shadowBlur = glow;
    for (var i = 1; i < trail.length; i++) {
      var a = (1 - i / trail.length) * (type === 'neon' ? 0.7 : 0.5);
      var w = (1 - i / trail.length) * rPix * (type === 'neon' ? 0.22 : 0.38);
      trailCtx.globalAlpha = a; trailCtx.strokeStyle = color; trailCtx.lineWidth = Math.max(1, w);
      trailCtx.beginPath(); trailCtx.moveTo(trail[i-1].x, trail[i-1].y); trailCtx.lineTo(trail[i].x, trail[i].y); trailCtx.stroke();
    }
  } else if (type === 'sparkle') {
    trailCtx.shadowColor = color; trailCtx.shadowBlur = 7; trailCtx.fillStyle = color;
    for (var i = 0; i < trail.length; i++) {
      var a = (1 - i / trail.length) * 0.7;
      var r = (1 - i / trail.length) * rPix * 0.16;
      var ox = Math.sin(i * 1.7 + trail[i].x * 0.08) * rPix * 0.45;
      var oy = Math.cos(i * 2.3 + trail[i].y * 0.08) * rPix * 0.35;
      trailCtx.globalAlpha = a;
      trailCtx.beginPath(); trailCtx.arc(trail[i].x + ox, trail[i].y + oy, Math.max(1, r), 0, TWO_PI); trailCtx.fill();
    }
  } else if (type === 'pulse') {
    trailCtx.shadowColor = color; trailCtx.shadowBlur = 10; trailCtx.strokeStyle = color; trailCtx.lineWidth = 1.5;
    for (var i = 0; i < trail.length; i += 4) {
      var a = (1 - i / trail.length) * 0.55;
      var r = (i / trail.length) * rPix * 0.7 + rPix * 0.12;
      trailCtx.globalAlpha = a;
      trailCtx.beginPath(); trailCtx.arc(trail[i].x, trail[i].y, r, Math.PI, TWO_PI); trailCtx.stroke();
    }
  }
  trailCtx.globalAlpha = 1; trailCtx.shadowBlur = 0; trailCtx.restore();
}

function newLegacySlime(onLeft, radius, color) {
  return {
    onLeft:onLeft, radius:radius, color:color, img:null, x:0, y:0, velocityX:0, velocityY:0,
    _trail: [], _trailType: 'none',
    render: function() {
      var xPix = this.x * pixelsPerUnitX;
      var yPix = courtYPix - (this.y * pixelsPerUnitY);
      var rPix = this.radius * pixelsPerUnitY;
      // Trail: push position, draw before body
      // At most one trail point per ~game tick, so the trail is the same length at 60 or 144fps.
      var trailNow = Date.now();
      if (!this._trailAt || trailNow - this._trailAt >= 12) {
        this._trailAt = trailNow;
        this._trail.unshift({ x: xPix, y: yPix });
        if (this._trail.length > 18) this._trail.pop();
      }
      if (this._trailType && this._trailType !== 'none')
        drawSlimeTrail(ctx, this._trail, this._trailType, this.tintColor || this.color, rPix);
      if (this.img && !legacyGraphics) {
        var drawSrc = this.tintColor ? getTintedCanvas(this.img, this.tintColor) : this.img;
        var artScale = (rPix * 2) / drawSrc.width;
        var dw = drawSrc.width * artScale;
        var dh = drawSrc.height * artScale;
        ctx.drawImage(drawSrc, xPix - dw / 2, yPix - dh, dw, dh);
      } else {
        ctx.fillStyle = this.tintColor || this.color;
        ctx.beginPath(); ctx.arc(xPix, yPix, rPix, Math.PI, TWO_PI); ctx.fill();
      }
      if (this.onLeft) drawBodyOverlay(ctx, xPix, yPix, rPix, playerBodyOverlay);
      var eyeX = this.x + (this.onLeft ? 1 : -1) * this.radius / 4;
      var eyeY = this.y + this.radius / 2;
      ctx.translate(eyeX * pixelsPerUnitX, courtYPix - eyeY * pixelsPerUnitY);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, rPix/4, 0, TWO_PI); ctx.fill();
      var dx = ball.x - eyeX, dy = eyeY - ball.y;
      var dist = Math.sqrt(dx*dx + dy*dy) || 1;
      var r8 = rPix / 8;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(r8*dx/dist, r8*dy/dist, r8, 0, TWO_PI); ctx.fill();
      ctx.setTransform(1,0,0,1,0,0);
    }
  };
}
