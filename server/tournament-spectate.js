module.exports = function install(ctx) {
  const { allClients, activeTournaments, WIN_AMOUNT, send } = ctx;

  function findMatch(lobby, id) {
    for (const round of lobby.rounds || []) for (const match of round) if (match.id === id) return match;
    return null;
  }

  function findLobbyAndMatch(info, id) {
    const lobby = ctx.tournamentLobbyFor ? ctx.tournamentLobbyFor(info) : activeTournaments.get(info.tournamentBracket);
    if (!lobby) return null;
    const match = findMatch(lobby, id);
    return match ? { lobby, match } : null;
  }

  function handleTournamentSpectate(ws, info, msg) {
    const found = findLobbyAndMatch(info, msg.matchId);
    if (!found) return;
    info.tournamentSpectate = { bracketId: found.lobby.bracketId, matchId: found.match.id };
    send(ws, {
      type: 'tournament_spectating',
      matchId: found.match.id,
      nameLeft: found.match.a ? found.match.a.name : 'TBD',
      nameRight: found.match.b ? found.match.b.name : 'TBD',
      state: found.match.liveState || null,
    });
  }

  function clampScore(n) {
    return Math.max(0, Math.min(WIN_AMOUNT, Number(n) || 0));
  }

  function handleTournamentState(ws, info, msg) {
    const found = findLobbyAndMatch(info, msg.matchId);
    if (!found || found.match.status === 'final') return;
    const a = found.match.a, b = found.match.b;
    if (!a || !b || (a.username !== info.username && b.username !== info.username)) return;
    found.match.liveState = {
      ball: msg.ball, slimeLeft: msg.slimeLeft, slimeRight: msg.slimeRight,
      scoreLeft: clampScore(msg.scoreLeft), scoreRight: clampScore(msg.scoreRight),
      phase: 'playing',
    };
    allClients.forEach((clientInfo, clientWs) => {
      const sub = clientInfo.tournamentSpectate;
      if (!sub || sub.bracketId !== found.lobby.bracketId || sub.matchId !== found.match.id) return;
      if (clientWs.readyState === 1) send(clientWs, Object.assign({ type: 'tournament_state', matchId: found.match.id }, found.match.liveState));
    });
  }

  Object.assign(ctx, { handleTournamentSpectate, handleTournamentState });
};
