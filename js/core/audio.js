// Core: web-audio sound effects and screen-fx toggles.
// (Victory / Finisher Cam music: js/core/music-synth.js, music-tracks.js, music-player.js.)
var audioCtx = null;
function initAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
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

// ── init ──────────────────────────────────────────────────
