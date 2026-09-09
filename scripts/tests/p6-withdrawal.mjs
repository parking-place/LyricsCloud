import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptFunction } from './load-typescript.mjs';

function setup(response, overrides = {}) {
  const state = { busy: false, message: '', calls: [], cleared: [], navigation: [] };
  const ref = { current: false };
  const bindings = {
    withdrawalBusy: false, withdrawalBusyRef: ref, withdrawalConfirmation: '탈퇴', exportAcknowledged: true,
    ownerId: 'synthetic-owner', setWithdrawalBusy: value => { state.busy = value; },
    setWithdrawalMessage: value => { state.message = value; },
    fetch: async (url, options) => {
      state.calls.push({ url, options });
      if (url === '/api/auth/session') return { status: 401, ok: false };
      if (typeof response === 'function') return response();
      return response;
    },
    clearAccountPrivateData: async owner => { state.cleared.push(owner); },
    window: { location: { replace: url => state.navigation.push(url) } },
    setTimeout: () => 1, ...overrides
  };
  const call = loadTypeScriptFunction(fileURLToPath(new URL('../../apps/web/src/components/settings-screen.tsx', import.meta.url)), 'requestWithdrawal', bindings);
  return { state, ref, call };
}

test('REVIEW-09: reauthentication rejection releases busy and preserves local data', async () => {
  const { state, ref, call } = setup({ status: 401, ok: false });
  await call();
  assert.equal(state.busy, false); assert.equal(ref.current, false);
  assert.match(state.message, /재인증/u); assert.deepEqual(state.cleared, []); assert.deepEqual(state.navigation, []);
});
test('an expired session after a lost withdrawal response is not success evidence', async () => {
  const { state, call } = setup(() => { throw new Error('synthetic network loss'); });
  await call();
  assert.deepEqual(state.cleared, [], 'unconfirmed withdrawal must not delete recoverable drafts');
  assert.deepEqual(state.navigation, []);
  assert.equal(state.busy, false);
  assert.equal(state.calls.length, 1, 'do not issue a non-probative session probe');
});
for (const status of [400, 403, 409, 429, 503]) {
  test(`withdrawal HTTP ${status} preserves data and permits retry`, async () => {
    const { state, ref, call } = setup({ status, ok: false });
    await call();
    assert.equal(state.busy, false); assert.equal(ref.current, false);
    assert.deepEqual(state.cleared, []); assert.deepEqual(state.navigation, []);
  });
}
test('confirmed successful withdrawal clears only this owner then navigates', async () => {
  const { state, call } = setup({ status: 200, ok: true });
  await call();
  assert.deepEqual(state.cleared, ['synthetic-owner']);
  assert.deepEqual(state.navigation, ['/auth?withdrawal=pending']);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].options.method, 'POST');
});
test('two calls before a React rerender send only one withdrawal request', async () => {
  let settle;
  const { state, call } = setup(() => new Promise(resolve => { settle = resolve; }));
  const first = call(); const second = call();
  assert.equal(state.calls.length, 1);
  settle({ status: 200, ok: true });
  await Promise.all([first, second]);
  assert.equal(state.cleared.length, 1);
});
for (const override of [{ withdrawalBusy: true }, { withdrawalConfirmation: '' }, { exportAcknowledged: false }]) {
  test(`withdrawal prerequisites remain enforced: ${Object.keys(override)[0]}`, async () => {
    const { state, call } = setup({ status: 200, ok: true }, override);
    await call(); assert.equal(state.calls.length, 0); assert.equal(state.cleared.length, 0);
  });
}
