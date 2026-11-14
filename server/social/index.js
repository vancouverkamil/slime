// Social component: friends and private messages over REST, with live pushes
// ('dm', 'social_update') to the player's open lobby sockets. Accounts only;
// the rules live in ./service.js.
const { createSocialService, SocialError } = require('./service');
const { createRateLimiter } = require('../core/rate-limit');

module.exports = function install(ctx) {
  const { app, accounts, allClients, send, getReqUser, normalizeUsername } = ctx;

  const isOnline = (userId) => { for (const info of allClients.values()) if (info.userId === userId) return true; return false; };
  // The room of a friend's live 1v1 (so the friends list can offer WATCH), or null.
  const watchRoomOf = (userId) => {
    for (const info of allClients.values()) if (info.userId === userId && ctx.liveMatchRoom(info) !== null) return ctx.liveMatchRoom(info);
    return null;
  };
  const notify = (userId, msg) => { allClients.forEach((info, ws) => { if (info.userId === userId) send(ws, msg); }); };
  const service = createSocialService({ accounts, isOnline, watchRoomOf, notify, normalizeUsername });

  const messageLimit = createRateLimiter({ limit: 8, windowMs: 10 * 1000 });
  const actionLimit = createRateLimiter({ limit: 30, windowMs: 60 * 1000 });

  // Wraps a route: signed-in players only, rate limited, rule errors become 400s.
  function route(limiter, fn) {
    return async (req, res) => {
      try {
        const me = await getReqUser(req);
        if (!me) { res.status(401).json({ error: 'Log in to use friends and messages.' }); return; }
        if (limiter && !limiter.allow(me.id)) { res.status(429).json({ error: 'Slow down a little.' }); return; }
        res.json(await fn(me, req));
      } catch (err) {
        if (err instanceof SocialError) { res.status(400).json({ error: err.message }); return; }
        console.error('[social] request failed', { path: req.path }, err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
      }
    };
  }
  const body = (req) => req.body || {};

  app.get('/api/social', route(null, (me) => service.overview(me)));
  ['request', 'accept', 'decline', 'remove', 'block', 'unblock'].forEach((action) => {
    app.post('/api/social/' + action, route(actionLimit, (me, req) => service[action](me, body(req).username)));
  });
  app.get('/api/social/messages/:username', route(null, (me, req) =>
    service.conversation(me, req.params.username, typeof req.query.before === 'string' ? req.query.before : null)));
  app.post('/api/social/messages', route(messageLimit, (me, req) => service.sendMessage(me, body(req).to, body(req).body)));

  Object.assign(ctx, { socialService: service });
};
