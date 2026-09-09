import { chmod, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const envPath = resolve(process.argv[2] ?? ".env");
const testUsersPath = resolve(process.argv[3] ?? ".test_users");
const envText = await readFile(envPath, "utf8");
const lines = envText.split(/\r?\n/u);
const retained = [];
const legacy = [];

for (const line of lines) {
  const match = line.match(/^\s*AUTH_ALLOWED_EMAILS\s*=\s*(.*)$/u);
  if (!match) {
    retained.push(line);
    continue;
  }
  const value = unquote(match[1] ?? "");
  legacy.push(...value.split(",").map(normalizeEmail).filter(Boolean));
}

if (legacy.length === 0) {
  console.log("No AUTH_ALLOWED_EMAILS entries were found; no files changed.");
  process.exit(0);
}

let existingText = "";
try { existingText = await readFile(testUsersPath, "utf8"); }
catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const existing = existingText.split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .flatMap((line) => line.split(","))
  .map(normalizeEmail)
  .filter(Boolean);
const merged = [...new Set([...existing, ...legacy])];

if (merged.some((email) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email))) {
  throw new Error("Migration stopped: AUTH_ALLOWED_EMAILS contains an invalid email entry.");
}

const testUsersText = [
  "# Google OAuth/LyricsCloud 허용 사용자 — 현재 서버 환경 전용",
  "# 이메일 주소를 한 줄에 하나씩 기록합니다. Google Console에는 별도로 수동 등록합니다.",
  "",
  ...merged,
  ""
].join("\n");
const nextEnvText = `${retained.join("\n").replace(/\n+$/u, "")}\n`;

await atomicWrite(testUsersPath, testUsersText, 0o600);
await atomicWrite(envPath, nextEnvText, 0o600);
console.log(`Migrated ${legacy.length} legacy entr${legacy.length === 1 ? "y" : "ies"}; .test_users now contains ${merged.length} entr${merged.length === 1 ? "y" : "ies"}.`);

function normalizeEmail(value) {
  return value.trim().normalize("NFKC").toLowerCase();
}

function unquote(value) {
  const trimmed = value.trim();
  const first = trimmed[0];
  return first && first === trimmed.at(-1) && (first === "\"" || first === "'")
    ? trimmed.slice(1, -1)
    : trimmed;
}

async function atomicWrite(path, contents, mode) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, contents, { encoding: "utf8", mode });
    await chmod(temporaryPath, mode);
    await rename(temporaryPath, path);
    await chmod(path, mode);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
