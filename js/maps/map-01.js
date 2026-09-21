function drawMap1(w, h, gy, cx) {
      // Stone ceiling
      var cg = cx.createLinearGradient(0, 0, 0, gy);
      cg.addColorStop(0, '#04040c'); cg.addColorStop(0.3, '#0b0818');
      cg.addColorStop(0.7, '#12101e'); cg.addColorStop(1, '#1a1428');
      cx.fillStyle = cg; cx.fillRect(0, 0, w, gy);
      // Stone banding texture
      cx.globalAlpha = 0.05;
      for (var sb = 0; sb < 14; sb++) {
        cx.fillStyle = sb % 2 === 0 ? '#ffffff' : '#000000';
        cx.fillRect(0, sb * (gy/14), w, (gy/14)+1);
      }
      cx.globalAlpha = 1;
      // Stalactites with shadow and highlight
      for (var st = 0; st < 18; st++) {
        var stx = st*42+10, sth = 24+Math.sin(st*2.1)*16+(st%4)*9, stw = 9+(st%3)*4;
        cx.fillStyle = 'rgba(0,0,0,0.55)';
        cx.beginPath(); cx.moveTo(stx-stw/2+4,0); cx.lineTo(stx+4,sth); cx.lineTo(stx+stw/2+4,0); cx.closePath(); cx.fill();
        var stG = cx.createLinearGradient(stx-stw/2,0,stx+stw/2,0);
        stG.addColorStop(0,'#161230'); stG.addColorStop(0.38,'#2a2245'); stG.addColorStop(0.7,'#201c3a'); stG.addColorStop(1,'#0f0c1e');
        cx.fillStyle = stG;
        cx.beginPath(); cx.moveTo(stx-stw/2,0); cx.lineTo(stx,sth); cx.lineTo(stx+stw/2,0); cx.closePath(); cx.fill();
        cx.strokeStyle = 'rgba(140,120,190,0.14)'; cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(stx-stw/2+2,0); cx.lineTo(stx-2,sth-4); cx.stroke();
      }
      cx.lineWidth = 1;
      // Crystal clusters
      function crystalCluster(bx, by, cols) {
        cols.forEach(function(c, ci) {
          var cpx = bx+(ci-1)*15, ch = 20+ci*9;
          cx.shadowColor = c; cx.shadowBlur = 22;
          cx.fillStyle = c;
          cx.beginPath();
          cx.moveTo(cpx-7, by); cx.lineTo(cpx-9, by-ch*0.6);
          cx.lineTo(cpx, by-ch); cx.lineTo(cpx+9, by-ch*0.6); cx.lineTo(cpx+7, by);
          cx.closePath(); cx.fill();
          cx.shadowBlur = 0;
          // specular highlight
          cx.fillStyle = 'rgba(255,255,255,0.22)';
          cx.beginPath(); cx.moveTo(cpx-5, by-4); cx.lineTo(cpx-8, by-ch*0.55); cx.lineTo(cpx-2, by-ch*0.55); cx.closePath(); cx.fill();
        });
      }
      crystalCluster(22, 210, ['#00ccff','#00ffcc','#7b2fff']);
      crystalCluster(726, 205, ['#ff00aa','#00ffcc','#7b2fff']);
      crystalCluster(375, 190, ['#aa44ff','#00ffcc','#ff4488']);
      // Ambient glow pools
      [{ x:22,y:210,col:'rgba(0,255,200,0.08)'}, {x:726,y:205,col:'rgba(255,0,170,0.08)'}, {x:375,y:190,col:'rgba(170,68,255,0.07)'}].forEach(function(g) {
        var ag = cx.createRadialGradient(g.x,g.y,0,g.x,g.y,70);
        ag.addColorStop(0,g.col); ag.addColorStop(1,'transparent');
        cx.fillStyle=ag; cx.fillRect(g.x-70,g.y-70,140,140);
      });
      // Bioluminescent moss patches on ceiling
      cx.globalAlpha = 0.14;
      [[50,8,40],[180,5,55],[400,10,48],[580,6,38]].forEach(function(m) {
        var mg = cx.createRadialGradient(m[0],m[1],0,m[0],m[1],m[2]);
        mg.addColorStop(0,'#00ffcc'); mg.addColorStop(1,'transparent');
        cx.fillStyle = mg; cx.fillRect(m[0]-m[2],0,m[2]*2,m[2]);
      });
      cx.globalAlpha = 1;
      // Floor — dark polished stone
      var flG = cx.createLinearGradient(0,gy,0,h);
      flG.addColorStop(0,'#181028'); flG.addColorStop(1,'#0a0a14');
      cx.fillStyle = flG; cx.fillRect(0,gy,w,h-gy);
      // Floor reflections from crystals
      cx.globalAlpha = 0.12;
      cx.fillStyle='#00ffcc'; cx.fillRect(8,gy+1,55,4);
      cx.fillStyle='#7b2fff'; cx.fillRect(700,gy+1,50,4);
      cx.fillStyle='#00ffcc'; cx.fillRect(348,gy+1,55,4);
      cx.globalAlpha = 1;
      // Floor ridges
      cx.fillStyle = 'rgba(36,26,55,0.88)';
      for (var ri = 0; ri < 10; ri++) { cx.beginPath(); cx.ellipse(ri*78+32,gy+5,20,7,0,0,TWO_PI); cx.fill(); }
      backTextColor = '#00ffcc'; return;
}
