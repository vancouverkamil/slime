module.exports = function createRpsController(options) {
  const { room, bcast, startNextPoint, broadcastState, RPS_CHOICES } = options;
function sendRpsPrompt(reason) {
  room.state.phase = 'rps';
  room.state.rps = { choices: {}, reason: reason || 'start' };
  bcast({ type: 'rps_start', reason: room.state.rps.reason });
}

function rpsWinner(a, b) {
  if (a === b) return null;
  if ((a === 'rock' && b === 'scissors') ||
      (a === 'paper' && b === 'rock') ||
      (a === 'scissors' && b === 'paper')) return 'left';
  return 'right';
}

function maybeResolveRps() {
  if (!room.state || room.state.phase !== 'rps' || !room.state.rps) return;
  const choices = room.state.rps.choices || {};
  if (!choices.left || !choices.right) return;
  const winner = rpsWinner(choices.left, choices.right);
  if (!winner) {
    bcast({ type: 'rps_result', tie: true, choices: { left: choices.left, right: choices.right } });
    setTimeout(() => { if (room.state && room.state.phase === 'rps') sendRpsPrompt('tie'); }, 900);
    return;
  }
  room.state.leftServes = winner === 'left';
  room.state.phase = 'countdown';
  bcast({
    type: 'rps_result',
    tie: false,
    winner,
    serveSide: winner,
    choices: { left: choices.left, right: choices.right },
  });
  [3, 2, 1].forEach((n, i) => {
    setTimeout(() => {
      if (room.state && room.state.phase === 'countdown') bcast({ type: 'pregame_countdown', n });
    }, 650 + i * 1000);
  });
  setTimeout(() => {
    if (!room.state || room.state.phase !== 'countdown') return;
    startNextPoint();
    broadcastState();
  }, 3650);
}

function handleRpsChoice(side, choice) {
  if (!room.state || room.state.phase !== 'rps') return;
  choice = String(choice || '').toLowerCase();
  if (!RPS_CHOICES.has(choice)) return;
  if (!room.state.rps) room.state.rps = { choices: {} };
  if (room.state.rps.choices[side]) return;
  room.state.rps.choices[side] = choice;
  bcast({ type: 'rps_locked', side });
  maybeResolveRps();
}


  return { sendRpsPrompt, handleRpsChoice };
};
