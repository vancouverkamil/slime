const shared = require('./shared');
const { crypto, fs, path, progression, DATA_DIR, SESSION_TTL_MS, nowIso, makeId, normalizeUsername, publicName, hashPassword, safeHatDrawing, safeSavedHatDrawings, normalizeStats, normalizeCoins, safeAchievements, awardMatchAchievements, defaultUser } = shared;

module.exports = {
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
  },

save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  },

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
  },

findByUsername(username) {
    const normalized = normalizeUsername(username);
    return this.data.users.find((user) => user.username === normalized) || null;
  },

findById(id) {
    return this.data.users.find((user) => user.id === id) || null;
  },

createSession(userId) {
    this.cleanupSessions();
    const token = crypto.randomBytes(32).toString('hex');
    this.data.sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
    this.save();
    return token;
  },

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
  },

deleteSession(token) {
    if (token && this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  },

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
};
