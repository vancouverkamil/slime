// In-match tournament messages (accept / result / live score) and reconnect reattachment.
module.exports = function install(ctx) {
  const { activeTournaments, send, WIN_AMOUNT } = ctx;
  const { findMatch, resolveMatch, broadcastTournState, tickTourn } = ctx.tournamentHelpers;

  function isEntrant(m, username) { return !!username && ((m.a && m.a.username === username) || (m.b && m.b.username === username)); }
  function isEliminated(lobby, username) {
    return lobby.rounds.some(r => r.some(m => m.status === 'final' && m.winner && isEntrant(m, username) && m.winner.username !== username));
  }

  // A reconnected socket starts with tournamentBracket = null, so look the player up by
  // username instead of trusting the socket; otherwise results from the new socket are dropped.
  function lobbyFor(info) {
    const cur = activeTournaments.get(info.tournamentBracket);
    if (cur) return cur;
    for (const lobby of activeTournaments.values()) {
      if (lobby.champion || !lobby.rounds.some(r => r.some(m => isEntrant(m, info.username)))) continue;
      info.tournamentBracket = lobby.bracketId;
      return lobby;
    }
    return null;
  }

  function reattachTournament(ws, info) {
    if (!info.username) return;
    const lobby = lobbyFor(info);
    if (!lobby) return;
    if (isEliminated(lobby, info.username)) { info.tournamentBracket = null; return; }
    send(ws, { type:'tournament_update', bracketId:lobby.bracketId, bracketName:lobby.name, rounds:lobby.rounds, champion:lobby.champion, now:Date.now() });
  }

  function handleTournamentAccept(ws, info, msg) {
    const lobby = lobbyFor(info); if (!lobby) return;
    const match = findMatch(lobby, msg.matchId); if (!match || match.status !== 'awaiting') return;
    if (match.a && match.a.username === info.username) match.acceptedA = true;
    if (match.b && match.b.username === info.username) match.acceptedB = true;
    if (match.acceptedA && match.acceptedB) { match.status = 'live'; match.acceptDeadline = 0; }
    broadcastTournState(lobby); tickTourn(lobby);
  }

  function handleTournamentResult(ws, info, msg) {
    const lobby = lobbyFor(info); if (!lobby) return;
    const match = findMatch(lobby, msg.matchId); if (!match || match.status === 'final') return;
    if (!match.a || !match.b || !isEntrant(match, info.username)) return;
    const won = !!msg.won, meA = match.a.username === info.username;
    if (won === meA) match.winsA++; else match.winsB++;
    // resolveMatch skips matches already marked final, so don't set status before calling it.
    if (match.winsA >= 2 || match.winsB >= 2) resolveMatch(lobby, match, match.winsA >= 2 ? match.a : match.b, null);
    else { match.status = 'live'; match.acceptDeadline = 0; }
    broadcastTournState(lobby); tickTourn(lobby);
  }

  function handleTournamentScore(ws, info, msg) {
    const lobby = lobbyFor(info); if (!lobby) return;
    const match = findMatch(lobby, msg.matchId);
    if (!match || match.status === 'final' || !isEntrant(match, info.username)) return;
    const meA = match.a && match.a.username === info.username;
    const clamp = (n) => Math.max(0, Math.min(WIN_AMOUNT, Number(n) || 0));
    match.scoreA = clamp(meA ? msg.scoreFor : msg.scoreAgainst);
    match.scoreB = clamp(meA ? msg.scoreAgainst : msg.scoreFor);
    broadcastTournState(lobby);
  }

  Object.assign(ctx, { handleTournamentAccept, handleTournamentResult, handleTournamentScore, reattachTournament, tournamentLobbyFor: lobbyFor });
};
