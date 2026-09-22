import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const verify = workflow.split("\n  verify:")[1].split("\n  windows-native:")[0];
const gate = verify.split(/\r?\n      - /u).find((step) => step.includes("--require-release"));

test("manual release runs the strict gate even while the CI runtime phase is p4", () => {
  assert.ok(gate, "the verify job must execute the strict release validator");
  const expression = gate.match(/if: \$\{\{ (.+) \}\}/u)?.[1];
  assert.ok(expression);
  const context = { github: { event_name: "workflow_dispatch" }, inputs: { publish: true, release: true }, env: { APP_PHASE: "p4" } };
  assert.equal(runInNewContext(expression, context), true);
  assert.equal(runInNewContext(expression, { ...context, inputs: { publish: false, release: true } }), true);
  assert.equal(runInNewContext(expression, { ...context, inputs: { publish: true, release: false } }), false);
  assert.equal(runInNewContext(expression, { ...context, github: { event_name: "push" } }), false);
  assert.equal(runInNewContext(expression, { ...context, github: { event_name: "pull_request" }, inputs: {} }), false);
  assert.match(gate, /test "\$GITHUB_REF_TYPE" = "tag"/u);
  assert.match(gate, /test "\$GITHUB_REF_NAME" = "v\$\{current_version\}"/u);
  assert.match(gate, /node scripts\/validate-1005-final-release\.mjs --require-release/u);
  assert.doesNotMatch(gate, /continue-on-error|\|\| true|release-manifest/u);
});

test("strict release fetches annotated tags while ordinary runs stay shallow and publication stays gated", () => {
  const checkout = verify.split(/\r?\n      - /u).find((step) => step.startsWith("uses: actions/checkout@"));
  assert.ok(checkout);
  const depthExpression = checkout.match(/fetch-depth: \$\{\{ (.+) \}\}/u)?.[1];
  assert.ok(depthExpression);
  assert.equal(runInNewContext(depthExpression, { github: { event_name: "workflow_dispatch" }, inputs: { release: true } }), "0");
  assert.equal(runInNewContext(depthExpression, { github: { event_name: "workflow_dispatch" }, inputs: { release: false } }), "1");
  for (const event_name of ["push", "pull_request"]) {
    assert.equal(runInNewContext(depthExpression, { github: { event_name }, inputs: {} }), "1");
  }
  assert.ok(verify.indexOf("--require-release") < verify.indexOf("Build development server production image"));
  assert.match(workflow.split("\n  publish:")[1], /needs: \[verify, windows-native\]/u);
});
