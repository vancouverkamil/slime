const shared = require('./shared');
const { crypto, fs, path, progression, DATA_DIR, SESSION_TTL_MS, nowIso, makeId, normalizeUsername, publicName, hashPassword, safeHatDrawing, safeSavedHatDrawings, normalizeStats, normalizeCoins, safeAchievements, awardMatchAchievements, defaultUser } = shared;

module.exports = {
login(username, password) {
    const user = this.findByUsername(username);
    if (!user) return null;
    const attempted = hashPassword(password, user.passwordSalt);
    const ok = crypto.timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    return ok ? user : null;
  },

updateSlime(userId, slime) {
    const user = this.findById(userId);
    if (!user) return null;
    const requestedHat = String(slime.hat || user.slime.hat || 'none').slice(0, 20);
    const hat = requestedHat === 'goldcrown' && !progression.getProgression(normalizeStats(user.stats).xp).unlocks.goldCrown
      ? 'none'
      : requestedHat;
    user.slime = {
      color: String(slime.color || user.slime.color || '#00ff00').slice(0, 20),
      hat,
      hatAnim: String(slime.hatAnim || user.slime.hatAnim || 'none').slice(0, 20),
      hatDrawing: safeHatDrawing(slime.hatDrawing),
      trail: String(slime.trail || user.slime.trail || 'none').slice(0, 20),
    };
    user.updatedAt = nowIso();
    this.save();
    return user;
  },

recordMatch(leftUserId, rightUserId, winnerSide, scoreLeft, scoreRight, ranked) {
    const left = leftUserId ? this.findById(leftUserId) : null;
    const right = rightUserId ? this.findById(rightUserId) : null;
    if (!left && !right) return;
    const matchId = makeId();
    const playedAt = nowIso();

    // ELO update for ranked matches
    let eloLeft = null, eloRight = null;
    if (ranked && left && right) {
      const lr = left.ranked  || progression.defaultRanked();
      const rr = right.ranked || progression.defaultRanked();
      const winner = winnerSide === 'left' ? lr : rr;
      const loser  = winnerSide === 'left' ? rr : lr;
      const result = progression.updateElo(winner.rating, loser.rating, winner.placementsLeft, loser.placementsLeft);
      const winnerNew = { ...winner, rating: result.winnerNew, peakRating: Math.max(winner.peakRating, result.winnerNew), placementsLeft: Math.max(0, winner.placementsLeft - 1), wins: winner.wins + 1 };
      const loserNew  = { ...loser,  rating: result.loserNew,  peakRating: Math.max(loser.peakRating,  result.loserNew),  placementsLeft: Math.max(0, loser.placementsLeft  - 1), losses: loser.losses + 1 };
      eloLeft  = winnerSide === 'left' ? winnerNew : loserNew;
      eloRight = winnerSide === 'left' ? loserNew  : winnerNew;
    }

    const apply = (user, side, opponent, scoreFor, scoreAgainst, newElo) => {
      if (!user) return;
      const won = winnerSide === side;
      user.stats = normalizeStats(user.stats);
      const xpGained = progression.getMatchXp({ won, scoreFor, scoreAgainst });
      const coinsGained = progression.getCoinReward({ won, scoreFor, scoreAgainst });
      user.stats.matches++;
      if (won) user.stats.wins++;
      else user.stats.losses++;
      user.stats.pointsFor += scoreFor;
      user.stats.pointsAgainst += scoreAgainst;
      user.stats.xp += xpGained;
      user.coins = normalizeCoins(user.coins) + coinsGained;
      if (newElo) user.ranked = newElo;
      user.achievements = awardMatchAchievements(user.achievements, { won, scoreFor, scoreAgainst, playedAt });
      user.recentMatches.unshift({
        id: matchId, playedAt, result: won ? 'win' : 'loss',
        scoreFor, scoreAgainst, xpGained, coinsGained, ranked: !!ranked,
        opponent: opponent ? opponent.username : 'guest',
      });
      user.recentMatches = user.recentMatches.slice(0, 10);
      user.updatedAt = playedAt;
    };

    apply(left,  'left',  right, scoreLeft,  scoreRight, eloLeft);
    apply(right, 'right', left,  scoreRight, scoreLeft,  eloRight);
    this.save();
  },

updateRanked(userId, rankedData) {
    const user = this.findById(userId);
    if (!user) return null;
    user.ranked = { ...(user.ranked || progression.defaultRanked()), ...rankedData };
    user.updatedAt = nowIso();
    this.save();
    return user;
  },

purchaseItem(userId, hatId, price) {
    const user = this.findById(userId);
    if (!user) return null;
    const coins = normalizeCoins(user.coins);
    if (coins < price) throw new Error('Not enough SC.');
    const inv = user.inventory || [];
    if (inv.includes(hatId)) throw new Error('Already owned.');
    user.coins = coins - price;
    user.inventory = inv.concat([hatId]);
    user.updatedAt = nowIso();
    this.save();
    return user;
  },

saveHatPreset(userId, preset) {
    const user = this.findById(userId);
    if (!user) return null;
    const saved = safeSavedHatDrawings(user.savedHatDrawings);
    if (saved.length >= 5) throw new Error('You can save up to 5 hat drawings.');
    const next = safeSavedHatDrawings([{
      id: makeId(),
      name: preset.name || `Hat ${saved.length + 1}`,
      savedAt: nowIso(),
      hatAnim: preset.hatAnim,
      drawBrush: preset.drawBrush,
      drawSize: preset.drawSize,
      drawColor: preset.drawColor,
      drawing: preset.drawing,
    }])[0];
    user.savedHatDrawings = saved.concat([next]);
    user.updatedAt = nowIso();
    this.save();
    return user;
  },

deleteHatPreset(userId, presetId) {
    const user = this.findById(userId);
    if (!user) return null;
    const saved = safeSavedHatDrawings(user.savedHatDrawings);
    user.savedHatDrawings = saved.filter((item) => item.id !== presetId);
    user.updatedAt = nowIso();
    this.save();
    return user;
  },

publicProfile(user) {
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      stats: normalizeStats(user.stats),
      progression: progression.getProgression((user.stats || {}).xp),
      slime: user.slime,
      achievements: safeAchievements(user.achievements),
      recentMatches: user.recentMatches || [],
      coins: normalizeCoins(user.coins),
      inventory: user.inventory || [],
      savedHatDrawings: safeSavedHatDrawings(user.savedHatDrawings),
      ranked: user.ranked || progression.defaultRanked(),
    };
  },

publicLeaderboardProfile(user) {
    if (!user) return null;
    const stats = normalizeStats(user.stats);
    return {
      username: user.username,
      displayName: user.displayName,
      stats,
      progression: progression.getProgression(stats.xp),
    };
  },

leaderboard() {
    return this.data.users
      .map((user) => this.publicLeaderboardProfile(user))
      .sort((a, b) => {
        const xpDiff = ((b.stats || {}).xp || 0) - ((a.stats || {}).xp || 0);
        if (xpDiff) return xpDiff;
        return String(a.username).localeCompare(String(b.username));
      });
  }
};
