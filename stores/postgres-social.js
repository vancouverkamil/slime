// Social storage for Postgres: friend links and direct messages.
// Pure storage (no rules); server/social/service.js decides what is allowed.
const MAX_MESSAGES_PER_PAIR = 200;

function iso(v) { return v instanceof Date ? v.toISOString() : v; }
function rowToMessage(r) {
  return { id: r.id, from: r.from_id, to: r.to_id, body: r.body, createdAt: iso(r.created_at), readAt: r.read_at ? iso(r.read_at) : null };
}

module.exports = {
async ensureSocialSchema() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS social_edges (
        from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (from_id, to_id)
      )
    `;
    await this.sql`CREATE INDEX IF NOT EXISTS social_edges_to_idx ON social_edges (to_id)`;
    await this.sql`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        read_at TIMESTAMPTZ
      )
    `;
    await this.sql`CREATE INDEX IF NOT EXISTS direct_messages_pair_idx ON direct_messages (from_id, to_id, created_at DESC)`;
    await this.sql`CREATE INDEX IF NOT EXISTS direct_messages_unread_idx ON direct_messages (to_id) WHERE read_at IS NULL`;
  },

async getEdge(fromId, toId) {
    await this.ready;
    const rows = await this.sql`SELECT status FROM social_edges WHERE from_id = ${fromId} AND to_id = ${toId}`;
    return rows[0] ? rows[0].status : null;
  },

async setEdge(fromId, toId, status) {
    await this.ready;
    await this.sql`
      INSERT INTO social_edges (from_id, to_id, status) VALUES (${fromId}, ${toId}, ${status})
      ON CONFLICT (from_id, to_id) DO UPDATE SET status = EXCLUDED.status
    `;
  },

async deleteEdge(fromId, toId) {
    await this.ready;
    await this.sql`DELETE FROM social_edges WHERE from_id = ${fromId} AND to_id = ${toId}`;
  },

async listEdges(userId) {
    await this.ready;
    const rows = await this.sql`SELECT from_id, to_id, status, created_at FROM social_edges WHERE from_id = ${userId} OR to_id = ${userId}`;
    return rows.map((r) => ({ from: r.from_id, to: r.to_id, status: r.status, createdAt: iso(r.created_at) }));
  },

async addMessage(msg) {
    await this.ready;
    await this.sql`
      INSERT INTO direct_messages (id, from_id, to_id, body, created_at)
      VALUES (${msg.id}, ${msg.from}, ${msg.to}, ${msg.body}, ${msg.createdAt})
    `;
    // Keep each conversation to its most recent messages.
    await this.sql`
      DELETE FROM direct_messages WHERE id IN (
        SELECT id FROM direct_messages
        WHERE (from_id = ${msg.from} AND to_id = ${msg.to}) OR (from_id = ${msg.to} AND to_id = ${msg.from})
        ORDER BY created_at DESC OFFSET ${MAX_MESSAGES_PER_PAIR}
      )
    `;
  },

async listMessages(aId, bId, limit, beforeIso) {
    await this.ready;
    const before = beforeIso || '9999-12-31T00:00:00Z';
    const rows = await this.sql`
      SELECT * FROM direct_messages
      WHERE ((from_id = ${aId} AND to_id = ${bId}) OR (from_id = ${bId} AND to_id = ${aId})) AND created_at < ${before}
      ORDER BY created_at DESC LIMIT ${limit}
    `;
    return rows.reverse().map(rowToMessage);
  },

async markMessagesRead(toId, fromId) {
    await this.ready;
    await this.sql`UPDATE direct_messages SET read_at = now() WHERE to_id = ${toId} AND from_id = ${fromId} AND read_at IS NULL`;
  },

async unreadCounts(userId) {
    await this.ready;
    const rows = await this.sql`SELECT from_id, count(*)::int AS n FROM direct_messages WHERE to_id = ${userId} AND read_at IS NULL GROUP BY from_id`;
    const counts = {};
    rows.forEach((r) => { counts[r.from_id] = r.n; });
    return counts;
  },

async usersByIds(ids) {
    await this.ready;
    if (!ids.length) return [];
    const rows = await this.sql`SELECT * FROM users WHERE id = ANY(${ids})`;
    return rows.map((r) => this.rowToUser(r));
  },
};
