function drawMap5(w, h, gy, cx) {
      // Arctic sky
      var arcG = cx.createLinearGradient(0,0,0,gy);
      arcG.addColorStop(0,'#08121e'); arcG.addColorStop(0.28,'#142235');
      arcG.addColorStop(0.6,'#c0dae8'); arcG.addColorStop(1,'#e6f2f8');
      cx.fillStyle = arcG; cx.fillRect(0,0,w,gy);
      // Stars
      cx.fillStyle='rgba(255,255,255,0.75)';
      for(var star=0;star<44;star++){ cx.beginPath(); cx.arc((star*179)%w,(star*97)%(gy*0.38),0.5+(star%3)*0.5,0,TWO_PI); cx.fill(); }
      // Aurora borealis — wavy ribbon bands
      [{y:0.1,col:'#00ff88',al:0.28},{y:0.16,col:'#00ccff',al:0.22},{y:0.07,col:'#aa44ff',al:0.18},{y:0.21,col:'#44ffcc',al:0.14}].forEach(function(a) {
        var aurY = gy*a.y;
        cx.globalAlpha = a.al;
        cx.fillStyle = a.col;
        cx.beginPath(); cx.moveTo(0, aurY);
        for(var aw=0;aw<=w;aw+=18){ cx.lineTo(aw, aurY+Math.sin(aw/82)*18+Math.cos(aw/48)*10); }
        cx.lineTo(w,aurY+52); cx.lineTo(0,aurY+52); cx.closePath(); cx.fill();
        cx.globalAlpha=1;
      });
      // Ice peaks — jagged with snow caps and shadow faces
      function icePeak2(px,pw,ph2,baseCol) {
        var pkG = cx.createLinearGradient(px-pw/2,gy-ph2,px+pw/2,gy-ph2);
        pkG.addColorStop(0,baseCol); pkG.addColorStop(0.4,'#d6eeff'); pkG.addColorStop(1,'#a0c6e8');
        cx.fillStyle=pkG;
        cx.beginPath();
        cx.moveTo(px-pw,gy); cx.lineTo(px-pw*0.28,gy-ph2*0.62); cx.lineTo(px,gy-ph2);
        cx.lineTo(px+pw*0.34,gy-ph2*0.70); cx.lineTo(px+pw*0.62,gy-ph2*0.46); cx.lineTo(px+pw,gy);
        cx.closePath(); cx.fill();
        cx.fillStyle='rgba(80,120,180,0.24)';
        cx.beginPath(); cx.moveTo(px,gy-ph2); cx.lineTo(px+pw*0.34,gy-ph2*0.70); cx.lineTo(px+pw,gy); cx.lineTo(px+pw*0.18,gy); cx.closePath(); cx.fill();
        var snowH = ph2*0.22;
        cx.fillStyle='rgba(255,255,255,0.92)';
        cx.beginPath(); cx.moveTo(px-snowH*0.82,gy-ph2+snowH*1.2); cx.lineTo(px,gy-ph2); cx.lineTo(px+snowH*0.72,gy-ph2+snowH); cx.closePath(); cx.fill();
      }
      icePeak2(76,95,118,'#aed0ee'); icePeak2(200,76,86,'#c6e2ff'); icePeak2(630,106,134,'#a6cae6'); icePeak2(712,74,80,'#beddff');
      // Snowflakes
      cx.fillStyle='rgba(255,255,255,0.7)';
      for(var sn=0;sn<48;sn++){ cx.beginPath(); cx.arc((sn*113+22)%w,(sn*71+6)%(gy-6),0.5+(sn%4)*0.55,0,TWO_PI); cx.fill(); }
      // Ice ground — reflective with cracks
      var iceG = cx.createLinearGradient(0,gy,0,h);
      iceG.addColorStop(0,'#c6e6ff'); iceG.addColorStop(0.3,'#a8d2f0'); iceG.addColorStop(1,'#84b8da');
      cx.fillStyle=iceG; cx.fillRect(0,gy,w,h-gy);
      var sheenG2 = cx.createLinearGradient(0,gy,w,gy+8);
      sheenG2.addColorStop(0,'rgba(255,255,255,0.55)'); sheenG2.addColorStop(0.5,'rgba(200,240,255,0.32)'); sheenG2.addColorStop(1,'rgba(255,255,255,0.12)');
      cx.fillStyle=sheenG2; cx.fillRect(0,gy,w,8);
      cx.strokeStyle='rgba(90,155,218,0.38)'; cx.lineWidth=1;
      [[75,4,155,7],[205,2,325,8],[455,5,580,3],[605,7,722,4]].forEach(function(cr){ cx.beginPath(); cx.moveTo(cr[0],gy+cr[1]); cx.lineTo(cr[2],gy+cr[3]); cx.stroke(); });
      cx.lineWidth=1;
      backTextColor = '#1a4a88'; return;
}
