function drawMap6(w, h, gy, cx) {
      var dSkyG = cx.createLinearGradient(0,0,0,gy);
      dSkyG.addColorStop(0,'#0830a5'); dSkyG.addColorStop(0.28,'#1a66cc');
      dSkyG.addColorStop(0.58,'#e87e1e'); dSkyG.addColorStop(0.8,'#f5aa2e'); dSkyG.addColorStop(1,'#f8d05e');
      cx.fillStyle=dSkyG; cx.fillRect(0,0,w,gy);
      // Heat haze at horizon
      for(var hz=0;hz<5;hz++){
        var hzG=cx.createLinearGradient(0,gy*(0.74+hz*0.04),0,gy*(0.82+hz*0.04));
        hzG.addColorStop(0,'transparent'); hzG.addColorStop(0.5,'rgba(255,175,'+(55-hz*10)+','+(0.07-hz*0.01)+')'); hzG.addColorStop(1,'transparent');
        cx.fillStyle=hzG; cx.fillRect(0,gy*(0.74+hz*0.04),w,gy*0.1);
      }
      // Sun with bloom and rays
      var dSX=648, dSY=56;
      var dSunG=cx.createRadialGradient(dSX,dSY,0,dSX,dSY,135);
      dSunG.addColorStop(0,'rgba(255,255,215,0.92)'); dSunG.addColorStop(0.18,'rgba(255,218,78,0.42)');
      dSunG.addColorStop(0.48,'rgba(255,158,28,0.14)'); dSunG.addColorStop(1,'transparent');
      cx.fillStyle=dSunG; cx.fillRect(dSX-135,dSY-135,270,270);
      cx.fillStyle='#fffac8'; cx.beginPath(); cx.arc(dSX,dSY,50,0,TWO_PI); cx.fill();
      cx.fillStyle='#fff8f0'; cx.beginPath(); cx.arc(dSX,dSY,36,0,TWO_PI); cx.fill();
      cx.strokeStyle='rgba(255,230,55,0.28)'; cx.lineWidth=2;
      for(var dr=0;dr<14;dr++){ var dra=(dr/14)*TWO_PI; cx.beginPath(); cx.moveTo(dSX+Math.cos(dra)*52,dSY+Math.sin(dra)*52); cx.lineTo(dSX+Math.cos(dra)*(72+(dr%3)*18),dSY+Math.sin(dra)*(72+(dr%3)*18)); cx.stroke(); }
      cx.lineWidth=1;
      // Layered sand dunes with shadow faces
      function sandDune(pts, col) {
        cx.fillStyle=col; cx.beginPath(); cx.moveTo(0,gy);
        pts.forEach(function(p){ cx.lineTo(p[0],p[1]); }); cx.lineTo(w,gy); cx.closePath(); cx.fill();
      }
      sandDune([[0,gy-28],[118,gy-60],[242,gy-44],[362,gy-68],[482,gy-40],[604,gy-63],[750,gy-33]],'#d09245');
      cx.fillStyle='rgba(90,48,8,0.22)';
      [[118,242],[362,482],[604,750]].forEach(function(p){ cx.beginPath(); cx.moveTo(p[0],gy-60+(p[0]===118?60:p[0]===362?68:63)); cx.lineTo(p[1],gy-44+(p[1]===242?44:p[1]===482?40:33)); cx.lineTo(p[1],gy); cx.lineTo(p[0],gy); cx.closePath(); cx.fill(); });
      // Detailed cacti
      function cactus2(cx0,by) {
        var cacG=cx.createLinearGradient(cx0-8,0,cx0+8,0);
        cacG.addColorStop(0,'#183f10'); cacG.addColorStop(0.38,'#2c6820'); cacG.addColorStop(1,'#0c2808');
        cx.fillStyle=cacG;
        cx.fillRect(cx0-6,by-65,12,65);
        cx.fillRect(cx0-23,by-48,18,8); cx.fillRect(cx0-24,by-65,8,22);
        cx.fillRect(cx0+5,by-38,18,8); cx.fillRect(cx0+12,by-56,8,24);
        cx.fillStyle='rgba(70,150,35,0.28)'; cx.fillRect(cx0-4,by-65,4,65);
        cx.strokeStyle='rgba(200,175,95,0.35)'; cx.lineWidth=0.5;
        for(var sp=0;sp<7;sp++){ cx.beginPath(); cx.moveTo(cx0-6,by-58+sp*8); cx.lineTo(cx0-11,by-60+sp*8); cx.stroke(); cx.beginPath(); cx.moveTo(cx0+6,by-58+sp*8); cx.lineTo(cx0+11,by-60+sp*8); cx.stroke(); }
        cx.lineWidth=1;
      }
      cactus2(102,gy); cactus2(633,gy); cactus2(50,gy-10);
      // Sand ground
      var sandG=cx.createLinearGradient(0,gy,0,h);
      sandG.addColorStop(0,'#e6b645'); sandG.addColorStop(0.3,'#d29c2e'); sandG.addColorStop(0.7,'#be8418'); sandG.addColorStop(1,'#a46e0c');
      cx.fillStyle=sandG; cx.fillRect(0,gy,w,h-gy);
      cx.fillStyle='rgba(175,125,38,0.38)';
      for(var sd=0;sd<38;sd++){ cx.beginPath(); cx.arc((sd*127+22)%w,gy+4+(sd*43)%(h-gy-8),2+(sd%3),0,TWO_PI); cx.fill(); }
      cx.strokeStyle='rgba(145,95,18,0.18)'; cx.lineWidth=1;
      for(var wr=0;wr<9;wr++){ cx.beginPath(); cx.moveTo(0,gy+7+wr*6); cx.bezierCurveTo(w*0.25,gy+5+wr*6,w*0.52,gy+9+wr*6,w,gy+7+wr*6); cx.stroke(); }
      cx.lineWidth=1;
      backTextColor = '#3a1a00'; return;
}
