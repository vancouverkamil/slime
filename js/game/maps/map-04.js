function drawMap4(w, h, gy, cx) {
      var junG = cx.createLinearGradient(0,0,0,gy);
      junG.addColorStop(0,'#010900'); junG.addColorStop(0.22,'#091c02');
      junG.addColorStop(0.55,'#142808'); junG.addColorStop(0.88,'#1e3c08');
      junG.addColorStop(1,'#285012');
      cx.fillStyle = junG; cx.fillRect(0,0,w,gy);
      // Light shafts through canopy
      cx.globalAlpha = 0.055;
      [-0.14,-0.04,0.09,0.19,0.3].forEach(function(ang,si) {
        var shX = 75+si*142;
        cx.fillStyle = '#a8ff44';
        cx.beginPath(); cx.moveTo(shX-8,0); cx.lineTo(shX+8,0); cx.lineTo(shX+32+ang*100,gy); cx.lineTo(shX+16+ang*100,gy); cx.closePath(); cx.fill();
      });
      cx.globalAlpha = 1;
      // Foliage mass layers
      for(var bl=0;bl<3;bl++){
        cx.globalAlpha=0.38+bl*0.22;
        cx.fillStyle = bl===0?'#0c2200':bl===1?'#122e04':'#1a4208';
        for(var fli=0;fli<9-bl*2;fli++){
          var fx2=fli*90+bl*30, fy2=bl*15;
          cx.beginPath(); cx.arc(fx2,fy2,52-bl*8,0,Math.PI); cx.fill();
          cx.beginPath(); cx.arc(fx2+38,fy2+14,38-bl*5,0,Math.PI); cx.fill();
        }
        cx.globalAlpha=1;
      }
      // Tree trunks with bark texture
      [25,88,185,330,438,562,648,718].forEach(function(tx,ti) {
        var tw=13+(tx%8), tth=158+(ti%3)*22;
        var bkG = cx.createLinearGradient(tx-tw/2,0,tx+tw/2,0);
        bkG.addColorStop(0,'#060300'); bkG.addColorStop(0.28,'#180c04'); bkG.addColorStop(0.62,'#100802'); bkG.addColorStop(1,'#050200');
        cx.fillStyle = bkG; cx.fillRect(tx-tw/2,gy-tth,tw,tth);
        cx.strokeStyle='rgba(50,28,8,0.38)'; cx.lineWidth=1;
        for(var bk=0;bk<7;bk++){ cx.beginPath(); cx.moveTo(tx-tw/2+2,gy-tth+bk*22); cx.bezierCurveTo(tx,gy-tth+bk*22+7,tx,gy-tth+bk*22+9,tx+tw/2-2,gy-tth+bk*22+4); cx.stroke(); }
        // canopy
        var canG = cx.createRadialGradient(tx,gy-tth,0,tx,gy-tth,50);
        canG.addColorStop(0,'#1a4e04'); canG.addColorStop(0.55,'#0e3002'); canG.addColorStop(1,'rgba(6,18,0,0)');
        cx.fillStyle=canG;
        cx.beginPath(); cx.arc(tx,gy-tth,46,0,TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(tx+23,gy-tth+18,35,0,TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(tx-21,gy-tth+22,33,0,TWO_PI); cx.fill();
      });
      cx.lineWidth=1;
      // Hanging vines with leaf clusters
      cx.strokeStyle='rgba(28,78,8,0.82)'; cx.lineWidth=2;
      [58,198,378,492,638].forEach(function(vx) {
        var vl=80+(vx%72);
        cx.beginPath(); cx.moveTo(vx,0); cx.bezierCurveTo(vx+18,vl/3,vx-12,vl*0.62,vx+6,vl); cx.stroke();
        cx.fillStyle='#1a5004'; cx.globalAlpha=0.72;
        for(var vi=0;vi<3;vi++){ var lY=vl*(0.28+vi*0.26); cx.beginPath(); cx.ellipse(vx+8,lY,10,6,0.4,0,TWO_PI); cx.fill(); }
        cx.globalAlpha=1;
      });
      cx.lineWidth=1;
      // Floor — rich jungle soil
      var jFlG = cx.createLinearGradient(0,gy,0,h);
      jFlG.addColorStop(0,'#180e02'); jFlG.addColorStop(0.45,'#110a02'); jFlG.addColorStop(1,'#090601');
      cx.fillStyle=jFlG; cx.fillRect(0,gy,w,h-gy);
      cx.fillStyle='#1e5504'; cx.globalAlpha=0.85;
      for(var gf=0;gf<22;gf++){ cx.beginPath(); cx.arc((gf*38+8)%w,gy,7+(gf%3)*3,Math.PI,TWO_PI); cx.fill(); }
      cx.globalAlpha=1;
      backTextColor = '#aaff44'; return;
}
