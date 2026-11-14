// Core: playing a track (MUSIC_TRACKS) for the Finisher Cam or a preview,
// the saved track choice and volume, and the beat pulse the camera shakes to.
var victoryTrack = 0;     // index into MUSIC_TRACKS, -1 = no music
var musicVolume = 80;     // 0..100
try {
  var _vt = localStorage.getItem('slime_victoryTrack');
  if (_vt !== null && !isNaN(+_vt)) victoryTrack = Math.max(-1, Math.min(MUSIC_TRACKS.length - 1, +_vt));
  var _mv = localStorage.getItem('slime_musicVolume');
  if (_mv !== null && !isNaN(+_mv)) musicVolume = Math.max(0, Math.min(100, +_mv));
} catch (e) {}

var musicNow = null;      // { session, bpm, start, dropAt, end, previewTimer }

function stopMusic(fade) {
  var m = musicNow;
  musicNow = null;
  if (!m) return;
  if (m.previewTimer) clearTimeout(m.previewTimer);
  var ac = m.session.ac, out = m.session.out, now = ac.currentTime, f = fade || 0.25;
  try { out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(out.gain.value, now); out.gain.linearRampToValueAtTime(0.0001, now + f); } catch (e) {}
  setTimeout(function() {
    m.session.nodes.forEach(function(n) { try { if (n.stop) n.stop(0); } catch (e) {} try { n.disconnect(); } catch (e) {} });
  }, f * 1000 + 60);
}
// The old victory-music name, still used by the replay's cleanup.
function stopDrop() { stopMusic(0.2); }

// Play track idx: a build of buildSec, then the drop for dropSec.
// Returns the audio times {start, dropAt, end} or null when music is off.
function playMusicTrack(idx, buildSec, dropSec) {
  stopMusic(0.05);
  var track = MUSIC_TRACKS[idx];
  if (!track || musicVolume <= 0) return null;
  var ac = initAC(), b = 60 / track.bpm;
  var start = ac.currentTime + 0.08;
  // The drop lands on a whole beat from the start, as close to buildSec as possible.
  var dropAt = start + Math.max(b, Math.round(buildSec / b) * b);
  var end = dropAt + dropSec;
  var vol = 0.9 * musicVolume / 100;
  var session = musSession(ac, vol);
  // The build sits lower and swells; the drop slams in at full level.
  session.out.gain.setValueAtTime(vol * 0.45, start);
  session.out.gain.linearRampToValueAtTime(vol * 0.7, dropAt - 0.02);
  session.out.gain.setValueAtTime(vol, dropAt);
  track.build(session, start, dropAt, b);
  track.drop(session, dropAt, end, b);
  session.out.gain.setValueAtTime(vol, end - 0.8);
  session.out.gain.linearRampToValueAtTime(0.0001, end + 0.4);
  musicNow = { session: session, bpm: track.bpm, start: start, dropAt: dropAt, end: end };
  return { start: start, dropAt: dropAt, end: end, beat: b };
}

// 0..1, peaks on each beat of the drop (halftime: harder on the kick and the
// snare), softer pulses during the build. 0 when nothing is playing.
function musicPulse() {
  var m = musicNow;
  if (!m) return 0;
  var t = m.session.ac.currentTime;
  if (t < m.start || t > m.end) return 0;
  var beats = (t - m.dropAt) * m.bpm / 60;
  if (beats < 0) {
    var bt = (t - m.start) * m.bpm / 60;
    return 0.35 * Math.exp(-(bt % 1) * 6);
  }
  var inBar = beats % 4;
  var hit = inBar < 1 ? inBar : inBar >= 2 && inBar < 3 ? inBar - 2 : (beats % 1);
  var strong = inBar < 1 || (inBar >= 2 && inBar < 3);
  return (strong ? 1 : 0.4) * Math.exp(-hit * 5);
}

function setVictoryTrack(i) {
  victoryTrack = Math.max(-1, Math.min(MUSIC_TRACKS.length - 1, i | 0));
  try { localStorage.setItem('slime_victoryTrack', String(victoryTrack)); } catch (e) {}
}
function setMusicVolume(v) {
  musicVolume = Math.max(0, Math.min(100, v | 0));
  try { localStorage.setItem('slime_musicVolume', String(musicVolume)); } catch (e) {}
  if (musicNow) musicNow.session.out.gain.value = 0.9 * musicVolume / 100;
}

// Settings > Audio: hear the build and the drop of the chosen track.
function previewVictoryTrack() {
  if (victoryTrack < 0) return;
  var r = playMusicTrack(victoryTrack, 3, 7);
  if (r && musicNow) musicNow.previewTimer = setTimeout(function() { stopMusic(0.4); }, (r.end - initAC().currentTime) * 1000 + 300);
}

function fillMusicSettings() {
  var sel = document.getElementById('DropSelect');
  if (sel && !sel.options.length) {
    var off = document.createElement('option'); off.value = -1; off.textContent = 'NO MUSIC';
    sel.appendChild(off);
    MUSIC_TRACKS.forEach(function(t, i) {
      var o = document.createElement('option'); o.value = i; o.textContent = (i + 1) + '. ' + t.name + '  (' + t.style + ')';
      sel.appendChild(o);
    });
  }
  if (sel) sel.value = String(victoryTrack);
  var vol = document.getElementById('MusicVolume');
  if (vol) vol.value = String(musicVolume);
  var ann = document.getElementById('AnnouncerToggle');
  if (ann && typeof announcerEnabled !== 'undefined') ann.checked = announcerEnabled;
}
