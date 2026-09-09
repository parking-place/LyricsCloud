// Test-only loader. Production TypeScript is compiled, not reimplemented.
// Callers explicitly supply unavailable external dependencies; unknown imports fail.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function loadTypeScript(path, imports = {}) {
  const source = readFileSync(path, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, strict: true }
  });
  const errors = diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [];
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: x => x, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n'
  }));
  const module = { exports: {} };
  const dependency = name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name.startsWith('node:')) return require(name);
    throw new Error(`Unprovided test dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', outputText)(dependency, module, module.exports);
  return module.exports;
}

/** Execute the actual named callback from a TS/TSX file with explicit closure bindings. */
export function loadTypeScriptFunction(path, name, bindings) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const matches = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (matches.length !== 1) throw new Error(`Expected one callback named ${name}`);
  const compiled = ts.transpileModule(matches[0].getText(source), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  return new Function(...Object.keys(bindings), `${compiled}\nreturn ${name};`)(...Object.values(bindings));
}
