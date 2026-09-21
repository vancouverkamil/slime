function drawMap15(w, h, gy, cx) {
      var mx = w / 2;
      // Blinding white-hot arena sky, no darkness anywhere
      var sg = cx.createLinearGradient(0, 0, 0, gy);
      sg.addColorStop(0,    '#fffdfa'); sg.addColorStop(0.4,  '#fbeaf6');
      sg.addColorStop(0.72, '#f8d8ee'); sg.addColorStop(1,    '#ffc7ea');
      cx.fillStyle = sg; cx.fillRect(0, 0, w, gy);

      // Hot-pink rim glow bleeding in from both edges
      var lrim = cx.createLinearGradient(0, 0, w * 0.35, 0);
      lrim.addColorStop(0, 'rgba(255,0,160,0.28)'); lrim.addColorStop(1, 'transparent');
      cx.fillStyle = lrim; cx.fillRect(0, 0, w * 0.35, gy);
      var rrim = cx.createLinearGradient(w, 0, w * 0.65, 0);
      rrim.addColorStop(0, 'rgba(255,0,160,0.28)'); rrim.addColorStop(1, 'transparent');
      cx.fillStyle = rrim; cx.fillRect(w * 0.65, 0, w * 0.35, gy);

      // Distant coliseum skyline silhouette, backlit by the white sky
      cx.fillStyle = 'rgba(120,20,90,0.55)';
      var towers = [[0.06,0.30],[0.16,0.42],[0.27,0.34],[0.5,0.5],[0.73,0.34],[0.84,0.42],[0.94,0.30]];
      towers.forEach(function(t, i) {
        var tx = t[0] * w, th = t[1] * gy, tw = w * 0.09;
        cx.fillRect(tx - tw/2, gy - th, tw, th);
        cx.fillStyle = 'rgba(255,235,250,0.85)';
        for (var wi = 0; wi < 4; wi++) {
          if (_sr(i * 7 + wi) > 0.4) {
            cx.fillRect(tx - tw/2 + 4 + (wi % 2) * (tw - 12), gy - th + 6 + wi * (th / 4.2), 6, 6);
          }
        }
        cx.fillStyle = 'rgba(120,20,90,0.55)';
      });

      // Tiered crowd stands, packed with cheering silhouettes
      var crowdColors = ['#ff2fb0','#ffffff','#ff9de0','#c400ff','#ff5fd0'];
      for (var row = 0; row < 3; row++) {
        var ry = gy * (0.58 + row * 0.11);
        cx.fillStyle = 'rgba(90,10,70,' + (0.4 + row * 0.08) + ')';
        cx.beginPath();
        cx.moveTo(0, ry + 14);
        cx.quadraticCurveTo(mx, ry - 10 - row * 4, w, ry + 14);
        cx.lineTo(w, ry + 30); cx.lineTo(0, ry + 30);
        cx.closePath(); cx.fill();
        for (var p = 0; p < 46; p++) {
          var px = (p / 46) * w + _sr(row * 100 + p) * 10 - 5;
          var curve = Math.sin((px / w) * Math.PI) * (10 + row * 4);
          var py = ry + 16 - curve + _sr(row * 100 + p + 50) * 6;
          cx.fillStyle = crowdColors[(p + row) % crowdColors.length];
          cx.beginPath(); cx.arc(px, py, 2.6, 0, TWO_PI); cx.fill();
        }
      }

      // Lighting truss with three fixtures beaming down on center court
      var rigY = gy * 0.06;
      cx.strokeStyle = 'rgba(80,20,60,0.7)'; cx.lineWidth = 4;
      cx.beginPath(); cx.moveTo(mx - w * 0.22, rigY); cx.lineTo(mx + w * 0.22, rigY); cx.stroke();
      [-0.16, 0, 0.16].forEach(function(off) {
        var fx = mx + off * w;
        var glow = cx.createRadialGradient(fx, rigY, 1, fx, rigY, 22);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)'); glow.addColorStop(1, 'transparent');
        cx.fillStyle = glow; cx.beginPath(); cx.arc(fx, rigY, 22, 0, TWO_PI); cx.fill();
        cx.fillStyle = '#3a1030';
        cx.beginPath(); cx.arc(fx, rigY, 5, 0, TWO_PI); cx.fill();
      });

      // Three converging spotlight beams onto center stage
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
      beam(mx - w * 0.16, rigY, mx - w * 0.05, w * 0.12, 'rgba(255,225,250,0.55)');
      beam(mx,            rigY, mx,            w * 0.16, 'rgba(255,255,255,0.85)');
      beam(mx + w * 0.16, rigY, mx + w * 0.05, w * 0.12, 'rgba(255,225,250,0.55)');
      cx.restore();

      // Stage floor: glossy white with a receding neon-pink grid
      var fg = cx.createLinearGradient(0, gy, 0, h);
      fg.addColorStop(0, '#fdf3fa'); fg.addColorStop(0.4, '#f6d9ee'); fg.addColorStop(1, '#e8b8dd');
      cx.fillStyle = fg; cx.fillRect(0, gy, w, h - gy);
      cx.strokeStyle = 'rgba(255,0,150,0.35)'; cx.lineWidth = 1;
      for (var gx = 0; gx <= 10; gx++) {
        var fx0 = mx + (gx / 10 - 0.5) * w * 2.2, fx1 = mx + (gx / 10 - 0.5) * w * 0.4;
        cx.beginPath(); cx.moveTo(fx0, h); cx.lineTo(fx1, gy); cx.stroke();
      }
      for (var gl = 1; gl <= 4; gl++) {
        var ly = gy + (h - gy) * (gl / 5);
        cx.beginPath(); cx.moveTo(0, ly); cx.lineTo(w, ly); cx.stroke();
      }

      // Spotlight pool where the slimes are playing
      var pool = cx.createRadialGradient(mx, gy, 4, mx, gy, w * 0.34);
      pool.addColorStop(0, 'rgba(255,255,255,0.75)');
      pool.addColorStop(0.5, 'rgba(255,190,240,0.3)');
      pool.addColorStop(1, 'transparent');
      cx.fillStyle = pool; cx.fillRect(0, gy - h * 0.05, w, h * 0.4);

      backTextColor = '#4a0030'; return;
}
