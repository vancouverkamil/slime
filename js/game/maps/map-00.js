function drawMap0(w, h, gy, cx) {
      // Deep multi-stop sky
      var sg = cx.createLinearGradient(0, 0, 0, gy);
      sg.addColorStop(0,   '#081c3a'); sg.addColorStop(0.15, '#0d3268');
      sg.addColorStop(0.4, '#1a6cb8'); sg.addColorStop(0.7,  '#5aa8d8');
      sg.addColorStop(0.9, '#9ecfe8'); sg.addColorStop(1,    '#cde8f5');
      cx.fillStyle = sg; cx.fillRect(0, 0, w, gy);
      // Horizon haze
      var haze = cx.createLinearGradient(0, gy * 0.72, 0, gy);
      haze.addColorStop(0, 'transparent'); haze.addColorStop(1, 'rgba(210,238,255,0.22)');
      cx.fillStyle = haze; cx.fillRect(0, gy * 0.72, w, gy * 0.28);
      // Sun with glow rings
      var sx = 108, sy = 52;
      var sunGlo = cx.createRadialGradient(sx, sy, 6, sx, sy, 120);
      sunGlo.addColorStop(0,   'rgba(255,244,180,0.4)');
      sunGlo.addColorStop(0.35,'rgba(255,220,100,0.14)');
      sunGlo.addColorStop(1,   'transparent');
      cx.fillStyle = sunGlo; cx.fillRect(sx-120, sy-120, 240, 240);
      var sunD = cx.createRadialGradient(sx, sy, 0, sx, sy, 34);
      sunD.addColorStop(0, '#fffef0'); sunD.addColorStop(0.5, '#ffe555'); sunD.addColorStop(1, '#ffa800');
      cx.fillStyle = sunD; cx.beginPath(); cx.arc(sx, sy, 34, 0, TWO_PI); cx.fill();
      cx.strokeStyle = 'rgba(255,238,100,0.18)'; cx.lineWidth = 2;
      for (var fi = 0; fi < 8; fi++) {
        var fa = (fi / 8) * TWO_PI;
        cx.beginPath();
        cx.moveTo(sx + Math.cos(fa) * 36, sy + Math.sin(fa) * 36);
        cx.lineTo(sx + Math.cos(fa) * (52 + (fi % 3) * 14), sy + Math.sin(fa) * (52 + (fi % 3) * 14));
        cx.stroke();
      }
      cx.lineWidth = 1;
      // Cirrus wisps
      cx.lineWidth = 2;
      [[140,48,110],[320,34,140],[502,58,95],[625,40,115]].forEach(function(ci) {
        cx.strokeStyle = 'rgba(255,255,255,' + (0.32 + _sr(ci[0]) * 0.18) + ')';
        cx.lineWidth = 2 + _sr(ci[1]) * 3;
        cx.beginPath();
        cx.moveTo(ci[0], ci[1]);
        cx.bezierCurveTo(ci[0] + ci[2]*0.28, ci[1] - 7, ci[0] + ci[2]*0.7, ci[1] + 4, ci[0] + ci[2], ci[1] - 2);
        cx.stroke();
      });
      cx.lineWidth = 1;
      // Volumetric cumulus clouds
      function skyCloud(cx0, cy0, sc) {
        cx.fillStyle = 'rgba(180,205,225,0.28)';
        cx.beginPath(); cx.ellipse(cx0+5, cy0+sc*0.4, sc*1.1, sc*0.32, 0, 0, TWO_PI); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.92)';
        cx.beginPath(); cx.arc(cx0, cy0, sc, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0+sc*1.1, cy0+sc*0.18, sc*0.78, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0-sc*0.88, cy0+sc*0.22, sc*0.7, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0+sc*0.38, cy0-sc*0.52, sc*0.65, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0-sc*0.3, cy0-sc*0.45, sc*0.52, 0, TWO_PI); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.5)';
        cx.beginPath(); cx.arc(cx0-sc*0.14, cy0-sc*0.18, sc*0.36, 0, TWO_PI); cx.fill();
      }
      skyCloud(185, 78, 22); skyCloud(418, 60, 20); skyCloud(598, 76, 27); skyCloud(698, 50, 16);
      // Lush grass ground
      var gg = cx.createLinearGradient(0, gy, 0, h);
      gg.addColorStop(0, '#4aab3c'); gg.addColorStop(0.25, '#3a8c2c');
      gg.addColorStop(0.65, '#2c6e1e'); gg.addColorStop(1, '#1c4a12');
      cx.fillStyle = gg; cx.fillRect(0, gy, w, h - gy);
      cx.strokeStyle = 'rgba(90,190,55,0.22)'; cx.lineWidth = 1;
      for (var gi = 0; gi < 65; gi++) { var gx = (gi*53)%w; cx.beginPath(); cx.moveTo(gx,gy); cx.lineTo(gx+3,gy-9); cx.stroke(); }
      var gsh = cx.createLinearGradient(0, gy-6, 0, gy+10);
      gsh.addColorStop(0, 'rgba(0,0,0,0.1)'); gsh.addColorStop(1, 'transparent');
      cx.fillStyle = gsh; cx.fillRect(0, gy-6, w, 16);
      backTextColor = '#1a3a0a'; return;
}
