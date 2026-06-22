function _sr(seed) { var s = (seed * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; }

var mapBackgroundCache = {};
var mapBackgroundCacheOrder = [];
var MAP_BACKGROUND_CACHE_LIMIT = 8;

function drawMapBackgroundRaw(id) {
  var w = viewWidth, h = viewHeight, gy = courtYPix, cx = ctx;
  switch (id) {

    case 0: { // Sky Court — hyperrealistic daytime
      // Deep multi-stop sky
      var sg = cx.createLinearGradient(0, 0, 0, gy);
      sg.addColorStop(0,   '#081c3a'); sg.addColorStop(0.15, '#0d3268');
      sg.addColorStop(0.4, '#1a6cb8'); sg.addColorStop(0.7,  '#5aa8d8');
      sg.addColorStop(0.9, '#9ecfe8'); sg.addColorStop(1,    '#cde8f5');
      cx.fillStyle = sg; cx.fillRect(0, 0, w, gy);
      // Horizon haze
      var haze = cx.createLinearGradient(0, gy * 0.72, 0, gy);
      haze.addColorStop(0, 'transparent'); haze.addColorStop(1, 'rgba(210,238,255,0.22)');
      cx.fillStyle = haze; cx.fillRect(0, gy * 0.72, w, gy * 0.28);
      // Sun with glow rings
      var sx = 108, sy = 52;
      var sunGlo = cx.createRadialGradient(sx, sy, 6, sx, sy, 120);
      sunGlo.addColorStop(0,   'rgba(255,244,180,0.4)');
      sunGlo.addColorStop(0.35,'rgba(255,220,100,0.14)');
      sunGlo.addColorStop(1,   'transparent');
      cx.fillStyle = sunGlo; cx.fillRect(sx-120, sy-120, 240, 240);
      var sunD = cx.createRadialGradient(sx, sy, 0, sx, sy, 34);
      sunD.addColorStop(0, '#fffef0'); sunD.addColorStop(0.5, '#ffe555'); sunD.addColorStop(1, '#ffa800');
      cx.fillStyle = sunD; cx.beginPath(); cx.arc(sx, sy, 34, 0, TWO_PI); cx.fill();
      cx.strokeStyle = 'rgba(255,238,100,0.18)'; cx.lineWidth = 2;
      for (var fi = 0; fi < 8; fi++) {
        var fa = (fi / 8) * TWO_PI;
        cx.beginPath();
        cx.moveTo(sx + Math.cos(fa) * 36, sy + Math.sin(fa) * 36);
        cx.lineTo(sx + Math.cos(fa) * (52 + (fi % 3) * 14), sy + Math.sin(fa) * (52 + (fi % 3) * 14));
        cx.stroke();
      }
      cx.lineWidth = 1;
      // Cirrus wisps
      cx.lineWidth = 2;
      [[140,48,110],[320,34,140],[502,58,95],[625,40,115]].forEach(function(ci) {
        cx.strokeStyle = 'rgba(255,255,255,' + (0.32 + _sr(ci[0]) * 0.18) + ')';
        cx.lineWidth = 2 + _sr(ci[1]) * 3;
        cx.beginPath();
        cx.moveTo(ci[0], ci[1]);
        cx.bezierCurveTo(ci[0] + ci[2]*0.28, ci[1] - 7, ci[0] + ci[2]*0.7, ci[1] + 4, ci[0] + ci[2], ci[1] - 2);
        cx.stroke();
      });
      cx.lineWidth = 1;
      // Volumetric cumulus clouds
      function skyCloud(cx0, cy0, sc) {
        cx.fillStyle = 'rgba(180,205,225,0.28)';
        cx.beginPath(); cx.ellipse(cx0+5, cy0+sc*0.4, sc*1.1, sc*0.32, 0, 0, TWO_PI); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.92)';
        cx.beginPath(); cx.arc(cx0, cy0, sc, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0+sc*1.1, cy0+sc*0.18, sc*0.78, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0-sc*0.88, cy0+sc*0.22, sc*0.7, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0+sc*0.38, cy0-sc*0.52, sc*0.65, 0, TWO_PI); cx.fill();
        cx.beginPath(); cx.arc(cx0-sc*0.3, cy0-sc*0.45, sc*0.52, 0, TWO_PI); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,0.5)';
        cx.beginPath(); cx.arc(cx0-sc*0.14, cy0-sc*0.18, sc*0.36, 0, TWO_PI); cx.fill();
      }
      skyCloud(185, 78, 22); skyCloud(418, 60, 20); skyCloud(598, 76, 27); skyCloud(698, 50, 16);
      // Lush grass ground
      var gg = cx.createLinearGradient(0, gy, 0, h);
      gg.addColorStop(0, '#4aab3c'); gg.addColorStop(0.25, '#3a8c2c');
      gg.addColorStop(0.65, '#2c6e1e'); gg.addColorStop(1, '#1c4a12');
      cx.fillStyle = gg; cx.fillRect(0, gy, w, h - gy);
      cx.strokeStyle = 'rgba(90,190,55,0.22)'; cx.lineWidth = 1;
      for (var gi = 0; gi < 65; gi++) { var gx = (gi*53)%w; cx.beginPath(); cx.moveTo(gx,gy); cx.lineTo(gx+3,gy-9); cx.stroke(); }
      var gsh = cx.createLinearGradient(0, gy-6, 0, gy+10);
      gsh.addColorStop(0, 'rgba(0,0,0,0.1)'); gsh.addColorStop(1, 'transparent');
      cx.fillStyle = gsh; cx.fillRect(0, gy-6, w, 16);
      backTextColor = '#1a3a0a'; break;
    }

    case 1: { // Cave Court — hyperrealistic crystal cavern
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
      backTextColor = '#00ffcc'; break;
    }

    case 2: { // Sunset Court — hyperrealistic golden-hour dusk
      var sunsetG = cx.createLinearGradient(0,0,0,gy);
      sunsetG.addColorStop(0,   '#080118');
      sunsetG.addColorStop(0.12,'#16062e');
      sunsetG.addColorStop(0.3, '#6e1a50');
      sunsetG.addColorStop(0.52,'#c24222');
      sunsetG.addColorStop(0.72,'#e87c0a');
      sunsetG.addColorStop(0.88,'#f5c030');
      sunsetG.addColorStop(1,   '#f8df55');
      cx.fillStyle = sunsetG; cx.fillRect(0,0,w,gy);
      // God rays from horizon sun
      cx.globalAlpha = 0.055;
      for (var ray = 0; ray < 18; ray++) {
        var rAng = Math.PI + ((ray / 18) * Math.PI), rLen = 290+(ray%4)*60, rW = 16+(ray%5)*10;
        cx.fillStyle = '#ffcc44';
        cx.beginPath(); cx.moveTo(w/2, gy);
        cx.lineTo(w/2+Math.cos(rAng-rW/1400)*rLen, gy+Math.sin(rAng-rW/1400)*rLen);
        cx.lineTo(w/2+Math.cos(rAng+rW/1400)*rLen, gy+Math.sin(rAng+rW/1400)*rLen);
        cx.closePath(); cx.fill();
      }
      cx.globalAlpha = 1;
      // Atmospheric haze
      for (var hi = 0; hi < 3; hi++) {
        var hazeG2 = cx.createLinearGradient(0,gy*(0.55+hi*0.1),0,gy*(0.78+hi*0.1));
        hazeG2.addColorStop(0,'transparent'); hazeG2.addColorStop(0.5,'rgba(255,'+(130-hi*20)+','+(40-hi*10)+','+(0.07-hi*0.01)+')'); hazeG2.addColorStop(1,'transparent');
        cx.fillStyle = hazeG2; cx.fillRect(0,gy*(0.55+hi*0.1),w,gy*0.28);
      }
      // Sun disc with bloom
      var sGlo = cx.createRadialGradient(w/2,gy,0,w/2,gy,175);
      sGlo.addColorStop(0,'rgba(255,255,200,0.82)'); sGlo.addColorStop(0.15,'rgba(255,210,70,0.38)');
      sGlo.addColorStop(0.42,'rgba(255,140,30,0.14)'); sGlo.addColorStop(1,'transparent');
      cx.fillStyle = sGlo; cx.fillRect(w/2-175,gy-175,350,175);
      cx.fillStyle = '#ffe84a';
      cx.beginPath(); cx.arc(w/2,gy,52,Math.PI,TWO_PI); cx.fill();
      cx.fillStyle = 'rgba(255,255,190,0.42)';
      cx.beginPath(); cx.arc(w/2,gy,68,Math.PI,TWO_PI); cx.fill();
      // Layered mountains — atmospheric depth
      function mtnLayer(pts, col) {
        cx.fillStyle = col; cx.beginPath(); cx.moveTo(0,gy);
        pts.forEach(function(p){ cx.lineTo(p[0],gy-p[1]); }); cx.lineTo(w,gy); cx.closePath(); cx.fill();
      }
      mtnLayer([[55,65],[138,98],[228,76],[332,108],[448,82],[555,96],[645,70],[725,85]],            '#3d1852');
      mtnLayer([[0,44],[88,108],[175,86],[285,122],[388,88],[498,112],[605,78],[688,98],[750,62]],   '#2a1038');
      mtnLayer([[0,28],[105,78],[200,58],[318,94],[448,52],[565,84],[665,60],[750,42]],              '#18082a');
      // Ground — warm earth
      var eGnd = cx.createLinearGradient(0,gy,0,h);
      eGnd.addColorStop(0,'#8c4020'); eGnd.addColorStop(0.45,'#6a2e14'); eGnd.addColorStop(1,'#3a1508');
      cx.fillStyle = eGnd; cx.fillRect(0,gy,w,h-gy);
      cx.fillStyle = 'rgba(255,200,80,0.38)'; cx.fillRect(0,gy-1,w,3);
      backTextColor = '#fff8d0'; break;
    }

    case 3: { // Storm Court — hyperrealistic thunderstorm
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
      backTextColor = '#ffee66'; break;
    }

    case 4: { // Jungle Court — hyperrealistic dense rainforest
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
      backTextColor = '#aaff44'; break;
    }

    case 5: { // Frozen Court — hyperrealistic arctic with aurora borealis
      // Arctic sky
      var arcG = cx.createLinearGradient(0,0,0,gy);
      arcG.addColorStop(0,'#08121e'); arcG.addColorStop(0.28,'#142235');
      arcG.addColorStop(0.6,'#c0dae8'); arcG.addColorStop(1,'#e6f2f8');
      cx.fillStyle = arcG; cx.fillRect(0,0,w,gy);
      // Stars
      cx.fillStyle='rgba(255,255,255,0.75)';
      for(var star=0;star<44;star++){ cx.beginPath(); cx.arc((star*179)%w,(star*97)%(gy*0.38),0.5+(star%3)*0.5,0,TWO_PI); cx.fill(); }
      // Aurora borealis — wavy ribbon bands
      [{y:0.1,col:'#00ff88',al:0.28},{y:0.16,col:'#00ccff',al:0.22},{y:0.07,col:'#aa44ff',al:0.18},{y:0.21,col:'#44ffcc',al:0.14}].forEach(function(a) {
        var aurY = gy*a.y;
        cx.globalAlpha = a.al;
        cx.fillStyle = a.col;
        cx.beginPath(); cx.moveTo(0, aurY);
        for(var aw=0;aw<=w;aw+=18){ cx.lineTo(aw, aurY+Math.sin(aw/82)*18+Math.cos(aw/48)*10); }
        cx.lineTo(w,aurY+52); cx.lineTo(0,aurY+52); cx.closePath(); cx.fill();
        cx.globalAlpha=1;
      });
      // Ice peaks — jagged with snow caps and shadow faces
      function icePeak2(px,pw,ph2,baseCol) {
        var pkG = cx.createLinearGradient(px-pw/2,gy-ph2,px+pw/2,gy-ph2);
        pkG.addColorStop(0,baseCol); pkG.addColorStop(0.4,'#d6eeff'); pkG.addColorStop(1,'#a0c6e8');
        cx.fillStyle=pkG;
        cx.beginPath();
        cx.moveTo(px-pw,gy); cx.lineTo(px-pw*0.28,gy-ph2*0.62); cx.lineTo(px,gy-ph2);
        cx.lineTo(px+pw*0.34,gy-ph2*0.70); cx.lineTo(px+pw*0.62,gy-ph2*0.46); cx.lineTo(px+pw,gy);
        cx.closePath(); cx.fill();
        cx.fillStyle='rgba(80,120,180,0.24)';
        cx.beginPath(); cx.moveTo(px,gy-ph2); cx.lineTo(px+pw*0.34,gy-ph2*0.70); cx.lineTo(px+pw,gy); cx.lineTo(px+pw*0.18,gy); cx.closePath(); cx.fill();
        var snowH = ph2*0.22;
        cx.fillStyle='rgba(255,255,255,0.92)';
        cx.beginPath(); cx.moveTo(px-snowH*0.82,gy-ph2+snowH*1.2); cx.lineTo(px,gy-ph2); cx.lineTo(px+snowH*0.72,gy-ph2+snowH); cx.closePath(); cx.fill();
      }
      icePeak2(76,95,118,'#aed0ee'); icePeak2(200,76,86,'#c6e2ff'); icePeak2(630,106,134,'#a6cae6'); icePeak2(712,74,80,'#beddff');
      // Snowflakes
      cx.fillStyle='rgba(255,255,255,0.7)';
      for(var sn=0;sn<48;sn++){ cx.beginPath(); cx.arc((sn*113+22)%w,(sn*71+6)%(gy-6),0.5+(sn%4)*0.55,0,TWO_PI); cx.fill(); }
      // Ice ground — reflective with cracks
      var iceG = cx.createLinearGradient(0,gy,0,h);
      iceG.addColorStop(0,'#c6e6ff'); iceG.addColorStop(0.3,'#a8d2f0'); iceG.addColorStop(1,'#84b8da');
      cx.fillStyle=iceG; cx.fillRect(0,gy,w,h-gy);
      var sheenG2 = cx.createLinearGradient(0,gy,w,gy+8);
      sheenG2.addColorStop(0,'rgba(255,255,255,0.55)'); sheenG2.addColorStop(0.5,'rgba(200,240,255,0.32)'); sheenG2.addColorStop(1,'rgba(255,255,255,0.12)');
      cx.fillStyle=sheenG2; cx.fillRect(0,gy,w,8);
      cx.strokeStyle='rgba(90,155,218,0.38)'; cx.lineWidth=1;
      [[75,4,155,7],[205,2,325,8],[455,5,580,3],[605,7,722,4]].forEach(function(cr){ cx.beginPath(); cx.moveTo(cr[0],gy+cr[1]); cx.lineTo(cr[2],gy+cr[3]); cx.stroke(); });
      cx.lineWidth=1;
      backTextColor = '#1a4a88'; break;
    }

    case 6: { // Desert Court — hyperrealistic scorching desert
      var dSkyG = cx.createLinearGradient(0,0,0,gy);
      dSkyG.addColorStop(0,'#0830a5'); dSkyG.addColorStop(0.28,'#1a66cc');
      dSkyG.addColorStop(0.58,'#e87e1e'); dSkyG.addColorStop(0.8,'#f5aa2e'); dSkyG.addColorStop(1,'#f8d05e');
      cx.fillStyle=dSkyG; cx.fillRect(0,0,w,gy);
      // Heat haze at horizon
      for(var hz=0;hz<5;hz++){
        var hzG=cx.createLinearGradient(0,gy*(0.74+hz*0.04),0,gy*(0.82+hz*0.04));
        hzG.addColorStop(0,'transparent'); hzG.addColorStop(0.5,'rgba(255,175,'+(55-hz*10)+','+(0.07-hz*0.01)+')'); hzG.addColorStop(1,'transparent');
        cx.fillStyle=hzG; cx.fillRect(0,gy*(0.74+hz*0.04),w,gy*0.1);
      }
      // Sun with bloom and rays
      var dSX=648, dSY=56;
      var dSunG=cx.createRadialGradient(dSX,dSY,0,dSX,dSY,135);
      dSunG.addColorStop(0,'rgba(255,255,215,0.92)'); dSunG.addColorStop(0.18,'rgba(255,218,78,0.42)');
      dSunG.addColorStop(0.48,'rgba(255,158,28,0.14)'); dSunG.addColorStop(1,'transparent');
      cx.fillStyle=dSunG; cx.fillRect(dSX-135,dSY-135,270,270);
      cx.fillStyle='#fffac8'; cx.beginPath(); cx.arc(dSX,dSY,50,0,TWO_PI); cx.fill();
      cx.fillStyle='#fff8f0'; cx.beginPath(); cx.arc(dSX,dSY,36,0,TWO_PI); cx.fill();
      cx.strokeStyle='rgba(255,230,55,0.28)'; cx.lineWidth=2;
      for(var dr=0;dr<14;dr++){ var dra=(dr/14)*TWO_PI; cx.beginPath(); cx.moveTo(dSX+Math.cos(dra)*52,dSY+Math.sin(dra)*52); cx.lineTo(dSX+Math.cos(dra)*(72+(dr%3)*18),dSY+Math.sin(dra)*(72+(dr%3)*18)); cx.stroke(); }
      cx.lineWidth=1;
      // Layered sand dunes with shadow faces
      function sandDune(pts, col) {
        cx.fillStyle=col; cx.beginPath(); cx.moveTo(0,gy);
        pts.forEach(function(p){ cx.lineTo(p[0],p[1]); }); cx.lineTo(w,gy); cx.closePath(); cx.fill();
      }
      sandDune([[0,gy-28],[118,gy-60],[242,gy-44],[362,gy-68],[482,gy-40],[604,gy-63],[750,gy-33]],'#d09245');
      cx.fillStyle='rgba(90,48,8,0.22)';
      [[118,242],[362,482],[604,750]].forEach(function(p){ cx.beginPath(); cx.moveTo(p[0],gy-60+(p[0]===118?60:p[0]===362?68:63)); cx.lineTo(p[1],gy-44+(p[1]===242?44:p[1]===482?40:33)); cx.lineTo(p[1],gy); cx.lineTo(p[0],gy); cx.closePath(); cx.fill(); });
      // Detailed cacti
      function cactus2(cx0,by) {
        var cacG=cx.createLinearGradient(cx0-8,0,cx0+8,0);
        cacG.addColorStop(0,'#183f10'); cacG.addColorStop(0.38,'#2c6820'); cacG.addColorStop(1,'#0c2808');
        cx.fillStyle=cacG;
        cx.fillRect(cx0-6,by-65,12,65);
        cx.fillRect(cx0-23,by-48,18,8); cx.fillRect(cx0-24,by-65,8,22);
        cx.fillRect(cx0+5,by-38,18,8); cx.fillRect(cx0+12,by-56,8,24);
        cx.fillStyle='rgba(70,150,35,0.28)'; cx.fillRect(cx0-4,by-65,4,65);
        cx.strokeStyle='rgba(200,175,95,0.35)'; cx.lineWidth=0.5;
        for(var sp=0;sp<7;sp++){ cx.beginPath(); cx.moveTo(cx0-6,by-58+sp*8); cx.lineTo(cx0-11,by-60+sp*8); cx.stroke(); cx.beginPath(); cx.moveTo(cx0+6,by-58+sp*8); cx.lineTo(cx0+11,by-60+sp*8); cx.stroke(); }
        cx.lineWidth=1;
      }
      cactus2(102,gy); cactus2(633,gy); cactus2(50,gy-10);
      // Sand ground
      var sandG=cx.createLinearGradient(0,gy,0,h);
      sandG.addColorStop(0,'#e6b645'); sandG.addColorStop(0.3,'#d29c2e'); sandG.addColorStop(0.7,'#be8418'); sandG.addColorStop(1,'#a46e0c');
      cx.fillStyle=sandG; cx.fillRect(0,gy,w,h-gy);
      cx.fillStyle='rgba(175,125,38,0.38)';
      for(var sd=0;sd<38;sd++){ cx.beginPath(); cx.arc((sd*127+22)%w,gy+4+(sd*43)%(h-gy-8),2+(sd%3),0,TWO_PI); cx.fill(); }
      cx.strokeStyle='rgba(145,95,18,0.18)'; cx.lineWidth=1;
      for(var wr=0;wr<9;wr++){ cx.beginPath(); cx.moveTo(0,gy+7+wr*6); cx.bezierCurveTo(w*0.25,gy+5+wr*6,w*0.52,gy+9+wr*6,w,gy+7+wr*6); cx.stroke(); }
      cx.lineWidth=1;
      backTextColor = '#3a1a00'; break;
    }

    case 7: // Neon Court — hyperrealistic cyberpunk city
    default: {
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
      backTextColor = '#00ffcc'; break;
    }

    case 8: { // Space Court — moonbase under a star-filled void
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
      backTextColor='#aaddff'; break;
    }

    case 9: { // Volcano Court — hellscape of lava and ash
      var vSky=cx.createLinearGradient(0,0,0,gy);
      vSky.addColorStop(0,'#0a0000'); vSky.addColorStop(0.45,'#1e0100');
      vSky.addColorStop(0.78,'#420700'); vSky.addColorStop(1,'#6e1100');
      cx.fillStyle=vSky; cx.fillRect(0,0,w,gy);
      // Ash clouds
      for(var ac=0;ac<6;ac++){
        var acx=(ac*167)%w, acy=25+(ac*71)%(gy*0.4), acR=38+(ac*37)%55;
        var aG=cx.createRadialGradient(acx,acy,0,acx,acy,acR);
        aG.addColorStop(0,'rgba(28,8,0,0.65)'); aG.addColorStop(1,'transparent');
        cx.fillStyle=aG; cx.fillRect(acx-acR,acy-acR,acR*2,acR*2);
      }
      // Background volcanoes
      cx.fillStyle='#0f0200';
      cx.beginPath(); cx.moveTo(w*0.7,gy); cx.lineTo(w*0.795,gy*0.32); cx.lineTo(w*0.89,gy); cx.closePath(); cx.fill();
      cx.fillStyle='#160300';
      cx.beginPath(); cx.moveTo(w*0.1,gy); cx.lineTo(w*0.205,gy*0.46); cx.lineTo(w*0.31,gy); cx.closePath(); cx.fill();
      // Lava glow at crater
      var lavG=cx.createRadialGradient(w*0.795,gy*0.32,2,w*0.795,gy*0.32,55);
      lavG.addColorStop(0,'rgba(255,130,0,0.85)'); lavG.addColorStop(0.38,'rgba(220,40,0,0.28)'); lavG.addColorStop(1,'transparent');
      cx.fillStyle=lavG; cx.fillRect(w*0.5,0,w*0.5,gy*0.65);
      // Embers / sparks
      for(var em=0;em<35;em++){
        var emx=(em*193)%w, emy=(em*127)%(gy*0.9);
        var emc='rgba('+(195+(em%60))+','+(em%110)+',0,'+(0.35+_sr(em)*0.55)+')';
        cx.fillStyle=emc; cx.beginPath(); cx.arc(emx,emy,0.8+(em%3)*0.55,0,TWO_PI); cx.fill();
      }
      // Ground — basalt with lava cracks
      var vGrd=cx.createLinearGradient(0,gy,0,h);
      vGrd.addColorStop(0,'#3e0800'); vGrd.addColorStop(0.3,'#220400'); vGrd.addColorStop(1,'#0e0100');
      cx.fillStyle=vGrd; cx.fillRect(0,gy,w,h-gy);
      [[45,10,175,14],[255,7,405,11],[490,13,650,8],[695,10,848,13],[820,9,978,7]].forEach(function(c){
        var lcG=cx.createLinearGradient(c[0],gy+c[1],c[2],gy+c[3]);
        lcG.addColorStop(0,'rgba(255,80,0,0)'); lcG.addColorStop(0.5,'rgba(255,120,0,0.72)'); lcG.addColorStop(1,'rgba(255,80,0,0)');
        cx.strokeStyle=lcG; cx.lineWidth=2;
        cx.beginPath(); cx.moveTo(c[0],gy+c[1]); cx.lineTo(c[2],gy+c[3]); cx.stroke();
      });
      cx.lineWidth=1;
      var lavH=cx.createLinearGradient(0,gy-6,0,gy+22);
      lavH.addColorStop(0,'rgba(255,85,0,0.48)'); lavH.addColorStop(1,'rgba(200,30,0,0)');
      cx.fillStyle=lavH; cx.fillRect(0,gy-6,w,28);
      cx.shadowColor='#ff4400'; cx.shadowBlur=15;
      cx.strokeStyle='rgba(255,80,0,0.72)'; cx.lineWidth=1.5;
      cx.beginPath(); cx.moveTo(0,gy); cx.lineTo(w,gy); cx.stroke();
      cx.shadowBlur=0; cx.lineWidth=1;
      backTextColor='#ff6622'; break;
    }

    case 10: { // Ocean Court — bioluminescent deep sea
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
      backTextColor='#00ccff'; break;
    }

    case 11: { // Overpass Court — military industrial complex
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
      backTextColor='#ffcc44'; break;
    }

    case 12: { // Bunker Court — underground military compound
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
      backTextColor='#cc3333'; break;
    }

    case 13: { // Reactor Court — nuclear containment chamber
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
      backTextColor='#44ff66'; break;
    }

    case 14: { // Void Court — corrupted digital void
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
      backTextColor='#cc44ff'; break;
    }

  }
}

function _cacheMapBackground(id, w, h, gy) {
  var key = [id, w, h, gy].join(':');
  if (mapBackgroundCache[key]) return mapBackgroundCache[key];

  var oldCtx = ctx, oldW = viewWidth, oldH = viewHeight, oldGy = courtYPix, oldText = backTextColor;
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  ctx = c.getContext('2d');
  viewWidth = w; viewHeight = h; courtYPix = gy;
  backTextColor = oldText;
  drawMapBackgroundRaw(id);
  var entry = { canvas: c, textColor: backTextColor };
  ctx = oldCtx; viewWidth = oldW; viewHeight = oldH; courtYPix = oldGy; backTextColor = oldText;

  mapBackgroundCache[key] = entry;
  mapBackgroundCacheOrder.push(key);
  while (mapBackgroundCacheOrder.length > MAP_BACKGROUND_CACHE_LIMIT) {
    delete mapBackgroundCache[mapBackgroundCacheOrder.shift()];
  }
  return entry;
}

function clearMapBackgroundCache() {
  mapBackgroundCache = {};
  mapBackgroundCacheOrder = [];
}

function drawMapBackground(id) {
  var w = Math.max(1, Math.round(viewWidth || 1));
  var h = Math.max(1, Math.round(viewHeight || 1));
  var gy = Math.max(1, Math.round(courtYPix || 1));
  var bg = _cacheMapBackground(id, w, h, gy);
  ctx.drawImage(bg.canvas, 0, 0);
  backTextColor = bg.textColor;
}

