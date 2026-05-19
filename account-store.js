const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const progression = require('./progression');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'accounts.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return crypto.randomBytes(12).toString('hex');
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
}

function publicName(username) {
  return username ? username.charAt(0).toUpperCase() + username.slice(1) : 'Player';
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
}

function safeHatDrawing(drawing) {
  return Array.isArray(drawing) ? drawing.slice(0, 300) : [];
}

function normalizeStats(stats) {
  stats = stats || {};
  return {
    matches: Number(stats.matches) || 0,
    wins: Number(stats.wins) || 0,
    losses: Number(stats.losses) || 0,
    pointsFor: Number(stats.pointsFor) || 0,
    pointsAgainst: Number(stats.pointsAgainst) || 0,
    xp: Number(stats.xp) || 0,
  };
}

function defaultUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const createdAt = nowIso();
  return {
    id: makeId(),
    username,
    displayName: publicName(username),
    passwordSalt: salt,
    passwordHash: hashPassword(password, salt),
    createdAt,
    updatedAt: createdAt,
    stats: {
      matches: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      xp: 0,
    },
    slime: {
      color: '#00ff00',
      hat: 'none',
      hatAnim: 'none',
      hatDrawing: [],
    },
    achievements: [],
    recentMatches: [],
    coins: 1,
    inventory: [],
  };
}

class AccountStore {
  constructor(file = DATA_FILE) {
    this.file = file;
    this.data = { users: [], sessions: {} };
    this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (!fs.existsSync(this.file)) {
      this.save();
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data.users = Array.isArray(parsed.users) ? parsed.users : [];
      this.data.sessions = parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {};
    } catch (_) {
      this.data = { users: [], sessions: {} };
      this.save();
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  cleanupSessions() {
    const now = Date.now();
    let changed = false;
    Object.keys(this.data.sessions).forEach((token) => {
      if (!this.data.sessions[token] || this.data.sessions[token].expiresAt <= now) {
        delete this.data.sessions[token];
        changed = true;
      }
    });
    if (changed) this.save();
  }

  findByUsername(username) {
    const normalized = normalizeUsername(username);
    return this.data.users.find((user) => user.username === normalized) || null;
  }

  findById(id) {
    return this.data.users.find((user) => user.id === id) || null;
  }

  createSession(userId) {
    this.cleanupSessions();
    const token = crypto.randomBytes(32).toString('hex');
    this.data.sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
    this.save();
    return token;
  }

  getUserBySession(token) {
    if (!token) return null;
    const session = this.data.sessions[token];
    if (!session || session.expiresAt <= Date.now()) {
      if (session) {
        delete this.data.sessions[token];
        this.save();
      }
      return null;
    }
    return this.findById(session.userId);
  }

  deleteSession(token) {
    if (token && this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  register(username, password) {
    const normalized = normalizeUsername(username);
    if (normalized.length < 3) throw new Error('Username must be at least 3 letters.');
    if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters.');
    if (this.findByUsername(normalized)) throw new Error('That username is already taken.');
    const user = defaultUser(normalized, password);
    this.data.users.push(user);
    this.save();
    return user;
  }

  login(username, password) {
    const user = this.findByUsername(username);
    if (!user) return null;
    const attempted = hashPassword(password, user.passwordSalt);
    const ok = crypto.timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    return ok ? user : null;
  }

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
    };
    user.updatedAt = nowIso();
    this.save();
    return user;
  }

  recordMatch(leftUserId, rightUserId, winnerSide, scoreLeft, scoreRight) {
    const left = leftUserId ? this.findById(leftUserId) : null;
    const right = rightUserId ? this.findById(rightUserId) : null;
    if (!left && !right) return;
    const matchId = makeId();
    const playedAt = nowIso();

    const apply = (user, side, opponent, scoreFor, scoreAgainst) => {
      if (!user) return;
      const won = winnerSide === side;
      user.stats = normalizeStats(user.stats);
      const xpGained = progression.getMatchXp({ won, scoreFor, scoreAgainst });
      user.stats.matches++;
      if (won) user.stats.wins++;
      else user.stats.losses++;
      user.stats.pointsFor += scoreFor;
      user.stats.pointsAgainst += scoreAgainst;
      user.stats.xp += xpGained;
      user.recentMatches.unshift({
        id: matchId,
        playedAt,
        result: won ? 'win' : 'loss',
        scoreFor,
        scoreAgainst,
        xpGained,
        opponent: opponent ? opponent.username : 'guest',
      });
      user.recentMatches = user.recentMatches.slice(0, 10);
      user.updatedAt = playedAt;
    };

    apply(left, 'left', right, scoreLeft, scoreRight);
    apply(right, 'right', left, scoreRight, scoreLeft);
    this.save();
  }

  purchaseItem(userId, hatId, price) {
    const user = this.findById(userId);
    if (!user) return null;
    const coins = user.coins || 1;
    if (coins < price) throw new Error('Not enough SC.');
    const inv = user.inventory || [];
    if (inv.includes(hatId)) throw new Error('Already owned.');
    user.coins = coins - price;
    user.inventory = inv.concat([hatId]);
    user.updatedAt = nowIso();
    this.save();
    return user;
  }

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
      achievements: user.achievements || [],
      recentMatches: user.recentMatches || [],
      coins: user.coins || 1,
      inventory: user.inventory || [],
    };
  }

  publicLeaderboardProfile(user) {
    if (!user) return null;
    const stats = normalizeStats(user.stats);
    return {
      username: user.username,
      displayName: user.displayName,
      stats,
      progression: progression.getProgression(stats.xp),
    };
  }

  leaderboard() {
    return this.data.users
      .map((user) => this.publicLeaderboardProfile(user))
      .sort((a, b) => {
        const xpDiff = ((b.stats || {}).xp || 0) - ((a.stats || {}).xp || 0);
        if (xpDiff) return xpDiff;
        return String(a.username).localeCompare(String(b.username));
      });
  }
}

class PostgresAccountStore {
  constructor(databaseUrl = process.env.DATABASE_URL) {
    if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgresAccountStore.');
    this.sql = neon(databaseUrl);
    this.ready = this.ensureSchema();
  }

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
        slime JSONB NOT NULL DEFAULT '{"color":"#00ff00","hat":"none","hatAnim":"none","hatDrawing":[]}'::jsonb,
        achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
        recent_matches JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `;
    await this.sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 1`;
    await this.sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS inventory JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await this.sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      )
    `;
  }

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
      achievements: row.achievements,
      recentMatches: row.recent_matches,
      coins: typeof row.coins === 'number' ? row.coins : 1,
      inventory: Array.isArray(row.inventory) ? row.inventory : [],
    };
  }

  async cleanupSessions() {
    await this.ready;
    await this.sql`DELETE FROM sessions WHERE expires_at <= ${Date.now()}`;
  }

  async findByUsername(username) {
    await this.ready;
    const normalized = normalizeUsername(username);
    const rows = await this.sql`SELECT * FROM users WHERE username = ${normalized} LIMIT 1`;
    return this.rowToUser(rows[0]);
  }

  async findById(id) {
    await this.ready;
    const rows = await this.sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return this.rowToUser(rows[0]);
  }

  async createSession(userId) {
    await this.cleanupSessions();
    const token = crypto.randomBytes(32).toString('hex');
    await this.sql`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (${token}, ${userId}, ${Date.now() + SESSION_TTL_MS})
    `;
    return token;
  }

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
  }

  async deleteSession(token) {
    await this.ready;
    if (token) await this.sql`DELETE FROM sessions WHERE token = ${token}`;
  }

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
      )
      VALUES (
        ${user.id}, ${user.username}, ${user.displayName}, ${user.passwordSalt}, ${user.passwordHash},
        ${user.createdAt}, ${user.updatedAt}, ${JSON.stringify(user.stats)}::jsonb,
        ${JSON.stringify(user.slime)}::jsonb, ${JSON.stringify(user.achievements)}::jsonb,
        ${JSON.stringify(user.recentMatches)}::jsonb,
        ${user.coins}, ${JSON.stringify(user.inventory)}::jsonb
      )
    `;
    return user;
  }

  async login(username, password) {
    const user = await this.findByUsername(username);
    if (!user) return null;
    const attempted = hashPassword(password, user.passwordSalt);
    const ok = crypto.timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    return ok ? user : null;
  }

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
    };
    const rows = await this.sql`
      UPDATE users
      SET slime = ${JSON.stringify(nextSlime)}::jsonb, updated_at = now()
      WHERE id = ${userId}
      RETURNING *
    `;
    return this.rowToUser(rows[0]);
  }

  async recordMatch(leftUserId, rightUserId, winnerSide, scoreLeft, scoreRight) {
    await this.ready;
    const left = leftUserId ? await this.findById(leftUserId) : null;
    const right = rightUserId ? await this.findById(rightUserId) : null;
    if (!left && !right) return;
    const matchId = makeId();
    const playedAt = nowIso();

    const apply = async (user, side, opponent, scoreFor, scoreAgainst) => {
      if (!user) return;
      const won = winnerSide === side;
      const xpGained = progression.getMatchXp({ won, scoreFor, scoreAgainst });
      const stats = {
        matches: (user.stats.matches || 0) + 1,
        wins: (user.stats.wins || 0) + (won ? 1 : 0),
        losses: (user.stats.losses || 0) + (won ? 0 : 1),
        pointsFor: (user.stats.pointsFor || 0) + scoreFor,
        pointsAgainst: (user.stats.pointsAgainst || 0) + scoreAgainst,
        xp: (user.stats.xp || 0) + xpGained,
      };
      const recentMatches = [{
        id: matchId,
        playedAt,
        result: won ? 'win' : 'loss',
        scoreFor,
        scoreAgainst,
        xpGained,
        opponent: opponent ? opponent.username : 'guest',
      }].concat(user.recentMatches || []).slice(0, 10);
      await this.sql`
        UPDATE users
        SET stats = ${JSON.stringify(stats)}::jsonb,
            recent_matches = ${JSON.stringify(recentMatches)}::jsonb,
            updated_at = now()
        WHERE id = ${user.id}
      `;
    };

    await apply(left, 'left', right, scoreLeft, scoreRight);
    await apply(right, 'right', left, scoreRight, scoreLeft);
  }

  async purchaseItem(userId, hatId, price) {
    await this.ready;
    const user = await this.findById(userId);
    if (!user) return null;
    if ((user.coins || 1) < price) throw new Error('Not enough SC.');
    if ((user.inventory || []).includes(hatId)) throw new Error('Already owned.');
    const rows = await this.sql`
      UPDATE users
      SET coins = coins - ${price},
          inventory = inventory || ${JSON.stringify([hatId])}::jsonb,
          updated_at = now()
      WHERE id = ${userId}
      RETURNING *
    `;
    return this.rowToUser(rows[0]);
  }

  publicProfile(user) {
    return AccountStore.prototype.publicProfile.call(this, user);
  }

  async leaderboard() {
    await this.ready;
    const rows = await this.sql`
      SELECT * FROM users
      ORDER BY COALESCE((stats->>'xp')::int, 0) DESC, username ASC
    `;
    return rows.map((row) => AccountStore.prototype.publicLeaderboardProfile.call(this, this.rowToUser(row)));
  }
}

function createAccountStore() {
  return process.env.DATABASE_URL ? new PostgresAccountStore(process.env.DATABASE_URL) : new AccountStore();
}

module.exports = { AccountStore, PostgresAccountStore, createAccountStore, normalizeUsername };
