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
    drawCustomHat(pctx, drawing, anim, rPix);
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
