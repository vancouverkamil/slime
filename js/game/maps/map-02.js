function drawMap2(w, h, gy, cx) {
      var sunsetG = cx.createLinearGradient(0,0,0,gy);
      sunsetG.addColorStop(0,   '#080118');
      sunsetG.addColorStop(0.12,'#16062e');
      sunsetG.addColorStop(0.3, '#6e1a50');
      sunsetG.addColorStop(0.52,'#c24222');
      sunsetG.addColorStop(0.72,'#e87c0a');
      sunsetG.addColorStop(0.88,'#f5c030');
      sunsetG.addColorStop(1,   '#f8df55');
      cx.fillStyle = sunsetG; cx.fillRect(0,0,w,gy);
      // God rays from horizon sun
      cx.globalAlpha = 0.055;
      for (var ray = 0; ray < 18; ray++) {
        var rAng = Math.PI + ((ray / 18) * Math.PI), rLen = 290+(ray%4)*60, rW = 16+(ray%5)*10;
        cx.fillStyle = '#ffcc44';
        cx.beginPath(); cx.moveTo(w/2, gy);
        cx.lineTo(w/2+Math.cos(rAng-rW/1400)*rLen, gy+Math.sin(rAng-rW/1400)*rLen);
        cx.lineTo(w/2+Math.cos(rAng+rW/1400)*rLen, gy+Math.sin(rAng+rW/1400)*rLen);
        cx.closePath(); cx.fill();
      }
      cx.globalAlpha = 1;
      // Atmospheric haze
      for (var hi = 0; hi < 3; hi++) {
        var hazeG2 = cx.createLinearGradient(0,gy*(0.55+hi*0.1),0,gy*(0.78+hi*0.1));
        hazeG2.addColorStop(0,'transparent'); hazeG2.addColorStop(0.5,'rgba(255,'+(130-hi*20)+','+(40-hi*10)+','+(0.07-hi*0.01)+')'); hazeG2.addColorStop(1,'transparent');
        cx.fillStyle = hazeG2; cx.fillRect(0,gy*(0.55+hi*0.1),w,gy*0.28);
      }
      // Sun disc with bloom
      var sGlo = cx.createRadialGradient(w/2,gy,0,w/2,gy,175);
      sGlo.addColorStop(0,'rgba(255,255,200,0.82)'); sGlo.addColorStop(0.15,'rgba(255,210,70,0.38)');
      sGlo.addColorStop(0.42,'rgba(255,140,30,0.14)'); sGlo.addColorStop(1,'transparent');
      cx.fillStyle = sGlo; cx.fillRect(w/2-175,gy-175,350,175);
      cx.fillStyle = '#ffe84a';
      cx.beginPath(); cx.arc(w/2,gy,52,Math.PI,TWO_PI); cx.fill();
      cx.fillStyle = 'rgba(255,255,190,0.42)';
      cx.beginPath(); cx.arc(w/2,gy,68,Math.PI,TWO_PI); cx.fill();
      // Layered mountains — atmospheric depth
      function mtnLayer(pts, col) {
        cx.fillStyle = col; cx.beginPath(); cx.moveTo(0,gy);
        pts.forEach(function(p){ cx.lineTo(p[0],gy-p[1]); }); cx.lineTo(w,gy); cx.closePath(); cx.fill();
      }
      mtnLayer([[55,65],[138,98],[228,76],[332,108],[448,82],[555,96],[645,70],[725,85]],            '#3d1852');
      mtnLayer([[0,44],[88,108],[175,86],[285,122],[388,88],[498,112],[605,78],[688,98],[750,62]],   '#2a1038');
      mtnLayer([[0,28],[105,78],[200,58],[318,94],[448,52],[565,84],[665,60],[750,42]],              '#18082a');
      // Ground — warm earth
      var eGnd = cx.createLinearGradient(0,gy,0,h);
      eGnd.addColorStop(0,'#8c4020'); eGnd.addColorStop(0.45,'#6a2e14'); eGnd.addColorStop(1,'#3a1508');
      cx.fillStyle = eGnd; cx.fillRect(0,gy,w,h-gy);
      cx.fillStyle = 'rgba(255,200,80,0.38)'; cx.fillRect(0,gy-1,w,3);
      backTextColor = '#fff8d0'; return;
}
