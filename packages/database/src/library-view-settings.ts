import {
  LibraryViewSettingsConflictError,
  isResourceId,
  libraryViewSettingDefault,
  parseUpdateLibraryViewSettingInput,
  type LibraryViewResourceType,
  type LibraryViewSettingRecord
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface LibraryViewSettingRow extends QueryResultRow {
  resource_type: LibraryViewResourceType;
  view_mode: LibraryViewSettingRecord["viewMode"];
  row_version: string;
  updated_at: Date;
}

export class PostgresLibraryViewSettingsStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 4) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  get(ownerId: string, resourceType: LibraryViewResourceType): Promise<LibraryViewSettingRecord> {
    return this.#withUser(ownerId, async (client) => {
      const row = await selectSetting(client, ownerId, resourceType);
      return row ? record(row) : libraryViewSettingDefault(resourceType);
    });
  }

  update(ownerId: string, resourceType: LibraryViewResourceType, value: unknown): Promise<LibraryViewSettingRecord> {
    const input = parseUpdateLibraryViewSettingInput(value);
    return this.#withUser(ownerId, async (client) => {
      const current = await selectSetting(client, ownerId, resourceType, true);
      if (!current) {
        if (input.rowVersion !== 0) throw new LibraryViewSettingsConflictError();
        try {
          await client.query(`insert into library_view_settings(owner_id,resource_type,view_mode)
            values($1,$2,$3)`, [ownerId, resourceType, input.viewMode]);
        } catch (error) {
          if (postgresCode(error) === "23505") throw new LibraryViewSettingsConflictError();
          throw error;
        }
      } else {
        if (Number(current.row_version) !== input.rowVersion) throw new LibraryViewSettingsConflictError();
        const result = await client.query(`update library_view_settings set
          view_mode=$3,row_version=row_version+1,updated_at=clock_timestamp()
          where owner_id=$1 and resource_type=$2 and row_version=$4`,
        [ownerId, resourceType, input.viewMode, input.rowVersion]);
        if (result.rowCount !== 1) throw new LibraryViewSettingsConflictError();
      }
      return record((await selectSetting(client, ownerId, resourceType))!);
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!isResourceId(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

async function selectSetting(client: PoolClient, ownerId: string, resourceType: LibraryViewResourceType, lock = false): Promise<LibraryViewSettingRow | undefined> {
  return (await client.query<LibraryViewSettingRow>(`select resource_type,view_mode,row_version::text,updated_at
    from library_view_settings where owner_id=$1 and resource_type=$2${lock ? " for update" : ""}`, [ownerId, resourceType])).rows[0];
}

function record(row: LibraryViewSettingRow): LibraryViewSettingRecord {
  return {
    resourceType: row.resource_type,
    viewMode: row.view_mode,
    rowVersion: Number(row.row_version),
    updatedAt: row.updated_at.toISOString()
  };
}

function postgresCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}
