const { neon, DATA_FILE, normalizeUsername } = require('./stores/shared');

class AccountStore {
constructor(file = DATA_FILE) {
    this.file = file;
    this.data = { users: [], sessions: {} };
    this.load();
  }
}
Object.assign(AccountStore.prototype, require('./stores/file-session'), require('./stores/file-profile'));

class PostgresAccountStore {
constructor(databaseUrl = process.env.DATABASE_URL) {
    if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgresAccountStore.');
    this.sql = neon(databaseUrl);
    this.ready = this.ensureSchema();
  }
}
Object.assign(PostgresAccountStore.prototype, require('./stores/postgres-session'), require('./stores/postgres-profile'));

function resolveDatabaseUrl(env = process.env) {
  return env.DATABASE_URL || env.SUPABASE_DATABASE_URL || env.POSTGRES_URL || '';
}

function createAccountStore() {
  const databaseUrl = resolveDatabaseUrl();
  return databaseUrl ? new PostgresAccountStore(databaseUrl) : new AccountStore();
}

module.exports = { AccountStore, PostgresAccountStore, createAccountStore, normalizeUsername, resolveDatabaseUrl };
