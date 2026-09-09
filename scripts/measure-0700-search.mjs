import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0700_perf_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rowCount = 1500;

try {
  await admin.query(`create database "${databaseName}"`);
  migrate();
  const target = new Pool({ connectionString: url.href, max: 1 });
  try {
    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','성능 합성 부모')", [song, owner]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query(`with generated as materialized (
        select gen_random_uuid() id,format('성능 가사 %s',n) title,n from generate_series(1,$3::integer) n
      ), inserted as (
        insert into resources(id,owner_id,type,title)
        select id,$1,'lyrics',title from generated returning id,title
      )
      insert into lyrics(resource_id,owner_id,song_id,body)
      select id,$1,$2,repeat('가 나 다 라 ',1000) || title
        || case when split_part(title,' ',3)::integer % 250=0 then ' needle0700 ' else '' end
      from inserted`, [owner, song, rowCount]);
    await target.query("commit");
    await target.query("analyze resources");
    await target.query("analyze lyrics");

    const measurements = [];
    for (const [label, query] of [["korean_1_char", "가"], ["korean_2_chars", "가사"], ["normal_trigram", "needle0700"]]) {
      await explain(target, owner, query);
      const plan = await explain(target, owner, query);
      measurements.push({ label, queryLength: [...query].length, ...plan });
    }
    console.log(JSON.stringify({ fixture: { lyrics: rowCount, bodyCharacters: 8000 }, measurements }));
  } finally { await target.end(); }
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function explain(target, owner, query) {
  const result = await target.query(`explain (analyze,buffers,format json)
    with body_matches as materialized (
      select resource_id,owner_id from lyrics where owner_id=$1 and search_body like $2 escape '\\'
    )
    select r.id from body_matches l join resources r on r.id=l.resource_id and r.owner_id=l.owner_id
    where r.owner_id=$1 and r.type='lyrics' and r.deleted_at is null
    `, [owner, `%${query}%`]);
  const report = result.rows[0]["QUERY PLAN"][0];
  const nodes = [];
  collect(report.Plan, nodes);
  return {
    planningMs: report["Planning Time"], executionMs: report["Execution Time"], rows: report.Plan["Actual Rows"],
    nodes: [...new Set(nodes.map(({ type }) => type))],
    indexes: [...new Set(nodes.map(({ index }) => index).filter(Boolean))]
  };
}

function collect(node, result) {
  result.push({ type: node["Node Type"], index: node["Index Name"] });
  for (const child of node.Plans ?? []) collect(child, result);
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
