import assert from 'node:assert/strict';
import { test } from 'node:test';
const moduleUrl = new URL('../audit-p6-codebase.mjs', import.meta.url);
const loaded = await import(moduleUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === moduleUrl.href) return null;
  throw error;
});
function scan(text, path = 'apps/web/src/example.ts') {
  assert.ok(loaded, 'codebase audit not implemented');
  return loaded.inspectSource(path, text);
}
test('codebase syntax diagnostics are reported without source contents', () => {
  const result = scan('const LC_PRIVATE_CANARY = ;');
  assert.ok(result.findings.some(f => f.rule === 'syntax-error' && f.severity === 'error'));
  assert.ok(!JSON.stringify(result).includes('LC_PRIVATE_CANARY'));
});
test('string literals and comments do not count as any types or empty catches', () => {
  assert.deepEqual(scan('const text = "any catch {}"; // any catch {}').findings, []);
});
test('empty catches and explicit any receive locations, not automatic defect labels', () => {
  const result = scan('let value: any;\ntry { value = 1; } catch {}');
  assert.deepEqual(result.findings.map(f => [f.rule, f.line, f.severity]), [['explicit-any', 1, 'review'], ['empty-catch', 2, 'review']]);
});
test('TSX is parsed as TSX without false syntax failures', () => {
  assert.deepEqual(scan('export const View = () => <main>synthetic</main>;', 'apps/web/src/example.tsx').findings, []);
});
test('catch blocks with an explicit action are not empty', () => {
  assert.deepEqual(scan('try { work(); } catch { preserveDraft(); }').findings, []);
});
test('long files remain review signals rather than syntax failures', () => {
  const result = scan('// comment\n'.repeat(801));
  assert.ok(result.findings.some(f => f.rule === 'large-file' && f.severity === 'review'));
  assert.ok(!result.findings.some(f => f.severity === 'error'));
});
