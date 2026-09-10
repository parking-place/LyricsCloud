import { createHash } from "node:crypto";
import {
  escapeSearchLikeLiteral, normalizeSearchText, RECENT_SEARCH_LIMIT, type RecentSearchRecord,
  type RecordRecentSearchInput, type SearchMatchField, type SearchResourceType,
  type UnifiedSearchInput, type UnifiedSearchPage, type UnifiedSearchResult
} from "@lyricscloud/domain";
import { Pool, type PoolClient } from "pg";
import { createDatabasePool } from "./pool.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SearchRow {
  readonly id: string;
  readonly type: SearchResourceType;
  readonly title: string;
  readonly match_field: SearchMatchField;
  readonly preview: string;
  readonly linked_song_ids: string[];
  readonly score: number;
  readonly updated_at: Date;
  readonly updated_cursor: string;
}

interface SearchCursor {
  readonly version: 1;
  readonly signature: string;
  readonly score: number;
  readonly updatedAt: string;
  readonly type: SearchResourceType;
  readonly id: string;
}

interface RecentSearchRow {
  readonly id: string;
  readonly query: string;
  readonly search_type: RecordRecentSearchInput["type"];
  readonly searched_at: Date;
}

export class SearchCursorError extends Error {
  readonly code = "VALIDATION_FAILED";
  constructor() { super("INVALID_SEARCH_CURSOR"); this.name = "SearchCursorError"; }
}

export class PostgresSearchStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 5) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  async search(ownerId: string, input: UnifiedSearchInput): Promise<UnifiedSearchPage> {
    const query = normalizeSearchText(input.query);
    if (!query || [...query].length > 200 || !["all", "song", "lyrics", "rhyme_note", "prompt"].includes(input.type)
      || !Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 50) {
      throw new Error("SEARCH_INPUT_INVALID");
    }
    const normalizedInput = { ...input, query };
    const cursor = input.cursor ? decodeCursor(input.cursor, normalizedInput) : null;
    const escaped = escapeSearchLikeLiteral(query);
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<SearchRow>(SEARCH_QUERY, [
        ownerId, query, `%${escaped}%`, `${escaped}%`, input.type,
        cursor?.score ?? null, cursor?.updatedAt ?? null, cursor?.type ?? null, cursor?.id ?? null,
        input.limit + 1
      ]);
      const hasMore = result.rows.length > input.limit;
      const rows = result.rows.slice(0, input.limit);
      const last = rows.at(-1);
      return {
        items: rows.map(mapResult),
        nextCursor: hasMore && last ? encodeCursor(makeCursor(last, normalizedInput)) : null
      };
    });
  }

  async listRecentSearches(ownerId: string): Promise<readonly RecentSearchRecord[]> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<RecentSearchRow>(`
        select id,query,search_type,searched_at from recent_searches
        where owner_id=$1 order by searched_at desc,id desc limit $2
      `, [ownerId, RECENT_SEARCH_LIMIT]);
      return result.rows.map(mapRecentSearch);
    });
  }

  async recordRecentSearch(ownerId: string, input: RecordRecentSearchInput): Promise<RecentSearchRecord> {
    const query = normalizeSearchText(input.query);
    if (!query || [...query].length > 200 || !["all", "song", "lyrics", "rhyme_note", "prompt"].includes(input.type)) {
      throw new Error("SEARCH_INPUT_INVALID");
    }
    return this.#withUser(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,701))", [ownerId]);
      const result = await client.query<RecentSearchRow>(`
        insert into recent_searches(owner_id,query,search_type) values($1,$2,$3)
        on conflict(owner_id,normalized_query,search_type) do update
          set query=excluded.query,searched_at=clock_timestamp()
        returning id,query,search_type,searched_at
      `, [ownerId, query, input.type]);
      await client.query(`
        delete from recent_searches where owner_id=$1 and id in (
          select id from recent_searches where owner_id=$1
          order by searched_at desc,id desc offset $2
        )
      `, [ownerId, RECENT_SEARCH_LIMIT]);
      return mapRecentSearch(result.rows[0]!);
    });
  }

  async deleteRecentSearch(ownerId: string, id: string): Promise<boolean> {
    if (!UUID.test(id)) return false;
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query("delete from recent_searches where owner_id=$1 and id=$2", [ownerId, id]);
      return result.rowCount === 1;
    });
  }

  async clearRecentSearches(ownerId: string): Promise<number> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query("delete from recent_searches where owner_id=$1", [ownerId]);
      return result.rowCount ?? 0;
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!UUID.test(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
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

const SEARCH_QUERY = `
with candidates as (
  select r.id,'song'::text as type,r.title,'title'::text as match_field,r.title as preview,
    array[r.id]::uuid[] as linked_song_ids,
    case when r.search_title=$2 then 600 when r.search_title like $4 escape '\\' then 500 else 400 end as score,
    r.updated_at
  from resources r join songs s on s.resource_id=r.id and s.owner_id=r.owner_id
  where r.owner_id=$1 and r.type='song' and r.deleted_at is null and ($5='all' or $5='song')
    and r.search_title like $3 escape '\\'

  union all
  select r.id,'lyrics'::text,r.title,
    case when r.search_title like $3 escape '\\' then 'title' else 'body' end,
    case when r.search_title like $3 escape '\\' then r.title
      else left(regexp_replace(l.body,'[[:space:]]+',' ','g'),240) end,
    array[l.song_id]::uuid[],
    case when r.search_title=$2 then 600 when r.search_title like $4 escape '\\' then 500
      when r.search_title like $3 escape '\\' then 400 else 200 end,
    r.updated_at
  from resources r join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
    join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
      and parent.type='song' and parent.deleted_at is null
  where r.owner_id=$1 and r.type='lyrics' and r.deleted_at is null and ($5='all' or $5='lyrics')
    and (r.search_title like $3 escape '\\' or l.search_body like $3 escape '\\')

  union all
  select r.id,'rhyme_note'::text,r.title,
    case when r.search_title like $3 escape '\\' then 'title'
      when matched_tag.display_value is not null then 'tag' else 'body' end,
    case when r.search_title like $3 escape '\\' then r.title
      when matched_tag.display_value is not null then matched_tag.display_value
      else left(regexp_replace(n.body,'[[:space:]]+',' ','g'),240) end,
    coalesce((select array_agg(link.song_resource_id order by link.song_resource_id)
      from song_resource_links link join resources linked_song
        on linked_song.id=link.song_resource_id and linked_song.owner_id=link.owner_id
        and linked_song.type='song' and linked_song.deleted_at is null
      where link.owner_id=r.owner_id and link.linked_resource_id=r.id
        and link.linked_resource_type='rhyme_note'),'{}'::uuid[]),
    case when r.search_title=$2 then 600 when r.search_title like $4 escape '\\' then 500
      when r.search_title like $3 escape '\\' then 400
      when matched_tag.display_value is not null then 300 else 200 end,
    r.updated_at
  from resources r join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
  left join lateral (
    select t.display_value from resource_tags rt join tags t on t.id=rt.tag_id and t.owner_id=rt.owner_id
    where rt.owner_id=r.owner_id and rt.resource_id=r.id and t.deleted_at is null
      and t.search_value like $3 escape '\\'
    order by t.normalized_value,t.id limit 1
  ) matched_tag on true
  where r.owner_id=$1 and r.type='rhyme_note' and r.deleted_at is null and ($5='all' or $5='rhyme_note')
    and (r.search_title like $3 escape '\\' or matched_tag.display_value is not null
      or n.search_body like $3 escape '\\')

  union all
  select r.id,'prompt'::text,r.title,
    case when r.search_title like $3 escape '\\' then 'title' when p.mode='sentence' then 'body' else 'tag' end,
    case when r.search_title like $3 escape '\\' then r.title
      else left(regexp_replace(case when p.mode='sentence' then p.sentence_text else p.plain_text end,'[[:space:]]+',' ','g'),240) end,
    coalesce((select array_agg(link.song_resource_id order by link.song_resource_id)
      from song_resource_links link join resources linked_song
        on linked_song.id=link.song_resource_id and linked_song.owner_id=link.owner_id
        and linked_song.type='song' and linked_song.deleted_at is null
      where link.owner_id=r.owner_id and link.linked_resource_id=r.id
        and link.linked_resource_type='prompt'),'{}'::uuid[]),
    case when r.search_title=$2 then 600 when r.search_title like $4 escape '\\' then 500
      when r.search_title like $3 escape '\\' then 400 else 300 end,
    r.updated_at
  from resources r join prompts p on p.resource_id=r.id and p.owner_id=r.owner_id
  where r.owner_id=$1 and r.type='prompt' and r.deleted_at is null and ($5='all' or $5='prompt')
    and (r.search_title like $3 escape '\\' or p.search_text like $3 escape '\\')
)
select id,type,title,match_field,preview,linked_song_ids,score,updated_at,
  to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_cursor
from candidates
where $6::integer is null or score < $6
  or (score=$6 and (updated_at < $7::timestamptz
    or (updated_at=$7::timestamptz and (type > $8::text or (type=$8::text and id > $9::uuid)))))
order by score desc,updated_at desc,type,id
limit $10
`;

function mapResult(row: SearchRow): UnifiedSearchResult {
  return {
    id: row.id, type: row.type, title: row.title, matchField: row.match_field,
    preview: row.preview, linkedSongIds: row.linked_song_ids,
    score: Number(row.score), updatedAt: row.updated_at.toISOString()
  };
}

function mapRecentSearch(row: RecentSearchRow): RecentSearchRecord {
  return { id: row.id, query: row.query, type: row.search_type, searchedAt: row.searched_at.toISOString() };
}

function signature(input: UnifiedSearchInput): string {
  return createHash("sha256").update(JSON.stringify([input.query, input.type, input.limit]))
    .digest("base64url").slice(0, 20);
}

function makeCursor(row: SearchRow, input: UnifiedSearchInput): SearchCursor {
  return {
    version: 1, signature: signature(input), score: Number(row.score), updatedAt: row.updated_cursor,
    type: row.type, id: row.id
  };
}

function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string, input: UnifiedSearchInput): SearchCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SearchCursor>;
    if (parsed.version !== 1 || parsed.signature !== signature(input) || !Number.isInteger(parsed.score)
      || typeof parsed.updatedAt !== "string"
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(parsed.updatedAt)
      || !["song", "lyrics", "rhyme_note", "prompt"].includes(parsed.type ?? "")
      || typeof parsed.id !== "string" || !UUID.test(parsed.id)) throw new SearchCursorError();
    return parsed as SearchCursor;
  } catch (error) {
    if (error instanceof SearchCursorError) throw error;
    throw new SearchCursorError();
  }
}
