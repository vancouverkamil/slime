function drawMap10(w, h, gy, cx) {
      var ocnG=cx.createLinearGradient(0,0,0,gy);
      ocnG.addColorStop(0,'#001428'); ocnG.addColorStop(0.35,'#00203e');
      ocnG.addColorStop(0.72,'#003054'); ocnG.addColorStop(1,'#004468');
      cx.fillStyle=ocnG; cx.fillRect(0,0,w,gy);
      // Caustic ripples near surface
      for(var ca=0;ca<16;ca++){
        var cax=(ca*73)%w, cay=8+(ca*47)%(gy*0.22), caR=18+(ca%5)*8;
        var caG=cx.createRadialGradient(cax,cay,0,cax,cay,caR);
        caG.addColorStop(0,'rgba(0,200,255,0.09)'); caG.addColorStop(1,'transparent');
        cx.fillStyle=caG; cx.fillRect(cax-caR,cay-caR,caR*2,caR*2);
      }
      // Bioluminescent glows
      for(var bp=0;bp<20;bp++){
        var bpx=(bp*137)%w, bpy=18+(bp*97)%(gy*0.85);
        var bpR=6+(bp%4)*5;
        var bpC=bp%3===0?'0,255,200':bp%3===1?'0,140,255':'140,0,255';
        var bpG=cx.createRadialGradient(bpx,bpy,0,bpx,bpy,bpR);
        bpG.addColorStop(0,'rgba('+bpC+',0.38)'); bpG.addColorStop(1,'transparent');
        cx.fillStyle=bpG; cx.beginPath(); cx.arc(bpx,bpy,bpR,0,TWO_PI); cx.fill();
      }
      // Rising bubbles
      cx.fillStyle='rgba(200,240,255,0.18)';
      for(var bu=0;bu<28;bu++){
        var bux=(bu*157)%w, buy=12+(bu*89)%(gy*0.92);
        cx.beginPath(); cx.arc(bux,buy,0.8+(bu%3)*1.1,0,TWO_PI); cx.fill();
      }
      // Sandy seabed
      var seaGrd=cx.createLinearGradient(0,gy,0,h);
      seaGrd.addColorStop(0,'#1a4a30'); seaGrd.addColorStop(0.4,'#0d3020'); seaGrd.addColorStop(1,'#051a10');
      cx.fillStyle=seaGrd; cx.fillRect(0,gy,w,h-gy);
      // Kelp
      [[55,58],[170,42],[625,52],[755,36],[910,48]].forEach(function(k){
        cx.fillStyle='rgba(0,180,80,0.38)';
        cx.fillRect(k[0]-3,gy-k[1],6,k[1]);
        cx.beginPath(); cx.arc(k[0],gy-k[1],11,0,TWO_PI); cx.fill();
      });
      // Coral
      [[285,0],[460,0],[815,0]].forEach(function(c,ci){
        cx.fillStyle=ci%2===0?'rgba(255,80,80,0.42)':'rgba(255,140,0,0.38)';
        cx.beginPath(); cx.arc(c[0],gy-12,14,Math.PI,TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(c[0]-13,gy-8,10,Math.PI,TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(c[0]+13,gy-8,10,Math.PI,TWO_PI); cx.fill();
      });
      cx.shadowColor='#00ccff'; cx.shadowBlur=10;
      cx.strokeStyle='rgba(0,180,255,0.55)'; cx.lineWidth=1.5;
      cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(w,gy); cx.stroke();
      cx.shadowBlur=0; cx.lineWidth=1;
      backTextColor='#00ccff'; return;
}
