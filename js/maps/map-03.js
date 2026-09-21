function drawMap3(w, h, gy, cx) {
      var stormG = cx.createLinearGradient(0,0,0,gy);
      stormG.addColorStop(0,'#04040e'); stormG.addColorStop(0.25,'#0a0a1e');
      stormG.addColorStop(0.55,'#121232'); stormG.addColorStop(1,'#202048');
      cx.fillStyle = stormG; cx.fillRect(0,0,w,gy);
      // Layered storm clouds
      function stormCloud(cx0, cy0, r, al) {
        var cg2 = cx.createRadialGradient(cx0,cy0,r*0.15,cx0,cy0,r);
        cg2.addColorStop(0,'rgba(42,42,72,'+al+')');
        cg2.addColorStop(0.65,'rgba(28,28,55,'+(al*0.75)+')');
        cg2.addColorStop(1,'rgba(14,14,38,0)');
        cx.fillStyle = cg2; cx.beginPath(); cx.arc(cx0,cy0,r,0,TWO_PI); cx.fill();
      }
      [[75,52,72,0.92],[210,44,88,0.88],[345,56,78,0.94],[475,40,92,0.86],
       [588,50,80,0.90],[692,46,66,0.88],[128,68,55,0.72],[405,63,62,0.76]].forEach(function(c){ stormCloud(c[0],c[1],c[2],c[3]); });
      // Lightning glow ambient
      var lGlo = cx.createRadialGradient(195,90,0,195,90,210);
      lGlo.addColorStop(0,'rgba(190,215,255,0.1)'); lGlo.addColorStop(1,'transparent');
      cx.fillStyle = lGlo; cx.fillRect(0,0,w,gy);
      // Lightning bolt with branching
      function lBolt(sx2,sy2,ex2,ey2,depth) {
        if(depth<=0) return;
        cx.strokeStyle = depth===3 ? 'rgba(255,255,240,0.96)' : 'rgba(200,215,255,'+(depth*0.22)+')';
        cx.lineWidth = depth===3 ? 2 : 1;
        var mx = (sx2+ex2)/2+((_sr(sx2*depth+sy2)-0.5)*28);
        var my = (sy2+ey2)/2+((_sr(sy2*depth+ex2)-0.5)*18);
        cx.beginPath(); cx.moveTo(sx2,sy2); cx.quadraticCurveTo(mx,my,ex2,ey2); cx.stroke();
        if(depth>1 && _sr(mx+my)>0.38) lBolt(mx,my,mx+(_sr(mx)-0.5)*85,my+38,depth-1);
      }
      cx.shadowColor='rgba(180,220,255,0.85)'; cx.shadowBlur=10;
      lBolt(198,28,178,128,3); lBolt(178,128,160,202,3);
      cx.shadowBlur=0; cx.lineWidth=1;
      // Heavy rain
      cx.strokeStyle='rgba(140,165,220,0.16)'; cx.lineWidth=1;
      for(var ri2=0;ri2<88;ri2++){ var rx2=(ri2*97+18)%w, ry2=(ri2*73+5)%(gy-22); cx.beginPath(); cx.moveTo(rx2,ry2); cx.lineTo(rx2-5,ry2+24); cx.stroke(); }
      // Ground — wet dark mud
      var mudG = cx.createLinearGradient(0,gy,0,h);
      mudG.addColorStop(0,'#1c1608'); mudG.addColorStop(0.5,'#140e04'); mudG.addColorStop(1,'#0c0a02');
      cx.fillStyle = mudG; cx.fillRect(0,gy,w,h-gy);
      // Puddles with lightning reflection
      cx.globalAlpha = 0.28;
      var pudG2 = cx.createLinearGradient(0,gy,0,gy+22);
      pudG2.addColorStop(0,'rgba(195,215,255,0.38)'); pudG2.addColorStop(1,'rgba(90,115,200,0.1)');
      cx.fillStyle = pudG2;
      cx.beginPath(); cx.ellipse(195,gy+12,62,8,0,0,TWO_PI); cx.fill();
      cx.beginPath(); cx.ellipse(552,gy+14,48,6,0,0,TWO_PI); cx.fill();
      cx.globalAlpha = 1;
      backTextColor = '#ffee66'; return;
}
