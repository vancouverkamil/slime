// Game: the Japanese announcer for the Finisher Cam (Quick Play matches).
// Uses the browser's own speech (Web Speech API) with a Japanese voice:
//   slow motion starts  -> 決着！        ("it's decided!")
//   victory card        -> 勝者、NAME！  ("the winner, NAME!"), plus
//                          パーフェクトゲーム！ for a 7-0, or 見事な勝利！ otherwise.
// Without a Japanese voice on the device it says the same lines in romaji.
// The music dips under the voice. Settings > Audio > Japanese Announcer.
var announcerEnabled = true;
try { announcerEnabled = localStorage.getItem('slime_announcer') !== 'off'; } catch (e) {}

function setAnnouncerEnabled(on) {
  announcerEnabled = !!on;
  try { localStorage.setItem('slime_announcer', announcerEnabled ? 'on' : 'off'); } catch (e) {}
  if (!announcerEnabled) stopAnnouncer();
}

function announcerSupported() { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'; }

// The best Japanese voice on this device: natural/online voices first.
function announcerVoice() {
  if (!announcerSupported()) return null;
  var ja = window.speechSynthesis.getVoices().filter(function(v) { return /^ja/i.test(v.lang); });
  var rank = function(v) { return /natural|online|google|nanami|keita/i.test(v.name) ? 0 : /haruka|ayumi|sayaka|ichiro|kyoko|otoya/i.test(v.name) ? 1 : 2; };
  ja.sort(function(a, b) { return rank(a) - rank(b); });
  return ja[0] || null;
}
if (announcerSupported()) {
  window.speechSynthesis.getVoices();   // voices load lazily; ask early so they are ready by the end of a match
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}

function stopAnnouncer() { if (announcerSupported()) window.speechSynthesis.cancel(); }

// Lower the music for `sec` seconds so the voice cuts through, then bring it back.
function duckMusicFor(sec) {
  if (!musicNow) return;
  var g = musicNow.session.out.gain, ac = musicNow.session.ac, now = ac.currentTime, full = 0.9 * musicVolume / 100;
  try {
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(full * 0.35, now + 0.12);
    g.setValueAtTime(full * 0.35, now + sec);
    g.linearRampToValueAtTime(full, now + sec + 0.5);
  } catch (e) {}
}

// line = { ja: Japanese text, romaji: fallback text }; style: 'shout' | 'call'.
function announce(line, style) {
  if (!announcerEnabled || !announcerSupported() || musicVolume <= 0) return;
  var voice = announcerVoice();
  var u = new SpeechSynthesisUtterance(voice ? line.ja : line.romaji);
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'ja-JP';
  u.rate = style === 'shout' ? 0.85 : 0.95;    // drawn out, like a ring announcer
  u.pitch = style === 'shout' ? 0.7 : 0.85;
  u.volume = Math.min(1, 0.4 + musicVolume / 120);
  duckMusicFor(style === 'shout' ? 1.4 : 2.8);
  window.speechSynthesis.speak(u);
}

// Only Quick Play matches get the announcer.
function announcerForThisMatch() { return typeof onlineMatchMode === 'undefined' || onlineMatchMode === 'QUICK PLAY'; }

function announceFinisher() {
  if (!announcerForThisMatch()) return;
  stopAnnouncer();
  announce({ ja: '決着！', romaji: 'Kecchaku!' }, 'shout');
}

function announceWinner(name, perfect) {
  if (!announcerForThisMatch()) return;
  var n = String(name || '').slice(0, 24);
  announce({ ja: '勝者、' + n + '！', romaji: 'Shousha... ' + n + '!' }, 'call');
  announce(perfect ? { ja: 'パーフェクトゲーム！', romaji: 'Perfect game!' } : { ja: '見事な勝利！', romaji: 'Migoto na shouri!' }, 'call');
}
