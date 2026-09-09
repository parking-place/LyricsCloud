import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the Next server externalizes Yjs so server chunks share one runtime module', () => {
  assert.match(read('apps/web/next.config.ts'), /serverExternalPackages:\s*\["yjs"\]/u);
});

test('all direct Yjs consumers and y-indexeddb resolve the same pinned version', () => {
  const versions = ['apps/collaboration/package.json', 'packages/database/package.json', 'packages/editor/package.json']
    .map(path => JSON.parse(read(path)).dependencies.yjs);
  assert.deepEqual(new Set(versions), new Set(['13.6.32']));
  assert.match(read('pnpm-lock.yaml'), /y-indexeddb@9\.0\.12\(yjs@13\.6\.32\)/u);
});
