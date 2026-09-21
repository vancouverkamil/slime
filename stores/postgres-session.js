const shared = require('./shared');
const { crypto, fs, path, progression, DATA_DIR, SESSION_TTL_MS, nowIso, makeId, normalizeUsername, publicName, hashPassword, safeHatDrawing, safeSavedHatDrawings, normalizeStats, normalizeCoins, safeAchievements, awardMatchAchievements, defaultUser } = shared;

module.exports = {
async ensureSchema() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        stats JSONB NOT NULL DEFAULT '{"matches":0,"wins":0,"losses":0,"pointsFor":0,"pointsAgainst":0,"xp":0}'::jsonb,
        slime JSONB NOT NULL DEFAULT '{"color":"#00ff00","hat":"none","hatAnim":"none","hatDrawing":[],"trail":"none"}'::jsonb,
        achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
        recent_matches JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `;
    await this.sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 1`;
    await this.sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS inventory JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await this.sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_hat_drawings JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await this.sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ranked JSONB NOT NULL DEFAULT '{"season":1,"rating":1000,"peakRating":1000,"placementsLeft":5,"wins":0,"losses":0}'::jsonb`;
    await this.sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      )
    `;
  },

rowToUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      passwordSalt: row.password_salt,
      passwordHash: row.password_hash,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
      stats: normalizeStats(row.stats),
      slime: row.slime,
      achievements: safeAchievements(row.achievements),
      recentMatches: row.recent_matches,
      coins: typeof row.coins === 'number' ? row.coins : 1,
      inventory: Array.isArray(row.inventory) ? row.inventory : [],
      savedHatDrawings: safeSavedHatDrawings(row.saved_hat_drawings),
      ranked: row.ranked && typeof row.ranked === 'object' ? row.ranked : progression.defaultRanked(),
    };
  },

async cleanupSessions() {
    await this.ready;
    await this.sql`DELETE FROM sessions WHERE expires_at <= ${Date.now()}`;
  },

async findByUsername(username) {
    await this.ready;
    const normalized = normalizeUsername(username);
    const rows = await this.sql`SELECT * FROM users WHERE username = ${normalized} LIMIT 1`;
    return this.rowToUser(rows[0]);
  },

async findById(id) {
    await this.ready;
    const rows = await this.sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return this.rowToUser(rows[0]);
  },

async createSession(userId) {
    await this.cleanupSessions();
    const token = crypto.randomBytes(32).toString('hex');
    await this.sql`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (${token}, ${userId}, ${Date.now() + SESSION_TTL_MS})
    `;
    return token;
  },

async getUserBySession(token) {
    await this.ready;
    if (!token) return null;
    const rows = await this.sql`
      SELECT u.* FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > ${Date.now()}
      LIMIT 1
    `;
    if (rows[0]) return this.rowToUser(rows[0]);
    await this.sql`DELETE FROM sessions WHERE token = ${token}`;
    return null;
  },

async deleteSession(token) {
    await this.ready;
    if (token) await this.sql`DELETE FROM sessions WHERE token = ${token}`;
  }
};
