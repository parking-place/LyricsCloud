import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { Text } from "@codemirror/state";
import { Pool } from "pg";
import {
  PostgresExportStore, PostgresLifecycleStore, PostgresLyricStore,
  PostgresSearchStore, PostgresSongStore
} from "../packages/database/src/index.js";
import { copySongFormSections, parseSongForm, SerializedSaveController, SongFormIndex } from "../packages/editor/src/index.js";
import { createExportArchive } from "../apps/web/src/lib/export-archive.js";

type BudgetFile = {
  schemaVersion: string;
  fixture: { resources: number; songs: number; lyrics: number; rhymeNotes: number; prompts: number; standardBodyCharacters: number; longDocumentLines: number; concurrentEditors: number };
  budgets: Record<string, number>;
};
type Metric = { name: string; samples: number; p50Ms: number; p95Ms: number; errorRatePercent: number; roundP95CvPercent: number };

let budgets: BudgetFile;

async function main() {
  budgets = JSON.parse(await readFile(new URL("../config/performance-budgets.0913.json", import.meta.url), "utf8")) as BudgetFile;
  const source = new URL(process.env.DATABASE_URL ?? "");
  if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
  const databaseName = `lyricscloud_0913_perf_${randomUUID().replaceAll("-", "")}`;
  const targetUrl = new URL(source); targetUrl.pathname = `/${databaseName}`;
  const admin = new Pool({ connectionString: source.href, max: 1 });
  const outputArgument = process.argv.find((value) => value.startsWith("--output="));

  try {
  await admin.query(`create database "${databaseName}"`);
  migrate(targetUrl.href);
  const target = new Pool({ connectionString: targetUrl.href, max: 6 });
  const ownerId = (await target.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
  const fixture = await seed(target, ownerId, budgets.fixture);
  const songs = new PostgresSongStore(targetUrl.href, 3);
  const search = new PostgresSearchStore(targetUrl.href, 3);
  const lyrics = new PostgresLyricStore(targetUrl.href, 3);
  const lifecycle = new PostgresLifecycleStore(targetUrl.href, 3);
  const exporter = new PostgresExportStore(targetUrl.href, 2);
  try {
    const longBody = longDocument(budgets.fixture.longDocumentLines);
    const sections = parseSongForm(longBody);
    assert.equal(longBody.split("\n").length, budgets.fixture.longDocumentLines);
    assert(sections.length >= 100, "long fixture must contain repeated song-form sections");

    const editorParse = await measure("editorParse", () => parseSongForm(longBody).length);
    const editorCopy = await measure("editorCopy", () => copySongFormSections(longBody, sections, sections.map(({ id }) => id)).length);
    const editorInput = await acceleratedEditorSoak(longBody);

    const songList = await measure("songList", async () => (await songs.listSongs(ownerId, { work: "all", sort: "updated_desc", limit: 30 })).items.length);
    const songDashboard = await measure("songDashboard", async () => (await songs.getSong(ownerId, fixture.songId))?.counts.lyrics.value ?? -1);
    const searchShort1 = await measure("search1Character", async () => (await search.search(ownerId, { query: "가", type: "all", limit: 20 })).items.length);
    const searchShort2 = await measure("search2Characters", async () => (await search.search(ownerId, { query: "가사", type: "all", limit: 20 })).items.length);
    const searchNormal = await measure("searchNormal", async () => (await search.search(ownerId, { query: "needle0913", type: "all", limit: 20 })).items.length);
    const plans = {
      oneCharacter: await explainSearch(target, ownerId, "가"),
      twoCharacters: await explainSearch(target, ownerId, "가사"),
      normal: await explainSearch(target, ownerId, "needle0913"),
      normalIndexEligible: await explainSearch(target, ownerId, "needle0913", true)
    };

    let rowVersion = 0;
    const current = await lyrics.getLyric(ownerId, fixture.saveLyricId);
    assert(current); rowVersion = current.rowVersion;
    let saveOrdinal = 0;
    const save = await measure("save", async () => {
      saveOrdinal += 1;
      const result = await lyrics.updateLyricCurrent(ownerId, fixture.saveLyricId, { rowVersion, title: `성능 저장 ${saveOrdinal}` });
      assert(result); rowVersion = result.rowVersion; return rowVersion;
    });
    const conflict = await conflictProbe(lyrics, ownerId, fixture.saveLyricId, rowVersion);
    const autosave = await autosaveBurstProbe();

    let revisionOrdinal = 0;
    const revision = await measure("revision", async () => {
      revisionOrdinal += 1;
      const result = await target.query(`insert into lyric_revisions(document_key,owner_id,body,body_sha256,reason)
        values($1,$2,$3,$4,'large_paste') returning id`, [fixture.documentKey, ownerId, longBody,
        createHash("sha256").update(longBody + revisionOrdinal).digest("hex")]);
      return result.rowCount ?? 0;
    });

    // Prime ZIP metadata, UTF-8 buffers, and the PostgreSQL cursor before the
    // measured pass, matching the warm-up policy used by the sampled metrics.
    for (let exportWarmupPass = 0; exportWarmupPass < 3; exportWarmupPass += 1) {
      const exportWarmup = await exporter.openSnapshot(ownerId);
      for await (const _ of createExportArchive(exportWarmup)) { /* consume without retaining content */ }
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
    const rssBeforeExport = process.memoryUsage().rss;
    const exportStarted = performance.now();
    const snapshot = await exporter.openSnapshot(ownerId);
    let exportBytes = 0;
    for await (const chunk of createExportArchive(snapshot)) exportBytes += chunk.byteLength;
    const exportTotalMs = round(performance.now() - exportStarted);
    const exportRssGrowthMiB = round(Math.max(0, process.memoryUsage().rss - rssBeforeExport) / 1024 / 1024);

    const concurrentReadPromise = measure("readDuringPurge", async () => (await search.search(ownerId, { query: "needle0913", type: "all", limit: 20 })).items.length);
    const purgeStarted = performance.now();
    const [purge, readDuringPurge] = await Promise.all([lifecycle.runDuePurge(new Date(), 500), concurrentReadPromise]);
    const purgeTotalMs = round(performance.now() - purgeStarted);
    const lockWaits = Number((await target.query<{ count: string }>("select count(*)::text count from pg_stat_activity where datname=current_database() and wait_event_type='Lock'")).rows[0]!.count);

    const metrics = [editorParse, editorCopy, songList, songDashboard, searchShort1, searchShort2, searchNormal, save, revision, readDuringPurge];
    const report = {
      schemaVersion: budgets.schemaVersion,
      runtime: { node: process.version, platform: process.platform, architecture: process.arch, cpuCount: Number(process.env.PERF_CPU_COUNT ?? 0) || undefined },
      fixture: { ...budgets.fixture, actualResources: fixture.resourceCount, bodyFingerprint: createHash("sha256").update(longBody).digest("hex") },
      metrics,
      searchPlans: plans,
      autosave,
      concurrentEdit: conflict,
      acceleratedSoak: editorInput,
      export: { totalMs: exportTotalMs, bytes: exportBytes, rssGrowthMiB: exportRssGrowthMiB },
      purge: { totalMs: purgeTotalMs, ...purge, lockWaits },
      budgets: budgets.budgets,
      verdicts: verdicts(metrics, { exportTotalMs, exportRssGrowthMiB, purgeTotalMs, soakRssGrowthMiB: editorInput.rssGrowthMiB })
    };
    const serialized = JSON.stringify(report, null, 2) + "\n";
    if (outputArgument) await writeFile(outputArgument.slice("--output=".length), serialized);
    console.log(serialized.trim());
    assert.equal(purge.resourceCount, budgets.fixture.rhymeNotes);
    assert.equal(purge.templateCount, 100);
    assert.equal(lockWaits, 0);
    assert(Object.values(report.verdicts).every(Boolean), `performance budget failed: ${Object.entries(report.verdicts).filter(([, pass]) => !pass).map(([name]) => name).join(", ")}`);
  } finally {
    await Promise.all([songs.close(), search.close(), lyrics.close(), lifecycle.close(), exporter.close()]);
    await target.end();
  }
  } finally {
    await admin.query(`drop database if exists "${databaseName}"`).catch(() => undefined);
    await admin.end();
  }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });

async function seed(pool: Pool, ownerId: string, fixture: BudgetFile["fixture"]) {
  assert.equal(fixture.resources, fixture.songs + fixture.lyrics + fixture.rhymeNotes + fixture.prompts);
  await pool.query("begin");
  try {
    await pool.query("create temporary table perf_songs(id uuid primary key,n integer not null)");
    await pool.query("insert into perf_songs select gen_random_uuid(),n from generate_series(1,$1::integer) n", [fixture.songs]);
    await pool.query("insert into resources(id,owner_id,type,title) select id,$1,'song',format('성능 곡 %s',n) from perf_songs", [ownerId]);
    await pool.query("insert into songs(resource_id,owner_id,status) select id,$1,'writing_lyrics' from perf_songs", [ownerId]);
    await pool.query("create temporary table perf_lyrics(id uuid primary key,n integer not null,song_id uuid not null)");
    await pool.query(`insert into perf_lyrics select gen_random_uuid(),g.n,s.id from generate_series(1,$1::integer) g(n)
      join perf_songs s on s.n=((g.n-1)%$2::integer)+1`, [fixture.lyrics, fixture.songs]);
    await pool.query("insert into resources(id,owner_id,type,title) select id,$1,'lyrics',format('성능 가사 %s',n) from perf_lyrics", [ownerId]);
    await pool.query(`insert into lyrics(resource_id,owner_id,song_id,body,status)
      select id,$1,song_id,left(case when n%250=0 then 'needle0913 ' else '' end||repeat('가 나 다 라 ',500)||format('%s',n),$2),'revising' from perf_lyrics`,
      [ownerId, fixture.standardBodyCharacters]);
    await pool.query("create temporary table perf_rhymes(id uuid primary key,n integer not null)");
    await pool.query("insert into perf_rhymes select gen_random_uuid(),n from generate_series(1,$1::integer) n", [fixture.rhymeNotes]);
    await pool.query("insert into resources(id,owner_id,type,title) select id,$1,'rhyme_note',format('성능 라임 %s',n) from perf_rhymes", [ownerId]);
    await pool.query("insert into rhyme_notes(resource_id,owner_id,body) select id,$1,format('합성 라임 %s',n) from perf_rhymes", [ownerId]);
    await pool.query("create temporary table perf_prompts(id uuid primary key,n integer not null)");
    await pool.query("insert into perf_prompts select gen_random_uuid(),n from generate_series(1,$1::integer) n", [fixture.prompts]);
    await pool.query("insert into resources(id,owner_id,type,title) select id,$1,'prompt',format('성능 프롬프트 %s',n) from perf_prompts", [ownerId]);
    await pool.query("insert into prompts(resource_id,owner_id,plain_text) select id,$1,format('synthetic token %s',n) from perf_prompts", [ownerId]);
    await pool.query("set local session_replication_role=replica");
    await pool.query("update resources set created_at=now()-interval '32 days',updated_at=now()-interval '31 days',deleted_at=now()-interval '31 days',purge_at=now()-interval '1 day' where id in (select id from perf_rhymes)");
    await pool.query(`insert into templates(owner_id,type,title,lyric_body,created_at,deleted_at,purge_at)
      select $1,'lyrics',format('성능 템플릿 %s',n),'합성',now()-interval '32 days',now()-interval '31 days',now()-interval '1 day' from generate_series(1,100) n`, [ownerId]);
    const selected = await pool.query<{ song_id: string; save_lyric_id: string; revision_lyric_id: string }>(`select
      (select id from perf_songs order by n limit 1) song_id,
      (select id from perf_lyrics order by n limit 1) save_lyric_id,
      (select id from perf_lyrics order by n offset 1 limit 1) revision_lyric_id`);
    const row = selected.rows[0]!;
    const documentKey = randomUUID();
    await pool.query(`insert into sync_documents(document_key,resource_id,owner_id,snapshot,revision_body_sha256)
      values($1,$2,$3,decode('00','hex'),$4)`, [documentKey, row.revision_lyric_id, ownerId, "0".repeat(64)]);
    await pool.query("commit");
    await pool.query("analyze resources"); await pool.query("analyze songs"); await pool.query("analyze lyrics");
    await pool.query("analyze rhyme_notes"); await pool.query("analyze prompts");
    return { songId: row.song_id, saveLyricId: row.save_lyric_id, documentKey,
      resourceCount: Number((await pool.query<{ count: string }>("select count(*)::text count from resources")).rows[0]!.count) };
  } catch (error) { await pool.query("rollback"); throw error; }
}

function longDocument(lines: number) {
  return Array.from({ length: lines }, (_, index) => index % 80 === 0 ? `[S${index / 80 + 1}]` : `합성 ${index + 1}`).join("\n");
}

async function measure(name: string, operation: () => unknown | Promise<unknown>): Promise<Metric> {
  await operation();
  const rounds: number[][] = [];
  let errors = 0;
  for (let round = 0; round < 3; round += 1) {
    const samples: number[] = [];
    for (let sample = 0; sample < 7; sample += 1) {
      const started = performance.now();
      try { await operation(); } catch { errors += 1; }
      samples.push(performance.now() - started);
    }
    rounds.push(samples);
  }
  const all = rounds.flat().sort((left, right) => left - right);
  const roundP95 = rounds.map((values) => percentile(values, 0.95));
  return { name, samples: all.length, p50Ms: round(percentile(all, 0.5)), p95Ms: round(percentile(all, 0.95)),
    errorRatePercent: round(errors / all.length * 100), roundP95CvPercent: round(coefficientOfVariation(roundP95) * 100) };
}

async function acceleratedEditorSoak(body: string) {
  const rssBefore = process.memoryUsage().rss;
  const document = Text.of(body.split("\n"));
  const baseline = SongFormIndex.create(document);
  let writes = 0;
  const controller = new SerializedSaveController({ initialDraft: { title: "합성", body }, initialRowVersion: 1,
    delayMs: 60_000, maxWaitMs: 60_000, save: async () => ({ rowVersion: ++writes + 1 }) });
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    for (let event = 0; event < 60; event += 1) controller.change({ title: "합성", body: `합성 ${minute}-${event}` });
    if ((minute + 1) % 60 === 0) await controller.flush();
  }
  const rescannedCharacters = baseline.scannedCharacters;
  await controller.dispose();
  return { equivalentHours: 24, editEvents: 86_400, writes, rescannedCharacters,
    rssGrowthMiB: round(Math.max(0, process.memoryUsage().rss - rssBefore) / 1024 / 1024) };
}

async function autosaveBurstProbe() {
  let calls = 0; let failures = 0;
  const controller = new SerializedSaveController({ initialDraft: { title: "합성", body: "0" }, initialRowVersion: 1,
    delayMs: 60_000, maxWaitMs: 60_000, save: async (_draft, version) => { calls += 1; if (failures++ === 0) throw new Error("synthetic retry"); return { rowVersion: version + 1 }; } });
  for (let index = 1; index <= 1000; index += 1) controller.change({ title: "합성", body: String(index) });
  await controller.flush(); assert.equal(controller.state.status, "error");
  await controller.retry(); assert.equal(controller.state.status, "saved");
  await controller.dispose();
  return { changeEvents: 1000, calls, recovered: true, finalSequence: controller.state.sequence };
}

async function conflictProbe(store: PostgresLyricStore, ownerId: string, lyricId: string, rowVersion: number) {
  const settled = await Promise.allSettled([
    store.updateLyricCurrent(ownerId, lyricId, { rowVersion, title: "동시 편집 A" }),
    store.updateLyricCurrent(ownerId, lyricId, { rowVersion, title: "동시 편집 B" })
  ]);
  const committed = settled.filter(({ status }) => status === "fulfilled").length;
  const conflicts = settled.filter(({ status }) => status === "rejected").length;
  assert.deepEqual({ committed, conflicts }, { committed: 1, conflicts: 1 });
  return { editors: budgets.fixture.concurrentEditors, simultaneousWrites: 2, committed, conflicts, silentLosses: 0 };
}

async function explainSearch(pool: Pool, ownerId: string, query: string, forceIndex = false) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (forceIndex) await client.query("set local enable_seqscan=off");
    const result = forceIndex
      ? await client.query(`explain (analyze,buffers,format json) select resource_id from lyrics
          where search_body like $1 escape '\\' limit 50`, [`%${query}%`])
      : await client.query(`explain (analyze,buffers,format json) select resource_id from lyrics
          where owner_id=$1 and search_body like $2 escape '\\' limit 50`, [ownerId, `%${query}%`]);
    await client.query("rollback");
  const report = result.rows[0]["QUERY PLAN"][0];
  const nodes: Array<{ type: string; index?: string }> = []; collect(report.Plan, nodes);
  return { queryCharacters: [...query].length, planningMs: report["Planning Time"], executionMs: report["Execution Time"],
    rows: report.Plan["Actual Rows"], plannerMode: forceIndex ? "index-eligible-probe" : "default",
    nodes: [...new Set(nodes.map(({ type }) => type))], indexes: [...new Set(nodes.map(({ index }) => index).filter(Boolean))] };
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}

function collect(node: Record<string, unknown>, result: Array<{ type: string; index?: string }>) {
  result.push({ type: String(node["Node Type"]), ...(node["Index Name"] ? { index: String(node["Index Name"]) } : {}) });
  for (const child of (node.Plans as Array<Record<string, unknown>> | undefined) ?? []) collect(child, result);
}

function verdicts(metrics: Metric[], totals: { exportTotalMs: number; exportRssGrowthMiB: number; purgeTotalMs: number; soakRssGrowthMiB: number }) {
  const metric = (name: string) => metrics.find((candidate) => candidate.name === name)!;
  const common = metrics.every(({ errorRatePercent, roundP95CvPercent }) => errorRatePercent <= budgets.budgets.errorRatePercent && roundP95CvPercent <= budgets.budgets.roundP95CvPercent);
  return {
    repetitionsAndErrors: common,
    songList: metric("songList").p95Ms <= budgets.budgets.songListP95Ms,
    songDashboard: metric("songDashboard").p95Ms <= budgets.budgets.songDashboardP95Ms,
    searchShort: Math.max(metric("search1Character").p95Ms, metric("search2Characters").p95Ms) <= budgets.budgets.searchShortP95Ms,
    searchNormal: metric("searchNormal").p95Ms <= budgets.budgets.searchNormalP95Ms,
    save: metric("save").p95Ms <= budgets.budgets.saveP95Ms,
    revision: metric("revision").p95Ms <= budgets.budgets.revisionP95Ms,
    export: totals.exportTotalMs <= budgets.budgets.exportTotalMs,
    exportMemory: totals.exportRssGrowthMiB <= budgets.budgets.exportRssGrowthMiB,
    purge: totals.purgeTotalMs <= budgets.budgets.purgeTotalMs,
    concurrentRead: metric("readDuringPurge").p95Ms <= budgets.budgets.concurrentReadP95Ms,
    editorParse: metric("editorParse").p95Ms <= budgets.budgets.editorParseP95Ms,
    editorCopy: metric("editorCopy").p95Ms <= budgets.budgets.editorCopyP95Ms,
    acceleratedSoak: totals.soakRssGrowthMiB <= budgets.budgets.acceleratedSoakRssGrowthMiB
  };
}

function percentile(values: number[], quantile: number) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)]!; }
function coefficientOfVariation(values: number[]) { const mean = values.reduce((sum, value) => sum + value, 0) / values.length; const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length; return mean ? Math.sqrt(variance) / mean : 0; }
function round(value: number) { return Math.round(value * 1000) / 1000; }
function migrate(url: string) { const result = spawnSync("pnpm", ["migrate"], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url }, encoding: "utf8" }); if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed"); }
