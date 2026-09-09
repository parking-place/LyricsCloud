#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || value === undefined) fail("arguments must be --name value pairs");
  args.set(key.slice(2), value);
}

const required = ["source-sha", "git-ref", "built-at", "source-date-epoch", "ci-run",
  "web-digest", "collaboration-digest", "worker-digest", "migrate-digest"];
for (const key of required) if (!args.get(key)) fail(`missing --${key}`);
if (!/^[0-9a-f]{40}$/.test(args.get("source-sha"))) fail("source SHA must be 40 lowercase hexadecimal characters");
if (!/^refs\/(heads|tags)\/.+/.test(args.get("git-ref"))) fail("git ref must be a full heads or tags ref");
if (!Number.isInteger(Number(args.get("source-date-epoch"))) || Number(args.get("source-date-epoch")) < 0) fail("source date epoch must be a non-negative integer");
if (Number.isNaN(Date.parse(args.get("built-at")))) fail("built-at must be an ISO timestamp");
for (const service of ["web", "collaboration", "worker", "migrate"]) {
  if (!/^sha256:[0-9a-f]{64}$/.test(args.get(`${service}-digest`))) fail(`${service} digest is invalid`);
}

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
if (!/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)) fail("VERSION is invalid");
const manifest = JSON.parse(await readFile(new URL(`../config/release-manifest.${version}.json`, import.meta.url), "utf8"));
if (manifest.releaseVersion !== version) fail("release template version does not match VERSION");
manifest.source.commit = args.get("source-sha");
manifest.source.builtAt = new Date(args.get("built-at")).toISOString();
manifest.source.sourceDateEpoch = Number(args.get("source-date-epoch"));
manifest.artifactPolicy.certificateIdentity = manifest.artifactPolicy.certificateIdentity.replace("$GIT_REF", args.get("git-ref"));
manifest.artifactPolicy.ciRun = args.get("ci-run");
for (const service of ["web", "collaboration", "worker", "migrate"]) manifest.images[service].digest = args.get(`${service}-digest`);

const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (args.get("output")) await writeFile(args.get("output"), output, { flag: "wx", mode: 0o600 });
else process.stdout.write(output);

function fail(message) {
  process.stderr.write(`Release manifest generation failed: ${message}\n`);
  process.exit(2);
}
