import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { PostgresRecentWorkStore, PostgresSavedResourceStore, PostgresSearchStore } from "../packages/database/src/index.js";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0700_navigation_perf_${randomUUID().replaceAll("-", "")}`;
const targetUrl = new URL(source); targetUrl.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const resourceCount = 2_000;

async function main() {
try {
  await admin.query(`create database "${databaseName}"`);
  migrate(targetUrl.href);
  const target = new Pool({ connectionString: targetUrl.href, max: 1 });
  const ownerId = (await target.query("insert into app_users default values returning id")).rows[0].id as string;
  try {
    await seed(target, ownerId);
    const search = new PostgresSearchStore(targetUrl.href, 1);
    const recent = new PostgresRecentWorkStore(targetUrl.href, 1);
    const saved = new PostgresSavedResourceStore(targetUrl.href, 1);
    try {
      const measurements = await Promise.all([
        measure("search", async () => (await search.search(ownerId, { query: "needle0700", type: "all", limit: 20 })).items.length),
        measure("recent", async () => (await recent.listRecentWork(ownerId, { type: "all", limit: 50 })).length),
        measure("saved", async () => (await saved.list(ownerId, { type: "all", scope: "all", status: "all" })).length)
      ]);
      assert.equal(measurements.find(({ name }) => name === "search")?.rows, 6);
      assert.equal(measurements.find(({ name }) => name === "recent")?.rows, 50);
      assert.equal(measurements.find(({ name }) => name === "saved")?.rows, 480);
      const plans = {
        searchBody: await explain(target, "select resource_id from lyrics where owner_id=$1 and search_body like $2 escape '\\' limit 50", [ownerId, "%needle0700%"]),
        recentAnchor: await explain(target, `select r.id from resources r left join recent_items ri on ri.resource_id=r.id and ri.owner_id=r.owner_id
          where r.owner_id=$1 and r.deleted_at is null order by greatest(r.updated_at,coalesce(ri.last_opened_at,'epoch'::timestamptz)) desc limit 50`, [ownerId]),
        savedAnchor: await explain(target, `select id from resources where owner_id=$1 and deleted_at is null and (is_favorite or is_pinned)
          order by case when is_pinned then 0 else 1 end,pin_order nulls last,updated_at desc limit 500`, [ownerId])
      };
      console.log(JSON.stringify({ fixture: { resources: resourceCount, lyrics: 1500, bodyCharacters: 8000, saved: 480, recent: resourceCount }, measurements, plans }));
    } finally {
      await Promise.all([search.close(), recent.close(), saved.close()]);
    }
  } finally { await target.end(); }
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function seed(target: Pool, ownerId: string) {
  await target.query("begin");
  try {
    await target.query("create temporary table perf_songs(id uuid primary key,n integer not null)");
    await target.query("insert into perf_songs select gen_random_uuid(),n from generate_series(1,500) n");
    await target.query("insert into resources(id,owner_id,type,title) select id,$1,'song',format('성능 곡 %s',n) from perf_songs", [ownerId]);
    await target.query("insert into songs(resource_id,owner_id,status) select id,$1,'writing_lyrics' from perf_songs", [ownerId]);
    await target.query("create temporary table perf_lyrics(id uuid primary key,n integer not null,song_id uuid not null)");
    await target.query(`insert into perf_lyrics
      select gen_random_uuid(),generated.n,(select id from perf_songs where perf_songs.n=((generated.n-1)%500)+1)
      from generate_series(1,1500) as generated(n)`);
    await target.query("insert into resources(id,owner_id,type,title) select id,$1,'lyrics',format('성능 가사 %s',n) from perf_lyrics", [ownerId]);
    await target.query(`insert into lyrics(resource_id,owner_id,song_id,body,status)
      select id,$1,song_id,repeat('가 나 다 라 ',1000)||case when n%250=0 then ' needle0700 ' else '' end||format('성능 가사 %s',n),'revising'
      from perf_lyrics`, [ownerId]);
    await target.query(`with ranked as (select id,row_number() over(order by id) ordinal from resources where owner_id=$1)
      update resources r set is_favorite=(ranked.ordinal%5=0),is_pinned=(ranked.ordinal<=100),
        pin_order=case when ranked.ordinal<=100 then ranked.ordinal-1 else null end
      from ranked where r.id=ranked.id`, [ownerId]);
    await target.query(`insert into recent_items(owner_id,resource_id,resource_type,last_opened_at)
      select owner_id,id,type,clock_timestamp()-(row_number() over(order by id)||' seconds')::interval from resources where owner_id=$1`, [ownerId]);
    await target.query("commit");
  } catch (error) {
    await target.query("rollback");
    throw error;
  }
  await target.query("analyze resources");
  await target.query("analyze songs");
  await target.query("analyze lyrics");
  await target.query("analyze recent_items");
}

async function measure(name: string, operation: () => Promise<number>) {
  await operation();
  const durations: number[] = [];
  let rows = 0;
  for (let index = 0; index < 7; index += 1) {
    const started = performance.now();
    rows = await operation();
    durations.push(performance.now() - started);
  }
  durations.sort((left, right) => left - right);
  return { name, rows, medianMs: round(durations[3]!), p95Ms: round(durations[6]!) };
}

async function explain(target: Pool, sql: string, values: unknown[]) {
  const result = await target.query(`explain (analyze,buffers,format json) ${sql}`, values);
  const report = result.rows[0]["QUERY PLAN"][0];
  const nodes: Array<{ type: string; index?: string }> = [];
  collect(report.Plan, nodes);
  return {
    planningMs: report["Planning Time"], executionMs: report["Execution Time"], rows: report.Plan["Actual Rows"],
    nodes: [...new Set(nodes.map(({ type }) => type))], indexes: [...new Set(nodes.map(({ index }) => index).filter(Boolean))]
  };
}

function collect(node: Record<string, unknown>, result: Array<{ type: string; index?: string }>) {
  result.push({ type: String(node["Node Type"]), ...(node["Index Name"] ? { index: String(node["Index Name"]) } : {}) });
  for (const child of (node.Plans as Array<Record<string, unknown>> | undefined) ?? []) collect(child, result);
}

function round(value: number) { return Math.round(value * 1_000) / 1_000; }

function migrate(url: string) {
  const result = spawnSync("pnpm", ["migrate"], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
