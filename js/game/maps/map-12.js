function drawMap12(w, h, gy, cx) {
      var sx12=w/1000, sy12=gy/800;
      // Dark olive walls
      var bg12=cx.createLinearGradient(0,0,0,gy);
      bg12.addColorStop(0,'#060a06'); bg12.addColorStop(0.5,'#0c120a'); bg12.addColorStop(1,'#141a10');
      cx.fillStyle=bg12; cx.fillRect(0,0,w,gy);
      // Camo texture blobs
      ['rgba(14,22,8,0.55)','rgba(8,16,6,0.45)','rgba(20,30,12,0.4)'].forEach(function(col,ci){
        for(var j=0;j<12;j++){
          var cx12=((ci*170+j*73)%w), cy12=((ci*90+j*97)%(gy*.88));
          ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(cx12,cy12,18+j%14,9+j%8,j*.4,0,TWO_PI); ctx.fill();
        }
      });
      // Red emergency lighting along top
      var rg12=cx.createLinearGradient(0,0,0,gy*.4);
      rg12.addColorStop(0,'rgba(200,0,0,0.09)'); rg12.addColorStop(1,'transparent');
      cx.fillStyle=rg12; cx.fillRect(0,0,w,gy*.4);
      // Ground — cracked dark concrete
      cx.fillStyle='#0e0f0c'; cx.fillRect(0,gy,w,h-gy);
      cx.strokeStyle='rgba(30,40,20,0.6)'; cx.lineWidth=1;
      for(var ci12=0;ci12<6;ci12++){
        cx.beginPath(); cx.moveTo((ci12*183)%w,gy); cx.lineTo(((ci12*183+40)%w),h); cx.stroke();
      }
      // Barriers — two concrete bunker slab ceilings
      [MAP_BARRIERS_CLIENT[12][0], MAP_BARRIERS_CLIENT[12][1]].forEach(function(b,bi){
        var bx=b.x1*sx12, bw=(b.x2-b.x1)*sx12, byt=gy-b.y2*sy12, bh=(b.y2-b.y1)*sy12;
        var slg=cx.createLinearGradient(0,byt,0,byt+bh);
        slg.addColorStop(0,'#1e2418'); slg.addColorStop(1,'#2e361e');
        cx.fillStyle=slg; cx.fillRect(bx,byt,bw,bh);
        // Concrete surface cracks
        cx.strokeStyle='rgba(5,10,3,0.7)'; cx.lineWidth=0.6;
        for(var cr=0;cr<5;cr++){
          var crx=bx+bw*(0.1+cr*.18);
          cx.beginPath(); cx.moveTo(crx,byt); cx.lineTo(crx+5,byt+bh); cx.stroke();
        }
        // Red drip lights
        cx.shadowColor='#cc0000'; cx.shadowBlur=8;
        for(var rl=0;rl<3;rl++){
          cx.fillStyle='rgba(200,0,0,0.75)';
          cx.fillRect(bx+bw*(0.15+rl*.35)-1,byt+bh,2,4+rl%3);
        }
        cx.shadowBlur=0;
        // Edge line
        cx.strokeStyle='rgba(180,0,0,0.3)'; cx.lineWidth=1;
        cx.strokeRect(bx,byt,bw,bh); cx.lineWidth=1;
      });
      // Red warning light blips on ceiling
      cx.shadowColor='#cc0000'; cx.shadowBlur=12;
      [w*.2, w*.5, w*.8].forEach(function(lx){
        cx.fillStyle='rgba(220,0,0,0.6)'; cx.beginPath(); cx.arc(lx,gy*.04,3,0,TWO_PI); cx.fill();
      });
      cx.shadowBlur=0;
      backTextColor='#cc3333'; return;
}
