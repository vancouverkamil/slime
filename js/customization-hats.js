function drawCustomHat(pctx, drawing, anim, rPix) {
  if (!drawing || drawing.length === 0) return;
  var T = Date.now();
  var lw = Math.max(1.5, rPix * 0.06);
  pctx.lineWidth = lw; pctx.lineCap = 'round'; pctx.lineJoin = 'round';

  // Glow: oscillating shadow
  if (anim === 'glow') {
    pctx.shadowColor = '#00ffcc';
    pctx.shadowBlur = 3 + 10 * (0.5 + 0.5 * Math.sin(T / 350));
  }

  // Collect all points for chaser
  var allPts = [];
  if (anim === 'chaser') drawing.forEach(function(s){ var sp=s.pts||s; if(sp)sp.forEach(function(p){ allPts.push(p); }); });

  drawing.forEach(function(stroke, si) {
    var sp = stroke.pts !== undefined ? stroke.pts : stroke;
    if (!sp || sp.length < 2) return;
    var strokeCol = stroke.color || '#ffffff';
    if (anim === 'rainbow') {
      pctx.strokeStyle = 'hsl(' + ((si / Math.max(drawing.length,1) * 360 + T / 18) % 360) + ',100%,68%)';
    } else {
      pctx.strokeStyle = strokeCol;
    }
    pctx.beginPath();
    for (var i = 0; i < sp.length; i++) {
      var hx = (sp[i].x - 0.5) * 2.5 * rPix;
      var hy = -(1 - sp[i].y) * 2.5 * rPix;
      if (anim === 'wave') hy += Math.sin(hx / (rPix * 0.45) + T / 420) * rPix * 0.09;
      if (i === 0) pctx.moveTo(hx, hy); else pctx.lineTo(hx, hy);
    }
    pctx.stroke();
  });

  pctx.shadowBlur = 0;

  // Light chaser overlay
  if (anim === 'chaser' && allPts.length > 1) {
    var ci = Math.floor(T / 40) % allPts.length;
    var cp = allPts[ci];
    var cpx = (cp.x - 0.5) * 2.5 * rPix, cpy = -(1 - cp.y) * 2.5 * rPix; // jshint ignore:line
    pctx.save();
    pctx.shadowColor = '#fff'; pctx.shadowBlur = 10;
    pctx.fillStyle = '#ffffff';
    pctx.beginPath(); pctx.arc(cpx, cpy, Math.max(2.5, rPix * 0.09), 0, TWO_PI); pctx.fill();
    pctx.shadowBlur = 0; pctx.restore();
  }

  // Sparkle overlay
  if (anim === 'sparkle' && drawing.length > 0) {
    pctx.save(); pctx.shadowColor = '#ffe800'; pctx.shadowBlur = 5;
    for (var sk = 0; sk < 4; sk++) {
      var seed = Math.floor((T + sk * 977) / 220);
      var r1 = ((seed * 1664525 + 1013904223) >>> 0) / 4294967296;
      var r2 = (((seed+3) * 1664525 + 1013904223) >>> 0) / 4294967296;
      var r3 = (((seed+7) * 1664525 + 1013904223) >>> 0) / 4294967296;
      var ds = drawing[Math.floor(r1 * drawing.length)];
      var dsp = ds ? (ds.pts || ds) : null;
      if (!dsp || !dsp.length) continue;
      var dp = dsp[Math.floor(r2 * dsp.length)];
      pctx.fillStyle = 'hsl(' + Math.floor(40 + r3*70) + ',100%,80%)';
      pctx.beginPath(); pctx.arc((dp.x-0.5)*2.5*rPix, -(1-dp.y)*2.5*rPix, Math.max(1.5, rPix*0.07)*(0.5+r3*0.5), 0, TWO_PI); pctx.fill();
    }
    pctx.shadowBlur = 0; pctx.restore();
  }

}

function getMySlime() {
  if (isSpectator) return null;
  if (onlineMode && mySide === 'right') return slimeRight;
  return slimeLeft;
}

function sendCustomization() {
  if (!lobbySocket || lobbySocket.readyState !== 1) return;
  if (playerHat === 'goldcrown' && !hasHatUnlock('goldcrown')) {
    playerHat = 'none';
    try { localStorage.setItem('slimeHat', playerHat); } catch(e) {}
    syncCustomizationUI();
  }
  lobbySocket.send(JSON.stringify({ type: 'customize', hat: playerHat, hatAnim: playerHatAnim, color: playerBodyColor, hatDrawing: playerHatDrawing, trail: playerTrail }));
}

function hasHatUnlock(hatId) {
  if (hatId === 'goldcrown') {
    return !!(currentAccount && currentAccount.progression && currentAccount.progression.unlocks && currentAccount.progression.unlocks.goldCrown);
  }
  var shopHats = ['devil','prismatic','dragonfire','cosmic','angelic','overlord'];
  if (shopHats.indexOf(hatId) !== -1) {
    return !!(currentAccount && Array.isArray(currentAccount.inventory) && currentAccount.inventory.indexOf(hatId) !== -1);
  }
  return true;
}

function drawBodyOverlay(pctx, cx, cy, rPix, overlay) {
  if (!overlay || overlay === 'none') return;
  var PI2 = Math.PI * 2;
  pctx.save();
  pctx.beginPath();
  pctx.arc(cx, cy, rPix, Math.PI, PI2, false);
  pctx.closePath();
  pctx.clip();
  if (overlay === 'shine') {
    var sg = pctx.createRadialGradient(cx - rPix*.28, cy - rPix*.42, 0, cx - rPix*.28, cy - rPix*.42, rPix*.75);
    sg.addColorStop(0, 'rgba(255,255,255,.28)'); sg.addColorStop(.5, 'rgba(255,255,255,.08)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = sg; pctx.fillRect(cx - rPix, cy - rPix, rPix*2, rPix);
  } else if (overlay === 'stripes') {
    pctx.strokeStyle = 'rgba(255,255,255,.22)'; pctx.lineWidth = rPix * 0.09;
    for (var sy = cy - rPix; sy < cy + rPix*.05; sy += rPix*.28) {
      pctx.beginPath(); pctx.moveTo(cx - rPix, sy); pctx.lineTo(cx + rPix, sy); pctx.stroke();
    }
  } else if (overlay === 'dots') {
    pctx.fillStyle = 'rgba(255,255,255,.2)';
    var sp = rPix * .36;
    for (var dy = cy - rPix*.85; dy < cy + rPix*.05; dy += sp) {
      for (var dx = cx - rPix*.8; dx < cx + rPix*.85; dx += sp) {
        pctx.beginPath(); pctx.arc(dx, dy, rPix*.07, 0, PI2); pctx.fill();
      }
    }
  } else if (overlay === 'stars') {
    pctx.strokeStyle = 'rgba(255,255,255,.35)'; pctx.fillStyle = 'rgba(255,255,255,.38)';
    [[-.38,-.54],[.22,-.72],[-.08,-.32],[.44,-.42],[.02,-.6]].forEach(function(p) {
      var sx = cx + p[0]*rPix, sy2 = cy + p[1]*rPix, sr = rPix*.075;
      pctx.lineWidth = rPix*.04;
      pctx.beginPath();
      for (var pt = 0; pt < 4; pt++) { var a = pt*Math.PI/2; pctx.moveTo(sx, sy2); pctx.lineTo(sx + Math.cos(a)*sr*2, sy2 + Math.sin(a)*sr*2); }
      pctx.stroke();
      pctx.beginPath(); pctx.arc(sx, sy2, sr, 0, PI2); pctx.fill();
    });
  } else if (overlay === 'grid') {
    pctx.strokeStyle = 'rgba(255,255,255,.14)'; pctx.lineWidth = 0.6;
    var gs = rPix * .3;
    for (var gx = cx - rPix; gx <= cx + rPix; gx += gs) { pctx.beginPath(); pctx.moveTo(gx, cy-rPix); pctx.lineTo(gx, cy+5); pctx.stroke(); }
    for (var gy = cy - rPix; gy <= cy; gy += gs) { pctx.beginPath(); pctx.moveTo(cx-rPix, gy); pctx.lineTo(cx+rPix, gy); pctx.stroke(); }
  }
  pctx.restore();
}

// drawHatAt: context-independent hat renderer used by game rendering and preview
