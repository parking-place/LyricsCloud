import {
  isResourceId,
  parseSaveLyricPositionInput,
  type LyricResumePosition,
  type RecentWorkItem,
  type RecentWorkQuery,
  type SaveLyricPositionInput
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface RecentWorkRow extends QueryResultRow {
  id: string;
  type: RecentWorkItem["type"];
  title: string;
  status: RecentWorkItem["status"];
  updated_at: Date;
  last_opened_at: Date | null;
  activity_at: Date;
  activity_kind: RecentWorkItem["activityKind"];
  parent_song_id: string | null;
  parent_song_title: string | null;
  linked_song_count: string;
  has_work_note: boolean;
  cursor_offset: number | null;
  songform_label: string | null;
  songform_occurrence: number | null;
  scroll_top: number | null;
  viewport: LyricResumePosition["viewport"] | null;
  position_saved_at: Date | null;
  position_basis_updated_at: Date | null;
}

interface PositionRow extends QueryResultRow {
  cursor_offset: number;
  songform_label: string | null;
  songform_occurrence: number | null;
  scroll_top: number;
  viewport: LyricResumePosition["viewport"];
  position_saved_at: Date;
  position_basis_updated_at: Date;
}

export class PostgresRecentWorkStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 5) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  listRecentWork(ownerId: string, query: RecentWorkQuery): Promise<readonly RecentWorkItem[]> {
    if (!["all", "song", "lyrics", "rhyme_note", "prompt"].includes(query.type)
      || !Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 50) {
      throw new Error("RECENT_WORK_INPUT_INVALID");
    }
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<RecentWorkRow>(RECENT_WORK_QUERY, [ownerId, query.type, query.limit]);
      return result.rows.map(mapRecentWork);
    });
  }

  recordOpen(ownerId: string, resourceId: string): Promise<boolean> {
    if (!isResourceId(resourceId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query(`
        insert into recent_items(owner_id,resource_id,resource_type,last_opened_at)
        select r.owner_id,r.id,r.type,clock_timestamp()
        from resources r
        where r.owner_id=$1 and r.id=$2 and r.deleted_at is null
          and r.type in ('song','lyrics','rhyme_note','prompt')
          and (r.type <> 'lyrics' or exists (
            select 1 from lyrics l join resources parent
              on parent.id=l.song_id and parent.owner_id=l.owner_id and parent.type='song' and parent.deleted_at is null
            where l.resource_id=r.id and l.owner_id=r.owner_id
          ))
        on conflict(owner_id,resource_id) do update
          set last_opened_at=greatest(recent_items.last_opened_at,excluded.last_opened_at)
        returning resource_id
      `, [ownerId, resourceId]);
      return result.rowCount === 1;
    });
  }

  getLyricPosition(ownerId: string, resourceId: string): Promise<LyricResumePosition | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<PositionRow>(`
        select ri.cursor_offset,ri.songform_label,ri.songform_occurrence,ri.scroll_top,ri.viewport,
          ri.position_saved_at,ri.position_basis_updated_at
        from recent_items ri
        join resources r on r.id=ri.resource_id and r.owner_id=ri.owner_id and r.type=ri.resource_type
        join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
        join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
          and parent.type='song' and parent.deleted_at is null
        where ri.owner_id=$1 and ri.resource_id=$2 and ri.resource_type='lyrics'
          and r.deleted_at is null and ri.position_saved_at is not null
      `, [ownerId, resourceId]);
      return result.rows[0] ? mapPosition(result.rows[0]) : null;
    });
  }

  saveLyricPosition(ownerId: string, resourceId: string, value: SaveLyricPositionInput): Promise<LyricResumePosition | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    const input = parseSaveLyricPositionInput(value);
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<PositionRow>(`
        insert into recent_items(owner_id,resource_id,resource_type,last_opened_at,cursor_offset,
          songform_label,songform_occurrence,scroll_top,viewport,position_saved_at,position_basis_updated_at)
        select r.owner_id,r.id,r.type,clock_timestamp(),$3,$4,$5,$6,$7,clock_timestamp(),r.updated_at
        from resources r join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
          join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
            and parent.type='song' and parent.deleted_at is null
        where r.owner_id=$1 and r.id=$2 and r.type='lyrics' and r.deleted_at is null
        on conflict(owner_id,resource_id) do update set
          last_opened_at=greatest(recent_items.last_opened_at,excluded.last_opened_at),
          cursor_offset=excluded.cursor_offset,
          songform_label=excluded.songform_label,
          songform_occurrence=excluded.songform_occurrence,
          scroll_top=excluded.scroll_top,
          viewport=excluded.viewport,
          position_saved_at=excluded.position_saved_at,
          position_basis_updated_at=excluded.position_basis_updated_at
        returning cursor_offset,songform_label,songform_occurrence,scroll_top,viewport,
          position_saved_at,position_basis_updated_at
      `, [ownerId, resourceId, input.cursorOffset, input.songformLabel, input.songformOccurrence, input.scrollTop, input.viewport]);
      return result.rows[0] ? mapPosition(result.rows[0]) : null;
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

const RECENT_WORK_QUERY = `
select r.id,r.type,r.title,
  case when r.type='song' then s.status when r.type='lyrics' then l.status else null end as status,
  r.updated_at,ri.last_opened_at,
  greatest(r.updated_at,coalesce(ri.last_opened_at,'epoch'::timestamptz)) as activity_at,
  case when ri.last_opened_at > r.updated_at then 'opened' else 'updated' end as activity_kind,
  case when r.type='lyrics' then parent.id else linked.id end as parent_song_id,
  case when r.type='lyrics' then parent.title else linked.title end as parent_song_title,
  case when r.type='lyrics' then 1 else coalesce(linked.link_count,0) end as linked_song_count,
  case when r.type='song' then btrim(s.work_notes) <> ''
    when r.type='lyrics' then btrim(l.memo) <> '' else false end as has_work_note,
  ri.cursor_offset,ri.songform_label,ri.songform_occurrence,ri.scroll_top,ri.viewport,
  ri.position_saved_at,ri.position_basis_updated_at
from resources r
left join songs s on s.resource_id=r.id and s.owner_id=r.owner_id and r.type='song'
left join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id and r.type='lyrics'
left join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
  and parent.type='song' and parent.deleted_at is null
left join recent_items ri on ri.resource_id=r.id and ri.owner_id=r.owner_id and ri.resource_type=r.type
left join lateral (
  select linked_song.id,linked_song.title,count(*) over()::integer as link_count
  from song_resource_links link join resources linked_song
    on linked_song.id=link.song_resource_id and linked_song.owner_id=link.owner_id
      and linked_song.type='song' and linked_song.deleted_at is null
  where link.owner_id=r.owner_id and link.linked_resource_id=r.id
    and link.linked_resource_type=r.type and r.type in ('rhyme_note','prompt')
  order by linked_song.updated_at desc,linked_song.id desc limit 1
) linked on true
where r.owner_id=$1 and r.deleted_at is null
  and r.type in ('song','lyrics','rhyme_note','prompt')
  and ($2='all' or r.type=$2)
  and (r.type <> 'lyrics' or parent.id is not null)
order by activity_at desc,r.type,r.id
limit $3
`;

function mapRecentWork(row: RecentWorkRow): RecentWorkItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
    lastOpenedAt: row.last_opened_at?.toISOString() ?? null,
    activityAt: row.activity_at.toISOString(),
    activityKind: row.activity_kind,
    parentSong: row.parent_song_id && row.parent_song_title
      ? { id: row.parent_song_id, title: row.parent_song_title }
      : null,
    linkedSongCount: Number(row.linked_song_count),
    hasWorkNote: row.has_work_note,
    position: row.position_saved_at ? mapPosition(row as unknown as PositionRow) : null
  };
}

function mapPosition(row: PositionRow): LyricResumePosition {
  return {
    cursorOffset: row.cursor_offset,
    songformLabel: row.songform_label,
    songformOccurrence: row.songform_occurrence,
    scrollTop: row.scroll_top,
    viewport: row.viewport,
    savedAt: row.position_saved_at.toISOString(),
    basisUpdatedAt: row.position_basis_updated_at.toISOString()
  };
}
