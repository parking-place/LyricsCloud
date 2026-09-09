#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { Pool } from "pg";
import {
  issueBetaCodes,
  listUnusedBetaCodes,
  refreshUnusedBetaCodes,
  type BetaCodeKeys,
  type BetaEnvironment
} from "./beta-access.js";

interface AdminCommand {
  readonly operation: "issue" | "list" | "refresh";
  readonly count?: number;
  readonly confirmEnvironment?: string;
}

export function parseBetaAdminArguments(args: readonly string[]): AdminCommand {
  if (args[0] !== "betacode") throw new Error("BETA_COMMAND_INVALID");
  if (args.length === 1) return { operation: "issue", count: 1 };
  if (args[1] === "ls" && args.length === 2) return { operation: "list" };
  if (args[1] === "refresh") {
    if (args.length === 2) return { operation: "refresh" };
    if (args.length === 4 && args[2] === "--confirm-environment") {
      return { operation: "refresh", confirmEnvironment: args[3] };
    }
    throw new Error("BETA_COMMAND_INVALID");
  }
  if (args[1] === "-n" && args.length === 3) {
    if (!/^[0-9]+$/u.test(args[2] ?? "")) throw new Error("BETA_COUNT_INVALID");
    const count = Number(args[2]);
    if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error("BETA_COUNT_INVALID");
    return { operation: "issue", count };
  }
  throw new Error("BETA_COMMAND_INVALID");
}

export async function runBetaAdmin(
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
  output: Pick<NodeJS.WriteStream, "write"> = process.stdout,
  errorOutput: Pick<NodeJS.WriteStream, "write"> = process.stderr
): Promise<void> {
  const command = parseBetaAdminArguments(args);
  const databaseUrl = validateDatabaseUrl(env.DATABASE_URL);
  const environment = parseEnvironment(env.BETA_ENVIRONMENT);
  const keys = await readKeys(env);
  const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 2_000 });
  try {
    if (command.operation === "issue") {
      const ttlHours = env.BETA_CODE_TTL_HOURS === undefined ? undefined : Number(env.BETA_CODE_TTL_HOURS);
      const codes = await issueBetaCodes(pool, { environment, count: command.count ?? 1, keys, ttlHours });
      for (const item of codes) output.write(`${item.code}\n`);
      return;
    }
    if (command.operation === "list") {
      const codes = await listUnusedBetaCodes(pool, environment, keys);
      for (const item of codes) output.write(`${item.code}\t${item.expiresAt.toISOString()}\n`);
      return;
    }
    await confirmRefresh(environment, command.confirmEnvironment, errorOutput);
    const refreshed = await refreshUnusedBetaCodes(pool, environment);
    output.write(`environment=${refreshed.environment} revoked=${refreshed.revokedCount} cancelled_intents=${refreshed.cancelledIntentCount} epoch=${refreshed.nextEpoch}\n`);
  } finally {
    await pool.end();
  }
}

async function readKeys(env: NodeJS.ProcessEnv): Promise<BetaCodeKeys> {
  const indexKey = await readSecretKey(env.BETA_CODE_INDEX_KEY_FILE, "BETA_INDEX_KEY");
  const encryptionKey = await readSecretKey(env.BETA_CODE_AEAD_KEY_FILE, "BETA_AEAD_KEY");
  const indexKid = env.BETA_CODE_INDEX_KID ?? "";
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(indexKid)) throw new Error("BETA_INDEX_KID_INVALID");
  return { indexKey, encryptionKey, indexKid };
}

async function readSecretKey(path: string | undefined, name: string): Promise<Buffer> {
  if (!path) throw new Error(`${name}_FILE_REQUIRED`);
  const info = await stat(path).catch(() => { throw new Error(`${name}_FILE_INVALID`); });
  if (!info.isFile() || (info.mode & 0o077) !== 0) throw new Error(`${name}_FILE_PERMISSIONS_INVALID`);
  const encoded = (await readFile(path, "utf8")).trim();
  if (!/^[A-Za-z0-9_-]{43}$/u.test(encoded)) throw new Error(`${name}_INVALID`);
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) throw new Error(`${name}_INVALID`);
  return key;
}

function validateDatabaseUrl(value: string | undefined): string {
  try {
    const url = new URL(value ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
    return url.href;
  } catch { throw new Error("BETA_DATABASE_URL_INVALID"); }
}

function parseEnvironment(value: string | undefined): BetaEnvironment {
  if (value !== "development" && value !== "release" && value !== "test") throw new Error("BETA_ENVIRONMENT_INVALID");
  return value;
}

async function confirmRefresh(environment: BetaEnvironment, supplied: string | undefined,
  errorOutput: Pick<NodeJS.WriteStream, "write">): Promise<void> {
  if (supplied !== undefined) {
    if (supplied !== environment) throw new Error("BETA_REFRESH_ENVIRONMENT_MISMATCH");
    return;
  }
  if (!process.stdin.isTTY) throw new Error("BETA_REFRESH_CONFIRM_REQUIRED");
  errorOutput.write(`Refresh every unused beta code in ${environment}. Type ${environment} to continue: `);
  const prompt = createInterface({ input: process.stdin, output: process.stderr, terminal: true });
  try {
    if ((await prompt.question("")).trim() !== environment) throw new Error("BETA_REFRESH_CANCELLED");
  } finally {
    prompt.close();
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectExecution()) {
  runBetaAdmin(process.argv.slice(2)).catch((error: unknown) => {
    const code = error instanceof Error && /^BETA_[A-Z0-9_]+$/u.test(error.message) ? error.message : "BETA_ADMIN_FAILED";
    process.stderr.write(`${code}\n`);
    process.exitCode = code === "BETA_COMMAND_INVALID" || code === "BETA_COUNT_INVALID" ? 2 : 1;
  });
}
