// Social storage for the JSON file store: friend links and direct messages.
// Pure storage (no rules); server/social/service.js decides what is allowed.
//   edge:    { from, to, status: 'pending' | 'friends' | 'blocked', createdAt }
//   message: { id, from, to, body, createdAt, readAt }
function social(store) {
  if (!Array.isArray(store.data.socialEdges)) store.data.socialEdges = [];
  if (!Array.isArray(store.data.directMessages)) store.data.directMessages = [];
  return store.data;
}

const MAX_MESSAGES_PER_PAIR = 200;

module.exports = {
async getEdge(fromId, toId) {
    const e = social(this).socialEdges.find((x) => x.from === fromId && x.to === toId);
    return e ? e.status : null;
  },

async setEdge(fromId, toId, status) {
    const edges = social(this).socialEdges;
    const e = edges.find((x) => x.from === fromId && x.to === toId);
    if (e) e.status = status;
    else edges.push({ from: fromId, to: toId, status, createdAt: new Date().toISOString() });
    this.save();
  },

async deleteEdge(fromId, toId) {
    const d = social(this);
    const before = d.socialEdges.length;
    d.socialEdges = d.socialEdges.filter((x) => !(x.from === fromId && x.to === toId));
    if (d.socialEdges.length !== before) this.save();
  },

async listEdges(userId) {
    return social(this).socialEdges.filter((x) => x.from === userId || x.to === userId).map((x) => ({ ...x }));
  },

async addMessage(msg) {
    const d = social(this);
    d.directMessages.push({ ...msg, readAt: null });
    const pair = d.directMessages.filter((m) => (m.from === msg.from && m.to === msg.to) || (m.from === msg.to && m.to === msg.from));
    if (pair.length > MAX_MESSAGES_PER_PAIR) {
      const drop = new Set(pair.slice(0, pair.length - MAX_MESSAGES_PER_PAIR).map((m) => m.id));
      d.directMessages = d.directMessages.filter((m) => !drop.has(m.id));
    }
    this.save();
  },

async listMessages(aId, bId, limit, beforeIso) {
    return social(this).directMessages
      .filter((m) => ((m.from === aId && m.to === bId) || (m.from === bId && m.to === aId)) && (!beforeIso || m.createdAt < beforeIso))
      .slice(-limit)
      .map((m) => ({ ...m }));
  },

async markMessagesRead(toId, fromId) {
    let changed = false;
    const now = new Date().toISOString();
    social(this).directMessages.forEach((m) => {
      if (m.to === toId && m.from === fromId && !m.readAt) { m.readAt = now; changed = true; }
    });
    if (changed) this.save();
  },

async unreadCounts(userId) {
    const counts = {};
    social(this).directMessages.forEach((m) => { if (m.to === userId && !m.readAt) counts[m.from] = (counts[m.from] || 0) + 1; });
    return counts;
  },

async usersByIds(ids) {
    const wanted = new Set(ids);
    return this.data.users.filter((u) => wanted.has(u.id));
  },
};
