function drawMap15(w, h, gy, cx) {
      var mx = w / 2;

      // Dark night arena — no white sky anymore, light comes only from the rig
      var sg = cx.createLinearGradient(0, 0, 0, gy);
      sg.addColorStop(0,    '#050108'); sg.addColorStop(0.45, '#180a20');
      sg.addColorStop(0.8,  '#2a0f2c'); sg.addColorStop(1,    '#3a1230');
      cx.fillStyle = sg; cx.fillRect(0, 0, w, gy);

      // Distant coliseum skyline, barely lit
      cx.fillStyle = 'rgba(60,10,45,0.6)';
      var towers = [[0.06,0.30],[0.16,0.42],[0.27,0.34],[0.5,0.46],[0.73,0.34],[0.84,0.42],[0.94,0.30]];
      towers.forEach(function(t, i) {
        var tx = t[0] * w, th = t[1] * gy, tw = w * 0.09;
        cx.fillRect(tx - tw/2, gy - th, tw, th);
        cx.fillStyle = 'rgba(255,140,220,0.4)';
        for (var wi = 0; wi < 4; wi++) {
          if (_sr(i * 7 + wi) > 0.5) cx.fillRect(tx - tw/2 + 4 + (wi % 2) * (tw - 12), gy - th + 6 + wi * (th / 4.2), 4, 4);
        }
        cx.fillStyle = 'rgba(60,10,45,0.6)';
      });

      // Tier riser bands — the seating structure, drawn behind the crowd
      for (var band = 0; band < 6; band++) {
        var by = gy * (0.40 + band * 0.10);
        cx.fillStyle = 'rgba(35,8,30,' + (0.5 + band * 0.07) + ')';
        cx.fillRect(0, by, w, gy * 0.1 + 2);
      }

      // ~300-strong crowd, packed into dense wavy tiers — a stadium mid-cheer,
      // bright enough to read clearly against the dark bowl behind it
      function crowdTier(y0, count, amp, freq, phase, dim) {
        for (var i = 0; i < count; i++) {
          var t = i / count;
          var x = t * w;
          var wave = Math.sin(t * Math.PI * freq + phase) * amp;
          var armUp = Math.sin(t * Math.PI * freq * 2.3 + phase) > 0;
          var y = y0 - Math.abs(wave);
          var seed = phase * 1000 + i;
          var accent = _sr(seed) > 0.85;
          cx.globalAlpha = dim;
          cx.fillStyle = accent ? '#ff6fe0' : (_sr(seed + 1) > 0.5 ? '#e888c8' : '#b855a0');
          cx.beginPath(); cx.arc(x, y, 2.6, 0, TWO_PI); cx.fill();
          cx.strokeStyle = cx.fillStyle; cx.lineWidth = 1.8;
          cx.beginPath(); cx.moveTo(x, y - 1); cx.lineTo(x + (i % 2 ? 2.5 : -2.5), armUp ? y - 7 : y + 2); cx.stroke();
        }
        cx.globalAlpha = 1;
      }
      crowdTier(gy * 0.42, 50, 5,  9, 0.4, 0.75);
      crowdTier(gy * 0.52, 50, 6,  9, 1.1, 0.8);
      crowdTier(gy * 0.62, 50, 6,  8, 0.7, 0.85);
      crowdTier(gy * 0.72, 50, 7,  8, 1.6, 0.9);
      crowdTier(gy * 0.82, 50, 7,  7, 0.3, 0.95);
      crowdTier(gy * 0.92, 50, 8,  7, 1.3, 1);

      // Lighting truss — the one bright, sharply separated foreground element
      var rigY = gy * 0.05;
      cx.strokeStyle = 'rgba(120,30,90,0.8)'; cx.lineWidth = 4;
      cx.beginPath(); cx.moveTo(mx - w * 0.22, rigY); cx.lineTo(mx + w * 0.22, rigY); cx.stroke();
      [-0.16, 0, 0.16].forEach(function(off) {
        var fx = mx + off * w;
        var glow = cx.createRadialGradient(fx, rigY, 1, fx, rigY, 26);
        glow.addColorStop(0, 'rgba(255,255,255,1)'); glow.addColorStop(1, 'transparent');
        cx.fillStyle = glow; cx.beginPath(); cx.arc(fx, rigY, 26, 0, TWO_PI); cx.fill();
        cx.fillStyle = '#1a0614';
        cx.beginPath(); cx.arc(fx, rigY, 5, 0, TWO_PI); cx.fill();
      });

      cx.save(); cx.globalCompositeOperation = 'lighter';
      function beam(fromX, fromY, targetX, halfWidth, color) {
        var g = cx.createLinearGradient(0, fromY, 0, gy);
        g.addColorStop(0, color); g.addColorStop(1, 'transparent');
        cx.fillStyle = g;
        cx.beginPath();
        cx.moveTo(fromX - 3, fromY); cx.lineTo(fromX + 3, fromY);
        cx.lineTo(targetX + halfWidth, gy); cx.lineTo(targetX - halfWidth, gy);
        cx.closePath(); cx.fill();
      }
      beam(mx - w * 0.16, rigY, mx - w * 0.05, w * 0.12, 'rgba(255,210,245,0.6)');
      beam(mx,            rigY, mx,            w * 0.16, 'rgba(255,255,255,0.95)');
      beam(mx + w * 0.16, rigY, mx + w * 0.05, w * 0.12, 'rgba(255,210,245,0.6)');
      cx.restore();

      // Stage floor: dim magenta, lit only where the spotlight actually lands
      var fg = cx.createLinearGradient(0, gy, 0, h);
      fg.addColorStop(0, '#1c0618'); fg.addColorStop(0.5, '#26081f'); fg.addColorStop(1, '#150512');
      cx.fillStyle = fg; cx.fillRect(0, gy, w, h - gy);
      cx.strokeStyle = 'rgba(255,0,150,0.3)'; cx.lineWidth = 1;
      for (var gx = 0; gx <= 10; gx++) {
        var fx0 = mx + (gx / 10 - 0.5) * w * 2.2, fx1 = mx + (gx / 10 - 0.5) * w * 0.4;
        cx.beginPath(); cx.moveTo(fx0, h); cx.lineTo(fx1, gy); cx.stroke();
      }
      for (var gl = 1; gl <= 4; gl++) {
        var ly = gy + (h - gy) * (gl / 5);
        cx.beginPath(); cx.moveTo(0, ly); cx.lineTo(w, ly); cx.stroke();
      }

      cx.save(); cx.globalCompositeOperation = 'lighter';
      var pool = cx.createRadialGradient(mx, gy, 4, mx, gy, w * 0.34);
      pool.addColorStop(0, 'rgba(255,255,255,0.9)');
      pool.addColorStop(0.5, 'rgba(255,120,220,0.35)');
      pool.addColorStop(1, 'transparent');
      cx.fillStyle = pool; cx.fillRect(0, gy - h * 0.05, w, h * 0.4);
      cx.restore();

      backTextColor = '#ff6fd0'; return;
}
