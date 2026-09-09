import assert from 'node:assert/strict';
import { test } from 'node:test';
const moduleUrl = new URL('../release-phase-state.mjs', import.meta.url);
const loaded = await import(moduleUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === moduleUrl.href) return null;
  throw error;
});
const status = phase => `current_version: "1.0.0"\ncurrent_phase: "1.0.0/${phase}phase.md"\nstate: "review"\n`;
const plan = Array.from({ length: 8 }, (_, i) => `LC-100-P6-${String(i + 1).padStart(2, '0')}`).join('\n');
function check(text, options) { assert.ok(loaded, 'phase-state guard not implemented'); return loaded.validateReleasePhase(text, options); }
test('the original P5 release phase remains valid', () => assert.equal(check(status(5), { requireRelease: true }), 5));
test('approved P6 with all work IDs is accepted for review only', () => assert.equal(check(status(6), { phase6Plan: plan }), 6));
for (const [name, text, options] of [
  ['P6 claiming release', status(6), { phase6Plan: plan, requireRelease: true }],
  ['unregistered P6', status(6), {}], ['unknown phase', status(7), { phase6Plan: plan }],
  ['mismatched version path', status(5).replace('current_version: "1.0.0"', 'current_version: "1.0.1"'), {}],
  ['conflicting declarations', `${status(5)}current_phase: "1.0.0/6phase.md"\n`, {}],
  ['incomplete P6 work IDs', status(6), { phase6Plan: plan.replace('LC-100-P6-08', '') }]
]) {
  test(`phase guard rejects ${name}`, () => { assert.ok(loaded); assert.throws(() => check(text, options)); });
}

const patchStatus = (version, phase, state = 'active', prefix = '../2.Patch-phase/') =>
  `current_version: "${version}"\ncurrent_phase: "${prefix}${version}/${phase}phase.md"\nstate: "${state}"\n`;
test('1.0.1 accepts ten phases and authorizes only completed P10', () => {
  for (let phase = 1; phase <= 10; phase++) assert.equal(check(patchStatus('1.0.1', phase), { phaseCount: 10 }), phase);
  assert.equal(check(patchStatus('1.0.1', 10, 'complete'), { phaseCount: 10, requireRelease: true }), 10);
  assert.throws(() => check(patchStatus('1.0.1', 9, 'complete'), { phaseCount: 10, requireRelease: true }));
  assert.throws(() => check(patchStatus('1.0.1', 10, 'active'), { phaseCount: 10, requireRelease: true }));
});
test('additional phases and multi-digit versions remain data-driven', () => {
  assert.equal(check(patchStatus('1.12.91', 13), { phaseCount: 13 }), 13);
  assert.equal(check(patchStatus('1.12.91', 13, 'complete'), { phaseCount: 13, requireRelease: true }), 13);
  assert.throws(() => check(patchStatus('1.12.91', 14), { phaseCount: 13 }));
});
