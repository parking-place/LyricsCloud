import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTypeScript } from './load-typescript.mjs';

const spans = [];
const code = loadTypeScript(fileURLToPath(new URL('../../packages/observability/src/index.ts', import.meta.url)), {
  '@opentelemetry/api': {
    SpanStatusCode: { ERROR: 2 },
    trace: { getTracer() { return { startSpan(name, options) { spans.push({ name, ...options }); return { setStatus() {}, end() {} }; } }; } }
  }
});
const { sanitizeTelemetry, redactRecursively, MemoryTelemetryTransport, Observability } = code;
const identity = { service: 'web', environment: 'test', version: '1.0.0', buildId: 'p6' };
const rawRoute = '/api/lyrics/123e4567-e89b-12d3-a456-426614174000?query=LC_CANARY_PRIVATE';

test('REVIEW-14: the final sanitizer retains an allowed route template', () => {
  assert.deepEqual(sanitizeTelemetry({ ...identity, routeTemplate: '/api/lyrics/:id' }), { ...identity, routeTemplate: '/api/lyrics/:id' });
});
test('REVIEW-14: safe route survives the real record and transport path', () => {
  const memory = new MemoryTelemetryTransport();
  const telemetry = new Observability(identity, [memory]);
  const record = telemetry.record({ event: 'request_failed', routeTemplate: rawRoute, body: 'LC_CANARY_PRIVATE' });
  assert.equal(record.routeTemplate, '/api/lyrics/:id');
  assert.equal(memory.records[0].routeTemplate, '/api/lyrics/:id');
  assert.equal(spans.at(-1).attributes.routeTemplate, '/api/lyrics/:id');
  assert.ok(!JSON.stringify({ record, spans }).includes('LC_CANARY_PRIVATE'));
});
test('standalone recursive redaction normalizes route fields before exposing them', () => {
  assert.deepEqual(redactRecursively({ routeTemplate: rawRoute }), { routeTemplate: '/api/lyrics/:id' });
});
for (const value of ['/api/lyrics/LC_CANARY_PRIVATE', { body: 'LC_CANARY_PRIVATE' }, ['LC_CANARY_PRIVATE'], true, null]) {
  test(`unsafe route metadata is discarded: ${typeof value}`, () => {
    const result = sanitizeTelemetry({ ...identity, routeTemplate: value });
    assert.deepEqual(result, identity);
    assert.ok(!JSON.stringify(redactRecursively({ routeTemplate: value })).includes('LC_CANARY_PRIVATE'));
  });
}
test('authored template data stays forbidden even next to an allowed routeTemplate', () => {
  const record = sanitizeTelemetry({ ...identity, routeTemplate: '/api/templates/:id',
    template: 'LC_CANARY_PRIVATE', templateBody: 'LC_CANARY_PRIVATE',
    cause: { routeTemplate: rawRoute, template: 'LC_CANARY_PRIVATE' }, body: 'LC_CANARY_PRIVATE',
    arbitrary: { content: 'LC_CANARY_PRIVATE' } });
  assert.deepEqual(record, { ...identity, routeTemplate: '/api/templates/:id' });
  assert.ok(!JSON.stringify(record).includes('LC_CANARY_PRIVATE'));
});
test('nested raw route is normalized without relaxing depth or forbidden key limits', () => {
  const value = redactRecursively({ nested: { routeTemplate: rawRoute }, template: { routeTemplate: rawRoute } });
  assert.equal(value.nested.routeTemplate, '/api/lyrics/:id');
  assert.equal(value.template, '[REDACTED]');
  assert.equal(redactRecursively('/api/lyrics/:id', 'routeTemplate', 9), '[REDACTED]');
});

test('unknown nested values are never inspected by the final allowlist sanitizer', () => {
  const unknown = {};
  Object.defineProperty(unknown, 'value', { enumerable: true, get() { throw new Error('untrusted nested getter'); } });
  assert.deepEqual(sanitizeTelemetry({ ...identity, arbitrary: unknown }), identity);
});
test('the bounded first-100-field contract is preserved before filtering', () => {
  const input = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`unknown${i}`, i]));
  input.event = 'request_failed';
  assert.deepEqual(sanitizeTelemetry(input), {});
});
