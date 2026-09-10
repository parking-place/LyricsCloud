#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const schema = JSON.parse(await readFile(new URL("../config/environment-schema.1.0.5.json", import.meta.url), "utf8"));

export function validateEnvironment(service, source) {
  const required = schema["x-required-by-service"][service];
  if (!required) throw new Error(`Unknown service: ${service}`);
  const invalid = [];
  for (const name of required) {
    const rule = schema.properties[name];
    const raw = source[name];
    if (raw === undefined || raw === "") { invalid.push(name); continue; }
    const value = rule.type === "integer" ? Number(raw) : raw;
    if (rule.type === "integer" && !Number.isInteger(value)) invalid.push(name);
    if (rule.type === "string" && typeof value !== "string") invalid.push(name);
    if (rule.const !== undefined && value !== rule.const) invalid.push(name);
    if (rule.pattern && (typeof value !== "string" || !new RegExp(rule.pattern).test(value))) invalid.push(name);
    if (rule.minLength && (typeof value !== "string" || value.length < rule.minLength)) invalid.push(name);
    if (rule.minimum !== undefined && (typeof value !== "number" || value < rule.minimum)) invalid.push(name);
  }
  if (source.APP_PHASE !== undefined && source.APP_PHASE !== "") invalid.push("APP_PHASE");
  if (invalid.length) throw new Error(`Invalid environment keys: ${[...new Set(invalid)].join(", ")}`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    validateEnvironment(process.argv[2], process.env);
    process.stdout.write(`1.0.5 ${process.argv[2]} environment: PASS\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Environment validation failed"}\n`);
    process.exit(2);
  }
}
