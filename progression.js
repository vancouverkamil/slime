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

  return {
    MAX_LEVEL,
    PRESTIGE_LEVEL,
    RANK_BLOCKS,
    xpForNextLevel,
    totalXpForLevel,
    levelFromXp,
    rankForLevel,
    getProgression,
    getMatchXp,
  };
});
