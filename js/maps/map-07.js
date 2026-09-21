function drawMap7(w, h, gy, cx) {
      var nSkyG=cx.createLinearGradient(0,0,0,gy);
      nSkyG.addColorStop(0,'#000006'); nSkyG.addColorStop(0.5,'#040012'); nSkyG.addColorStop(1,'#08001e');
      cx.fillStyle=nSkyG; cx.fillRect(0,0,w,h);
      // Stars
      cx.fillStyle='rgba(255,255,255,0.6)';
      for(var ns=0;ns<52;ns++){ cx.beginPath(); cx.arc((ns*173)%w,(ns*97)%(gy*0.58),0.4+(ns%3)*0.42,0,TWO_PI); cx.fill(); }
      // Sky grid
      cx.strokeStyle='rgba(170,0,255,0.09)'; cx.lineWidth=1;
      for(var gr=1;gr<10;gr++){ cx.beginPath(); cx.moveTo(0,gr*(gy/10)); cx.lineTo(w,gr*(gy/10)); cx.stroke(); }
      for(var gc=0;gc<=18;gc++){ cx.beginPath(); cx.moveTo(gc*(w/18),0); cx.lineTo(gc*(w/18),gy); cx.stroke(); }
      // Detailed city skyline
      var bldgData=[
        [28,98,42,'#00ffcc'],[72,58,30,'#ff00cc'],[112,118,36,'#7b2fff'],
        [158,74,24,'#00ffcc'],[190,144,32,'#ff4488'],[232,64,46,'#00ffcc'],
        [292,90,40,'#ff00cc'],[342,55,26,'#aa44ff'],[376,128,44,'#7b2fff'],
        [432,62,40,'#ff00cc'],[482,102,34,'#00ffcc'],[522,82,30,'#aa44ff'],
        [562,118,42,'#ff00cc'],[614,68,32,'#00ffcc'],[656,92,36,'#7b2fff'],
        [704,54,24,'#ff4488'],[730,80,30,'#00ffcc']
      ];
      bldgData.forEach(function(b,bi) {
        cx.fillStyle='#05001a'; cx.fillRect(b[0],gy-b[1],b[2],b[1]);
        cx.globalAlpha=0.28; cx.strokeStyle=b[3]; cx.lineWidth=1;
        cx.strokeRect(b[0],gy-b[1],b[2],b[1]);
        cx.globalAlpha=1; cx.lineWidth=1;
        // Deterministic window lights
        var rowsN=Math.floor(b[1]/14)-1, colsN=Math.floor(b[2]/8)-1;
        for(var wr2=0;wr2<rowsN;wr2++){
          for(var wc2=0;wc2<colsN;wc2++){
            var seed=(bi*121+wr2*13+wc2*7);
            var lit=_sr(seed)>0.35;
            if(lit){
              cx.fillStyle=(wr2+wc2)%3===0?'rgba(0,255,200,0.65)':'rgba(255,200,100,0.45)';
              cx.fillRect(b[0]+4+wc2*8,gy-b[1]+8+wr2*14,4,5);
            }
          }
        }
      });
      // Central energy orb
      var orbG=cx.createRadialGradient(w/2,gy*0.4,2,w/2,gy*0.4,74);
      orbG.addColorStop(0,'rgba(255,0,200,0.92)'); orbG.addColorStop(0.38,'rgba(140,0,255,0.36)');
      orbG.addColorStop(0.78,'rgba(0,200,255,0.08)'); orbG.addColorStop(1,'transparent');
      cx.fillStyle=orbG; cx.beginPath(); cx.arc(w/2,gy*0.4,74,0,TWO_PI); cx.fill();
      cx.shadowColor='#ff00cc'; cx.shadowBlur=20; cx.strokeStyle='rgba(255,0,200,0.72)'; cx.lineWidth=1.5;
      cx.beginPath(); cx.arc(w/2,gy*0.4,44,0,TWO_PI); cx.stroke();
      cx.shadowBlur=0; cx.lineWidth=1;
      // Rain
      cx.strokeStyle='rgba(0,200,255,0.1)'; cx.lineWidth=1;
      for(var rn=0;rn<58;rn++){ var rnx=(rn*137)%w,rny=(rn*89)%gy; cx.beginPath(); cx.moveTo(rnx,rny); cx.lineTo(rnx-3,rny+16); cx.stroke(); }
      // Ground — wet neon pavement
      var nGndG=cx.createLinearGradient(0,gy,0,h);
      nGndG.addColorStop(0,'#0e0022'); nGndG.addColorStop(0.42,'#070016'); nGndG.addColorStop(1,'#040010');
      cx.fillStyle=nGndG; cx.fillRect(0,gy,w,h-gy);
      cx.strokeStyle='rgba(0,255,200,0.2)'; cx.lineWidth=1;
      for(var gl=0;gl<=5;gl++){ var gy4=gy+(h-gy)*(gl/5); cx.beginPath(); cx.moveTo(0,gy4); cx.lineTo(w,gy4); cx.stroke(); }
      var vp2=w/2;
      for(var gv=0;gv<=14;gv++){ var gfx=gv*(w/14); cx.beginPath(); cx.moveTo(gfx,gy); cx.lineTo(vp2+(gfx-vp2)*0.1,h); cx.stroke(); }
      // Neon puddle reflections
      cx.globalAlpha=0.14;
      cx.fillStyle='#00ffcc'; cx.fillRect(0,gy+2,w,4);
      cx.fillStyle='#ff00cc'; cx.fillRect(0,gy+8,w,3);
      cx.globalAlpha=1;
      cx.shadowColor='#00ffcc'; cx.shadowBlur=16; cx.strokeStyle='#00ffcc'; cx.lineWidth=2;
      cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(w,gy); cx.stroke();
      cx.shadowBlur=0; cx.lineWidth=1;
      backTextColor = '#00ffcc'; return;
}
