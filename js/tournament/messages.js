// Tournament: server messages for brackets, accept checks and spectating.

onServerMessage('tournament_spectating', function(msg) {
  tournamentSpectateMatchId = msg.matchId;
  playerNameLeft = msg.nameLeft || 'Player 1';
  playerNameRight = msg.nameRight || 'Player 2';
  currentRoomId = null; currentRoomMapId = 15;
  isSpectator = true; onlineMode = false;
  if (!tournSpecRaf) startTournamentSpectateView();
  if (msg.state) pushTournamentSnapshot(msg.state);
});

onServerMessage('tournament_state', function(msg) {
  if (msg.matchId === tournamentSpectateMatchId) pushTournamentSnapshot(msg);
});

onServerMessage('tournament_lobby', function(msg) {
  // Waiting-room updates only redraw the lobby screen; they never pull a player out of the Slimeverse.
  if (onlineTournamentBracketId === msg.bracketId && currentScreenOwner() !== 'slimeverse') {
    if (typeof showOnlineTournamentLobby === 'function') showOnlineTournamentLobby(msg);
  }
});

function onTournamentBracket(msg) {
  if (typeof loadOnlineTournament === 'function') loadOnlineTournament(msg);
}
onServerMessage('tournament_start', onTournamentBracket);
onServerMessage('tournament_update', onTournamentBracket);

onServerMessage('tournament_match_ready', function(msg) {
  if (typeof showTournamentAccept === 'function') showTournamentAccept(msg);
});

onServerMessage('tournament_error', function(msg) {
  addChatMessage(null, 'Tournament: ' + (msg.error || 'Unknown error'));
  if (typeof onlineTournamentBracketId !== 'undefined' && onlineTournamentBracketId) {
    if (typeof showOnlineBrackets === 'function') showOnlineBrackets();
  }
});
