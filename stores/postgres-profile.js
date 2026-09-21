const shared = require('./shared');
const { crypto, fs, path, progression, DATA_DIR, SESSION_TTL_MS, nowIso, makeId, normalizeUsername, publicName, hashPassword, safeHatDrawing, safeSavedHatDrawings, normalizeStats, normalizeCoins, safeAchievements, awardMatchAchievements, defaultUser } = shared;

module.exports = {
async register(username, password) {
    await this.ready;
    const normalized = normalizeUsername(username);
    if (normalized.length < 3) throw new Error('Username must be at least 3 letters.');
    if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters.');
    if (await this.findByUsername(normalized)) throw new Error('That username is already taken.');
    const user = defaultUser(normalized, password);
    await this.sql`
      INSERT INTO users (
        id, username, display_name, password_salt, password_hash,
        created_at, updated_at, stats, slime, achievements, recent_matches,
        coins, inventory
        , saved_hat_drawings
      )
      VALUES (
        ${user.id}, ${user.username}, ${user.displayName}, ${user.passwordSalt}, ${user.passwordHash},
        ${user.createdAt}, ${user.updatedAt}, ${JSON.stringify(user.stats)}::jsonb,
        ${JSON.stringify(user.slime)}::jsonb, ${JSON.stringify(user.achievements)}::jsonb,
        ${JSON.stringify(user.recentMatches)}::jsonb,
        ${user.coins}, ${JSON.stringify(user.inventory)}::jsonb,
        ${JSON.stringify(user.savedHatDrawings)}::jsonb
      )
    `;
    return user;
  },

async login(username, password) {
    const user = await this.findByUsername(username);
    if (!user) return null;
    const attempted = hashPassword(password, user.passwordSalt);
    const ok = crypto.timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    return ok ? user : null;
  },

async updateSlime(userId, slime) {
    await this.ready;
    const user = await this.findById(userId);
    if (!user) return null;
    const requestedHat = String(slime.hat || user.slime.hat || 'none').slice(0, 20);
    const hat = requestedHat === 'goldcrown' && !progression.getProgression(normalizeStats(user.stats).xp).unlocks.goldCrown
      ? 'none'
      : requestedHat;
    const nextSlime = {
      color: String(slime.color || user.slime.color || '#00ff00').slice(0, 20),
      hat,
      hatAnim: String(slime.hatAnim || user.slime.hatAnim || 'none').slice(0, 20),
      hatDrawing: safeHatDrawing(slime.hatDrawing),
      trail: String(slime.trail || user.slime.trail || 'none').slice(0, 20),
    };
    const rows = await this.sql`
      UPDATE users
      SET slime = ${JSON.stringify(nextSlime)}::jsonb, updated_at = now()
      WHERE id = ${userId}
      RETURNING *
    `;
    return this.rowToUser(rows[0]);
  },

async recordMatch(leftUserId, rightUserId, winnerSide, scoreLeft, scoreRight, ranked) {
    await this.ready;
    const left = leftUserId ? await this.findById(leftUserId) : null;
    const right = rightUserId ? await this.findById(rightUserId) : null;
    if (!left && !right) return;
    const matchId = makeId();
    const playedAt = nowIso();

    let eloLeft = null, eloRight = null;
    if (ranked && left && right) {
      const lr = left.ranked  || progression.defaultRanked();
      const rr = right.ranked || progression.defaultRanked();
      const winner = winnerSide === 'left' ? lr : rr;
      const loser  = winnerSide === 'left' ? rr : lr;
      const result = progression.updateElo(winner.rating, loser.rating, winner.placementsLeft, loser.placementsLeft);
      const wNew = { ...winner, rating: result.winnerNew, peakRating: Math.max(winner.peakRating, result.winnerNew), placementsLeft: Math.max(0, winner.placementsLeft - 1), wins: winner.wins + 1 };
      const lNew = { ...loser,  rating: result.loserNew,  peakRating: Math.max(loser.peakRating,  result.loserNew),  placementsLeft: Math.max(0, loser.placementsLeft  - 1), losses: loser.losses + 1 };
      eloLeft  = winnerSide === 'left' ? wNew : lNew;
      eloRight = winnerSide === 'left' ? lNew : wNew;
    }

    const apply = async (user, side, opponent, scoreFor, scoreAgainst, newElo) => {
      if (!user) return;
      const won = winnerSide === side;
      const xpGained = progression.getMatchXp({ won, scoreFor, scoreAgainst });
      const coinsGained = progression.getCoinReward({ won, scoreFor, scoreAgainst });
      const stats = {
        matches: (user.stats.matches || 0) + 1,
        wins: (user.stats.wins || 0) + (won ? 1 : 0),
        losses: (user.stats.losses || 0) + (won ? 0 : 1),
        pointsFor: (user.stats.pointsFor || 0) + scoreFor,
        pointsAgainst: (user.stats.pointsAgainst || 0) + scoreAgainst,
        xp: (user.stats.xp || 0) + xpGained,
      };
      const recentMatch = { id: matchId, playedAt, result: won ? 'win' : 'loss', scoreFor, scoreAgainst, xpGained, coinsGained, ranked: !!ranked, opponent: opponent ? opponent.username : 'guest' };
      const recentMatches = [recentMatch].concat(user.recentMatches || []).slice(0, 10);
      const achievements = awardMatchAchievements(user.achievements, { won, scoreFor, scoreAgainst, playedAt });
      const rankedVal = newElo ? JSON.stringify(newElo) : JSON.stringify(user.ranked || progression.defaultRanked());
      await this.sql`
        UPDATE users
        SET stats         = ${JSON.stringify(stats)}::jsonb,
            recent_matches= ${JSON.stringify(recentMatches)}::jsonb,
            achievements  = ${JSON.stringify(achievements)}::jsonb,
            coins         = coins + ${coinsGained},
            ranked        = ${rankedVal}::jsonb,
            updated_at    = now()
        WHERE id = ${user.id}
      `;
    };

    await apply(left,  'left',  right, scoreLeft,  scoreRight, eloLeft);
    await apply(right, 'right', left,  scoreRight, scoreLeft,  eloRight);
  },

async updateRanked(userId, rankedData) {
    await this.ready;
    const user = await this.findById(userId);
    if (!user) return null;
    const updated = { ...(user.ranked || progression.defaultRanked()), ...rankedData };
    const rows = await this.sql`UPDATE users SET ranked = ${JSON.stringify(updated)}::jsonb, updated_at = now() WHERE id = ${userId} RETURNING *`;
    return this.rowToUser(rows[0]);
  },

async purchaseItem(userId, hatId, price) {
    await this.ready;
    const user = await this.findById(userId);
    if (!user) return null;
    if (normalizeCoins(user.coins) < price) throw new Error('Not enough SC.');
    if ((user.inventory || []).includes(hatId)) throw new Error('Already owned.');
    const rows = await this.sql`
      UPDATE users
      SET coins = coins - ${price},
          inventory = inventory || ${JSON.stringify([hatId])}::jsonb,
          updated_at = now()
      WHERE id = ${userId}
        AND coins >= ${price}
      RETURNING *
    `;
    if (!rows[0]) throw new Error('Not enough SC.');
    return this.rowToUser(rows[0]);
  },

async saveHatPreset(userId, preset) {
    await this.ready;
    const user = await this.findById(userId);
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
    const rows = await this.sql`
      UPDATE users
      SET saved_hat_drawings = ${JSON.stringify(saved.concat([next]))}::jsonb,
          updated_at = now()
      WHERE id = ${userId}
      RETURNING *
    `;
    return this.rowToUser(rows[0]);
  },

async deleteHatPreset(userId, presetId) {
    await this.ready;
    const user = await this.findById(userId);
    if (!user) return null;
    const saved = safeSavedHatDrawings(user.savedHatDrawings).filter((item) => item.id !== presetId);
    const rows = await this.sql`
      UPDATE users
      SET saved_hat_drawings = ${JSON.stringify(saved)}::jsonb,
          updated_at = now()
      WHERE id = ${userId}
      RETURNING *
    `;
    return this.rowToUser(rows[0]);
  },

publicProfile(user) {
    return require('../account-store').AccountStore.prototype.publicProfile.call(this, user);
  },

async leaderboard() {
    await this.ready;
    const rows = await this.sql`
      SELECT * FROM users
      ORDER BY COALESCE((stats->>'xp')::int, 0) DESC, username ASC
    `;
    return rows.map((row) => require('../account-store').AccountStore.prototype.publicLeaderboardProfile.call(this, this.rowToUser(row)));
  }
};
