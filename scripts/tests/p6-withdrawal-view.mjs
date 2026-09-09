import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Isolated JSX-output test of the actual component, not a browser/React scheduler test.
// Effects and unrelated children are not executed. Existing callback tests cover writes.
function render({ open, message = '', busy = false }) {
  const initialSettings = { theme: 'system', font: 'sans', fontSize: 18, lineHeight: 1.6,
    letterSpacing: 0, focusModeDefault: false, rowVersion: 1, updatedAt: '' };
  const states = [initialSettings, initialSettings, false, '', false, false, open, '탈퇴', true, busy, message];
  let index = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    react: { useState: () => { assert.ok(index < states.length); return [states[index++], () => {}]; },
      useRef: current => ({ current }), useEffect() {} },
    '@lyricscloud/domain': { DEFAULT_USER_SETTINGS: initialSettings },
    '../lib/account-cache.js': { clearAccountPrivateData() {}, downloadRecoveryDrafts() {} },
    '../lib/dialog-focus.js': { trapDialogTab() {} },
    './shortcut-help.js': { ShortcutGuide() {} }
  };
  const source = readFileSync(new URL('../../apps/web/src/components/settings-screen.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { fileName: 'settings-screen.tsx',
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `unexpected dependency ${name}`); return imports[name];
  }, module, module.exports);
  const tree = module.exports.SettingsScreen({ initialSettings, ownerId: 'synthetic-owner' });
  assert.equal(index, states.length, 'update the isolated fixture when component state changes');
  return tree;
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join('');
  return tree && typeof tree === 'object' ? text(tree.props?.children) : '';
}
const notice = '최근 Google 재인증이 필요합니다.';

test('withdrawal failure is announced inside the open modal rather than behind it', () => {
  const tree = render({ open: true, message: notice });
  const dialog = nodes(tree, node => node.props['data-withdrawal-dialog'] !== undefined)[0];
  assert.ok(dialog);
  const alerts = nodes(dialog, node => node.props.role === 'alert');
  assert.equal(alerts.length, 1);
  assert.ok(text(alerts[0]).includes(notice));
  assert.equal(nodes(tree, node => node.props.role === 'alert').length, 1, 'do not announce the same error twice');
});
test('reauthentication and enabled cancel remain reachable within the failed modal', () => {
  const tree = render({ open: true, message: notice });
  const dialog = nodes(tree, node => node.props['data-withdrawal-dialog'] !== undefined)[0];
  const links = nodes(dialog, node => node.type === 'a' && text(node) === 'Google로 재인증');
  assert.equal(links.length, 1);
  assert.equal(links[0].props.href, '/api/auth/login?returnTo=%2Fsettings%3Fwithdrawal%3Dconfirm%23account');
  const cancel = nodes(dialog, node => node.type === 'button' && text(node) === '취소')[0];
  assert.equal(cancel.props.disabled, false);
});
test('a closed modal leaves its recovery notice visible on the account page', () => {
  const tree = render({ open: false, message: notice });
  assert.equal(nodes(tree, node => node.props['data-withdrawal-dialog'] !== undefined).length, 0);
  const alerts = nodes(tree, node => node.props.role === 'alert');
  assert.equal(alerts.length, 1);
  assert.equal(text(alerts[0]), notice);
});
test('an error-free modal has no empty alert and busy cancellation stays disabled', () => {
  const tree = render({ open: true, busy: true });
  const dialog = nodes(tree, node => node.props['data-withdrawal-dialog'] !== undefined)[0];
  assert.equal(nodes(dialog, node => node.props.role === 'alert').length, 0);
  assert.equal(nodes(dialog, node => node.type === 'button' && text(node) === '취소')[0].props.disabled, true);
});
