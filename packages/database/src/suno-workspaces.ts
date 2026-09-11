import { createHash, randomUUID } from "node:crypto";
import type { SunoWorkspace, SunoWorkspaceCommand, SunoWorkspaceLink } from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

export interface SunoWorkspaceCommandResult {
  readonly workspace: SunoWorkspace;
  readonly replayed: boolean;
}

export class SunoWorkspaceConflictError extends Error {
  constructor(readonly currentVersion: number) { super("SUNO_WORKSPACE_VERSION_CONFLICT"); this.name = "SunoWorkspaceConflictError"; }
}
export class SunoWorkspaceNotFoundError extends Error {
  constructor() { super("SUNO_WORKSPACE_NOT_FOUND"); this.name = "SunoWorkspaceNotFoundError"; }
}
export class SunoWorkspaceRequestReuseError extends Error {
  constructor() { super("SUNO_WORKSPACE_REQUEST_REUSED"); this.name = "SunoWorkspaceRequestReuseError"; }
}
export class SunoWorkspaceLimitError extends Error {
  constructor() { super("SUNO_WORKSPACE_LINK_LIMIT"); this.name = "SunoWorkspaceLimitError"; }
}
export class SunoWorkspaceDuplicateUrlError extends Error {
  constructor() { super("SUNO_WORKSPACE_DUPLICATE_URL"); this.name = "SunoWorkspaceDuplicateUrlError"; }
}
export class SunoWorkspaceOrderSetError extends Error {
  constructor() { super("SUNO_WORKSPACE_ORDER_SET_MISMATCH"); this.name = "SunoWorkspaceOrderSetError"; }
}

interface WorkspaceRow extends QueryResultRow { model_label: string | null; row_version: string }
interface LinkRow extends QueryResultRow {
  id: string; url: string; title: string; note: string; position: number; row_version: string;
  created_at: Date; updated_at: Date;
}

export class PostgresSunoWorkspaceStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 6) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  getWorkspace(ownerId: string, songId: string): Promise<SunoWorkspace | null> {
    return this.#withUser(ownerId, async (client) => {
      if (!(await activeSongExists(client, ownerId, songId))) return null;
      return selectWorkspace(client, ownerId, songId);
    });
  }

  applyCommand(ownerId: string, songId: string, input: SunoWorkspaceCommand): Promise<SunoWorkspaceCommandResult> {
    return this.#withUser(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`suno-workspace:${ownerId}:${songId}`]);
      const parent = await client.query(`select 1 from resources
        where owner_id=$1 and id=$2 and type='song' and deleted_at is null for update`, [ownerId, songId]);
      if (!parent.rowCount) throw new SunoWorkspaceNotFoundError();

      const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      const replay = await client.query<{ request_sha256: string; result: SunoWorkspace }>(`select request_sha256,result
        from song_suno_command_requests where owner_id=$1 and song_resource_id=$2 and request_id=$3`,
      [ownerId, songId, input.requestId]);
      if (replay.rows[0]) {
        if (replay.rows[0].request_sha256 !== requestHash) throw new SunoWorkspaceRequestReuseError();
        return { workspace: replay.rows[0].result, replayed: true };
      }

      let current = await lockWorkspace(client, ownerId, songId);
      if (!current) {
        if (input.expectedVersion !== 0) throw new SunoWorkspaceConflictError(0);
        await client.query(`insert into song_suno_workspaces(song_resource_id,owner_id)
          values($1,$2)`, [songId, ownerId]);
        current = { model_label: null, row_version: "0" };
      }
      const currentVersion = Number(current.row_version);
      if (currentVersion !== input.expectedVersion) throw new SunoWorkspaceConflictError(currentVersion);

      const changed = await executeCommand(client, ownerId, songId, current.model_label, input);
      if (changed) {
        await client.query(`update song_suno_workspaces set row_version=row_version+1,updated_at=clock_timestamp()
          where owner_id=$1 and song_resource_id=$2`, [ownerId, songId]);
      }
      const workspace = await selectWorkspace(client, ownerId, songId);
      await client.query(`insert into song_suno_command_requests(
          owner_id,song_resource_id,request_id,request_sha256,result
        ) values($1,$2,$3,$4,$5::jsonb)`,
      [ownerId, songId, input.requestId, requestHash, JSON.stringify(workspace)]);
      return { workspace, replayed: false };
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
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

async function executeCommand(
  client: PoolClient,
  ownerId: string,
  songId: string,
  currentModel: string | null,
  input: SunoWorkspaceCommand
): Promise<boolean> {
  if (input.command === "set_model") {
    if (input.modelLabel === currentModel) return false;
    await client.query(`update song_suno_workspaces set model_label=$3
      where owner_id=$1 and song_resource_id=$2`, [ownerId, songId, input.modelLabel]);
    return true;
  }
  if (input.command === "create_link") {
    const count = await client.query<{ count: string }>(`select count(*)::text count from song_suno_links
      where owner_id=$1 and song_resource_id=$2`, [ownerId, songId]);
    if (Number(count.rows[0]?.count ?? 0) >= 20) throw new SunoWorkspaceLimitError();
    if (await duplicateUrlExists(client, ownerId, songId, input.url)) throw new SunoWorkspaceDuplicateUrlError();
    await client.query(`insert into song_suno_links(id,owner_id,song_resource_id,url,title,note,position)
      values($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), ownerId, songId, input.url, input.title, input.note, Number(count.rows[0]?.count ?? 0)]);
    return true;
  }
  if (input.command === "update_link") {
    const existing = await client.query<LinkRow>(`select id,url,title,note,position,row_version::text,created_at,updated_at
      from song_suno_links where owner_id=$1 and song_resource_id=$2 and id=$3 for update`,
    [ownerId, songId, input.linkId]);
    const link = existing.rows[0];
    if (!link) throw new SunoWorkspaceNotFoundError();
    const url = input.url ?? link.url;
    const title = input.title ?? link.title;
    const note = input.note ?? link.note;
    if (url === link.url && title === link.title && note === link.note) return false;
    if (url !== link.url && await duplicateUrlExists(client, ownerId, songId, url, input.linkId)) {
      throw new SunoWorkspaceDuplicateUrlError();
    }
    await client.query(`update song_suno_links set url=$4,title=$5,note=$6
      where owner_id=$1 and song_resource_id=$2 and id=$3`, [ownerId, songId, input.linkId, url, title, note]);
    return true;
  }
  if (input.command === "remove_link") {
    const removed = await client.query<{ position: number }>(`delete from song_suno_links
      where owner_id=$1 and song_resource_id=$2 and id=$3 returning position`, [ownerId, songId, input.linkId]);
    if (!removed.rows[0]) throw new SunoWorkspaceNotFoundError();
    const remaining = await currentLinkIds(client, ownerId, songId);
    await writeOrder(client, ownerId, songId, remaining);
    return true;
  }
  const currentIds = await currentLinkIds(client, ownerId, songId);
  if (currentIds.length !== input.linkIds.length || new Set(currentIds).size !== new Set(input.linkIds).size
      || input.linkIds.some((id) => !currentIds.includes(id))) throw new SunoWorkspaceOrderSetError();
  if (currentIds.every((id, index) => id === input.linkIds[index])) return false;
  await writeOrder(client, ownerId, songId, input.linkIds);
  return true;
}

async function activeSongExists(client: PoolClient, ownerId: string, songId: string): Promise<boolean> {
  const result = await client.query(`select 1 from resources
    where owner_id=$1 and id=$2 and type='song' and deleted_at is null`, [ownerId, songId]);
  return Boolean(result.rowCount);
}

async function lockWorkspace(client: PoolClient, ownerId: string, songId: string): Promise<WorkspaceRow | undefined> {
  const result = await client.query<WorkspaceRow>(`select model_label,row_version::text from song_suno_workspaces
    where owner_id=$1 and song_resource_id=$2 for update`, [ownerId, songId]);
  return result.rows[0];
}

async function selectWorkspace(client: PoolClient, ownerId: string, songId: string): Promise<SunoWorkspace> {
  const state = await client.query<WorkspaceRow>(`select model_label,row_version::text from song_suno_workspaces
    where owner_id=$1 and song_resource_id=$2`, [ownerId, songId]);
  const links = await client.query<LinkRow>(`select id,url,title,note,position,row_version::text,created_at,updated_at
    from song_suno_links where owner_id=$1 and song_resource_id=$2 order by position,id`, [ownerId, songId]);
  return {
    modelLabel: state.rows[0]?.model_label ?? null,
    links: links.rows.map(mapLink),
    rowVersion: Number(state.rows[0]?.row_version ?? 0)
  };
}

function mapLink(row: LinkRow): SunoWorkspaceLink {
  return {
    id: row.id, url: row.url, title: row.title, note: row.note, position: row.position,
    rowVersion: Number(row.row_version), createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}

async function duplicateUrlExists(
  client: PoolClient,
  ownerId: string,
  songId: string,
  url: string,
  exceptId?: string
): Promise<boolean> {
  const result = await client.query(`select 1 from song_suno_links
    where owner_id=$1 and song_resource_id=$2 and url=$3 and ($4::uuid is null or id<>$4::uuid)`,
  [ownerId, songId, url, exceptId ?? null]);
  return Boolean(result.rowCount);
}

async function currentLinkIds(client: PoolClient, ownerId: string, songId: string): Promise<string[]> {
  const rows = await client.query<{ id: string }>(`select id from song_suno_links
    where owner_id=$1 and song_resource_id=$2 order by position,id for update`, [ownerId, songId]);
  return rows.rows.map(({ id }) => id);
}

async function writeOrder(client: PoolClient, ownerId: string, songId: string, ids: readonly string[]): Promise<void> {
  await client.query("set constraints song_suno_links_owner_position_unique deferred");
  if (!ids.length) return;
  await client.query(`update song_suno_links link set position=ordered.position
    from (select id,(ordinality-1)::smallint position from unnest($3::uuid[]) with ordinality sequence(id,ordinality)) ordered
    where link.owner_id=$1 and link.song_resource_id=$2 and link.id=ordered.id`, [ownerId, songId, ids]);
}
