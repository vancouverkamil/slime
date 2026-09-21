function drawMap11(w, h, gy, cx) {
      var sx11=w/1000, sy11=gy/800;
      // Dark concrete walls
      var bg11=cx.createLinearGradient(0,0,0,gy);
      bg11.addColorStop(0,'#090807'); bg11.addColorStop(0.6,'#141210'); bg11.addColorStop(1,'#1c1916');
      cx.fillStyle=bg11; cx.fillRect(0,0,w,gy);
      // Concrete block texture
      cx.fillStyle='rgba(255,200,80,0.025)';
      for(var ci11=0;ci11<28;ci11++){cx.fillRect((ci11*139)%w,(ci11*83)%(gy*.92),24+ci11%18,5+ci11%7);}
      // Amber searchlight beams from corners
      cx.save(); cx.globalAlpha=0.06; cx.fillStyle='#ffaa00';
      cx.beginPath(); cx.moveTo(0,0); cx.lineTo(w*0.22,gy); cx.lineTo(0,gy); cx.fill();
      cx.beginPath(); cx.moveTo(w,0); cx.lineTo(w*0.78,gy); cx.lineTo(w,gy); cx.fill();
      cx.restore();
      // Side amber glow
      var al11=cx.createRadialGradient(0,gy*.35,0,0,gy*.35,w*.32);
      al11.addColorStop(0,'rgba(255,150,0,0.13)'); al11.addColorStop(1,'transparent');
      cx.fillStyle=al11; cx.fillRect(0,0,w,gy);
      var ar11=cx.createRadialGradient(w,gy*.35,0,w,gy*.35,w*.32);
      ar11.addColorStop(0,'rgba(255,150,0,0.13)'); ar11.addColorStop(1,'transparent');
      cx.fillStyle=ar11; cx.fillRect(0,0,w,gy);
      // Ground — reinforced concrete grid
      var grd11=cx.createLinearGradient(0,gy,0,h);
      grd11.addColorStop(0,'#1a1815'); grd11.addColorStop(1,'#0c0a08');
      cx.fillStyle=grd11; cx.fillRect(0,gy,w,h-gy);
      cx.strokeStyle='rgba(60,50,35,0.45)'; cx.lineWidth=0.7;
      for(var gxi=0;gxi<w;gxi+=38){cx.beginPath();cx.moveTo(gxi,gy);cx.lineTo(gxi,h);cx.stroke();}
      // Barrier — steel I-beam
      var b11=MAP_BARRIERS_CLIENT[11][0];
      var bx11=b11.x1*sx11, bw11=(b11.x2-b11.x1)*sx11, byt11=gy-b11.y2*sy11, bh11=(b11.y2-b11.y1)*sy11;
      var bmg=cx.createLinearGradient(0,byt11,0,byt11+bh11);
      bmg.addColorStop(0,'#3a3228'); bmg.addColorStop(0.5,'#4e453a'); bmg.addColorStop(1,'#2e2820');
      cx.fillStyle=bmg; cx.fillRect(bx11,byt11,bw11,bh11);
      // Flanges
      cx.fillStyle='#524840'; cx.fillRect(bx11-3,byt11-2,bw11+6,2.5); cx.fillRect(bx11-3,byt11+bh11,bw11+6,2.5);
      // Hazard stripes on ends
      for(var hs=0;hs<4;hs++){
        cx.fillStyle=hs%2===0?'rgba(255,200,0,0.7)':'rgba(0,0,0,0.8)';
        cx.fillRect(bx11+hs*8,byt11,8,bh11+2); cx.fillRect(bx11+bw11-32+hs*8,byt11,8,bh11+2);
      }
      // Amber warning lights
      cx.shadowColor='#ffaa00'; cx.shadowBlur=10;
      [bx11+bw11*.15, bx11+bw11*.5, bx11+bw11*.85].forEach(function(lx){
        cx.fillStyle='#ffcc22'; cx.beginPath(); cx.arc(lx,byt11+bh11/2,2,0,TWO_PI); cx.fill();
      });
      cx.shadowBlur=0;
      // Beam edge glow
      cx.strokeStyle='rgba(255,140,0,0.3)'; cx.lineWidth=1;
      cx.strokeRect(bx11,byt11,bw11,bh11); cx.lineWidth=1;
      backTextColor='#ffcc44'; return;
}
