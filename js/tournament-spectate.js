// ── tournament spectating ─────────────────────────────────
// The player's client streams snapshots (~25/s). Rendering straight off each
// message looked choppy, so buffer them and draw ~100ms behind, interpolating.
var TOURN_SPEC_DELAY_MS = 100;
var tournSpecSnaps = [];
var tournSpecRaf = null;
var tournamentSpectateRoomId = null;

function spectateTournamentMatch(matchId) {
  var match = tournamentMatchById(matchId);
  if (!match) return;
  tournamentSpectateMatchId = matchId;
  playerNameLeft = match.a ? match.a.name : 'TBD';
  playerNameRight = match.b ? match.b.name : 'TBD';
  isSpectator = true; onlineMode = false;
  if (match.roomId != null) {
    // Real players: watch the actual server room, same smooth path as Quick Play spectating.
    tournamentSpectateRoomId = match.roomId;
    if (lobbySocket && lobbySocket.readyState === 1)
      lobbySocket.send(JSON.stringify({ type:'join_room', roomId:match.roomId }));
    return;
  }
  currentRoomId = null; currentRoomMapId = 15;
  startTournamentSpectateView();
  if (lobbySocket && lobbySocket.readyState === 1)
    lobbySocket.send(JSON.stringify({ type:'tournament_spectate', matchId:matchId }));
}

function startTournamentSpectateView() {
  tournSpecSnaps = [];
  launchSpectatorMode();
  hideBottomBar();
  if (!tournSpecRaf) tournSpecRaf = requestAnimationFrame(tournamentSpectateFrame);
}

function pushTournamentSnapshot(msg) {
  if (!msg.ball || !msg.slimeLeft || !msg.slimeRight) return;
  tournSpecSnaps.push({ t: Date.now(), msg: msg });
  if (tournSpecSnaps.length > 30) tournSpecSnaps.shift();
}

function lerpSpec(a, b, k) { return a + (b - a) * k; }

function tournamentSpectateFrame() {
  tournSpecRaf = null;
  if (!isSpectator || !tournamentSpectateMatchId) return;
  tournSpecRaf = requestAnimationFrame(tournamentSpectateFrame);
  if (!tournSpecSnaps.length) return;
  var renderAt = Date.now() - TOURN_SPEC_DELAY_MS;
  while (tournSpecSnaps.length > 2 && tournSpecSnaps[1].t <= renderAt) tournSpecSnaps.shift();
  var s0 = tournSpecSnaps[0], s1 = tournSpecSnaps[1] || s0;
  var k = s1.t > s0.t ? Math.max(0, Math.min(1, (renderAt - s0.t) / (s1.t - s0.t))) : 1;
  var a = s0.msg, b = s1.msg;
  // A new point teleports the ball; snap instead of sweeping it across the court.
  if (Math.abs(b.ball.x - a.ball.x) > 200 || Math.abs(b.ball.y - a.ball.y) > 200) k = 1;
  applyServerState({
    ball: { x: lerpSpec(a.ball.x, b.ball.x, k), y: lerpSpec(a.ball.y, b.ball.y, k), velocityX: b.ball.velocityX },
    slimeLeft: { x: lerpSpec(a.slimeLeft.x, b.slimeLeft.x, k), y: lerpSpec(a.slimeLeft.y, b.slimeLeft.y, k) },
    slimeRight: { x: lerpSpec(a.slimeRight.x, b.slimeRight.x, k), y: lerpSpec(a.slimeRight.y, b.slimeRight.y, k) },
    scoreLeft: b.scoreLeft, scoreRight: b.scoreRight, phase: 'playing',
  });
}

function exitTournamentSpectate() {
  if (!tournamentSpectateMatchId) return;
  tournamentSpectateMatchId = null;
  tournSpecSnaps = [];
  if (tournSpecRaf) { cancelAnimationFrame(tournSpecRaf); tournSpecRaf = null; }
  isSpectator = false; currentRoomMapId = null; currentRoomId = null;
  hideSpecBadge(); showLeaveBtn(false); hidePregameOverlay();
  if (lobbySocket && lobbySocket.readyState === 1) {
    if (tournamentSpectateRoomId != null) lobbySocket.send(JSON.stringify({ type:'leave_room' }));
    else lobbySocket.send(JSON.stringify({ type:'tournament_spectate', matchId:null }));
  }
  tournamentSpectateRoomId = null;
  if (tournamentState) showTournamentHub(); else toInitialMenu();
}
