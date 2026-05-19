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
  lobbySocket.send(JSON.stringify({ type: 'customize', hat: playerHat, hatAnim: playerHatAnim, color: playerBodyColor, hatDrawing: playerHatDrawing }));
}

function hasHatUnlock(hatId) {
  if (hatId !== 'goldcrown') return true;
  return !!(currentAccount && currentAccount.progression && currentAccount.progression.unlocks && currentAccount.progression.unlocks.goldCrown);
}

// drawHatAt: context-independent hat renderer used by game rendering and preview
function drawHatAt(pctx, cx, topY, rPix, cfg) {
  var hat     = cfg ? cfg.hat  : playerHat;
  var anim    = cfg ? (cfg.anim || 'none') : playerHatAnim;
  var drawing = cfg ? (cfg.drawing || cfg.hatDrawing || []) : playerHatDrawing;
  if (!hat || hat === 'none') return;
  pctx.save();
  pctx.translate(cx, topY);
  if (anim === 'pulse') {
    var ps = 1 + 0.12 * Math.sin(Date.now() / 280);
    pctx.scale(ps, ps);
  }
  if (hat === 'crown' || hat === 'goldcrown') {
    pctx.fillStyle = '#ffd700'; pctx.strokeStyle = '#b8960c'; pctx.lineWidth = 1;
    if (hat === 'goldcrown') {
      pctx.shadowColor = '#ffd700';
      pctx.shadowBlur = rPix * 0.45;
      pctx.fillStyle = '#ffe066';
      pctx.strokeStyle = '#fff1a6';
    }
    var cw = rPix * 1.1, ch = rPix * 0.55;
    pctx.beginPath();
    pctx.moveTo(-cw/2, 0); pctx.lineTo(-cw/2, -ch*0.55);
    pctx.lineTo(-cw/4, -ch); pctx.lineTo(0, -ch*0.45);
    pctx.lineTo(cw/4, -ch); pctx.lineTo(cw/2, -ch*0.55);
    pctx.lineTo(cw/2, 0); pctx.closePath();
    pctx.fill(); pctx.stroke();
    [['#ff3355',-cw/4],['#33ddff',0],['#33ff88',cw/4]].forEach(function(g) {
      pctx.fillStyle = g[0];
      pctx.beginPath(); pctx.arc(g[1], -ch*0.18, rPix*0.09, 0, TWO_PI); pctx.fill();
    });
    pctx.shadowBlur = 0;
  } else if (hat === 'tophat') {
    pctx.fillStyle = '#111'; pctx.strokeStyle = '#444'; pctx.lineWidth = 1;
    var bw = rPix*1.4, bh = rPix*0.14, hw = rPix*0.78, hh = rPix*0.85;
    pctx.fillRect(-bw/2, -bh, bw, bh); pctx.fillRect(-hw/2, -bh-hh, hw, hh);
    pctx.strokeRect(-hw/2, -bh-hh, hw, hh);
    pctx.fillStyle = '#8b0000'; pctx.fillRect(-hw/2, -bh-hh*0.24, hw, hh*0.17);
  } else if (hat === 'cowboy') {
    pctx.fillStyle = '#8B5E3C'; pctx.strokeStyle = '#5a3a1a'; pctx.lineWidth = 1;
    var bw2 = rPix*1.6, hw2 = rPix*0.95, hh2 = rPix*0.72;
    pctx.beginPath(); pctx.ellipse(0, -hh2*0.3, hw2/2, hh2*0.68, 0, 0, TWO_PI); pctx.fill(); pctx.stroke();
    pctx.beginPath(); pctx.ellipse(0, -1, bw2/2, rPix*0.17, 0, 0, TWO_PI); pctx.fill();
    pctx.strokeStyle = '#333'; pctx.lineWidth = 2;
    pctx.beginPath(); pctx.ellipse(0, -hh2*0.25, hw2/2-1, hh2*0.13, 0, 0, TWO_PI); pctx.stroke();
  } else if (hat === 'halo') {
    pctx.strokeStyle = '#ffe800'; pctx.lineWidth = rPix*0.17;
    pctx.shadowColor = '#ffe800'; pctx.shadowBlur = rPix*0.5;
    pctx.beginPath(); pctx.ellipse(0, -rPix*0.38, rPix*0.52, rPix*0.19, 0, 0, TWO_PI); pctx.stroke();
    pctx.shadowBlur = 0;
  } else if (hat === 'party') {
    var ph = rPix*0.98, pw2 = rPix*0.68;
    pctx.fillStyle = '#ff00cc';
    pctx.beginPath(); pctx.moveTo(0,-ph); pctx.lineTo(-pw2/2,0); pctx.lineTo(pw2/2,0); pctx.closePath(); pctx.fill();
    pctx.strokeStyle = '#ffff00'; pctx.lineWidth = 1.5;
    for (var pi=1; pi<=2; pi++) {
      var t2 = pi/3;
      pctx.beginPath(); pctx.moveTo(-pw2/2*t2, -ph*(1-t2)); pctx.lineTo(pw2/2*t2, -ph*(1-t2)); pctx.stroke();
    }
    pctx.fillStyle = '#ffff00'; pctx.beginPath(); pctx.arc(0, -ph, rPix*0.11, 0, TWO_PI); pctx.fill();
  } else if (hat === 'cosmic') {
    var T = Date.now();
    var _cw = rPix * 1.25, _ch = rPix * 0.72;
    pctx.shadowColor = '#9933ff'; pctx.shadowBlur = rPix * 0.9;
    var _cGrad = pctx.createLinearGradient(0, 0, 0, -_ch);
    _cGrad.addColorStop(0, '#1a0045'); _cGrad.addColorStop(1, '#4400bb');
    pctx.fillStyle = _cGrad; pctx.strokeStyle = '#bb66ff'; pctx.lineWidth = 1.5;
    pctx.beginPath();
    pctx.moveTo(-_cw/2, 0); pctx.lineTo(-_cw/2, -_ch*0.44);
    pctx.lineTo(-_cw*0.32, -_ch); pctx.lineTo(-_cw*0.12, -_ch*0.5);
    pctx.lineTo(0, -_ch*1.08); pctx.lineTo(_cw*0.12, -_ch*0.5);
    pctx.lineTo(_cw*0.32, -_ch); pctx.lineTo(_cw/2, -_ch*0.44);
    pctx.lineTo(_cw/2, 0); pctx.closePath(); pctx.fill(); pctx.stroke();
    for (var _ci = 0; _ci < 4; _ci++) {
      var _ca = T/600 + _ci*1.571;
      pctx.fillStyle = _ci%2===0 ? '#ff88ff' : '#88ccff';
      pctx.shadowColor = _ci%2===0 ? '#ff44ff' : '#4488ff'; pctx.shadowBlur = rPix*0.5;
      pctx.beginPath();
      pctx.arc(Math.cos(_ca)*_cw*0.3, -_ch*0.5+Math.sin(_ca)*_ch*0.22, rPix*0.09, 0, TWO_PI);
      pctx.fill();
    }
    pctx.shadowBlur = 0;
  } else if (hat === 'dragonfire') {
    var T = Date.now();
    var _fl = 0.09 + 0.05*Math.sin(T/110);
    pctx.shadowColor = '#ff4400'; pctx.shadowBlur = rPix*0.7;
    pctx.fillStyle = '#cc2200'; pctx.strokeStyle = '#ff6600'; pctx.lineWidth = 1.5;
    pctx.beginPath();
    pctx.moveTo(-rPix*0.18, 0);
    pctx.quadraticCurveTo(-rPix*0.8, -rPix*0.45, -rPix*0.46, -rPix*1.08);
    pctx.quadraticCurveTo(-rPix*0.22, -rPix*0.58, -rPix*0.04, 0);
    pctx.closePath(); pctx.fill(); pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(rPix*0.18, 0);
    pctx.quadraticCurveTo(rPix*0.8, -rPix*0.45, rPix*0.46, -rPix*1.08);
    pctx.quadraticCurveTo(rPix*0.22, -rPix*0.58, rPix*0.04, 0);
    pctx.closePath(); pctx.fill(); pctx.stroke();
    pctx.fillStyle = '#ffee00'; pctx.shadowColor = '#ffaa00'; pctx.shadowBlur = rPix*0.6;
    pctx.beginPath(); pctx.arc(-rPix*0.46, -rPix*1.08, rPix*_fl, 0, TWO_PI); pctx.fill();
    pctx.beginPath(); pctx.arc(rPix*0.46, -rPix*1.08, rPix*_fl, 0, TWO_PI); pctx.fill();
    pctx.shadowBlur = 0;
  } else if (hat === 'angelic') {
    pctx.shadowColor = '#ffffcc'; pctx.shadowBlur = rPix*0.8;
    [[rPix*0.56, -rPix*0.34, rPix*0.18, '#ffe800'],
     [rPix*0.38, -rPix*0.7,  rPix*0.13, '#ffffff'],
     [rPix*0.24, -rPix*1.0,  rPix*0.1,  '#aaddff']].forEach(function(h) {
      pctx.strokeStyle = h[3]; pctx.lineWidth = h[2];
      pctx.beginPath(); pctx.ellipse(0, h[1], h[0], h[0]*0.34, 0, 0, TWO_PI); pctx.stroke();
    });
    pctx.shadowBlur = 0;
  } else if (hat === 'devil') {
    pctx.shadowColor = '#cc0000'; pctx.shadowBlur = rPix*0.55;
    pctx.fillStyle = '#880000'; pctx.strokeStyle = '#cc2200'; pctx.lineWidth = 1.5;
    pctx.beginPath();
    pctx.moveTo(-rPix*0.44, -rPix*0.08);
    pctx.quadraticCurveTo(-rPix*0.72, -rPix*0.62, -rPix*0.36, -rPix*0.96);
    pctx.quadraticCurveTo(-rPix*0.16, -rPix*0.54, -rPix*0.04, -rPix*0.08);
    pctx.closePath(); pctx.fill(); pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(rPix*0.44, -rPix*0.08);
    pctx.quadraticCurveTo(rPix*0.72, -rPix*0.62, rPix*0.36, -rPix*0.96);
    pctx.quadraticCurveTo(rPix*0.16, -rPix*0.54, rPix*0.04, -rPix*0.08);
    pctx.closePath(); pctx.fill(); pctx.stroke();
    pctx.shadowBlur = 0;
  } else if (hat === 'prismatic') {
    var T = Date.now();
    var _ph2 = (T/25)%360;
    var _pw = rPix*1.1, _pht = rPix*0.88;
    pctx.shadowColor = 'hsl('+_ph2+',100%,60%)'; pctx.shadowBlur = rPix*0.8;
    var _pGrad = pctx.createLinearGradient(-_pw/2, 0, _pw/2, -_pht);
    _pGrad.addColorStop(0, 'hsl('+_ph2+',70%,12%)');
    _pGrad.addColorStop(0.5, 'hsl('+((_ph2+120)%360)+',70%,18%)');
    _pGrad.addColorStop(1, 'hsl('+((_ph2+240)%360)+',70%,22%)');
    pctx.fillStyle = _pGrad;
    pctx.strokeStyle = 'hsl('+_ph2+',100%,65%)'; pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.moveTo(-_pw/2, 0); pctx.lineTo(-_pw/3, -_pht*0.52);
    pctx.lineTo(-_pw*0.09, -_pht); pctx.lineTo(_pw*0.09, -_pht);
    pctx.lineTo(_pw/3, -_pht*0.52); pctx.lineTo(_pw/2, 0);
    pctx.closePath(); pctx.fill(); pctx.stroke();
    for (var _gi = 0; _gi < 3; _gi++) {
      pctx.fillStyle = 'hsl('+((_ph2+_gi*120)%360)+',100%,70%)';
      pctx.shadowColor = 'hsl('+((_ph2+_gi*120)%360)+',100%,60%)'; pctx.shadowBlur = rPix*0.5;
      pctx.beginPath();
      pctx.arc(-_pw/4+_gi*_pw/4, -_pht*0.23, rPix*0.1, 0, TWO_PI); pctx.fill();
    }
    pctx.shadowBlur = 0;
  } else if (hat === 'overlord') {
    var T = Date.now();
    var _ow = rPix*1.45, _oh = rPix*0.95;
    var _gp = 0.8+0.2*Math.sin(T/380);
    pctx.shadowColor = '#aa0000'; pctx.shadowBlur = rPix*1.1;
    var _oGrad = pctx.createLinearGradient(0, 0, 0, -_oh);
    _oGrad.addColorStop(0, '#080004'); _oGrad.addColorStop(1, '#180010');
    pctx.fillStyle = _oGrad; pctx.strokeStyle = '#550033'; pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.moveTo(-_ow/2, 0); pctx.lineTo(-_ow/2, -_oh*0.38);
    pctx.lineTo(-_ow*0.36, -_oh*0.84); pctx.lineTo(-_ow*0.22, -_oh*0.48);
    pctx.lineTo(-_ow*0.1, -_oh); pctx.lineTo(0, -_oh*0.54);
    pctx.lineTo(_ow*0.1, -_oh); pctx.lineTo(_ow*0.22, -_oh*0.48);
    pctx.lineTo(_ow*0.36, -_oh*0.84); pctx.lineTo(_ow/2, -_oh*0.38);
    pctx.lineTo(_ow/2, 0); pctx.closePath(); pctx.fill(); pctx.stroke();
    [[-_ow*0.32,-_oh*0.21],[0,-_oh*0.2],[_ow*0.32,-_oh*0.21]].forEach(function(g,i) {
      pctx.shadowColor = '#ff0033';
      pctx.shadowBlur = rPix*0.45*(i===1?_gp:0.55);
      pctx.fillStyle = i===1 ? 'hsl(0,100%,'+(28+14*_gp|0)+'%)' : '#660022';
      pctx.beginPath(); pctx.arc(g[0], g[1], rPix*(i===1?0.13:0.09), 0, TWO_PI); pctx.fill();
    });
    pctx.shadowBlur = 0;
  } else if (hat === 'custom') {
    if (!drawing || drawing.length === 0) { pctx.restore(); return; }
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
  pctx.restore();
}

function drawHat(s, cfg) {
  if (!s) return;
  var xPix = s.x * pixelsPerUnitX;
  var yPix = courtYPix - (s.y * pixelsPerUnitY);
  var rPix = s.radius * pixelsPerUnitY;
  drawHatAt(ctx, xPix, yPix - rPix + 1, rPix, cfg || { hat: playerHat, drawing: playerHatDrawing });
}

// ── slime preview ─────────────────────────────────────────
// r=22 chosen so that 2.5*r=55px fits within the 110px preview width
var PREV_R = 22;
function updateSlimePreview() {
  var pc = document.getElementById('SlimePreview');
  if (!pc) return;
  var pw = pc.width, ph = pc.height;
  var pctx = pc.getContext('2d');
  pctx.clearRect(0, 0, pw, ph);
  pctx.fillStyle = '#080018'; pctx.fillRect(0, 0, pw, ph);
  var cx = pw / 2;
  var r  = PREV_R;
  var cy = ph - 22;      // slime base sits here
  var topY = cy - r;     // top of slime arc = hat anchor
  // court floor
  pctx.strokeStyle = 'rgba(0,255,200,0.18)'; pctx.lineWidth = 1;
  pctx.beginPath(); pctx.moveTo(0, cy); pctx.lineTo(pw, cy); pctx.stroke();
  // slime body
  if (greenSlimeImage && greenSlimeImage.complete) {
    var tc = getTintedCanvas(greenSlimeImage, playerBodyColor);
    var sc2 = (r * 2) / tc.width;
    pctx.drawImage(tc, cx - r, cy - tc.height * sc2 * 0.72, tc.width * sc2, tc.height * sc2);
  } else {
    pctx.fillStyle = playerBodyColor;
    pctx.beginPath(); pctx.arc(cx, cy, r, Math.PI, 0); pctx.fill();
  }
  // eye
  var eyeX = cx + r*0.26, eyeY = cy - r*0.38;
  pctx.fillStyle = '#fff'; pctx.beginPath(); pctx.arc(eyeX, eyeY, r*0.19, 0, TWO_PI); pctx.fill();
  pctx.fillStyle = '#000'; pctx.beginPath(); pctx.arc(eyeX+r*0.05, eyeY, r*0.095, 0, TWO_PI); pctx.fill();
  // hat — topY is the exact same anchor drawHatAt uses in-game
  drawHatAt(pctx, cx, topY, r, { hat: playerHat, anim: playerHatAnim, drawing: playerHatDrawing });
}

// ── custom hat drawing ────────────────────────────────────
