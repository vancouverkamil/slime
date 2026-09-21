function drawMap8(w, h, gy, cx) {
      cx.fillStyle='#000005'; cx.fillRect(0,0,w,h);
      // Stars (varied size & brightness)
      for(var si=0;si<130;si++){
        var stx=(si*179+13)%w, sty=(si*113+7)%(gy*0.96);
        var str=0.25+(si%4)*0.35, sta=0.35+_sr(si)*0.65;
        cx.fillStyle='rgba(255,255,255,'+sta+')';
        cx.beginPath(); cx.arc(stx,sty,str,0,TWO_PI); cx.fill();
      }
      // Purple nebula cloud
      var nebG=cx.createRadialGradient(w*0.68,gy*0.28,10,w*0.68,gy*0.28,150);
      nebG.addColorStop(0,'rgba(110,0,255,0.2)'); nebG.addColorStop(0.4,'rgba(60,0,160,0.09)');
      nebG.addColorStop(0.75,'rgba(0,80,180,0.05)'); nebG.addColorStop(1,'transparent');
      cx.fillStyle=nebG; cx.fillRect(w*0.25,0,w*0.75,gy*0.7);
      // Moon
      var mgG=cx.createRadialGradient(62,58,8,62,58,50);
      mgG.addColorStop(0,'#d8d8cc'); mgG.addColorStop(0.65,'#a8a898'); mgG.addColorStop(1,'#727060');
      cx.fillStyle=mgG; cx.beginPath(); cx.arc(62,58,50,0,TWO_PI); cx.fill();
      [[52,42,15],[88,70,9],[70,82,6]].forEach(function(c){
        cx.fillStyle='rgba(0,0,0,0.2)'; cx.beginPath(); cx.arc(c[0],c[1],c[2],0,TWO_PI); cx.fill();
      });
      var msh=cx.createRadialGradient(88,46,0,88,46,68);
      msh.addColorStop(0,'transparent'); msh.addColorStop(0.55,'transparent'); msh.addColorStop(1,'rgba(0,0,12,0.52)');
      cx.fillStyle=msh; cx.beginPath(); cx.arc(62,58,50,0,TWO_PI); cx.fill();
      // Ground — moonrock with craters
      var mgrd=cx.createLinearGradient(0,gy,0,h);
      mgrd.addColorStop(0,'#1c1c20'); mgrd.addColorStop(0.5,'#131316'); mgrd.addColorStop(1,'#0a0a0d');
      cx.fillStyle=mgrd; cx.fillRect(0,gy,w,h-gy);
      [[110,9,22],[310,7,16],[530,11,20],[720,8,14],[890,10,17]].forEach(function(c){
        cx.strokeStyle='rgba(255,255,255,0.06)'; cx.lineWidth=1;
        cx.beginPath(); cx.ellipse(c[0],gy+c[1],c[2],c[2]*0.35,0,0,TWO_PI); cx.stroke();
      });
      cx.lineWidth=1;
      cx.shadowColor='#aaddff'; cx.shadowBlur=10;
      cx.strokeStyle='rgba(160,210,255,0.45)'; cx.lineWidth=1.5;
      cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(w,gy); cx.stroke();
      cx.shadowBlur=0; cx.lineWidth=1;
      backTextColor='#aaddff'; return;
}
