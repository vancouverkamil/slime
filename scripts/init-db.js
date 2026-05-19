const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { loadLocalEnv } = require('../local-env');

async function main() {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Provision Neon and run `vercel env pull .env.local --yes` first.');
  }
  const sql = neon(process.env.DATABASE_URL);
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
