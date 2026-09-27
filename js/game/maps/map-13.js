function drawMap13(w, h, gy, cx) {
      var sx13=w/1000, sy13=gy/800;
      // Dark teal/nuclear background
      var bg13=cx.createLinearGradient(0,0,0,gy);
      bg13.addColorStop(0,'#020c08'); bg13.addColorStop(0.5,'#041410'); bg13.addColorStop(1,'#081c12');
      cx.fillStyle=bg13; cx.fillRect(0,0,w,gy);
      // Reactor rod glow columns
      [[w*.12,gy*.6],[w*.28,gy*.45],[w*.72,gy*.45],[w*.88,gy*.6]].forEach(function(rod){
        var rg=cx.createRadialGradient(rod[0],rod[1],0,rod[0],rod[1],w*.06);
        rg.addColorStop(0,'rgba(80,255,120,0.18)'); rg.addColorStop(1,'transparent');
        cx.fillStyle=rg; cx.fillRect(rod[0]-w*.08,0,w*.16,gy);
        cx.fillStyle='rgba(50,200,80,0.35)'; cx.fillRect(rod[0]-3,0,6,rod[1]);
        cx.strokeStyle='rgba(40,180,70,0.5)'; cx.lineWidth=1;
        cx.beginPath(); cx.moveTo(rod[0],0); cx.lineTo(rod[0],rod[1]); cx.stroke();
        cx.lineWidth=1;
      });
      // Radiation symbol (simplified)
      cx.save(); cx.globalAlpha=0.06; cx.fillStyle='#88ff44';
      var ryc=gy*.22, rxc=w*.5;
      for(var ra=0;ra<3;ra++){
        cx.save(); cx.translate(rxc,ryc); cx.rotate(ra*Math.PI*2/3);
        cx.beginPath(); cx.moveTo(5,0); cx.arc(0,0,14,-.4,.4); cx.lineTo(5,0); cx.fill();
        cx.restore();
      }
      cx.beginPath(); cx.arc(rxc,ryc,5,0,TWO_PI); cx.fill();
      cx.restore();
      // Toxic floor
      cx.fillStyle='#03120a'; cx.fillRect(0,gy,w,h-gy);
      cx.strokeStyle='rgba(50,160,60,0.25)'; cx.lineWidth=0.7;
      for(var fg=0;fg<w;fg+=32){cx.beginPath();cx.moveTo(fg,gy);cx.lineTo(fg,h);cx.stroke();}
      // Horizontal barrier
      var bh13=MAP_BARRIERS_CLIENT[13][0];
      var bhx=bh13.x1*sx13, bhw=(bh13.x2-bh13.x1)*sx13, bhyt=gy-bh13.y2*sy13, bhh=(bh13.y2-bh13.y1)*sy13;
      var hbg=cx.createLinearGradient(0,bhyt,0,bhyt+bhh);
      hbg.addColorStop(0,'rgba(40,200,80,0.5)'); hbg.addColorStop(1,'rgba(20,140,50,0.4)');
      cx.shadowColor='#44ff66'; cx.shadowBlur=14;
      cx.fillStyle=hbg; cx.fillRect(bhx,bhyt,bhw,bhh);
      cx.strokeStyle='rgba(60,255,100,0.6)'; cx.lineWidth=1; cx.strokeRect(bhx,bhyt,bhw,bhh);
      cx.lineWidth=1;
      // Vertical barrier (containment column)
      var bv13=MAP_BARRIERS_CLIENT[13][1];
      var bvx=bv13.x1*sx13, bvw=(bv13.x2-bv13.x1)*sx13, bvyt=gy-bv13.y2*sy13, bvh=(bv13.y2-bv13.y1)*sy13;
      var vbg=cx.createLinearGradient(bvx,0,bvx+bvw,0);
      vbg.addColorStop(0,'rgba(20,160,50,0.35)'); vbg.addColorStop(0.5,'rgba(60,220,90,0.55)'); vbg.addColorStop(1,'rgba(20,160,50,0.35)');
      cx.fillStyle=vbg; cx.fillRect(bvx,bvyt,bvw,bvh);
      cx.strokeStyle='rgba(80,255,120,0.5)'; cx.lineWidth=1; cx.strokeRect(bvx,bvyt,bvw,bvh);
      cx.lineWidth=1; cx.shadowBlur=0;
      backTextColor='#44ff66'; return;
}
