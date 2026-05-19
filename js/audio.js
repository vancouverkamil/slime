var audioCtx = null;
var dropNodes = [];
var selectedDrop = 0;
var dropNames = [
  'CIRCUIT BREAKER','BASS CANNON','NEON STORM','REACTOR CORE','SUBZERO BASS',
  'GLITCH STORM','LASER RUSH','MIDNIGHT DROP','CYBER STRIKE','ZERO GRAVITY'
];

function initAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function stopDrop() {
  dropNodes.forEach(function(n) { try { n.stop && n.stop(0); } catch(e){} try { n.disconnect(); } catch(e){} });
  dropNodes = [];
}
function _kick(ac, dst, t) {
  var g = ac.createGain(); g.gain.setValueAtTime(1.4, t); g.gain.exponentialRampToValueAtTime(0.001, t+.45); g.connect(dst);
  var o = ac.createOscillator(); o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(22, t+.35); o.connect(g);
  o.start(t); o.stop(t+.45); dropNodes.push(o,g);
}
function _hat(ac, dst, t, sh) {
  var buf = ac.createBuffer(1, ac.sampleRate*(sh?.06:.18), ac.sampleRate);
  var d = buf.getChannelData(0); for (var i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  var src = ac.createBufferSource(); src.buffer = buf;
  var filt = ac.createBiquadFilter(); filt.type='highpass'; filt.frequency.value=8000;
  var g = ac.createGain(); g.gain.setValueAtTime(.28,t); g.gain.exponentialRampToValueAtTime(.001,t+(sh?.06:.18));
  src.connect(filt); filt.connect(g); g.connect(dst); src.start(t); src.stop(t+.25);
  dropNodes.push(src,filt,g);
}
function _wobble(ac, dst, t, dur, freq, lfoR, fCut, Q) {
  var osc = ac.createOscillator(); osc.type='sawtooth'; osc.frequency.value=freq;
  var filt = ac.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=fCut; filt.Q.value=Q||10;
  var lfo  = ac.createOscillator(); lfo.type='sine'; lfo.frequency.value=lfoR;
  var lfoG = ac.createGain(); lfoG.gain.value=fCut*.85; lfo.connect(lfoG); lfoG.connect(filt.frequency);
  var env  = ac.createGain();
  env.gain.setValueAtTime(0,t); env.gain.linearRampToValueAtTime(.6,t+.1);
  env.gain.setValueAtTime(.6,t+dur-.8); env.gain.linearRampToValueAtTime(0,t+dur);
  osc.connect(filt); filt.connect(env); env.connect(dst);
  lfo.start(t); osc.start(t); lfo.stop(t+dur); osc.stop(t+dur);
  dropNodes.push(osc,filt,lfo,lfoG,env);
}
function _tone(ac, dst, t, dur, freq, type, vol) {
  var o = ac.createOscillator(); o.type=type||'triangle'; o.frequency.value=freq;
  var g = ac.createGain(); g.gain.setValueAtTime(vol||.15,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g); g.connect(dst); o.start(t); o.stop(t+dur); dropNodes.push(o,g);
}
function setGameSfx(enabled) {
  gameSfxEnabled = !!enabled;
  try { localStorage.setItem('slime_sfx', gameSfxEnabled ? 'on' : 'off'); } catch(e){}
}
function setScreenFx(enabled) {
  screenFxEnabled = !!enabled;
  try { localStorage.setItem('slime_screenFx', screenFxEnabled ? 'on' : 'off'); } catch(e){}
  if (!screenFxEnabled) { particles = []; shakeFrames = 0; }
}
function playSfx(kind) {
  if (!gameSfxEnabled || !audioCtx) return;
  var ac = initAC();
  var now = ac.currentTime;
  var master = ac.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(kind === 'score' ? 0.18 : 0.11, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'score' ? 0.34 : 0.12));
  master.connect(ac.destination);

  var osc = ac.createOscillator();
  osc.type = kind === 'score' ? 'triangle' : 'square';
  if (kind === 'score') {
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
  } else if (kind === 'win') {
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);
  } else {
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
  }
  osc.connect(master);
  osc.start(now);
  osc.stop(now + (kind === 'score' ? 0.35 : 0.13));
}

function playDrop(idx) {
  stopDrop();
  var ac = initAC(), now = ac.currentTime+.12, dur=10;
  var master = ac.createGain();
  master.gain.setValueAtTime(.82,now); master.gain.setValueAtTime(.82,now+dur-1.8);
  master.gain.linearRampToValueAtTime(0,now+dur); master.connect(ac.destination);
  dropNodes.push(master);
  var b, bi, i;

  switch(idx) {
    case 0: // CIRCUIT BREAKER – classic 140bpm wobble
      bi=60/140; _wobble(ac,master,now,dur,60,4,420,12);
      for(b=0;b*bi<dur;b++){ _kick(ac,master,now+b*bi); if(b%2===1) _hat(ac,master,now+b*bi+bi/2,true); }
      break;
    case 1: // BASS CANNON – massive slow wobble
      bi=60/140; _wobble(ac,master,now,dur,44,8,650,16);
      for(b=0;b*bi<dur;b++){ if(b%2===0)_kick(ac,master,now+b*bi); _hat(ac,master,now+b*bi*.75,true); }
      break;
    case 2: // NEON STORM – fast bright chaos
      bi=60/150; _wobble(ac,master,now,dur,78,16,850,8);
      for(b=0;b*bi<dur;b++){ _kick(ac,master,now+b*bi); _hat(ac,master,now+b*bi+bi/2,true); _hat(ac,master,now+b*bi+bi/4,true); }
      break;
    case 3: // REACTOR CORE – slow menacing throb
      bi=60/130; _wobble(ac,master,now,dur,54,2,280,15);
      for(b=0;b*2*bi<dur;b++){ _kick(ac,master,now+b*2*bi); _kick(ac,master,now+b*2*bi+bi*1.5); }
      break;
    case 4: // SUBZERO BASS – deep glacial pulse
      bi=60/140; _wobble(ac,master,now,dur,34,1,180,20);
      for(b=0;b*bi*2<dur;b++){ _kick(ac,master,now+b*bi*2); _hat(ac,master,now+b*bi*2+bi*.5,false); }
      break;
    case 5: // GLITCH STORM – choppy fragmented
      bi=60/140; var sb=bi/4;
      for(b=0;b*sb<dur;b++){
        if(b%4===0){ _wobble(ac,master,now+b*sb,sb*3.2,70,12,520,10); _kick(ac,master,now+b*sb); }
        else if(b%2===1) _hat(ac,master,now+b*sb,true);
      } break;
    case 6: // LASER RUSH – hi-pitched scifi
      bi=60/150; _wobble(ac,master,now,dur,100,8,1050,12);
      for(b=0;b*bi<dur;b++){
        _kick(ac,master,now+b*bi);
        if(b%4===2){ _tone(ac,master,now+b*bi,.22,900,'square',.28); }
      } break;
    case 7: // MIDNIGHT DROP – dark rolling groove
      bi=60/130; _wobble(ac,master,now,dur,50,3,340,14);
      for(b=0;b*bi<dur;b++){
        if(b%4===0||b%4===3)_kick(ac,master,now+b*bi);
        if(b%2===1)_hat(ac,master,now+b*bi,false);
      } break;
    case 8: // CYBER STRIKE – melodic drops
      bi=60/140; _wobble(ac,master,now,dur,64,6,460,11);
      [440,0,330,0,440,0,523,440,0,330,0,392,440,0].forEach(function(fr,i){
        if(!fr) return;
        _tone(ac,master,now+i*bi,bi*.85,fr,'triangle',.13);
      });
      for(b=0;b*bi<dur;b++){ _kick(ac,master,now+b*bi); if(b%2===1)_hat(ac,master,now+b*bi,true); }
      break;
    case 9: // ZERO GRAVITY – atmospheric cosmos
      bi=60/140; _wobble(ac,master,now,dur,38,.5,240,22);
      [130,164,196].forEach(function(fr){
        var po=ac.createOscillator(); po.type='sine'; po.frequency.value=fr;
        var pf=ac.createBiquadFilter(); pf.type='lowpass'; pf.frequency.value=500;
        var pg=ac.createGain(); pg.gain.setValueAtTime(0,now); pg.gain.linearRampToValueAtTime(.1,now+2);
        pg.gain.setValueAtTime(.1,now+dur-2); pg.gain.linearRampToValueAtTime(0,now+dur);
        po.connect(pf); pf.connect(pg); pg.connect(master);
        po.start(now); po.stop(now+dur); dropNodes.push(po,pf,pg);
      });
      for(b=0;b*bi*2<dur;b++){ _kick(ac,master,now+b*bi*2); _hat(ac,master,now+b*bi*2+bi,false); }
      break;
  }
}

function previewDrop() {
  initAC();
  playDrop(selectedDrop);
  setTimeout(stopDrop, 6000);
}

// ── init ──────────────────────────────────────────────────
