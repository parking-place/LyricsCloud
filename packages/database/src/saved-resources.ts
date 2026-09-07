import {
  isResourceId,
  type SavedResourceItem,
  type SavedResourceMutation,
  type SavedResourceQuery
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface SavedRow extends QueryResultRow {
  id: string; type: SavedResourceItem["type"]; title: string; status: SavedResourceItem["status"];
  is_favorite: boolean; is_pinned: boolean; pin_order: number | null; row_version: string;
  updated_at: Date; last_opened_at: Date | null; parent_song_id: string | null; parent_song_title: string | null;
  linked_song_count: string; has_work_note: boolean;
}
interface MutationRow extends QueryResultRow { id: string; is_favorite: boolean; is_pinned: boolean; pin_order: number | null; row_version: string; }

export class PostgresSavedResourceStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 5) { this.#pool = createDatabasePool(databaseUrl, maxConnections); }

  list(ownerId: string, query: SavedResourceQuery): Promise<readonly SavedResourceItem[]> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<SavedRow>(SAVED_QUERY, [ownerId, query.type, query.songId ?? "", query.status, query.scope]);
      return result.rows.map(mapSaved);
    });
  }

  listSongs(ownerId: string): Promise<readonly { id: string; title: string }[]> {
    return this.#withUser(ownerId, async (client) => (await client.query<{ id: string; title: string }>(`
      select id,title from resources where owner_id=$1 and type='song' and deleted_at is null order by lower(title),id
    `, [ownerId])).rows);
  }

  setFavorite(ownerId: string, resourceId: string, value: boolean): Promise<SavedResourceMutation | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<MutationRow>(`${ELIGIBLE_UPDATE} set is_favorite=$3
        where id=$2 and owner_id=$1 and ${ELIGIBLE_PREDICATE} returning id,is_favorite,is_pinned,pin_order,row_version`, [ownerId, resourceId, value]);
      return result.rows[0] ? mapMutation(result.rows[0]) : null;
    });
  }

  setPinned(ownerId: string, resourceId: string, value: boolean): Promise<SavedResourceMutation | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`saved-pins:${ownerId}`]);
      const target = await client.query<{ id: string; is_pinned: boolean }>(`select id,is_pinned from resources where id=$2 and owner_id=$1 and ${ELIGIBLE_PREDICATE} for update`, [ownerId, resourceId]);
      if (!target.rows[0]) return null;
      if (target.rows[0].is_pinned === value) return selectMutation(client, ownerId, resourceId);
      if (value) {
        await client.query(`update resources set is_pinned=true,pin_order=(select coalesce(max(pin_order),-1)+1 from resources where owner_id=$1 and deleted_at is null and is_pinned)
          where owner_id=$1 and id=$2`, [ownerId, resourceId]);
      } else {
        await client.query("update resources set is_pinned=false,pin_order=null where owner_id=$1 and id=$2", [ownerId, resourceId]);
        await compactPins(client, ownerId);
      }
      return selectMutation(client, ownerId, resourceId);
    });
  }

  reorderPins(ownerId: string, ids: readonly string[]): Promise<readonly SavedResourceMutation[] | null> {
    return this.#withUser(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`saved-pins:${ownerId}`]);
      const current = (await client.query<{ id: string }>(`select id from resources where owner_id=$1 and deleted_at is null and is_pinned and ${ELIGIBLE_PREDICATE} order by pin_order,id for update`, [ownerId])).rows.map(({ id }) => id);
      if (current.length !== ids.length || current.some((id) => !ids.includes(id))) return null;
      if (ids.length) await client.query(`update resources r set pin_order=ordered.position
        from (select id::uuid,(ordinality-1)::integer position from unnest($2::text[]) with ordinality as value(id,ordinality)) ordered
        where r.owner_id=$1 and r.id=ordered.id`, [ownerId, ids]);
      const result = await client.query<MutationRow>(`select id,is_favorite,is_pinned,pin_order,row_version from resources
        where owner_id=$1 and id=any($2::uuid[]) order by pin_order,id`, [ownerId, ids]);
      return result.rows.map(mapMutation);
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }
  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!isResourceId(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin"); await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      const result = await work(client); await client.query("commit"); return result;
    } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
    finally { client.release(); }
  }
}

const ELIGIBLE_UPDATE = "update resources";
const ELIGIBLE_PREDICATE = `deleted_at is null and type in ('song','lyrics','rhyme_note','prompt') and (type <> 'lyrics' or exists (
  select 1 from lyrics l join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id and parent.deleted_at is null
  where l.resource_id=resources.id and l.owner_id=resources.owner_id
))`;

async function compactPins(client: PoolClient, ownerId: string) {
  await client.query(`with ordered as (select id,(row_number() over(order by pin_order,id)-1)::integer position
    from resources where owner_id=$1 and deleted_at is null and is_pinned)
    update resources r set pin_order=ordered.position from ordered where r.id=ordered.id and r.pin_order is distinct from ordered.position`, [ownerId]);
}
async function selectMutation(client: PoolClient, ownerId: string, id: string) {
  const row = (await client.query<MutationRow>("select id,is_favorite,is_pinned,pin_order,row_version from resources where owner_id=$1 and id=$2", [ownerId, id])).rows[0];
  return row ? mapMutation(row) : null;
}
function mapMutation(row: MutationRow): SavedResourceMutation {
  return { id: row.id, isFavorite: row.is_favorite, isPinned: row.is_pinned, pinOrder: row.pin_order, rowVersion: Number(row.row_version) };
}

const SAVED_QUERY = `
select r.id,r.type,r.title,case when r.type='song' then s.status when r.type='lyrics' then l.status else null end status,
  r.is_favorite,r.is_pinned,r.pin_order,r.row_version,r.updated_at,ri.last_opened_at,
  case when r.type='lyrics' then parent.id else linked.id end parent_song_id,
  case when r.type='lyrics' then parent.title else linked.title end parent_song_title,
  case when r.type='lyrics' then 1 else coalesce(linked.link_count,0) end linked_song_count,
  case when r.type='song' then btrim(s.work_notes)<>'' when r.type='lyrics' then btrim(l.memo)<>'' else false end has_work_note
from resources r
left join songs s on s.resource_id=r.id and s.owner_id=r.owner_id and r.type='song'
left join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id and r.type='lyrics'
left join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id and parent.type='song' and parent.deleted_at is null
left join recent_items ri on ri.resource_id=r.id and ri.owner_id=r.owner_id
left join lateral (select song.id,song.title,count(*) over()::integer link_count from song_resource_links link
  join resources song on song.id=link.song_resource_id and song.owner_id=link.owner_id and song.type='song' and song.deleted_at is null
  where link.owner_id=r.owner_id and link.linked_resource_id=r.id and link.linked_resource_type=r.type order by song.updated_at desc,song.id desc limit 1) linked on true
where r.owner_id=$1 and r.deleted_at is null and r.type in ('song','lyrics','rhyme_note','prompt')
  and (r.is_favorite or r.is_pinned) and ($2='all' or r.type=$2)
  and ($3='' or (r.type='song' and r.id=$3::uuid) or (r.type='lyrics' and l.song_id=$3::uuid) or exists (
    select 1 from song_resource_links filter_link where filter_link.owner_id=r.owner_id and filter_link.linked_resource_id=r.id and filter_link.song_resource_id=$3::uuid))
  and ($4='all' or (r.type='song' and s.status=$4) or (r.type='lyrics' and l.status=$4))
  and ($5='all' or ($5='favorites' and r.is_favorite) or ($5='pinned' and r.is_pinned))
  and (r.type<>'lyrics' or parent.id is not null)
order by case when r.is_pinned then 0 else 1 end,r.pin_order nulls last,coalesce(ri.last_opened_at,r.updated_at) desc,r.type,r.id`;

function mapSaved(row: SavedRow): SavedResourceItem {
  return { id: row.id, type: row.type, title: row.title, status: row.status, isFavorite: row.is_favorite, isPinned: row.is_pinned,
    pinOrder: row.pin_order, updatedAt: row.updated_at.toISOString(), lastOpenedAt: row.last_opened_at?.toISOString() ?? null,
    parentSong: row.parent_song_id && row.parent_song_title ? { id: row.parent_song_id, title: row.parent_song_title } : null,
    linkedSongCount: Number(row.linked_song_count), hasWorkNote: row.has_work_note };
}
