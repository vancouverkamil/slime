// Social rules: friends, requests, blocking and direct messages.
// Storage (file or Postgres) only saves edges and messages; everything that is
// allowed or refused is decided here, in one place.
//   A→B 'pending'  A asked B to be friends
//   A↔B 'friends'  both edges, written together
//   A→B 'blocked'  A blocked B: B can't request or message A
const crypto = require('crypto');

const MAX_FRIENDS = 200;
const MAX_MESSAGE_LENGTH = 500;
const PAGE_SIZE = 50;

class SocialError extends Error {}

function createSocialService({ accounts, isOnline, notify, normalizeUsername }) {
  const fail = (msg) => { throw new SocialError(msg); };

  async function target(me, username) {
    const other = await accounts.findByUsername(normalizeUsername(username));
    if (!other) fail('No player with that username.');
    if (other.id === me.id) fail("That's you!");
    return other;
  }
  const summary = (u) => ({ username: u.username, displayName: u.displayName });
  const areFriends = async (a, b) => (await accounts.getEdge(a, b)) === 'friends' && (await accounts.getEdge(b, a)) === 'friends';
  const blockedEitherWay = async (a, b) => (await accounts.getEdge(a, b)) === 'blocked' || (await accounts.getEdge(b, a)) === 'blocked';
  const changed = (...ids) => ids.forEach((id) => notify(id, { type: 'social_update' }));

  async function overview(me) {
    const edges = await accounts.listEdges(me.id);
    const out = {}, inn = {};
    edges.forEach((e) => { if (e.from === me.id) out[e.to] = e.status; else inn[e.from] = e.status; });
    const ids = [...new Set(Object.keys(out).concat(Object.keys(inn)))];
    const users = new Map((await accounts.usersByIds(ids)).map((u) => [u.id, u]));
    const unread = await accounts.unreadCounts(me.id);
    const result = { friends: [], incoming: [], outgoing: [], blocked: [], unreadTotal: 0 };
    ids.forEach((id) => {
      const u = users.get(id);
      if (!u) return;
      if (out[id] === 'blocked') result.blocked.push(summary(u));
      else if (out[id] === 'friends' && inn[id] === 'friends') result.friends.push({ ...summary(u), online: isOnline(id), unread: unread[id] || 0 });
      else if (inn[id] === 'pending' && out[id] !== 'blocked') result.incoming.push(summary(u));
      else if (out[id] === 'pending') result.outgoing.push(summary(u));
    });
    result.friends.sort((a, b) => (b.unread - a.unread) || (b.online - a.online) || a.username.localeCompare(b.username));
    result.unreadTotal = result.friends.reduce((n, f) => n + f.unread, 0);
    return result;
  }

  async function request(me, username) {
    const other = await target(me, username);
    if (await blockedEitherWay(me.id, other.id)) fail("You can't add this player.");
    if (await areFriends(me.id, other.id)) fail('You are already friends.');
    const friendCount = (await accounts.listEdges(me.id)).filter((e) => e.from === me.id && e.status === 'friends').length;
    if (friendCount >= MAX_FRIENDS) fail('Your friends list is full.');
    // They already asked you: asking back accepts.
    if ((await accounts.getEdge(other.id, me.id)) === 'pending') return accept(me, username);
    await accounts.setEdge(me.id, other.id, 'pending');
    changed(me.id, other.id);
    return { status: 'requested' };
  }

  async function accept(me, username) {
    const other = await target(me, username);
    if ((await accounts.getEdge(other.id, me.id)) !== 'pending') fail('No friend request from this player.');
    await accounts.setEdge(other.id, me.id, 'friends');
    await accounts.setEdge(me.id, other.id, 'friends');
    changed(me.id, other.id);
    return { status: 'friends' };
  }

  // Declines their request and/or cancels yours.
  async function decline(me, username) {
    const other = await target(me, username);
    if ((await accounts.getEdge(other.id, me.id)) === 'pending') await accounts.deleteEdge(other.id, me.id);
    if ((await accounts.getEdge(me.id, other.id)) === 'pending') await accounts.deleteEdge(me.id, other.id);
    changed(me.id, other.id);
    return { status: 'none' };
  }

  async function remove(me, username) {
    const other = await target(me, username);
    if ((await accounts.getEdge(me.id, other.id)) === 'friends') await accounts.deleteEdge(me.id, other.id);
    if ((await accounts.getEdge(other.id, me.id)) === 'friends') await accounts.deleteEdge(other.id, me.id);
    changed(me.id, other.id);
    return { status: 'none' };
  }

  async function block(me, username) {
    const other = await target(me, username);
    await accounts.setEdge(me.id, other.id, 'blocked');
    if ((await accounts.getEdge(other.id, me.id)) !== 'blocked') await accounts.deleteEdge(other.id, me.id);
    changed(me.id, other.id);
    return { status: 'blocked' };
  }

  async function unblock(me, username) {
    const other = await target(me, username);
    if ((await accounts.getEdge(me.id, other.id)) === 'blocked') await accounts.deleteEdge(me.id, other.id);
    changed(me.id);
    return { status: 'none' };
  }

  async function sendMessage(me, username, body) {
    const text = String(body || '').replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) fail('Type a message first.');
    const other = await target(me, username);
    if (!(await areFriends(me.id, other.id))) fail('You can only message friends.');
    const message = { id: crypto.randomBytes(10).toString('hex'), from: me.id, to: other.id, body: text, createdAt: new Date().toISOString() };
    await accounts.addMessage(message);
    const wire = { id: message.id, from: me.username, to: other.username, body: text, createdAt: message.createdAt, fromName: me.displayName };
    notify(other.id, { type: 'dm', message: wire });
    notify(me.id, { type: 'dm', message: wire }); // your other tabs
    return { message: wire };
  }

  // Reading a conversation marks it read.
  async function conversation(me, username, beforeIso) {
    const other = await target(me, username);
    const rows = await accounts.listMessages(me.id, other.id, PAGE_SIZE, beforeIso || null);
    await accounts.markMessagesRead(me.id, other.id);
    const names = { [me.id]: me.username, [other.id]: other.username };
    return {
      with: summary(other),
      friends: await areFriends(me.id, other.id),
      messages: rows.map((m) => ({ id: m.id, from: names[m.from], to: names[m.to], body: m.body, createdAt: m.createdAt })),
      hasMore: rows.length === PAGE_SIZE,
    };
  }

  return { overview, request, accept, decline, remove, block, unblock, sendMessage, conversation, SocialError };
}

module.exports = { createSocialService, SocialError, MAX_MESSAGE_LENGTH };
