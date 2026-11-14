// Online: shared online/spectator match state.
// ── online / spectator state ──────────────────────────────
var onlineMode          = false;
var isSpectator         = false;
var mySide              = null;
var onlineInputInterval = null;
var onlinePointText     = null;
var showingLobbySelect  = false;
var currentRoomId       = null;
var currentRoomMapId    = null;
var onlinePregameState  = null;
var currentGameId       = null; // server id of the game being played or watched
var onlineMatchMode     = 'QUICK PLAY'; // what this match counts for: QUICK PLAY, RANKED or TOURNAMENT

// ── online player info ────────────────────────────────────
var playerNameLeft  = 'Player 1';
var playerNameRight = 'Player 2';
var leftStreak      = 0;
var rightStreak     = 0;
var rallyCount      = 0;
var sessionWins     = 0;
var sessionLosses   = 0;

// ── emotes ────────────────────────────────────────────────
var EMOTE_LIST = ['👋','🔥','💪','😎'];
var emoteLeft = null, emoteRight = null;
var emoteLeftEnd = 0, emoteRightEnd = 0;

// ── screen shake ─────────────────────────────────────────
var shakeFrames = 0, shakeAmt = 0;

// ── particles ─────────────────────────────────────────────
var particles = [];
