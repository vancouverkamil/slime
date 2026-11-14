// Core: the victory / Finisher Cam tracks. Each has a BUILD of any length
// (snare roll + riser, timed to the replay) and a DROP that lands on the
// slow-motion final point. All original, synthesized by js/core/music-synth.js.
function mf(n) { return 440 * Math.pow(2, (n - 69) / 12); }   // MIDI note -> Hz
function every(t0, t1, step, fn) { for (var i = 0, t = t0; t < t1 - 0.001; i++, t = t0 + i * step) fn(t, i); }

// Shared build: chords per bar, kicks speeding up, then a snare roll and a riser.
function buildUp(s, t0, t1, b, chords, opt) {
  opt = opt || {};
  var len = t1 - t0, bar = b * 4, rollFrom = t1 - Math.min(len * 0.45, bar * 2);
  every(t0, t1, bar, function(t, i) { mPad(s, t, Math.min(bar, t1 - t), chords[i % chords.length].map(mf), opt.pad || 1); });
  every(t0, rollFrom, b, function(t, i) { mKick(s, t, 0.7); if (opt.hats !== false) mHat(s, t + b / 2, false, 0.7); });
  every(rollFrom, t1, b / 2, function(t) { mKick(s, t, 0.55); });
  mSnareRoll(s, rollFrom, t1, b);
  mRiser(s, Math.max(t0, t1 - Math.min(3.2, len * 0.6)), Math.min(3.2, len * 0.6));
}

var MUSIC_TRACKS = [
  { name: 'KATANA RIDDIM', style: 'Riddim dubstep', bpm: 140,
    build: function(s, t0, t1, b) { buildUp(s, t0, t1, b, [[52, 55, 59], [48, 52, 55], [50, 53, 57], [47, 50, 55]]); },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0);
      every(t0, t1, b * 4, function(t) { mKick(s, t); mSnare(s, t + b * 2); mKick(s, t + b * 3.5, 0.8); });
      every(t0, t1, b / 2, function(t) { mHat(s, t, false, 0.8); });
      every(t0, t1, b * 2, function(t, i) {   // triplet square wobbles with riddim gaps
        mWobble(s, t, b * (i % 4 === 3 ? 1 : 1.75), mf(i % 4 === 2 ? 31 : 28), 3 / b, { shape: 'square', cut: 650, q: 12, dist: 12 });
      });
    } },
  { name: 'ONI GROWL', style: 'Brostep', bpm: 150,
    build: function(s, t0, t1, b) { buildUp(s, t0, t1, b, [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]]); },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0);
      every(t0, t1, b * 4, function(t) { mKick(s, t); mSnare(s, t + b * 2); });
      every(t0, t1, b / 2, function(t, i) { if (i % 4 !== 0) mHat(s, t, i % 4 === 2, 0.7); });
      var notes = [26, 26, 29, 24, 26, 33, 31, 29];
      every(t0, t1, b / 2, function(t, i) { if (i % 8 !== 4) mGrowl(s, t, b * 0.45, mf(notes[i % 8]), i % 3 ? 8 : 5); });
    } },
  { name: 'NEON SHINOBI', style: 'Drum & bass', bpm: 174,
    build: function(s, t0, t1, b) { buildUp(s, t0, t1, b, [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]); },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0);
      every(t0, t1, b * 4, function(t) { mKick(s, t); mSnare(s, t + b); mKick(s, t + b * 2.5); mSnare(s, t + b * 3); });
      every(t0, t1, b / 2, function(t, i) { mHat(s, t, i % 8 === 7, 0.75); });
      var roots = [33, 29, 31, 28];
      every(t0, t1, b * 4, function(t, i) { mReese(s, t, b * 3.9, mf(roots[i % 4]), 1.1); });
    } },
  { name: 'TOKYO DRIFT PHONK', style: 'Drift phonk', bpm: 130,
    build: function(s, t0, t1, b) {
      buildUp(s, t0, t1, b, [[49, 52, 56], [45, 49, 52], [47, 51, 54], [44, 47, 51]], { pad: 0.7 });
      every(t0, t1, b / 2, function(t, i) { mBell(s, t, mf([73, 76, 80, 76, 73, 71, 68, 71][i % 8]), 0.5); });
    },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0);
      every(t0, t1, b * 4, function(t) { mKick(s, t); mClap(s, t + b); mKick(s, t + b * 2.75); mClap(s, t + b * 3); });
      every(t0, t1, b / 4, function(t) { mHat(s, t, false, 0.55); });
      every(t0, t1, b / 2, function(t, i) { mBell(s, t, mf([73, 76, 80, 76, 73, 71, 68, 71, 73, 76, 81, 80, 76, 73, 71, 68][i % 16])); });
      every(t0, t1, b * 2, function(t, i) { m808(s, t, b * 1.8, mf([25, 25, 28, 23][i % 4] + 12), mf([25, 25, 28, 23][i % 4])); });
    } },
  { name: 'SAKURA RUSH', style: 'J-core', bpm: 175,
    build: function(s, t0, t1, b) { buildUp(s, t0, t1, b, [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]); },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0);
      every(t0, t1, b, function(t, i) { mKick(s, t); mHat(s, t + b / 2, true, 0.8); if (i % 2) mClap(s, t, 0.8); });
      var arp = [[69, 72, 76, 81], [65, 69, 72, 77], [60, 64, 67, 72], [67, 71, 74, 79]];
      every(t0, t1, b / 4, function(t, i) { var c = arp[Math.floor(i / 16) % 4]; mPluck(s, t, mf(c[i % 4] + (i % 8 > 3 ? 12 : 0)), 0.9); });
      every(t0, t1, b * 4, function(t, i) { mSaw(s, t, b * 3.8, arp[i % 4].slice(0, 3).map(mf), 0.9, 3200); m808(s, t, b * 0.9, mf(arp[i % 4][0] - 36)); });
    } },
  { name: 'MECHA RIDDIM', style: 'Metal riddim', bpm: 150,
    build: function(s, t0, t1, b) { buildUp(s, t0, t1, b, [[50, 53, 56], [49, 52, 56], [47, 50, 53], [46, 49, 53]]); },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0);
      every(t0, t1, b * 4, function(t) { mKick(s, t); mKick(s, t + b * 0.75, 0.8); mSnare(s, t + b * 2); });
      every(t0, t1, b / 2, function(t) { mHat(s, t, false, 0.7); });
      every(t0, t1, b, function(t, i) {
        if (i % 4 === 3) return;   // the riddim stop
        mWobble(s, t, b * 0.9, mf(i % 8 < 4 ? 26 : 29), 4 / b, { shape: 'sawtooth', cut: 900, q: 16, dist: 20, lfo: 'square' });
      });
    } },
  { name: 'FINAL FORM', style: 'Hybrid trap', bpm: 140,
    build: function(s, t0, t1, b) { buildUp(s, t0, t1, b, [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]); },
    drop: function(s, t0, t1, b) {
      mImpact(s, t0, 1.2);
      every(t0, t1, b * 4, function(t) { mKick(s, t); mSnare(s, t + b * 2); mKick(s, t + b * 2.5, 0.8); });
      every(t0, t1, b / 3, function(t, i) { mHat(s, t, false, i % 6 === 5 ? 1 : 0.55); });   // triplet hat rolls
      var stabs = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
      every(t0, t1, b * 4, function(t, i) {
        var c = stabs[i % 4].map(mf);
        mSaw(s, t, b * 0.4, c, 1.3, 2600); mSaw(s, t + b * 0.75, b * 0.3, c, 1, 2600); mSaw(s, t + b * 1.5, b * 1.2, c, 1.1, 2200);
        m808(s, t, b * 2.4, mf(stabs[i % 4][0] - 24), mf(stabs[i % 4][0] - 36));
      });
    } },
  { name: 'MIDNIGHT DRIVE', style: 'Synthwave (calm)', bpm: 100,
    build: function(s, t0, t1, b) {
      every(t0, t1, b * 4, function(t, i) { mPad(s, t, Math.min(b * 4, t1 - t), [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]][i % 4].map(mf)); });
      every(t0, t1, b / 2, function(t, i) { mPluck(s, t, mf([69, 72, 76, 72][i % 4]), 0.5); });
      mRiser(s, Math.max(t0, t1 - 2), Math.min(2, t1 - t0), 0.5);
    },
    drop: function(s, t0, t1, b) {
      var ch = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
      every(t0, t1, b, function(t, i) { mKick(s, t, 0.7); if (i % 2) mSnare(s, t, 0.5); mHat(s, t + b / 2, false, 0.5); });
      every(t0, t1, b * 4, function(t, i) { mPad(s, t, b * 4, ch[i % 4].map(mf), 1.4); m808(s, t, b * 3.5, mf(ch[i % 4][0] - 24), null, 0.6); });
      every(t0, t1, b / 4, function(t, i) { mPluck(s, t, mf(ch[Math.floor(i / 16) % 4][i % 3] + 12), 0.6); });
    } },
];
