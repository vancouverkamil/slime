// Fixed-window rate limiter kept in memory (one server process).
// isBlocked(key) is true once `limit` hits happened for that key within `windowMs`.
function createRateLimiter({ limit, windowMs }) {
  const hits = new Map(); // key -> { count, resetAt }
  function live(key, now) {
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    const entry = hits.get(key);
    return entry && entry.resetAt > now ? entry : null;
  }
  const limiter = {
    isBlocked(key) { const e = live(key, Date.now()); return !!e && e.count >= limit; },
    hit(key) {
      const now = Date.now();
      const e = live(key, now);
      if (e) e.count++; else hits.set(key, { count: 1, resetAt: now + windowMs });
    },
    // Check and count in one step.
    allow(key) { if (limiter.isBlocked(key)) return false; limiter.hit(key); return true; },
  };
  return limiter;
}

// The caller's address; behind Railway/Vercel the first X-Forwarded-For entry is the client.
function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = { createRateLimiter, clientIp };
