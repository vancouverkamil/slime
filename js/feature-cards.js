var SlimeFeatureCards = (function() {
  var callingCards = [
    {
      id: 'rookie-grit',
      name: 'Rookie Grit',
      title: 'Fresh off the floor',
      accent: '#9bff66',
      unlock: 'Default card',
    },
    {
      id: 'mud-line',
      name: 'Mud Line',
      title: 'Win a match by 3+ points',
      accent: '#c7a13a',
      unlock: 'Dominant win',
    },
    {
      id: 'final-four',
      name: 'Final Four',
      title: 'Conquer The Final 4',
      accent: '#ff4a1f',
      unlock: 'The Final 4 champion',
    },
    {
      id: 'vacuum-save',
      name: 'Vacuum Save',
      title: 'Keep the rally alive',
      accent: '#54d6ff',
      unlock: 'Save streak challenge',
    },
    {
      id: 'bracket-wound',
      name: 'Bracket Wound',
      title: 'Tournament champion',
      accent: '#ffcc33',
      unlock: 'Win a bracket',
    },
  ];

  var emblems = [
    { id: 'recruit', label: 'REC', unlock: 'Level 1' },
    { id: 'spiker', label: 'SPK', unlock: 'Score with 10 hard hits' },
    { id: 'wall', label: 'WAL', unlock: 'Win a defensive match' },
    { id: 'ace', label: 'ACE', unlock: 'Win a match 7-0' },
    { id: 'champ', label: 'CHP', unlock: 'Win a tournament' },
  ];

  var achievements = [
    { id: 'clean-win', name: 'Clean Win', reward: 'Mud Line calling card', criteria: 'Win by 3+ points.' },
    { id: 'final-four-clear', name: 'The Final 4', reward: 'Final Four calling card', criteria: 'Beat every boss in The Final 4.' },
    { id: 'tournament-crown', name: 'Bracket Crown', reward: 'Bracket Wound calling card', criteria: 'Win a tournament bracket.' },
    { id: 'high-impact', name: 'High Impact', reward: 'Spiker emblem', criteria: 'Win points with high ball velocity.' },
    { id: 'rally-rat', name: 'No Easy Points', reward: 'Vacuum Save calling card', criteria: 'Survive long rallies and defensive saves.' },
  ];

  function cardById(id) {
    for (var i = 0; i < callingCards.length; i++) {
      if (callingCards[i].id === id) return callingCards[i];
    }
    return callingCards[0];
  }

  function emblemForProgression(prog) {
    var level = prog && prog.level ? prog.level : 1;
    if (level >= 70) return { id: 'prestige', label: 'PRS', unlock: 'Level 70' };
    if (level >= 30) return { id: 'elite', label: 'ELT', unlock: 'Level 30' };
    if (level >= 15) return { id: 'vet', label: 'VET', unlock: 'Level 15' };
    if (level >= 5) return { id: 'rec-plus', label: 'REC+', unlock: 'Level 5' };
    return emblems[0];
  }

  function coinReward(scoreFor, scoreAgainst, won) {
    if (!won) return 0;
    return Math.max(1, Math.max(0, Number(scoreFor || 0) - Number(scoreAgainst || 0)));
  }

  return {
    callingCards: callingCards,
    emblems: emblems,
    achievements: achievements,
    cardById: cardById,
    emblemForProgression: emblemForProgression,
    coinReward: coinReward,
  };
})();
