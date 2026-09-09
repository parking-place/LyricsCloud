import { Pool } from "pg";
import { observabilityFromEnvironment } from "@lyricscloud/observability";

const telemetry = observabilityFromEnvironment("database");

export function createDatabasePool(databaseUrl: string, max: number): Pool {
  const pool = new Pool({ connectionString: databaseUrl, max, connectionTimeoutMillis: 2_000 });
  // pg removes an idle broken client before emitting this event. Without a
  // listener, a database restart also terminates the application process.
  // Active query failures still reject and roll back through their caller.
  pool.on("error", () => { telemetry.record({ signal: "log", event: "database_connection_lost",
    errorCode: "DATABASE_UNAVAILABLE", resourceType: "database", outcome: "unavailable" }); });
  return pool;
}
