import { createHash } from "node:crypto";
import type { LibraryMoveInput } from "@lyricscloud/domain";
import type { PoolClient } from "pg";

export type LibraryOrderResourceType = "rhyme_note" | "prompt";

export interface LibraryMoveResult {
  readonly itemId: string;
  readonly beforeId: string | null;
  readonly afterId: string | null;
  readonly orderVersion: number;
  readonly changed: boolean;
  readonly replayed: boolean;
}

export class LibraryOrderConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super("ORDER_VERSION_CONFLICT");
    this.name = "LibraryOrderConflictError";
  }
}

export class LibraryOrderNotFoundError extends Error {
  constructor() { super("LIBRARY_ORDER_NOT_FOUND"); this.name = "LibraryOrderNotFoundError"; }
}

export class LibraryOrderPinGroupError extends Error {
  constructor() { super("PIN_GROUP_MISMATCH"); this.name = "LibraryOrderPinGroupError"; }
}

export class LibraryOrderRequestReuseError extends Error {
  constructor() { super("REQUEST_REUSE_MISMATCH"); this.name = "LibraryOrderRequestReuseError"; }
}

const ORDER_GAP = 1_048_576n;

export async function lockLibraryOrder(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType
): Promise<void> {
  await client.query(
    "select pg_advisory_xact_lock(hashtextextended($1,0))",
    [`library-order:${ownerId}:${resourceType}`]
  );
}

export async function ensureLibraryOrder(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType
): Promise<number> {
  await client.query(
    "insert into library_order_states(owner_id,resource_type) values($1,$2) on conflict do nothing",
    [ownerId, resourceType]
  );
  const inserted = await client.query<{ count: string }>(`with missing as (
      select r.id,r.is_pinned,
        row_number() over(partition by r.is_pinned order by r.pin_order nulls last,r.updated_at desc,r.id desc) sequence
      from resources r left join library_order_items item on item.owner_id=r.owner_id
        and item.resource_type=$2 and item.resource_id=r.id
      where r.owner_id=$1 and r.type=$2 and item.resource_id is null
    ), maxima as (
      select pin_group,coalesce(max(sort_rank),0) maximum from library_order_items
      where owner_id=$1 and resource_type=$2 group by pin_group
    ), added as (
      insert into library_order_items(owner_id,resource_type,resource_id,pin_group,sort_rank)
      select $1,$2,missing.id,missing.is_pinned,
        coalesce(maxima.maximum,0) + missing.sequence * 1048576
      from missing left join maxima on maxima.pin_group=missing.is_pinned
      returning 1
    ) select count(*)::text count from added`, [ownerId, resourceType]);
  const added = Number(inserted.rows[0]?.count ?? 0);
  if (added) {
    await client.query(`update library_order_states
      set row_version=row_version+$3,updated_at=clock_timestamp()
      where owner_id=$1 and resource_type=$2`, [ownerId, resourceType, added]);
  }
  const state = await client.query<{ row_version: string }>(`select row_version::text from library_order_states
    where owner_id=$1 and resource_type=$2`, [ownerId, resourceType]);
  return Number(state.rows[0]!.row_version);
}

export async function appendLibraryOrderItem(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType,
  resourceId: string,
  pinGroup: boolean
): Promise<number> {
  const maximum = await client.query<{ rank: string }>(`select coalesce(max(sort_rank),0)::text rank
    from library_order_items where owner_id=$1 and resource_type=$2 and pin_group=$3`,
  [ownerId, resourceType, pinGroup]);
  await client.query(`insert into library_order_items(owner_id,resource_type,resource_id,pin_group,sort_rank)
    values($1,$2,$3,$4,$5)`, [ownerId, resourceType, resourceId, pinGroup,
    (BigInt(maximum.rows[0]?.rank ?? "0") + ORDER_GAP).toString()]);
  return bumpLibraryOrderVersion(client, ownerId, resourceType);
}

export async function moveLibraryOrderPinGroup(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType,
  resourceId: string,
  pinGroup: boolean
): Promise<number> {
  const maximum = await client.query<{ rank: string }>(`select coalesce(max(sort_rank),0)::text rank
    from library_order_items where owner_id=$1 and resource_type=$2 and pin_group=$3`,
  [ownerId, resourceType, pinGroup]);
  await client.query(`update library_order_items
    set pin_group=$4,sort_rank=$5,updated_at=clock_timestamp()
    where owner_id=$1 and resource_type=$2 and resource_id=$3`,
  [ownerId, resourceType, resourceId, pinGroup,
    (BigInt(maximum.rows[0]?.rank ?? "0") + ORDER_GAP).toString()]);
  return bumpLibraryOrderVersion(client, ownerId, resourceType);
}

export async function moveLibraryOrderItem(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType,
  input: LibraryMoveInput
): Promise<LibraryMoveResult> {
  await lockLibraryOrder(client, ownerId, resourceType);
  await ensureLibraryOrder(client, ownerId, resourceType);
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const replay = await client.query<{ request_sha256: string; result_version: string; changed: boolean }>(`
    select request_sha256,result_version::text,changed from library_order_move_requests
    where owner_id=$1 and resource_type=$2 and request_id=$3`, [ownerId, resourceType, input.requestId]);
  if (replay.rows[0]) {
    if (replay.rows[0].request_sha256 !== requestHash) throw new LibraryOrderRequestReuseError();
    return result(input, Number(replay.rows[0].result_version), replay.rows[0].changed, true);
  }

  const state = await client.query<{ row_version: string }>(`select row_version::text from library_order_states
    where owner_id=$1 and resource_type=$2 for update`, [ownerId, resourceType]);
  const currentVersion = Number(state.rows[0]!.row_version);
  if (currentVersion !== input.expectedVersion) throw new LibraryOrderConflictError(currentVersion);

  const requestedIds = [input.itemId, input.beforeId, input.afterId].filter((id): id is string => id !== null);
  const requested = await client.query<{ id: string; is_pinned: boolean }>(`select id,is_pinned from resources
    where owner_id=$1 and type=$2 and deleted_at is null and id=any($3::uuid[]) for update`,
  [ownerId, resourceType, requestedIds]);
  if (requested.rowCount !== new Set(requestedIds).size) throw new LibraryOrderNotFoundError();
  const groups = new Set(requested.rows.map((row) => row.is_pinned));
  if (groups.size !== 1) throw new LibraryOrderPinGroupError();
  const pinGroup = requested.rows[0]!.is_pinned;

  const ordered = await client.query<{ resource_id: string; sort_rank: string }>(`select resource_id,sort_rank::text
    from library_order_items where owner_id=$1 and resource_type=$2 and pin_group=$3
    order by sort_rank,resource_id for update`, [ownerId, resourceType, pinGroup]);
  const original = ordered.rows.map((row) => row.resource_id);
  const without = original.filter((id) => id !== input.itemId);
  const beforeIndex = input.beforeId === null ? -1 : without.indexOf(input.beforeId);
  const afterIndex = input.afterId === null ? -1 : without.indexOf(input.afterId);
  if ((input.beforeId !== null && beforeIndex < 0) || (input.afterId !== null && afterIndex < 0)) {
    throw new LibraryOrderNotFoundError();
  }
  if (beforeIndex >= 0 && afterIndex >= 0 && afterIndex >= beforeIndex) {
    throw new LibraryOrderConflictError(currentVersion);
  }
  const insertionIndex = beforeIndex >= 0 ? beforeIndex : afterIndex + 1;
  const nextOrder = [...without.slice(0, insertionIndex), input.itemId, ...without.slice(insertionIndex)];
  const changed = nextOrder.some((id, index) => id !== original[index]);
  let resultVersion = currentVersion;
  if (changed) {
    const previousRank = insertionIndex === 0 ? 0n
      : BigInt(ordered.rows.find((row) => row.resource_id === without[insertionIndex - 1])!.sort_rank);
    const nextRank = insertionIndex === without.length ? previousRank + ORDER_GAP * 2n
      : BigInt(ordered.rows.find((row) => row.resource_id === without[insertionIndex])!.sort_rank);
    if (nextRank - previousRank <= 1n) {
      await rebalanceLibraryOrderGroup(client, ownerId, resourceType, pinGroup, nextOrder);
    } else {
      await client.query(`update library_order_items set sort_rank=$5,updated_at=clock_timestamp()
        where owner_id=$1 and resource_type=$2 and resource_id=$3 and pin_group=$4`,
      [ownerId, resourceType, input.itemId, pinGroup, ((previousRank + nextRank) / 2n).toString()]);
    }
    resultVersion = await bumpLibraryOrderVersion(client, ownerId, resourceType);
  }
  await client.query(`insert into library_order_move_requests(
      owner_id,resource_type,request_id,request_sha256,item_id,before_id,after_id,expected_version,result_version,changed
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [ownerId, resourceType, input.requestId, requestHash, input.itemId, input.beforeId, input.afterId,
    input.expectedVersion, resultVersion, changed]);
  return result(input, resultVersion, changed, false);
}

async function bumpLibraryOrderVersion(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType
): Promise<number> {
  const updated = await client.query<{ row_version: string }>(`update library_order_states
    set row_version=row_version+1,updated_at=clock_timestamp()
    where owner_id=$1 and resource_type=$2 returning row_version::text`, [ownerId, resourceType]);
  return Number(updated.rows[0]!.row_version);
}

async function rebalanceLibraryOrderGroup(
  client: PoolClient,
  ownerId: string,
  resourceType: LibraryOrderResourceType,
  pinGroup: boolean,
  orderedIds: readonly string[]
): Promise<void> {
  await client.query("set constraints library_order_items_group_rank deferred");
  await client.query(`update library_order_items item set sort_rank=ranked.sort_rank,updated_at=clock_timestamp()
    from (
      select id,(ordinality * 1048576)::bigint sort_rank
      from unnest($4::uuid[]) with ordinality as sequence(id,ordinality)
    ) ranked
    where item.owner_id=$1 and item.resource_type=$2 and item.pin_group=$3 and item.resource_id=ranked.id`,
  [ownerId, resourceType, pinGroup, orderedIds]);
}

function result(
  input: LibraryMoveInput,
  orderVersion: number,
  changed: boolean,
  replayed: boolean
): LibraryMoveResult {
  return {
    itemId: input.itemId,
    beforeId: input.beforeId,
    afterId: input.afterId,
    orderVersion,
    changed,
    replayed
  };
}
