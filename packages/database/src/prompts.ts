import { createHash, randomUUID } from "node:crypto";
import {
  isResourceId, normalizePromptToken, parseCreatePromptInput, parseUpdatePromptInput,
  projectUniquePromptTokens, serializePromptTokens, PromptConflictError,
  type CreatePromptInput, type PromptRecord, type PromptTokenValue, type UpdatePromptInput
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface PromptRow extends QueryResultRow {
  id: string; title: string; plain_text: string; is_favorite: boolean; is_pinned: boolean;
  pin_order: number | null; color: PromptRecord["color"]; row_version: string;
  created_at: Date; updated_at: Date;
}

interface PromptTokenRow extends QueryResultRow {
  display_value: string; normalized_value: string;
}

export interface PromptSuggestion extends PromptTokenValue {
  readonly usageCount: number;
  readonly lastUsedAt: string | null;
}

export interface PromptSongCandidate {
  readonly id: string;
  readonly title: string;
  readonly isLinked: boolean;
}

export type WrittenPrompt = { readonly prompt: PromptRecord; readonly replayed: boolean };

const PROMPT_SELECT = `select r.id,r.title,p.plain_text,r.is_favorite,r.is_pinned,r.pin_order,r.color,
  r.row_version::text,r.created_at,r.updated_at
  from resources r join prompts p on p.resource_id=r.id and p.owner_id=r.owner_id
  where r.type='prompt' and r.deleted_at is null`;

export class PostgresPromptStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 8) { this.#pool = createDatabasePool(databaseUrl, maxConnections); }

  createPrompt(ownerId: string, value: CreatePromptInput): Promise<WrittenPrompt> {
    const input = parseCreatePromptInput(value);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, input.requestId);
      const requestHash = hashRequest("create", input);
      const replay = await replayRequest(client, ownerId, input.requestId, requestHash);
      if (replay) return replay;
      const resourceId = randomUUID();
      await client.query(`insert into resources(id,owner_id,type,title,is_favorite,is_pinned,pin_order,color)
        values($1,$2,'prompt',$3,$4,$5,$6,$7)`, [resourceId, ownerId, input.title, input.isFavorite, input.isPinned, input.pinOrder, input.color]);
      await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,$3)",
        [resourceId, ownerId, serializePromptTokens(projectUniquePromptTokens(input.tokens))]);
      await writeTokenProjection(client, ownerId, resourceId, input.tokens, new Set());
      const prompt = await selectPrompt(client, ownerId, resourceId);
      if (!prompt) throw new Error("PROMPT_CREATE_FAILED");
      await recordRequest(client, ownerId, input.requestId, resourceId, "create", requestHash, prompt.rowVersion);
      return { prompt, replayed: false };
    });
  }

  getPrompt(ownerId: string, resourceId: string): Promise<PromptRecord | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, (client) => selectPrompt(client, ownerId, resourceId));
  }

  updatePrompt(ownerId: string, resourceId: string, value: UpdatePromptInput): Promise<WrittenPrompt | null> {
    const input = parseUpdatePromptInput(value);
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, input.requestId);
      const requestHash = hashRequest("update", { resourceId, ...input });
      const replay = await replayRequest(client, ownerId, input.requestId, requestHash);
      if (replay) return replay;
      const current = await lockPrompt(client, ownerId, resourceId);
      if (!current) return null;
      if (current.rowVersion !== input.rowVersion) throw new PromptConflictError();
      const oldNormalized = new Set(current.tokens.map((token) => token.normalizedValue));
      if (input.tokens !== undefined) {
        const projected = projectUniquePromptTokens(input.tokens);
        await writeTokenProjection(client, ownerId, resourceId, projected, oldNormalized);
        await client.query("update prompts set plain_text=$3 where resource_id=$1 and owner_id=$2", [resourceId, ownerId, serializePromptTokens(projected)]);
      }
      const changes: string[] = [];
      const values: unknown[] = [resourceId, ownerId];
      for (const [field, column] of [["title","title"],["isFavorite","is_favorite"],["isPinned","is_pinned"],["pinOrder","pin_order"],["color","color"]] as const) {
        if (input[field] !== undefined) { values.push(input[field]); changes.push(`${column}=$${values.length}`); }
      }
      if (changes.length) await client.query(`update resources set ${changes.join(",")} where id=$1 and owner_id=$2 and type='prompt' and deleted_at is null`, values);
      const prompt = await selectPrompt(client, ownerId, resourceId);
      if (!prompt) return null;
      await recordRequest(client, ownerId, input.requestId, resourceId, "update", requestHash, prompt.rowVersion);
      return { prompt, replayed: false };
    });
  }

  duplicatePrompt(ownerId: string, resourceId: string, requestId: string): Promise<WrittenPrompt | null> {
    if (!isResourceId(resourceId) || !isResourceId(requestId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, requestId);
      const requestHash = hashRequest("duplicate", { resourceId });
      const replay = await replayRequest(client, ownerId, requestId, requestHash);
      if (replay) return replay;
      const source = await lockPrompt(client, ownerId, resourceId);
      if (!source) return null;
      const copyId = randomUUID();
      const copyTitle = `${[...source.title].slice(0, 196).join("")} 복사본`;
      await client.query(`insert into resources(id,owner_id,type,title,is_favorite,is_pinned,pin_order,color)
        values($1,$2,'prompt',$3,$4,false,null,$5)`, [copyId, ownerId, copyTitle, source.isFavorite, source.color]);
      await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,$3)", [copyId, ownerId, source.plainText]);
      await writeTokenProjection(client, ownerId, copyId, source.tokens, new Set());
      const prompt = await selectPrompt(client, ownerId, copyId);
      if (!prompt) throw new Error("PROMPT_DUPLICATE_FAILED");
      await recordRequest(client, ownerId, requestId, copyId, "duplicate", requestHash, prompt.rowVersion);
      return { prompt, replayed: false };
    });
  }

  listSuggestions(ownerId: string, search = "", limit = 20): Promise<readonly PromptSuggestion[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError("PROMPT_SUGGESTION_LIMIT_INVALID");
    const normalizedSearch = search.trim() ? normalizePromptToken(search).normalizedValue : "";
    return this.#withUser(ownerId, async (client) => {
      const rows = await client.query<{ display_value: string; normalized_value: string; usage_count: string; last_used_at: Date | null }>(
        `select display_value,normalized_value,usage_count::text,last_used_at from prompt_token_dictionary
         where owner_id=$1 and usage_count>0 and ($2='' or strpos(normalized_value,$2)>0)
         order by usage_count desc,last_used_at desc nulls last,normalized_value,id limit $3`, [ownerId, normalizedSearch, limit]);
      return rows.rows.map((row) => ({ displayValue: row.display_value, normalizedValue: row.normalized_value,
        usageCount: Number(row.usage_count), lastUsedAt: row.last_used_at?.toISOString() ?? null }));
    });
  }

  listSongCandidates(ownerId: string, resourceId: string, search = "", limit = 20): Promise<readonly PromptSongCandidate[] | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new RangeError("PROMPT_SONG_LIMIT_INVALID");
    const normalizedSearch = search.normalize("NFC").trim();
    return this.#withUser(ownerId, async (client) => {
      const prompt = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='prompt' and deleted_at is null", [resourceId, ownerId]);
      if (!prompt.rowCount) return null;
      const rows = await client.query<{ id: string; title: string; is_linked: boolean }>(`select song.id,song.title,
        exists(select 1 from song_resource_links link where link.owner_id=song.owner_id
          and link.song_resource_id=song.id and link.linked_resource_id=$2 and link.linked_resource_type='prompt') is_linked
        from resources song where song.owner_id=$1 and song.type='song' and song.deleted_at is null
          and ($3='' or strpos(lower(song.title),lower($3))>0)
        order by is_linked desc,lower(song.title),song.id limit $4`, [ownerId, resourceId, normalizedSearch, limit]);
      return rows.rows.map((row) => ({ id: row.id, title: row.title, isLinked: row.is_linked }));
    });
  }

  linkSong(ownerId: string, resourceId: string, songId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(songId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const prompt = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='prompt' and deleted_at is null for update", [resourceId, ownerId]);
      const song = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='song' and deleted_at is null", [songId, ownerId]);
      if (!prompt.rowCount || !song.rowCount) return false;
      const linked = await client.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
        values($1,$2,$3,'prompt') on conflict do nothing returning linked_resource_id`, [ownerId, songId, resourceId]);
      if (linked.rowCount) await client.query("update resources set updated_at=clock_timestamp() where id=$1 and owner_id=$2", [resourceId, ownerId]);
      return linked.rowCount === 1;
    });
  }

  unlinkSong(ownerId: string, resourceId: string, songId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(songId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const prompt = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='prompt' and deleted_at is null for update", [resourceId, ownerId]);
      if (!prompt.rowCount) return false;
      const removed = await client.query(`delete from song_resource_links where owner_id=$1 and song_resource_id=$2
        and linked_resource_id=$3 and linked_resource_type='prompt'`, [ownerId, songId, resourceId]);
      if (removed.rowCount) await client.query("update resources set updated_at=clock_timestamp() where id=$1 and owner_id=$2", [resourceId, ownerId]);
      return removed.rowCount === 1;
    });
  }

  deletePrompt(ownerId: string, resourceId: string): Promise<boolean> {
    if (!isResourceId(resourceId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => Boolean((await client.query<{ deleted: boolean }>(
      "select soft_delete_prompt($1) deleted", [resourceId])).rows[0]?.deleted));
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

async function writeTokenProjection(client: PoolClient, ownerId: string, resourceId: string,
  rawTokens: readonly PromptTokenValue[], oldNormalized: ReadonlySet<string>): Promise<void> {
  const tokens = projectUniquePromptTokens(rawTokens);
  await client.query("delete from prompt_tokens where owner_id=$1 and prompt_resource_id=$2", [ownerId, resourceId]);
  for (const [ordinal, token] of tokens.entries()) {
    const increment = oldNormalized.has(token.normalizedValue) ? 0 : 1;
    const dictionary = await client.query<{ id: string }>(`insert into prompt_token_dictionary
      (id,owner_id,display_value,normalized_value,usage_count,last_used_at) values($1,$2,$3,$4,$5,clock_timestamp())
      on conflict(owner_id,normalized_value) do update set
        usage_count=prompt_token_dictionary.usage_count+$5,last_used_at=clock_timestamp()
      returning id`, [randomUUID(), ownerId, token.displayValue, token.normalizedValue, increment]);
    await client.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
      values($1,$2,$3,$4,$5,$6)`, [ownerId, resourceId, ordinal, dictionary.rows[0]!.id, token.displayValue, token.normalizedValue]);
  }
}

async function selectPrompt(client: PoolClient, ownerId: string, resourceId: string): Promise<PromptRecord | null> {
  const row = (await client.query<PromptRow>(`${PROMPT_SELECT} and r.owner_id=$1 and r.id=$2`, [ownerId, resourceId])).rows[0];
  if (!row) return null;
  const [tokens, links] = await Promise.all([
    client.query<PromptTokenRow>(`select display_value,normalized_value from prompt_tokens
      where owner_id=$1 and prompt_resource_id=$2 order by ordinal`, [ownerId, resourceId]),
    client.query<{ song_resource_id: string }>(`select sl.song_resource_id from song_resource_links sl
      join resources song on song.id=sl.song_resource_id and song.owner_id=sl.owner_id
      where sl.owner_id=$1 and sl.linked_resource_id=$2 and sl.linked_resource_type='prompt'
        and song.type='song' and song.deleted_at is null order by sl.song_resource_id`, [ownerId, resourceId])
  ]);
  return {
    id: row.id, title: row.title,
    tokens: tokens.rows.map((token) => ({ displayValue: token.display_value, normalizedValue: token.normalized_value })),
    plainText: row.plain_text, isFavorite: row.is_favorite, isPinned: row.is_pinned,
    pinOrder: row.pin_order, color: row.color, rowVersion: Number(row.row_version),
    linkedSongIds: links.rows.map((link) => link.song_resource_id),
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}

async function lockPrompt(client: PoolClient, ownerId: string, resourceId: string): Promise<PromptRecord | null> {
  await client.query("select id from resources where id=$1 and owner_id=$2 and type='prompt' and deleted_at is null for update", [resourceId, ownerId]);
  return selectPrompt(client, ownerId, resourceId);
}

async function requestLock(client: PoolClient, ownerId: string, requestId: string): Promise<void> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`${ownerId}:${requestId}`]);
}

async function replayRequest(client: PoolClient, ownerId: string, requestId: string, requestHash: string): Promise<WrittenPrompt | null> {
  const row = (await client.query<{ resource_id: string; request_sha256: string }>(
    "select resource_id,request_sha256 from prompt_write_requests where owner_id=$1 and request_id=$2", [ownerId, requestId])).rows[0];
  if (!row) return null;
  if (row.request_sha256 !== requestHash) throw new PromptConflictError("REQUEST_REUSED");
  const prompt = await selectPrompt(client, ownerId, row.resource_id);
  if (!prompt) throw new PromptConflictError("REQUEST_REUSED");
  return { prompt, replayed: true };
}

async function recordRequest(client: PoolClient, ownerId: string, requestId: string, resourceId: string,
  operation: "create" | "duplicate" | "update", requestHash: string, rowVersion: number): Promise<void> {
  await client.query(`insert into prompt_write_requests(owner_id,request_id,resource_id,operation,request_sha256,result_row_version)
    values($1,$2,$3,$4,$5,$6)`, [ownerId, requestId, resourceId, operation, requestHash, rowVersion]);
}

function hashRequest(operation: string, input: unknown): string {
  return createHash("sha256").update(JSON.stringify({ operation, input })).digest("hex");
}
