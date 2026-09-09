import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

/** Inventory/triage, not a claim that every review signal is a defect. Never emit source text. */
export function inspectSource(path, text) {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const findings = [];
  const add = (rule, position, severity = 'review') => {
    const { line, character } = file.getLineAndCharacterOfPosition(position);
    findings.push({ rule, line: line + 1, column: character + 1, severity });
  };
  for (const diagnostic of file.parseDiagnostics) add('syntax-error', diagnostic.start ?? 0, 'error');
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) add('explicit-any', node.getStart(file));
    if (ts.isCatchClause(node) && node.block.statements.length === 0) add('empty-catch', node.getStart(file));
    ts.forEachChild(node, visit);
  }
  visit(file);
  const lines = text.split(/\r?\n/u).length;
  if (lines > 800) add('large-file', 0);
  return { path, lines, findings };
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  if (!tracked.length) throw new Error('AUDIT_TRACKED_FILES_REQUIRED');
  const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
  const categories = {};
  const reviews = [];
  let parsed = 0, shell = 0, errors = 0;
  for (const path of tracked) {
    const category = path.startsWith('apps/') ? 'apps' : path.startsWith('packages/') ? 'packages'
      : path.startsWith('tests/') ? 'tests' : path.startsWith('scripts/') ? 'scripts'
      : path.startsWith('infra/') ? 'infra' : path.startsWith('docs/') || path.startsWith('0.Plans/') ? 'docs' : 'config-assets';
    categories[category] = (categories[category] ?? 0) + 1;
    // Do not read secrets, ignored runtime data or symlink targets if mistakenly tracked.
    if (/(?:^|\/)(?:\.env(?:\..*)?|\.private|\.test_users|node_modules|\.next|dist|data|backups|exports|logs)(?:\/|$)/u.test(path)) continue;
    const absolute = resolve(root, path);
    if (!lstatSync(absolute).isFile()) continue;
    if (sourceExtensions.has(extname(path))) {
      const review = inspectSource(path, readFileSync(absolute, 'utf8'));
      parsed++;
      for (const finding of review.findings) {
        errors += Number(finding.severity === 'error');
        reviews.push({ path, ...finding });
      }
    } else if (extname(path) === '.sh') {
      shell++;
      const result = spawnSync('bash', ['-n', absolute], { encoding: 'utf8', timeout: 10_000 });
      if (result.error || result.status !== 0) {
        errors++;
        reviews.push({ path, rule: 'shell-syntax-or-tool-error', severity: 'error' });
      }
    }
  }
  console.log(JSON.stringify({ schema: 'lyricscloud.p6.audit.v1', tracked: tracked.length,
    categories, parsedSources: parsed, shellSources: shell, errors, reviewSignals: reviews.length - errors }));
  for (const review of reviews) console.log(JSON.stringify(review));
  if (errors) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); }
  catch { console.error('P6_CODEBASE_AUDIT_FAILED'); process.exitCode = 1; }
}
