function drawMap14(w, h, gy, cx) {
      var sx14=w/1000, sy14=gy/800;
      // Pure black void
      cx.fillStyle='#000'; cx.fillRect(0,0,w,h);
      // Glitch scan lines (neon, thin, horizontal)
      var glitchCols=['#00ffff','#ff00ff','#ffff00','#ff4444','#44ffaa'];
      for(var gli=0;gli<40;gli++){
        var gy14=(_sr(gli*7+1)*gy*.94)|0;
        cx.fillStyle=glitchCols[gli%glitchCols.length];
        cx.globalAlpha=0.04+_sr(gli*3)*.06;
        cx.fillRect(0,gy14,w*(_sr(gli*11)*.6+0.4),1+(_sr(gli*13)>.8?1:0));
      }
      cx.globalAlpha=1;
      // Data particle rain
      cx.fillStyle='rgba(0,255,200,0.3)';
      for(var dp=0;dp<60;dp++){
        var dpx=(_sr(dp*17)*w)|0, dpy=(_sr(dp*31)*gy*.88)|0;
        cx.fillRect(dpx,dpy,1,2+(_sr(dp*5)>0.85?2:0));
      }
      // Void ground
      cx.globalAlpha=1; cx.fillStyle='#000'; cx.fillRect(0,gy,w,h-gy);
      cx.strokeStyle='rgba(150,0,255,0.15)'; cx.lineWidth=0.5;
      cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(w,gy); cx.stroke(); cx.lineWidth=1;
      // Three floating platform barriers — each a different neon color
      var voidPlatforms=[
        {b:MAP_BARRIERS_CLIENT[14][0], col:'#00ffff', glow:'rgba(0,255,255,0.5)'},
        {b:MAP_BARRIERS_CLIENT[14][1], col:'#ff00ff', glow:'rgba(255,0,255,0.5)'},
        {b:MAP_BARRIERS_CLIENT[14][2], col:'#ffff00', glow:'rgba(255,255,0,0.5)'},
      ];
      voidPlatforms.forEach(function(p){
        var pb=p.b, px=pb.x1*sx14, pw=(pb.x2-pb.x1)*sx14, pyt=gy-pb.y2*sy14, ph=(pb.y2-pb.y1)*sy14;
        cx.shadowColor=p.col; cx.shadowBlur=16;
        cx.fillStyle=p.glow; cx.fillRect(px,pyt,pw,ph);
        cx.strokeStyle=p.col; cx.lineWidth=1.5; cx.strokeRect(px,pyt,pw,ph);
        // Pixel dots along platform
        cx.fillStyle=p.col; cx.lineWidth=1;
        for(var pd=0;pd<Math.floor(pw/12);pd++){cx.fillRect(px+pd*12,pyt+ph/2-.5,4,1);}
        cx.shadowBlur=0;
      });
      backTextColor='#cc44ff'; return;
}
