import { Client } from "pg";
import { CollaborationStore } from "../../apps/collaboration/src/store.ts";

if (process.env.NODE_ENV !== "test" || !/\/lyricscloud_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Crash fixture requires the isolated test database");
}
const point = process.env.SYNC_CRASH_POINT;
const crash = () => process.kill(process.pid, "SIGKILL");
const query = Client.prototype.query;
Client.prototype.query = function (...args) {
  const result = query.apply(this, args);
  if (point === "uncommitted" && String(args[0]).startsWith("insert into sync_updates")) return result.then(crash);
  return result;
};
const apply = CollaborationStore.prototype.applyUpdate;
CollaborationStore.prototype.applyUpdate = async function (...args) {
  if (point === "before-update") crash();
  const result = await apply.apply(this, args);
  if (point === "before-ack") crash();
  return result;
};
await import("../../apps/collaboration/src/server.ts");
