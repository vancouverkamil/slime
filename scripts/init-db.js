const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { loadLocalEnv } = require('../local-env');
const { resolveDatabaseUrl } = require('../account-store');

async function main() {
  loadLocalEnv();
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('Database URL is missing. Set DATABASE_URL, SUPABASE_DATABASE_URL, or POSTGRES_URL first.');
  }
  const sql = neon(databaseUrl);
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const statements = schema.split(';').map((stmt) => stmt.trim()).filter(Boolean);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Applied ${statements.length} database statements.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
