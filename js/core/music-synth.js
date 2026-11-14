// Core: the music synthesizer. Every track is synthesized live with Web Audio
// (original compositions, nothing sampled), so there is nothing to download
// or license. A "session" is one playback: its own output bus, a reverb send
// and the list of nodes to stop. Instruments schedule at audio time t.
var _musNoiseBuf = null, _musCurves = {};

function musNoise(ac) {
  if (!_musNoiseBuf || _musNoiseBuf.sampleRate !== ac.sampleRate) {
    _musNoiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    var d = _musNoiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return _musNoiseBuf;
}

// Soft-clip curve for growls and 808s (amount 1..50).
function musCurve(amount) {
  if (_musCurves[amount]) return _musCurves[amount];
  var n = 1024, c = new Float32Array(n);
  for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = (1 + amount) * x / (1 + amount * Math.abs(x)); }
  return (_musCurves[amount] = c);
}

function musSession(ac, volume) {
  var out = ac.createGain(); out.gain.value = volume;
  var comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.18;
  // Brick-wall-ish limiter after the glue compressor, then headroom: loud, never clipping.
  var lim = ac.createDynamicsCompressor();
  lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  var master = ac.createGain(); master.gain.value = 0.85;
  out.connect(comp); comp.connect(lim); lim.connect(master); master.connect(ac.destination);
  // Reverb: a generated 2 s tail (big anime-hall space for snares and impacts).
  var len = ac.sampleRate * 2, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (var ch = 0; ch < 2; ch++) {
    var d = ir.getChannelData(ch);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  var conv = ac.createConvolver(); conv.buffer = ir;
  var rev = ac.createGain(); rev.gain.value = 0.35;
  rev.connect(conv); conv.connect(out);
  return { ac: ac, out: out, rev: rev, comp: comp, nodes: [out, comp, lim, master, conv, rev] };
}

function _mk(s, node) { s.nodes.push(node); return node; }
function _gain(s, t, peak, attack, decay, dst) {
  var g = _mk(s, s.ac.createGain());
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dst || s.out);
  return g;
}
function _osc(s, type, freq, t, end, dst) {
  var o = _mk(s, s.ac.createOscillator()); o.type = type; o.frequency.setValueAtTime(freq, t);
  o.connect(dst); o.start(t); o.stop(end);
  return o;
}
function _noise(s, t, end, dst) {
  var n = _mk(s, s.ac.createBufferSource()); n.buffer = musNoise(s.ac);
  n.connect(dst); n.start(t, Math.random()); n.stop(end);
  return n;
}
function _filter(s, type, freq, q, dst) {
  var f = _mk(s, s.ac.createBiquadFilter()); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
  f.connect(dst);
  return f;
}

// ── drums ─────────────────────────────────────────────────
function mKick(s, t, v) {
  var g = _gain(s, t, 1.2 * (v || 1), 0.002, 0.42);
  var o = _osc(s, 'sine', 160, t, t + 0.5, g);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
  _noise(s, t, t + 0.01, _filter(s, 'highpass', 3000, 0.7, _gain(s, t, 0.4 * (v || 1), 0.001, 0.01)));
}
function mSnare(s, t, v) {
  var g = _gain(s, t, 0.75 * (v || 1), 0.002, 0.22);
  _noise(s, t, t + 0.3, _filter(s, 'bandpass', 1900, 0.9, g));
  var body = _gain(s, t, 0.5 * (v || 1), 0.002, 0.12);
  var o = _osc(s, 'triangle', 220, t, t + 0.15, body); o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
  var send = _gain(s, t, 0.5 * (v || 1), 0.002, 0.3, s.rev);
  _noise(s, t, t + 0.3, _filter(s, 'bandpass', 2400, 1, send));
}
function mClap(s, t, v) {
  for (var i = 0; i < 3; i++) {
    var g = _gain(s, t + i * 0.012, 0.45 * (v || 1), 0.001, i === 2 ? 0.16 : 0.02);
    _noise(s, t + i * 0.012, t + 0.25, _filter(s, 'bandpass', 1300, 1.2, g));
  }
}
function mHat(s, t, open, v) {
  var g = _gain(s, t, (open ? 0.18 : 0.13) * (v || 1), 0.001, open ? 0.2 : 0.04);
  _noise(s, t, t + 0.25, _filter(s, 'highpass', 8500, 0.7, g));
}
// Snare roll that speeds up into the drop (16ths, then 32nds, then 64ths).
function mSnareRoll(s, t0, t1, beat) {
  var t = t0, total = t1 - t0;
  while (t < t1 - 0.01) {
    var k = (t - t0) / total;
    mSnare(s, t, 0.35 + k * 0.6);
    t += beat / (k < 0.5 ? 4 : k < 0.8 ? 8 : 16);
  }
}

// ── bass ──────────────────────────────────────────────────
// 808 with a pitch glide and grit.
function m808(s, t, dur, f0, f1, v) {
  var g = _gain(s, t, 0.9 * (v || 1), 0.005, dur);
  var sh = _mk(s, s.ac.createWaveShaper()); sh.curve = musCurve(4); sh.connect(g);
  var o = _osc(s, 'sine', f0, t, t + dur + 0.05, sh);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(dur, 0.25));
}
// Wobble: saw/square through a resonant lowpass swept by an LFO (rate in Hz).
function mWobble(s, t, dur, freq, rate, opt) {
  opt = opt || {};
  var env = _mk(s, s.ac.createGain());
  env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(opt.vol || 0.5, t + 0.01);
  env.gain.setValueAtTime(opt.vol || 0.5, t + dur - 0.03); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  env.connect(s.out);
  var sh = _mk(s, s.ac.createWaveShaper()); sh.curve = musCurve(opt.dist || 8); sh.connect(env);
  var f = _filter(s, 'lowpass', opt.cut || 500, opt.q || 9, sh);
  var depth = _mk(s, s.ac.createGain()); depth.gain.value = (opt.cut || 500) * 0.9;
  depth.connect(f.frequency);
  _osc(s, opt.lfo || 'sine', rate, t, t + dur, depth);
  _osc(s, opt.shape || 'sawtooth', freq, t, t + dur, f);
  _osc(s, 'square', freq / 2, t, t + dur, f);
}
// Growl: detuned saws, heavy distortion, a formant band sweeping "yoi-yoi".
function mGrowl(s, t, dur, freq, speed, v) {
  var env = _gain(s, t, 1.3 * (v || 1), 0.01, dur);
  var lp = _filter(s, 'lowpass', 3200, 0.8, env);
  var sub = _gain(s, t, 0.5 * (v || 1), 0.01, dur);
  _osc(s, 'sine', freq / 2, t, t + dur, sub);
  var bp = _filter(s, 'bandpass', 600, 5, lp);
  var steps = Math.max(2, Math.round(dur * (speed || 6)));
  for (var i = 0; i <= steps; i++) bp.frequency.setValueAtTime(i % 2 ? 1400 : 380, t + (dur * i) / steps);
  var sh = _mk(s, s.ac.createWaveShaper()); sh.curve = musCurve(30); sh.connect(bp);
  _osc(s, 'sawtooth', freq, t, t + dur, sh); _osc(s, 'sawtooth', freq * 1.01, t, t + dur, sh);
  _osc(s, 'square', freq / 2, t, t + dur, sh);
}
// Reese: two detuned saws with a slowly moving lowpass (drum & bass).
function mReese(s, t, dur, freq, v) {
  var env = _gain(s, t, 0.4 * (v || 1), 0.02, dur);
  var f = _filter(s, 'lowpass', 300, 4, env);
  f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(900, t + dur * 0.6); f.frequency.linearRampToValueAtTime(320, t + dur);
  _osc(s, 'sawtooth', freq, t, t + dur, f); _osc(s, 'sawtooth', freq * 1.012, t, t + dur, f);
}

// ── melody ────────────────────────────────────────────────
// Supersaw chord or lead: 3 detuned saws per note, filtered.
function mSaw(s, t, dur, freqs, v, cut) {
  var env = _mk(s, s.ac.createGain());
  env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.12 * (v || 1), t + 0.02);
  env.gain.setValueAtTime(0.12 * (v || 1), t + dur * 0.7); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  env.connect(s.out); env.connect(s.rev);
  var f = _filter(s, 'lowpass', cut || 4200, 0.7, env);
  freqs.forEach(function(fr) { [-0.012, 0, 0.012].forEach(function(dt) { _osc(s, 'sawtooth', fr * (1 + dt), t, t + dur, f); }); });
}
function mPluck(s, t, freq, v) {
  var g = _gain(s, t, 0.18 * (v || 1), 0.003, 0.22);
  g.connect(s.rev);
  _osc(s, 'square', freq, t, t + 0.3, _filter(s, 'lowpass', 3000, 2, g));
}
function mBell(s, t, freq, v) {   // phonk cowbell
  var g = _gain(s, t, 0.2 * (v || 1), 0.002, 0.28);
  var bp = _filter(s, 'bandpass', freq * 1.4, 3, g);
  _osc(s, 'square', freq, t, t + 0.3, bp); _osc(s, 'square', freq * 1.48, t, t + 0.3, bp);
}
function mPad(s, t, dur, freqs, v) {
  var env = _mk(s, s.ac.createGain());
  env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.06 * (v || 1), t + dur * 0.3);
  env.gain.linearRampToValueAtTime(0.0001, t + dur); env.connect(s.out); env.connect(s.rev);
  var f = _filter(s, 'lowpass', 1400, 0.7, env);
  freqs.forEach(function(fr) { _osc(s, 'triangle', fr, t, t + dur, f); _osc(s, 'sawtooth', fr * 1.005, t, t + dur, f); });
}

// ── transitions ───────────────────────────────────────────
// Riser: noise sweeping up plus a climbing tone, into the drop.
function mRiser(s, t, dur, v) {
  var g = _mk(s, s.ac.createGain());
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * (v || 1), t + dur);
  g.connect(s.out); g.connect(s.rev);
  var hp = _filter(s, 'bandpass', 400, 2, g);
  hp.frequency.setValueAtTime(400, t); hp.frequency.exponentialRampToValueAtTime(9000, t + dur);
  _noise(s, t, t + dur, hp);
  var o = _osc(s, 'sawtooth', 110, t, t + dur, _filter(s, 'lowpass', 2500, 1, g));
  o.frequency.exponentialRampToValueAtTime(880, t + dur);
}
// Impact: the boom on the drop (sub hit + noise burst into the reverb).
function mImpact(s, t, v) {
  var g = _gain(s, t, 1.3 * (v || 1), 0.003, 1.6);
  var o = _osc(s, 'sine', 90, t, t + 1.8, g); o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
  var n = _gain(s, t, 0.7 * (v || 1), 0.002, 0.9, s.rev);
  _noise(s, t, t + 1, _filter(s, 'lowpass', 2500, 0.7, n));
}
