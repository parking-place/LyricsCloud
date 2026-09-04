import { fixtureTokens, fixtureUsers, hashToken, withE2eDatabase } from "./fixtures.js";

export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) return;
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith("_test")) throw new Error("E2E_DATABASE_URL must name a disposable *_test database");
  await withE2eDatabase(async (pool) => {
    await pool.query("truncate table oauth_transactions, auth_sessions, auth_identities, user_profiles, app_users cascade");
    for (const [name, user] of Object.entries(fixtureUsers)) {
      await pool.query("insert into app_users(id, status) values ($1, 'active')", [user.id]);
      await pool.query(
        `insert into auth_identities(issuer, subject, user_id, email, email_verified, display_name)
         values ($1, $2, $3, $4, true, $5)`,
        ["http://127.0.0.1:3100", user.subject, user.id, user.email, user.displayName]
      );
      await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [user.id, user.displayName]);
      await pool.query(
        `insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at)
         values ($1, $2, now() + interval '30 days', now() + interval '90 days')`,
        [hashToken(fixtureTokens[name as keyof typeof fixtureTokens]), user.id]
      );
    }
  });
}
