const { neon } = require('@neondatabase/serverless');
const { loadLocalEnv } = require('../local-env');
const { resolveDatabaseUrl } = require('../account-store');

function requireUrl(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  loadLocalEnv();
  const sourceUrl = requireUrl('SOURCE_DATABASE_URL', process.env.SOURCE_DATABASE_URL || resolveDatabaseUrl());
  const targetUrl = requireUrl('TARGET_DATABASE_URL', process.env.TARGET_DATABASE_URL);
  if (sourceUrl === targetUrl) throw new Error('SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different.');

  const source = neon(sourceUrl);
  const target = neon(targetUrl);

  const users = await source`
    SELECT id, username, display_name, password_salt, password_hash,
           created_at, updated_at, stats, slime, achievements, recent_matches,
           coins, inventory, saved_hat_drawings
    FROM users
    ORDER BY created_at ASC
  `;
  const sessions = await source`
    SELECT token, user_id, expires_at
    FROM sessions
    WHERE expires_at > ${Date.now()}
  `;

  for (const user of users) {
    await target`
      INSERT INTO users (
        id, username, display_name, password_salt, password_hash,
        created_at, updated_at, stats, slime, achievements, recent_matches,
        coins, inventory, saved_hat_drawings
      )
      VALUES (
        ${user.id}, ${user.username}, ${user.display_name}, ${user.password_salt}, ${user.password_hash},
        ${user.created_at}, ${user.updated_at}, ${JSON.stringify(user.stats)}::jsonb,
        ${JSON.stringify(user.slime)}::jsonb, ${JSON.stringify(user.achievements)}::jsonb,
        ${JSON.stringify(user.recent_matches)}::jsonb, ${Number(user.coins) || 1},
        ${JSON.stringify(user.inventory || [])}::jsonb,
        ${JSON.stringify(user.saved_hat_drawings || [])}::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        password_salt = EXCLUDED.password_salt,
        password_hash = EXCLUDED.password_hash,
        updated_at = EXCLUDED.updated_at,
        stats = EXCLUDED.stats,
        slime = EXCLUDED.slime,
        achievements = EXCLUDED.achievements,
        recent_matches = EXCLUDED.recent_matches,
        coins = EXCLUDED.coins,
        inventory = EXCLUDED.inventory,
        saved_hat_drawings = EXCLUDED.saved_hat_drawings
    `;
  }

  for (const session of sessions) {
    await target`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (${session.token}, ${session.user_id}, ${session.expires_at})
      ON CONFLICT (token) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        expires_at = EXCLUDED.expires_at
    `;
  }

  console.log(`Migrated ${users.length} users and ${sessions.length} active sessions.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
