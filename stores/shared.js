const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const progression = require('../progression');

const DATA_DIR = path.join(__dirname, '..', 'data');
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

function safeSavedHatDrawings(drawings) {
  if (!Array.isArray(drawings)) return [];
  return drawings.slice(0, 5).map((item, index) => ({
    id: String(item && item.id || makeId()).slice(0, 32),
    name: String(item && item.name || `Hat ${index + 1}`).trim().slice(0, 24) || `Hat ${index + 1}`,
    savedAt: item && item.savedAt ? String(item.savedAt).slice(0, 40) : nowIso(),
    hatAnim: String(item && item.hatAnim || 'none').slice(0, 20),
    drawBrush: String(item && item.drawBrush || 'pen').slice(0, 20),
    drawSize: Math.max(1, Math.min(30, Number(item && item.drawSize) || 4)),
    drawColor: String(item && item.drawColor || '#ffffff').slice(0, 20),
    drawing: safeHatDrawing(item && item.drawing),
  }));
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

function normalizeCoins(coins) {
  const value = Number(coins);
  return Number.isFinite(value) ? value : 1;
}

function safeAchievements(achievements) {
  if (!Array.isArray(achievements)) return [];
  const seen = new Set();
  return achievements.map((achievement) => {
    const id = String(typeof achievement === 'string' ? achievement : achievement && achievement.id || '').trim().slice(0, 40);
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      unlockedAt: String(achievement && achievement.unlockedAt || '').slice(0, 40),
    };
  }).filter(Boolean);
}

function awardMatchAchievements(achievements, match) {
  const next = safeAchievements(achievements);
  if (match.won && match.scoreFor - match.scoreAgainst >= 3 && !next.some((achievement) => achievement.id === 'clean-win')) {
    next.push({ id: 'clean-win', unlockedAt: match.playedAt || nowIso() });
  }
  return next;
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
      trail: 'none',
    },
    achievements: [],
    recentMatches: [],
    coins: 1,
    inventory: [],
    savedHatDrawings: [],
    ranked: progression.defaultRanked(),
  };
}

module.exports = { crypto, fs, path, neon, progression, DATA_DIR, DATA_FILE, SESSION_TTL_MS, nowIso, makeId, normalizeUsername, publicName, hashPassword, safeHatDrawing, safeSavedHatDrawings, normalizeStats, normalizeCoins, safeAchievements, awardMatchAchievements, defaultUser };
