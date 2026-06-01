(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SlimeProgression = factory();
})(typeof self !== 'undefined' ? self : this, function() {
  const MAX_LEVEL = 100;
  const PRESTIGE_LEVEL = 70;

  const RANK_BLOCKS = [
    'Recruit', 'Rookie', 'Scrapper', 'Bouncer', 'Spiker',
    'Jumper', 'Defender', 'Striker', 'Ace', 'Captain',
    'Champion', 'Elite', 'Master', 'Prestige', 'Crowned',
    'Royal', 'Mythic', 'Legend', 'Immortal', 'Slime God',
  ];

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function xpForNextLevel(level) {
    level = Math.floor(clampNumber(level, 1, MAX_LEVEL));
    if (level >= MAX_LEVEL) return 0;
    if (level < 25) return Math.round(40 + 30 * level);
    if (level < PRESTIGE_LEVEL) {
      const mid = level - 25;
      return Math.round(800 + 85 * mid + 2 * mid * mid);
    }
    return Math.round(8500 * Math.pow(1.07, level - PRESTIGE_LEVEL));
  }

  function totalXpForLevel(level) {
    level = Math.floor(clampNumber(level, 1, MAX_LEVEL));
    let total = 0;
    for (let current = 1; current < level; current++) total += xpForNextLevel(current);
    return total;
  }

  function levelFromXp(xp) {
    xp = Math.floor(clampNumber(xp, 0, Number.MAX_SAFE_INTEGER));
    let total = 0;
    for (let level = 1; level < MAX_LEVEL; level++) {
      const next = xpForNextLevel(level);
      if (xp < total + next) return level;
      total += next;
    }
    return MAX_LEVEL;
  }

  function rankForLevel(level) {
    level = Math.floor(clampNumber(level, 1, MAX_LEVEL));
    const block = Math.min(RANK_BLOCKS.length - 1, Math.floor((level - 1) / 5));
    const arrows = ((level - 1) % 5) + 1;
    const title = RANK_BLOCKS[block];
    return {
      title,
      badge: title.slice(0, 3).toUpperCase() + ' ' + '^'.repeat(arrows),
      tier: block + 1,
      arrows,
    };
  }

  function getProgression(xp) {
    xp = Math.floor(clampNumber(xp, 0, Number.MAX_SAFE_INTEGER));
    const level = levelFromXp(xp);
    const rank = rankForLevel(level);
    const levelStartXp = totalXpForLevel(level);
    const nextLevelXp = xpForNextLevel(level);
    const currentLevelXp = level >= MAX_LEVEL ? 0 : xp - levelStartXp;
    return {
      xp,
      level,
      maxLevel: MAX_LEVEL,
      prestigeLevel: PRESTIGE_LEVEL,
      currentLevelXp,
      nextLevelXp,
      progressToNext: nextLevelXp ? currentLevelXp / nextLevelXp : 1,
      rankTitle: rank.title,
      badge: rank.badge,
      badgeTier: rank.tier,
      badgeArrows: rank.arrows,
      prestige: level >= PRESTIGE_LEVEL,
      unlocks: {
        goldCrown: level >= PRESTIGE_LEVEL,
      },
    };
  }

  function getMatchXp(match) {
    match = match || {};
    const scoreFor = Math.floor(clampNumber(match.scoreFor, 0, 99));
    const scoreAgainst = Math.floor(clampNumber(match.scoreAgainst, 0, 99));
    const won = !!match.won;
    const closeBonus = Math.max(0, 3 - Math.abs(scoreFor - scoreAgainst)) * 10;
    return 80 + scoreFor * 12 + (won ? 140 : 35) + closeBonus;
  }

  function getCoinReward(match) {
    match = match || {};
    const scoreFor = Math.floor(clampNumber(match.scoreFor, 0, 99));
    const scoreAgainst = Math.floor(clampNumber(match.scoreAgainst, 0, 99));
    if (!match.won) return 0;
    return Math.max(1, scoreFor - scoreAgainst);
  }

  // ── Ranked / ELO ─────────────────────────────────────────
  const RANKED_TIERS = [
    { name: 'iron',        label: 'Iron',        min: 0,    color: '#8a8a8a' },
    { name: 'bronze',      label: 'Bronze',      min: 800,  color: '#cd7f32' },
    { name: 'silver',      label: 'Silver',      min: 1000, color: '#b8c0cc' },
    { name: 'gold',        label: 'Gold',        min: 1200, color: '#ffd700' },
    { name: 'platinum',    label: 'Platinum',    min: 1400, color: '#00e5cc' },
    { name: 'diamond',     label: 'Diamond',     min: 1600, color: '#88eeff' },
    { name: 'master',      label: 'Master',      min: 1800, color: '#bb66ff' },
    { name: 'grandmaster', label: 'Grandmaster', min: 2000, color: '#ff6600' },
  ];

  function getRankedTier(rating, placementsLeft) {
    rating = clampNumber(rating, 0, 9999);
    placementsLeft = clampNumber(placementsLeft, 0, 10);
    if (placementsLeft > 0) {
      return { name: 'placement', label: 'Placement', color: '#aaaaaa', rating, placementsLeft };
    }
    let tier = RANKED_TIERS[0];
    for (let i = RANKED_TIERS.length - 1; i >= 0; i--) {
      if (rating >= RANKED_TIERS[i].min) { tier = RANKED_TIERS[i]; break; }
    }
    return { ...tier, rating, placementsLeft: 0 };
  }

  function eloExpected(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  function eloK(rating, placementsLeft) {
    if (placementsLeft > 0) return 40;
    if (rating < 1000) return 32;
    if (rating < 1400) return 24;
    return 16;
  }

  function updateElo(winnerRating, loserRating, winnerPL, loserPL) {
    const kW = eloK(winnerRating, winnerPL);
    const kL = eloK(loserRating,  loserPL);
    const expW = eloExpected(winnerRating, loserRating);
    const expL = eloExpected(loserRating,  winnerRating);
    return {
      winnerNew: Math.max(0, Math.round(winnerRating + kW * (1 - expW))),
      loserNew:  Math.max(0, Math.round(loserRating  + kL * (0 - expL))),
    };
  }

  function defaultRanked() {
    return { season: 1, rating: 1000, peakRating: 1000, placementsLeft: 5, wins: 0, losses: 0 };
  }

  return {
    MAX_LEVEL,
    PRESTIGE_LEVEL,
    RANK_BLOCKS,
    RANKED_TIERS,
    xpForNextLevel,
    totalXpForLevel,
    levelFromXp,
    rankForLevel,
    getProgression,
    getMatchXp,
    getCoinReward,
    getRankedTier,
    eloExpected,
    eloK,
    updateElo,
    defaultRanked,
  };
});
