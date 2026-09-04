import { lstat, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const secretKeys = ["GOOGLE_CLIENT_SECRET", "SESSION_SECRET", "E2E_PROVIDER_TOKEN"];
const secrets = secretKeys.flatMap((key) => {
  const value = process.env[key];
  return value && value.length >= 8 ? [{ key, value }] : [];
});
if (secrets.length === 0) throw new Error(`Set at least one of ${secretKeys.join(", ")} for the leak scan`);

const roots = process.argv.slice(2);
if (roots.length === 0) throw new Error("Pass one or more build, network, or log paths to scan");
const findings = [];
for (const root of roots) await scan(resolve(root));
if (findings.length > 0) {
  for (const finding of findings) console.error(`Secret leak: ${finding.key} in ${finding.path}`);
  process.exitCode = 1;
} else {
  console.log(`Secret leak scan passed (${roots.length} target${roots.length === 1 ? "" : "s"}).`);
}

async function scan(path) {
  let info;
  try { info = await lstat(path); } catch { throw new Error(`Secret scan target does not exist: ${path}`); }
  if (info.isSymbolicLink()) return;
  if (info.isDirectory()) {
    for (const entry of await readdir(path)) await scan(resolve(path, entry));
    return;
  }
  if (!info.isFile() || info.size > 25 * 1024 * 1024) return;
  const data = await readFile(path);
  if (data.includes(0)) return;
  const content = data.toString("utf8");
  for (const secret of secrets) if (content.includes(secret.value)) findings.push({ key: secret.key, path });
}
