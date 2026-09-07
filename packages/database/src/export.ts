import type { Pool, PoolClient } from "pg";
import { createDatabasePool } from "./pool.js";

export interface ExportRecord {
  readonly section: string;
  readonly data: Record<string, unknown>;
}

export interface ExportReadableResource {
  readonly id: string;
  readonly type: "song" | "lyrics" | "rhyme_note" | "prompt";
  readonly title: string;
  readonly deletedAt: string | null;
  readonly songId: string | null;
  readonly status: string | null;
  readonly description: string;
  readonly workNotes: string;
  readonly body: string;
  readonly memo: string;
  readonly plainText: string;
}

export interface ExportReadableTemplate {
  readonly id: string;
  readonly type: "lyrics" | "prompt";
  readonly title: string;
  readonly lyricBody: string | null;
  readonly promptTokens: readonly string[] | null;
  readonly deletedAt: string | null;
}

export class PostgresExportStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 3) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  async openSnapshot(ownerId: string): Promise<ExportSnapshot> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin isolation level repeatable read read only");
      const result = await client.query<{ exported_at: Date }>("select transaction_timestamp() exported_at");
      const bootstrap = await client.query<{ section: string; data: Record<string, unknown> }>(`
        select 'account' section,jsonb_build_object('id',u.id,'status',u.status,'created_at',u.created_at,'updated_at',u.updated_at) data
          from app_users u where u.id=$1
        union all select 'profile',to_jsonb(p)-'owner_id' from user_profiles p where p.owner_id=$1
        union all select 'identities',to_jsonb(i)-'user_id' from auth_identities i where i.user_id=$1`, [ownerId]);
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      return new ExportSnapshot(client, result.rows[0]!.exported_at, bootstrap.rows);
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      client.release();
      throw error;
    }
  }

  async close(): Promise<void> { await this.#pool.end(); }
}

export class ExportSnapshot {
  #closed = false;

  constructor(private readonly client: PoolClient, readonly exportedAt: Date, private readonly bootstrap: readonly ExportRecord[]) {}

  async *records(batchSize = 50): AsyncGenerator<ExportRecord> {
    for (const record of this.bootstrap) yield record;
    for (const section of EXPORT_SECTIONS) {
      for await (const data of this.#rows(section.query, batchSize)) yield { section: section.name, data };
    }
  }

  async *readableResources(batchSize = 50): AsyncGenerator<ExportReadableResource> {
    for await (const row of this.#rows(READABLE_RESOURCES_QUERY, batchSize)) {
      yield {
        id: String(row.id), type: row.type as ExportReadableResource["type"], title: String(row.title),
        deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : null,
        songId: typeof row.song_id === "string" ? row.song_id : null,
        status: typeof row.status === "string" ? row.status : null,
        description: String(row.description ?? ""), workNotes: String(row.work_notes ?? ""),
        body: String(row.body ?? ""), memo: String(row.memo ?? ""), plainText: String(row.plain_text ?? "")
      };
    }
  }

  async *readableTemplates(batchSize = 50): AsyncGenerator<ExportReadableTemplate> {
    for await (const row of this.#rows(READABLE_TEMPLATES_QUERY, batchSize)) {
      yield {
        id: String(row.id), type: row.type as ExportReadableTemplate["type"], title: String(row.title),
        lyricBody: typeof row.lyric_body === "string" ? row.lyric_body : null,
        promptTokens: Array.isArray(row.prompt_tokens) ? row.prompt_tokens.map(String) : null,
        deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : null
      };
    }
  }

  async settings(): Promise<Record<string, unknown>> {
    this.#assertOpen();
    const result = await this.client.query<{ data: Record<string, unknown> }>(`select jsonb_build_object(
      'profile',coalesce((select to_jsonb(p)-'owner_id' from user_profiles p where owner_id=app_current_user_id()),'{}'::jsonb),
      'settings',coalesce((select to_jsonb(s)-'owner_id' from user_settings s where owner_id=app_current_user_id()),'{}'::jsonb),
      'lyricOverrides',coalesce((select jsonb_agg(to_jsonb(d)-'owner_id' order by lyric_id) from lyric_display_settings d where owner_id=app_current_user_id()),'[]'::jsonb)
    ) data`);
    return result.rows[0]!.data;
  }

  async close(success = false): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    try { await this.client.query(success ? "commit" : "rollback"); }
    finally { this.client.release(); }
  }

  async *#rows(query: string, batchSize: number): AsyncGenerator<Record<string, unknown>> {
    this.#assertOpen();
    const size = Math.max(1, Math.min(200, Math.floor(batchSize)));
    const cursor = `export_cursor_${Math.random().toString(36).slice(2)}`;
    await this.client.query(`declare ${cursor} no scroll cursor for ${query}`);
    try {
      while (true) {
        const result = await this.client.query<Record<string, unknown>>(`fetch forward ${size} from ${cursor}`);
        if (!result.rowCount) break;
        for (const row of result.rows) yield row.data && typeof row.data === "object" ? row.data as Record<string, unknown> : row;
      }
    } finally { await this.client.query(`close ${cursor}`).catch(() => undefined); }
  }

  #assertOpen(): void { if (this.#closed) throw new Error("EXPORT_SNAPSHOT_CLOSED"); }
}

const EXPORT_SECTIONS = [
  { name: "resources", query: `select to_jsonb(q) data from (select r.id,r.type,r.title,r.is_favorite,r.is_pinned,r.pin_order,r.color,r.row_version,r.created_at,r.updated_at,r.deletion_batch_id,r.deleted_at,r.purge_at from resources r where owner_id=app_current_user_id() order by type,created_at,id) q` },
  { name: "songs", query: `select to_jsonb(q) data from (select resource_id,status,description,work_notes from songs where owner_id=app_current_user_id() order by resource_id) q` },
  { name: "lyrics", query: `select to_jsonb(q) data from (select resource_id,song_id,body,memo,status from lyrics where owner_id=app_current_user_id() order by resource_id) q` },
  { name: "rhymeNotes", query: `select to_jsonb(q) data from (select resource_id,body from rhyme_notes where owner_id=app_current_user_id() order by resource_id) q` },
  { name: "prompts", query: `select to_jsonb(q) data from (select resource_id,plain_text from prompts where owner_id=app_current_user_id() order by resource_id) q` },
  { name: "promptDictionary", query: `select to_jsonb(q) data from (select id,display_value,normalized_value,usage_count,last_used_at,created_at,updated_at from prompt_token_dictionary where owner_id=app_current_user_id() order by id) q` },
  { name: "promptTokens", query: `select to_jsonb(q) data from (select prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value,created_at from prompt_tokens where owner_id=app_current_user_id() order by prompt_resource_id,ordinal) q` },
  { name: "tags", query: `select to_jsonb(q) data from (select id,display_value,normalized_value,created_at,updated_at,deleted_at from tags where owner_id=app_current_user_id() order by id) q` },
  { name: "resourceTags", query: `select to_jsonb(q) data from (select resource_id,tag_id,created_at from resource_tags where owner_id=app_current_user_id() order by resource_id,tag_id) q` },
  { name: "songResourceLinks", query: `select to_jsonb(q) data from (select song_resource_id,linked_resource_id,linked_resource_type,created_at from song_resource_links where owner_id=app_current_user_id() order by song_resource_id,linked_resource_id) q` },
  { name: "templates", query: `select to_jsonb(q) data from (select t.id,case when t.owner_id is null then 'built_in' else 'owned' end source,t.type,t.title,t.lyric_body,t.prompt_tokens,t.row_version,t.created_at,t.updated_at,t.deleted_at,t.purge_at from templates t where t.owner_id=app_current_user_id() or (t.owner_id is null and exists(select 1 from template_preferences p where p.owner_id=app_current_user_id() and p.template_id=t.id)) order by source,t.type,t.id) q` },
  { name: "templatePreferences", query: `select to_jsonb(q) data from (select template_id,is_favorite,use_count,last_used_at,updated_at from template_preferences where owner_id=app_current_user_id() order by template_id) q` },
  { name: "settings", query: `select to_jsonb(q) data from (select theme,writing_font,font_size,line_height,letter_spacing,focus_mode_default,row_version,updated_at from user_settings where owner_id=app_current_user_id()) q` },
  { name: "lyricDisplaySettings", query: `select to_jsonb(q) data from (select lyric_id,writing_font,font_size,line_height,letter_spacing,row_version,updated_at from lyric_display_settings where owner_id=app_current_user_id() order by lyric_id) q` },
  { name: "recentItems", query: `select to_jsonb(q) data from (select resource_id,resource_type,last_opened_at,cursor_offset,songform_label,songform_occurrence,scroll_top,viewport,position_saved_at,position_basis_updated_at from recent_items where owner_id=app_current_user_id() order by resource_id) q` },
  { name: "recentSearches", query: `select to_jsonb(q) data from (select id,query,search_type,searched_at from recent_searches where owner_id=app_current_user_id() order by searched_at,id) q` },
  { name: "lyricRevisions", query: `select to_jsonb(q) data from (select d.resource_id,r.id,r.body,r.reason,r.created_at from lyric_revisions r join sync_documents d on d.document_key=r.document_key and d.owner_id=r.owner_id where r.owner_id=app_current_user_id() order by d.resource_id,r.created_at,r.sequence) q` }
] as const;

const READABLE_RESOURCES_QUERY = `select r.id,r.type,r.title,r.deleted_at,l.song_id,
  coalesce(s.status,l.status) status,coalesce(s.description,'') description,coalesce(s.work_notes,'') work_notes,
  coalesce(l.body,n.body,'') body,coalesce(l.memo,'') memo,coalesce(p.plain_text,'') plain_text
from resources r left join songs s on s.resource_id=r.id and s.owner_id=r.owner_id
left join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
left join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
left join prompts p on p.resource_id=r.id and p.owner_id=r.owner_id
where r.owner_id=app_current_user_id() order by r.type,r.created_at,r.id`;

const READABLE_TEMPLATES_QUERY = `select id,type,title,lyric_body,prompt_tokens,deleted_at from templates
where owner_id=app_current_user_id() order by type,created_at,id`;
