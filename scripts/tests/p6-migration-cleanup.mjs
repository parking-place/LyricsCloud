import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const url = new URL('../migration-test-cleanup.mjs', import.meta.url);
const loaded = await import(url).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === url.href) return null;
  throw error;
});
const databaseName = `lyricscloud_0701_${'a'.repeat(32)}`;
function cleanup(admin, name = databaseName) {
  assert.ok(loaded, 'safe migration cleanup not implemented');
  return loaded.dropMigrationTestDatabase(admin, name);
}
test('migration cleanup drops only its random disposable database without forcing connections', async () => {
  const calls = [];
  await cleanup({ async query(sql) { calls.push(sql); } });
  assert.deepEqual(calls, [`drop database if exists "${databaseName}"`]);
});
test('migration cleanup retries only object-in-use while a connection finishes closing', async () => {
  let calls = 0;
  await cleanup({ async query(sql) {
    assert.ok(!/force/iu.test(sql));
    if (++calls < 3) throw Object.assign(new Error('synthetic still connected'), { code: '55006' });
  } });
  assert.equal(calls, 3);
});
test('migration cleanup does not suppress unrelated database errors', async () => {
  const failure = Object.assign(new Error('synthetic denied'), { code: '42501' });
  let calls = 0;
  await assert.rejects(() => cleanup({ async query() { calls++; throw failure; } }), error => error === failure);
  assert.equal(calls, 1);
});
test('migration cleanup has a bounded retry and never terminates remaining sessions', async () => {
  const failure = Object.assign(new Error('synthetic still connected'), { code: '55006' });
  let calls = 0;
  await assert.rejects(() => cleanup({ async query(sql) {
    calls++; assert.ok(!/force|terminate/iu.test(sql)); throw failure;
  } }), error => error === failure);
  assert.equal(calls, 4);
});
test('migration cleanup rejects production, shared test and injected names before SQL', async () => {
  for (const name of ['lyricscloud', 'lyricscloud_test', 'postgres', 'lyricscloud_0701_no-uuid', `lyricscloud_0701_${'a'.repeat(32)}"; DROP DATABASE postgres;--`]) {
    let calls = 0;
    await assert.rejects(() => cleanup({ async query() { calls++; } }, name), /MIGRATION_TEST_DATABASE_INVALID/u);
    assert.equal(calls, 0);
  }
});
test('0701 verifier uses safe cleanup and closes its admin pool in finally', () => {
  const source = readFileSync(new URL('../verify-0701-migration.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes('await dropMigrationTestDatabase(admin, databaseName)'));
  assert.match(source, /finally\s*\{\s*await admin\.end\(\);\s*\}/u);
  assert.ok(!/with\s*\(force\)/iu.test(source));
});
