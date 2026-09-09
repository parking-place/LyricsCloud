import { setTimeout as delay } from 'node:timers/promises';

/** Drop only a verifier's UUID-scoped database after its pool has been ended. */
export async function dropMigrationTestDatabase(admin, databaseName) {
  if (typeof databaseName !== 'string' || !/^lyricscloud_[0-9]{4}_[0-9a-f]{32}$/u.test(databaseName)) {
    throw new Error('MIGRATION_TEST_DATABASE_INVALID');
  }
  // pool.end() may resolve before the backend observes every closing socket.
  // FORCE can deliver 57P01 to that socket and crash an otherwise passing test.
  // Never terminate sessions: only retry object_in_use, and surface exhaustion.
  for (let attempt = 0; ; attempt++) {
    try {
      await admin.query(`drop database if exists "${databaseName}"`);
      return;
    } catch (error) {
      if (error?.code !== '55006' || attempt >= 3) throw error;
      await delay(25);
    }
  }
}
