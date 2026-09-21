function drawMap9(w, h, gy, cx) {
      var vSky=cx.createLinearGradient(0,0,0,gy);
      vSky.addColorStop(0,'#0a0000'); vSky.addColorStop(0.45,'#1e0100');
      vSky.addColorStop(0.78,'#420700'); vSky.addColorStop(1,'#6e1100');
      cx.fillStyle=vSky; cx.fillRect(0,0,w,gy);
      // Ash clouds
      for(var ac=0;ac<6;ac++){
        var acx=(ac*167)%w, acy=25+(ac*71)%(gy*0.4), acR=38+(ac*37)%55;
        var aG=cx.createRadialGradient(acx,acy,0,acx,acy,acR);
        aG.addColorStop(0,'rgba(28,8,0,0.65)'); aG.addColorStop(1,'transparent');
        cx.fillStyle=aG; cx.fillRect(acx-acR,acy-acR,acR*2,acR*2);
      }
      // Background volcanoes
      cx.fillStyle='#0f0200';
      cx.beginPath(); cx.moveTo(w*0.7,gy); cx.lineTo(w*0.795,gy*0.32); cx.lineTo(w*0.89,gy); cx.closePath(); cx.fill();
      cx.fillStyle='#160300';
      cx.beginPath(); cx.moveTo(w*0.1,gy); cx.lineTo(w*0.205,gy*0.46); cx.lineTo(w*0.31,gy); cx.closePath(); cx.fill();
      // Lava glow at crater
      var lavG=cx.createRadialGradient(w*0.795,gy*0.32,2,w*0.795,gy*0.32,55);
      lavG.addColorStop(0,'rgba(255,130,0,0.85)'); lavG.addColorStop(0.38,'rgba(220,40,0,0.28)'); lavG.addColorStop(1,'transparent');
      cx.fillStyle=lavG; cx.fillRect(w*0.5,0,w*0.5,gy*0.65);
      // Embers / sparks
      for(var em=0;em<35;em++){
        var emx=(em*193)%w, emy=(em*127)%(gy*0.9);
        var emc='rgba('+(195+(em%60))+','+(em%110)+',0,'+(0.35+_sr(em)*0.55)+')';
        cx.fillStyle=emc; cx.beginPath(); cx.arc(emx,emy,0.8+(em%3)*0.55,0,TWO_PI); cx.fill();
      }
      // Ground — basalt with lava cracks
      var vGrd=cx.createLinearGradient(0,gy,0,h);
      vGrd.addColorStop(0,'#3e0800'); vGrd.addColorStop(0.3,'#220400'); vGrd.addColorStop(1,'#0e0100');
      cx.fillStyle=vGrd; cx.fillRect(0,gy,w,h-gy);
      [[45,10,175,14],[255,7,405,11],[490,13,650,8],[695,10,848,13],[820,9,978,7]].forEach(function(c){
        var lcG=cx.createLinearGradient(c[0],gy+c[1],c[2],gy+c[3]);
        lcG.addColorStop(0,'rgba(255,80,0,0)'); lcG.addColorStop(0.5,'rgba(255,120,0,0.72)'); lcG.addColorStop(1,'rgba(255,80,0,0)');
        cx.strokeStyle=lcG; cx.lineWidth=2;
        cx.beginPath(); cx.moveTo(c[0],gy+c[1]); cx.lineTo(c[2],gy+c[3]); cx.stroke();
      });
      cx.lineWidth=1;
      var lavH=cx.createLinearGradient(0,gy-6,0,gy+22);
      lavH.addColorStop(0,'rgba(255,85,0,0.48)'); lavH.addColorStop(1,'rgba(200,30,0,0)');
      cx.fillStyle=lavH; cx.fillRect(0,gy-6,w,28);
      cx.shadowColor='#ff4400'; cx.shadowBlur=15;
      cx.strokeStyle='rgba(255,80,0,0.72)'; cx.lineWidth=1.5;
      cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(w,gy); cx.stroke();
      cx.shadowBlur=0; cx.lineWidth=1;
      backTextColor='#ff6622'; return;
}
