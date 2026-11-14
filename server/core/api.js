const { createRateLimiter, clientIp } = require('./rate-limit');

// Brute-force protection: failed logins per address+username, and sign-ups per address.
const loginFailures = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });
const signups = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 });
const isLoopback = (ip) => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

module.exports = function install(ctx) {
  const { app, accounts, normalizeUsername } = ctx;
function parseCookies(header) {
  const cookies = {};
  String(header || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    try { cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim()); }
    catch (_) { /* malformed cookie value: ignore it */ }
  });
  return cookies;
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const extraOrigins = String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === 'slime-7wuo.onrender.com' ||
      url.hostname === 'slime.vercel.app' ||
      url.hostname === 'slime-nu.vercel.app' ||
      url.hostname === 'slime-kamils-projects-2416babd.vercel.app' ||
      (url.hostname.startsWith('slime-') && url.hostname.endsWith('-kamils-projects-2416babd.vercel.app')) ||
      extraOrigins.includes(origin)
    );
  } catch (_) {
    return false;
  }
}

function isCrossSiteRequest(req) {
  if (!req.headers.origin) return false;
  try {
    return new URL(req.headers.origin).host !== req.headers.host;
  } catch (_) {
    return false;
  }
}

function sessionCookie(token, req) {
  const crossSite = isCrossSiteRequest(req);
  const sameSite = crossSite ? 'None' : 'Lax';
  const secure = crossSite ? '; Secure' : '';
  return `slime_session=${encodeURIComponent(token)}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}

function clearSessionCookie(req) {
  const crossSite = isCrossSiteRequest(req);
  const sameSite = crossSite ? 'None' : 'Lax';
  const secure = crossSite ? '; Secure' : '';
  return `slime_session=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`;
}

// Cookie-only auth for a request that changes something is accepted only from our
// own site. Another website can make a browser send the cookie (cross-site request
// forgery), but it can't read the session token our client puts in the body or URL.
function cookieAuthAllowed(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  const origin = req.headers.origin;
  return !origin || isAllowedOrigin(origin) || !isCrossSiteRequest(req);
}

async function getReqUser(req) {
  const explicit = getExplicitToken(req);
  if (explicit) return await accounts.getUserBySession(explicit);
  if (!cookieAuthAllowed(req)) return null;
  return await accounts.getUserBySession(parseCookies(req.headers.cookie).slime_session);
}

// A token the client sent on purpose (header, URL or body), as opposed to the cookie.
function getExplicitToken(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  if (req.query && req.query.session) return String(req.query.session);
  if (req.body && req.body._session) return String(req.body._session);
  return '';
}

function getReqToken(req) {
  return getExplicitToken(req) || parseCookies(req.headers.cookie).slime_session;
}

function sendUser(res, user) {
  res.json({ user: accounts.publicProfile(user) });
}

app.get('/api/me', async (req, res) => {
  sendUser(res, await getReqUser(req));
});

app.post('/api/auth/register', async (req, res) => {
  const ip = clientIp(req);
  if (!isLoopback(ip) && !signups.allow(ip)) { res.status(429).json({ error: 'Too many new accounts from here. Try again later.' }); return; }
  try {
    const user = await accounts.register(req.body.username, req.body.password);
    const token = await accounts.createSession(user.id);
    res.setHeader('Set-Cookie', sessionCookie(token, req));
    res.json({ user: accounts.publicProfile(user), token });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const ip = clientIp(req), key = ip + '|' + normalizeUsername(req.body.username);
    if (!isLoopback(ip) && loginFailures.isBlocked(key)) {
      res.status(429).json({ error: 'Too many failed logins. Try again in a few minutes.' });
      return;
    }
    const user = await accounts.login(req.body.username, req.body.password);
    if (!user) {
      loginFailures.hit(key); // only failures count toward the lockout
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const token = await accounts.createSession(user.id);
    res.setHeader('Set-Cookie', sessionCookie(token, req));
    res.json({ user: accounts.publicProfile(user), token });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = getReqToken(req);
  await accounts.deleteSession(token);
  res.setHeader('Set-Cookie', clearSessionCookie(req));
  res.json({ ok: true });
});

app.get('/api/profiles/:username', async (req, res) => {
  const user = await accounts.findByUsername(normalizeUsername(req.params.username));
  if (!user) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  res.json({ user: accounts.publicProfile(user) });
});

app.get('/api/leaderboard', async (_req, res) => {
  const players = typeof accounts.leaderboard === 'function' ? await accounts.leaderboard() : [];
  res.json({ players });
});

app.post('/api/me/slime', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) {
    res.status(401).json({ error: 'Login required.' });
    return;
  }
  const updated = await accounts.updateSlime(user.id, req.body || {});
  sendUser(res, updated);
});

const SHOP_ITEMS = {
  devil:      { price: 400,  name: 'Devil Horns' },
  prismatic:  { price: 600,  name: 'Prismatic Crown' },
  dragonfire: { price: 800,  name: 'Dragon Horns' },
  cosmic:     { price: 1200, name: 'Cosmic Crown' },
  angelic:    { price: 1500, name: 'Triple Halo' },
  overlord:   { price: 2500, name: 'Overlord Crown' },
};

app.post('/api/me/buy', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) { res.status(401).json({ error: 'Login required.' }); return; }
  const hatId = String(req.body.hat || '');
  const item = SHOP_ITEMS[hatId];
  if (!item) { res.status(400).json({ error: 'Unknown item.' }); return; }
  try {
    const updated = await accounts.purchaseItem(user.id, hatId, item.price);
    sendUser(res, updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Purchase failed.' });
  }
});

app.post('/api/me/hat-drawings', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) { res.status(401).json({ error: 'Login required.' }); return; }
  try {
    const updated = await accounts.saveHatPreset(user.id, req.body || {});
    sendUser(res, updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not save hat drawing.' });
  }
});

app.delete('/api/me/hat-drawings/:id', async (req, res) => {
  const user = await getReqUser(req);
  if (!user) { res.status(401).json({ error: 'Login required.' }); return; }
  const updated = await accounts.deleteHatPreset(user.id, String(req.params.id || '').slice(0, 32));
  sendUser(res, updated);
});

  Object.assign(ctx, { parseCookies, getReqToken, getReqUser });
};
