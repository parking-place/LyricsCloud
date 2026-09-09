import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTypeScript } from './load-typescript.mjs';

const source = fileURLToPath(new URL('../../packages/database/src/export.ts', import.meta.url));
const owner = '123e4567-e89b-42d3-a456-426614174000';
const timestamp = new Date('2026-09-09T00:00:00.000Z');
function classes(client) {
  return loadTypeScript(source, { './pool.js': { createDatabasePool: () => ({ connect: async () => client, end: async () => {} }) } });
}
for (const method of ['readableResources', 'readableTemplates']) {
  for (const deletedAt of [timestamp, timestamp.toISOString(), null]) {
    test(`REVIEW-08: ${method} preserves ${deletedAt instanceof Date ? 'PostgreSQL Date' : typeof deletedAt}`, async () => {
      let fetched = false;
      const queries = [];
      const client = { release() {}, async query(sql) {
        queries.push(sql);
        if (sql.startsWith('fetch ') && !fetched) {
          fetched = true;
          return { rowCount: 1, rows: [{ id: 'synthetic-resource', type: 'lyrics', title: 'synthetic', deleted_at: deletedAt }] };
        }
        return { rowCount: 0, rows: [] };
      } };
      const { ExportSnapshot } = classes(client);
      const snapshot = new ExportSnapshot(client, timestamp, []);
      const rows = [];
      for await (const row of snapshot[method](1)) rows.push(row);
      assert.equal(rows[0].deletedAt, deletedAt === null ? null : timestamp.toISOString());
      assert.ok(queries.some(sql => sql.startsWith('close export_cursor_')));
      await snapshot.close(true);
    });
  }
}
function snapshotFixture(pending) {
  const queries = []; let released = 0;
  const client = { release() { released++; }, async query(sql, params) {
    queries.push({ sql, params });
    if (sql.includes('transaction_timestamp() exported_at')) return { rows: [{ exported_at: timestamp }] };
    if (sql.includes('projection_error_code')) return { rows: [{ pending }] };
    return { rows: [], rowCount: 0 };
  } };
  const { PostgresExportStore } = classes(client);
  return { store: new PostgresExportStore('synthetic-only'), queries, releases: () => released };
}
test('REVIEW-06: pending projection is rejected before exposing a snapshot', async () => {
  const f = snapshotFixture(true);
  await assert.rejects(f.store.openSnapshot(owner), /EXPORT_PROJECTION_PENDING/u);
  assert.equal(f.releases(), 1);
  assert.equal(f.queries.at(-1).sql, 'rollback');
});
test('ready projection check is owner-scoped inside the same repeatable-read transaction', async () => {
  const f = snapshotFixture(false);
  const snapshot = await f.store.openSnapshot(owner);
  const guard = f.queries.findIndex(q => q.sql.includes('projection_error_code'));
  const scope = f.queries.findIndex(q => q.sql.includes("set_config('app.user_id'"));
  assert.ok(guard > scope && scope > 0);
  assert.match(f.queries[guard].sql, /owner_id\s*=\s*app_current_user_id\(\)/u);
  assert.equal(f.queries[0].sql, 'begin isolation level repeatable read read only');
  await snapshot.close(true); assert.equal(f.releases(), 1);
});
test('a missing projection check result fails closed and releases its connection', async () => {
  const f = snapshotFixture(undefined);
  await assert.rejects(f.store.openSnapshot(owner), /EXPORT_PROJECTION_PENDING/u);
  assert.equal(f.releases(), 1);
});
test('invalid owner is rejected before a database connection is opened', async () => {
  const f = snapshotFixture(false);
  await assert.rejects(f.store.openSnapshot('invalid'), /AUTH_CONTEXT_INVALID/u);
  assert.equal(f.queries.length, 0);
});
