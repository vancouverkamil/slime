// Tournament match statuses and the only moves allowed between them.
//   waiting  → a later-round slot still missing an entrant
//   upcoming → both entrants known, accept not requested yet
//   awaiting → accept check open (per game in a best-of-3), with a deadline
//   live     → a game of the series is being played
//   bot_live → two bots, auto-resolved
//   final    → series decided; nothing changes it again
const TRANSITIONS = {
  waiting:  ['waiting', 'upcoming'],
  upcoming: ['awaiting', 'bot_live'],
  awaiting: ['live', 'final'],
  live:     ['live', 'awaiting', 'final'],
  bot_live: ['final'],
  final:    [],
};

// Returns false (and logs) instead of making an illegal move, so a bug can never
// reopen a finished series or skip its accept check.
function setMatchStatus(match, to) {
  const from = match.status;
  if (from === 'final' && to === 'final') return false; // a late duplicate result: nothing to do
  if (!(TRANSITIONS[from] || []).includes(to)) {
    console.warn('[tournament] illegal match status change blocked', { match: match.id, from, to });
    return false;
  }
  match.status = to;
  return true;
}

module.exports = { setMatchStatus, TRANSITIONS };
