import { createHash, randomUUID } from "node:crypto";
import {
  isResourceId, normalizePromptToken, parseCreateTemplateInput, parseUpdateTemplateInput,
  serializePromptTokens, TemplateConflictError, TemplateValidationError,
  type ApplyTemplateInput, type CreateTemplateInput, type PromptTokenValue,
  type TemplateListInput, type TemplateRecord
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface TemplateRow extends QueryResultRow {
  id: string; owner_id: string | null; type: "lyrics" | "prompt"; title: string;
  lyric_body: string | null; prompt_tokens: string[] | null; is_favorite: boolean;
  use_count: string; last_used_at: Date | null; row_version: string; created_at: Date; updated_at: Date;
}

export interface AppliedTemplate {
  readonly resource: { readonly id: string; readonly type: "lyrics" | "prompt"; readonly title: string };
  readonly replayed: boolean;
}

export type WrittenTemplate = { readonly template: TemplateRecord; readonly replayed: boolean };

const TEMPLATE_SELECT = `select t.id,t.owner_id,t.type,t.title,t.lyric_body,t.prompt_tokens,
  coalesce(pref.is_favorite,false) is_favorite,coalesce(pref.use_count,0)::text use_count,pref.last_used_at,
  t.row_version::text,t.created_at,t.updated_at
  from templates t left join template_preferences pref on pref.template_id=t.id and pref.owner_id=$1
  where t.deleted_at is null and (t.owner_id is null or t.owner_id=$1)`;

export class PostgresTemplateStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 8) { this.#pool = createDatabasePool(databaseUrl, maxConnections); }

  createTemplate(ownerId: string, value: unknown): Promise<WrittenTemplate> {
    const input = parseCreateTemplateInput(value);
    return this.#withUser(ownerId, async (client) => {
      const requestHash = hashRequest("create", input);
      const replay = await replayTemplateRequest(client, ownerId, input.requestId, requestHash);
      if (replay) return replay;
      const id = randomUUID();
      await insertTemplate(client, id, ownerId, input);
      await recordRequest(client, ownerId, input.requestId, "create", requestHash, id, "template");
      return { template: (await selectTemplate(client, ownerId, id))!, replayed: false };
    }, input.requestId);
  }

  getTemplate(ownerId: string, id: string): Promise<TemplateRecord | null> {
    if (!isResourceId(id)) return Promise.resolve(null);
    return this.#withUser(ownerId, (client) => selectTemplate(client, ownerId, id));
  }

  listTemplates(ownerId: string, input: TemplateListInput): Promise<readonly TemplateRecord[]> {
    return this.#withUser(ownerId, async (client) => {
      const values: unknown[] = [ownerId, input.type];
      let source = "";
      if (input.source === "default") source = " and t.owner_id is null";
      if (input.source === "user") source = " and t.owner_id=$1";
      const order = input.sort === "recent_used" ? "pref.last_used_at desc nulls last,t.updated_at desc,t.id"
        : input.sort === "updated_desc" ? "t.updated_at desc,t.id"
        : input.sort === "title_asc" ? "lower(t.title),t.id"
        : "coalesce(pref.is_favorite,false) desc,t.updated_at desc,t.id";
      const result = await client.query<TemplateRow>(`${TEMPLATE_SELECT} and t.type=$2${source} order by ${order}`, values);
      return result.rows.map(mapTemplate);
    });
  }

  updateTemplate(ownerId: string, id: string, value: unknown): Promise<TemplateRecord | null> {
    if (!isResourceId(id)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const current = await selectTemplate(client, ownerId, id, true);
      if (!current || current.source === "default") return null;
      const input = parseUpdateTemplateInput(value, current.type);
      if (input.rowVersion !== current.rowVersion) throw new TemplateConflictError();
      if (input.isFavorite !== undefined) await upsertPreference(client, ownerId, id, input.isFavorite, false);
      const updates: string[] = [];
      const values: unknown[] = [id, ownerId];
      if (input.title !== undefined) { values.push(input.title); updates.push(`title=$${values.length}`); }
      if (input.lyricBody !== undefined) { values.push(input.lyricBody); updates.push(`lyric_body=$${values.length}`); }
      if (input.tokens !== undefined) { values.push(input.tokens.map((token) => token.displayValue)); updates.push(`prompt_tokens=$${values.length}`); }
      if (updates.length) {
        updates.push("row_version=row_version+1", "updated_at=clock_timestamp()");
        await client.query(`update templates set ${updates.join(",")} where id=$1 and owner_id=$2 and deleted_at is null`, values);
      }
      return selectTemplate(client, ownerId, id);
    });
  }

  duplicateTemplate(ownerId: string, id: string, requestId: string): Promise<WrittenTemplate | null> {
    if (!isResourceId(id) || !isResourceId(requestId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const requestHash = hashRequest("duplicate", { id });
      const replay = await replayTemplateRequest(client, ownerId, requestId, requestHash);
      if (replay) return replay;
      const source = await selectTemplate(client, ownerId, id);
      if (!source) return null;
      const copyId = randomUUID();
      const input: CreateTemplateInput = {
        requestId, type: source.type, title: `${[...source.title].slice(0, 196).join("")} 복사본`,
        lyricBody: source.lyricBody, tokens: source.tokens
      };
      await insertTemplate(client, copyId, ownerId, input);
      await recordRequest(client, ownerId, requestId, "duplicate", requestHash, copyId, "template");
      return { template: (await selectTemplate(client, ownerId, copyId))!, replayed: false };
    }, requestId);
  }

  deleteTemplate(ownerId: string, id: string): Promise<boolean> {
    if (!isResourceId(id)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => (await client.query(
      "update templates set deleted_at=clock_timestamp(),row_version=row_version+1,updated_at=clock_timestamp() where id=$1 and owner_id=$2 and deleted_at is null", [id, ownerId])).rowCount === 1);
  }

  setFavorite(ownerId: string, id: string, value: boolean): Promise<TemplateRecord | null> {
    if (!isResourceId(id)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      if (!await selectTemplate(client, ownerId, id)) return null;
      await upsertPreference(client, ownerId, id, value, false);
      return selectTemplate(client, ownerId, id);
    });
  }

  applyTemplate(ownerId: string, id: string, input: ApplyTemplateInput): Promise<AppliedTemplate | null> {
    if (!isResourceId(id)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const requestHash = hashRequest("apply", { id, ...input });
      const replay = await replayApplyRequest(client, ownerId, input.requestId, requestHash);
      if (replay) return replay;
      const template = await selectTemplate(client, ownerId, id);
      if (!template) return null;
      if (template.type !== input.targetType) throw new TemplateValidationError([{ field: "targetType", code: "template_type_mismatch" }]);
      const resourceId = randomUUID();
      if (input.targetType === "lyrics") {
        const song = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='song' and deleted_at is null for update", [input.songId, ownerId]);
        if (!song.rowCount) return null;
        await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'lyrics',$3)", [resourceId, ownerId, input.title]);
        await client.query("insert into lyrics(resource_id,owner_id,song_id,body,memo,status) values($1,$2,$3,$4,'','draft')", [resourceId, ownerId, input.songId, template.lyricBody ?? ""]);
      } else {
        await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'prompt',$3)", [resourceId, ownerId, input.title]);
        const tokens = template.tokens;
        await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,$3)", [resourceId, ownerId, serializePromptTokens(tokens)]);
        for (const [ordinal, token] of tokens.entries()) await insertPromptToken(client, ownerId, resourceId, ordinal, token);
      }
      await upsertPreference(client, ownerId, id, undefined, true);
      await recordRequest(client, ownerId, input.requestId, "apply", requestHash, resourceId, input.targetType);
      return { resource: { id: resourceId, type: input.targetType, title: input.title }, replayed: false };
    }, input.requestId);
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>, requestId?: string): Promise<T> {
    if (!isResourceId(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      if (requestId) await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`template:${ownerId}:${requestId}`]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

async function insertTemplate(client: PoolClient, id: string, ownerId: string, input: CreateTemplateInput): Promise<void> {
  await client.query(`insert into templates(id,owner_id,type,title,lyric_body,prompt_tokens)
    values($1,$2,$3,$4,$5,$6)`, [id, ownerId, input.type, input.title, input.lyricBody, input.type === "prompt" ? input.tokens.map((token) => token.displayValue) : null]);
}

async function selectTemplate(client: PoolClient, ownerId: string, id: string, lock = false): Promise<TemplateRecord | null> {
  const row = (await client.query<TemplateRow>(`${TEMPLATE_SELECT} and t.id=$2${lock ? " for update of t" : ""}`, [ownerId, id])).rows[0];
  return row ? mapTemplate(row) : null;
}

function mapTemplate(row: TemplateRow): TemplateRecord {
  return {
    id: row.id, type: row.type, source: row.owner_id === null ? "default" : "user", title: row.title,
    lyricBody: row.lyric_body, tokens: (row.prompt_tokens ?? []).map((value) => normalizePromptToken(value)),
    isFavorite: row.is_favorite, useCount: Number(row.use_count), lastUsedAt: row.last_used_at?.toISOString() ?? null,
    rowVersion: Number(row.row_version), createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}

async function upsertPreference(client: PoolClient, ownerId: string, templateId: string, favorite: boolean | undefined, used: boolean): Promise<void> {
  await client.query(`insert into template_preferences(owner_id,template_id,is_favorite,use_count,last_used_at)
    values($1,$2,coalesce($3,false),case when $4 then 1 else 0 end,case when $4 then clock_timestamp() end)
    on conflict(owner_id,template_id) do update set
      is_favorite=coalesce($3,template_preferences.is_favorite),
      use_count=template_preferences.use_count+case when $4 then 1 else 0 end,
      last_used_at=case when $4 then clock_timestamp() else template_preferences.last_used_at end,
      updated_at=clock_timestamp()`, [ownerId, templateId, favorite ?? null, used]);
}

async function insertPromptToken(client: PoolClient, ownerId: string, promptId: string, ordinal: number, token: PromptTokenValue): Promise<void> {
  const dictionary = await client.query<{ id: string }>(`insert into prompt_token_dictionary
    (id,owner_id,display_value,normalized_value,usage_count,last_used_at) values($1,$2,$3,$4,1,clock_timestamp())
    on conflict(owner_id,normalized_value) do update set usage_count=prompt_token_dictionary.usage_count+1,last_used_at=clock_timestamp()
    returning id`, [randomUUID(), ownerId, token.displayValue, token.normalizedValue]);
  await client.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
    values($1,$2,$3,$4,$5,$6)`, [ownerId, promptId, ordinal, dictionary.rows[0]!.id, token.displayValue, token.normalizedValue]);
}

async function replayTemplateRequest(client: PoolClient, ownerId: string, requestId: string, hash: string): Promise<WrittenTemplate | null> {
  const row = (await client.query<{ request_sha256: string; result_id: string; result_type: string }>(
    "select request_sha256,result_id,result_type from template_requests where owner_id=$1 and request_id=$2", [ownerId, requestId])).rows[0];
  if (!row) return null;
  if (row.request_sha256 !== hash || row.result_type !== "template") throw new TemplateConflictError("REQUEST_REUSED");
  const template = await selectTemplate(client, ownerId, row.result_id);
  if (!template) throw new TemplateConflictError("REQUEST_REUSED");
  return { template, replayed: true };
}

async function replayApplyRequest(client: PoolClient, ownerId: string, requestId: string, hash: string): Promise<AppliedTemplate | null> {
  const row = (await client.query<{ request_sha256: string; result_id: string; result_type: "lyrics" | "prompt" | "template" }>(
    "select request_sha256,result_id,result_type from template_requests where owner_id=$1 and request_id=$2", [ownerId, requestId])).rows[0];
  if (!row) return null;
  if (row.request_sha256 !== hash || row.result_type === "template") throw new TemplateConflictError("REQUEST_REUSED");
  const resource = (await client.query<{ id: string; type: "lyrics" | "prompt"; title: string }>(
    "select id,type,title from resources where id=$1 and owner_id=$2 and type=$3 and deleted_at is null", [row.result_id, ownerId, row.result_type])).rows[0];
  if (!resource) throw new TemplateConflictError("REQUEST_REUSED");
  return { resource, replayed: true };
}

async function recordRequest(client: PoolClient, ownerId: string, requestId: string, operation: "create" | "duplicate" | "apply", hash: string, resultId: string, resultType: "template" | "lyrics" | "prompt"): Promise<void> {
  await client.query(`insert into template_requests(owner_id,request_id,operation,request_sha256,result_id,result_type)
    values($1,$2,$3,$4,$5,$6)`, [ownerId, requestId, operation, hash, resultId, resultType]);
}

function hashRequest(operation: string, input: unknown): string {
  return createHash("sha256").update(JSON.stringify({ operation, input })).digest("hex");
}
