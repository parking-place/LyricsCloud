import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";
import { applyLyricUpdate, createLyricDocument, lyricBody } from "../../packages/editor/src/crdt.js";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const convergence = { timeout: 45_000, intervals: [100, 250, 500] };
type Fingerprint = { sha256: string; characters: number };
type CopyWindow = Window & { resilienceCopy?: Promise<Fingerprint> };
type Replicas = { owner: string; pages: [Page, Page, Page]; mobileContext: BrowserContext };

const test = base.extend<{ replicas: Replicas }>({
  replicas: async ({ browser }, use) => {
    requireTestDatabase();
    const owner = randomUUID();
    const contexts: BrowserContext[] = [];
    try {
      const desktop = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
      contexts.push(desktop);
      const mobileContext = await browser.newContext({ baseURL: origin, viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
      contexts.push(mobileContext);
      await account(owner, contexts);
      for (const context of contexts) await installCopyProbe(context);
      const first = await desktop.newPage(), second = await desktop.newPage(), mobile = await mobileContext.newPage();
      await use({ owner, pages: [first, second, mobile], mobileContext });
    } finally {
      // Close pages before their contexts so Playwright's context-close error
      // snapshot cannot attach the document body when an assertion fails.
      const closedPages = await Promise.allSettled(contexts.flatMap((context) => context.pages()).map((page) => page.close()));
      const closed = await Promise.allSettled(contexts.map((context) => context.close()));
      // Even partial fixture setup must remove only its own synthetic owner.
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [owner]).then(() => undefined));
      if ([...closedPages, ...closed].some((result) => result.status === "rejected")) throw new Error("Synthetic browser context cleanup failed");
    }
  }
});

test.use({ trace: "off", screenshot: "off", video: "off" });

test.describe("Phase 5 three-replica browser resilience", () => {
  // The scenario already contains both desktop tabs and a mobile viewport.
  test.skip(({ isMobile }) => isMobile, "the desktop project runs the complete three-replica matrix");
  test.skip(!process.env.E2E_DATABASE_URL, "requires the isolated E2E database");
  test.describe.configure({ timeout: 180_000 });

  test("keeps same-sentence and different-sentence inputs across two PC tabs and an offline mobile viewport", async ({ replicas }) => {
    const { owner, pages, mobileContext } = replicas;
    const [first, second, mobile] = pages;
    const initial = "첫 문장의 기준\n다른 문장의 기준";
    const id = await createLyric(first, initial);
    await openReplicas(pages, id);
    await assertConverged(pages, owner, id, initial);

    // Position all cursors before starting the input calls together. Yjs chooses
    // the order at a shared insertion point; the test must not prescribe it.
    const sameSentence = ["〔가〕", "〔나〕", "〔다〕"];
    await Promise.all(pages.map((page) => page.locator(".cm-content").press("Control+Home")));
    await Promise.all(pages.map((page, index) => page.keyboard.insertText(sameSentence[index]!)));
    const afterSame = await assertConverged(pages, owner, id, initial, sameSentence);

    const differentSentences = ["〔앞〕", "〔뒤〕"];
    await Promise.all([
      first.locator(".cm-content").press("Control+Home"),
      second.locator(".cm-content").press("Control+End")
    ]);
    await Promise.all([first.keyboard.insertText(differentSentences[0]!), second.keyboard.insertText(differentSentences[1]!)]);
    const beforeOffline = await assertConverged(pages, owner, id, afterSame, differentSentences);

    await mobileContext.setOffline(true);
    const offlineInput = "〔모바일초안〕";
    await mobile.locator(".cm-content").press("Control+End");
    await mobile.keyboard.insertText(offlineInput);
    await expect(mobile.getByText("오프라인 · 이 기기에 임시 저장됨", { exact: true })).toBeVisible();
    await expect.poll(() => copiedFingerprint(mobile), convergence).toEqual(fingerprint(beforeOffline + offlineInput));

    const onlineInputs = ["〔온라인앞〕", "〔온라인뒤〕"];
    await Promise.all([
      first.locator(".cm-content").press("Control+Home"),
      second.locator(".cm-content").press("Control+End")
    ]);
    await Promise.all([first.keyboard.insertText(onlineInputs[0]!), second.keyboard.insertText(onlineInputs[1]!)]);
    await assertConverged([first, second], owner, id, beforeOffline, onlineInputs);
    // The offline page retains its own draft and has not received PC changes.
    expect(await copiedFingerprint(mobile)).toEqual(fingerprint(beforeOffline + offlineInput));
    expect((await databaseState(owner, id)).body.includes(offlineInput)).toBe(false);

    await mobileContext.setOffline(false);
    await assertConverged(pages, owner, id, beforeOffline, [...onlineInputs, offlineInput]);
  });

  test("measures one small replacement in a 100000-character Korean document across all three replicas", async ({ replicas }, testInfo) => {
    const { owner, pages } = replicas;
    const [first, , mobile] = pages;
    // Including newlines, this is exactly 100,000 Unicode characters. Replacing
    // one character in a single input never crosses the server's document limit.
    const initial = ("가나다라마바사아자".repeat(11) + "\n").repeat(1000);
    expect([...initial].length).toBe(100_000);
    const id = await createLyric(first, initial);
    let updatePayloadBytes = 0;
    let measuring = false;
    // Capture byte counts only, without storing frames, IDs or authentication.
    for (const page of pages) page.on("websocket", (socket) => {
      if (!new URL(socket.url()).pathname.startsWith("/collaboration/sync/")) return;
      socket.on("framesent", ({ payload }) => {
        if (!measuring) return;
        const envelope = JSON.parse(String(payload)) as { type?: string; payload?: string };
        if (envelope.type === "update" && typeof envelope.payload === "string") updatePayloadBytes += Buffer.byteLength(envelope.payload, "base64");
      });
    });
    await openReplicas(pages, id);
    await assertConverged(pages, owner, id, initial);

    await mobile.locator(".cm-content").press("Control+Home");
    await mobile.locator(".cm-content").press("Shift+ArrowRight");
    const expected = "힣" + initial.slice(1);
    const started = performance.now();
    measuring = true;
    await mobile.keyboard.insertText("힣");
    const projected = (async () => {
      await expect.poll(async () => {
        const state = await databaseState(owner, id);
        return state.current && state.body === expected && state.crdt === expected;
      }, convergence).toBe(true);
      return (await databaseState(owner, id)).projectionLagMs;
    })();
    const [synchronizationMs, projectionLagMs] = await Promise.all([
      Promise.all(pages.map(async (page) => {
        await expect.poll(() => copiedFingerprint(page), convergence).toEqual(fingerprint(expected));
      })).then(() => performance.now() - started),
      projected
    ]);
    await Promise.all(pages.map(ready));
    const persisted = await databaseState(owner, id);
    measuring = false;
    expect(updatePayloadBytes).toBeGreaterThan(0);
    expect(persisted.snapshotBytes).toBeGreaterThan(0);
    expect(persisted.current).toBe(true);
    expect(fingerprint(persisted.crdt)).toEqual(fingerprint(expected));
    expect(fingerprint(persisted.body)).toEqual(fingerprint(expected));
    expect(Number.isFinite(projectionLagMs)).toBe(true);
    expect(projectionLagMs).toBeGreaterThanOrEqual(0);
    // Times are observations, not performance pass/fail budgets. The projection
    // interval uses DB receipt/projected timestamps, avoiding browser clock skew.
    await testInfo.attach("three-replica-large-document-metrics", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify({ synchronizationMs, updatePayloadBytes, snapshotBytes: persisted.snapshotBytes, projectionLagMs }))
    });
  });
});

function requireTestDatabase() {
  let safe = false;
  try {
    const value = process.env.E2E_DATABASE_URL;
    if (value) {
      const url = new URL(value);
      safe = ["postgres:", "postgresql:"].includes(url.protocol) && decodeURIComponent(url.pathname.slice(1)).endsWith("_test");
    }
  } catch { /* Do not include a malformed URL (which may contain credentials). */ }
  if (!safe) throw new Error("E2E_DATABASE_URL must name a disposable *_test database");
}

async function account(owner: string, contexts: BrowserContext[]) {
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [owner]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'복원력 합성 사용자')", [owner]);
    for (const context of contexts) {
      // PC tabs share their context's cookie; the mobile context gets a distinct
      // session for the same owner, rather than copying a session between devices.
      const token = `resilience-fixture-${randomUUID()}`;
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]);
      await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    }
  });
}

async function createLyric(page: Page, body: string) {
  const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "복원력 합성 곡" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id;
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "복원력 합성 가사", body } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function openReplicas(pages: Page[], id: string) {
  await Promise.all(pages.map((page) => page.goto(`/lyrics/${id}`)));
  await Promise.all(pages.map(ready));
}

async function ready(page: Page) {
  await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
}

function fingerprint(body: string): Fingerprint {
  return { sha256: createHash("sha256").update(body).digest("hex"), characters: [...body].length };
}

async function installCopyProbe(context: BrowserContext) {
  await context.addInitScript(() => {
    // The real whole-copy command reads CodeMirror's entire document, including
    // virtualized lines. Keep only its digest, never the clipboard body.
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async (text: string) => {
        (window as CopyWindow).resilienceCopy = (async () => {
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
          return { sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""), characters: [...text].length };
        })();
      }
    } });
  });
}

async function copiedFingerprint(page: Page): Promise<Fingerprint> {
  await page.evaluate(() => { delete (window as CopyWindow).resilienceCopy; });
  await page.getByRole("button", { name: /전체 복사$/ }).click();
  return page.evaluate(async () => {
    const copied = (window as CopyWindow).resilienceCopy;
    if (!copied) throw new Error("Whole-document copy did not produce a fingerprint");
    return copied;
  });
}

async function databaseState(owner: string, id: string) {
  return withE2eDatabase(async (pool) => {
    // One statement gives a consistent MVCC view, including compacted snapshots
    // and only the deltas after snapshot_sequence, just like the server loader.
    const result = await pool.query<{
      snapshot: Buffer; updates: Buffer[]; body: string; current: boolean;
      snapshot_bytes: number; projection_lag_ms: string | null;
    }>(`select d.snapshot, l.body, d.projection_error_code is null as current,
        octet_length(d.snapshot)::int as snapshot_bytes,
        array(select u.payload from sync_updates u where u.document_key=d.document_key
          and u.sequence>d.snapshot_sequence order by u.sequence) as updates,
        (extract(epoch from (d.projected_at - (select max(r.received_at)
          from sync_update_receipts r where r.document_key=d.document_key))) * 1000)::text as projection_lag_ms
      from sync_documents d join lyrics l on l.resource_id=d.resource_id and l.owner_id=d.owner_id
      where d.resource_id=$1 and d.owner_id=$2`, [id, owner]);
    const row = result.rows[0];
    if (!row) throw new Error("Synthetic synchronization document is missing");
    const document = createLyricDocument();
    try {
      applyLyricUpdate(document, row.snapshot);
      for (const update of row.updates) applyLyricUpdate(document, update);
      return { body: row.body, crdt: lyricBody(document).toString(), current: row.current,
        snapshotBytes: row.snapshot_bytes, projectionLagMs: row.projection_lag_ms === null ? Number.NaN : Number(row.projection_lag_ms) };
    } finally { document.destroy(); }
  });
}

async function assertConverged(pages: Page[], owner: string, id: string, baseline: string, inputs: string[] = []) {
  let expected = baseline;
  await expect.poll(async () => {
    const state = await databaseState(owner, id);
    let stripped = state.crdt;
    for (const input of inputs) {
      if (stripped.split(input).length !== 2) return false;
      stripped = stripped.replace(input, "");
    }
    if (!state.current || state.body !== state.crdt || stripped !== baseline) return false;
    expected = state.crdt;
    return true;
  }, convergence).toBe(true);
  await Promise.all(pages.map(async (page) => {
    await expect.poll(() => copiedFingerprint(page), convergence).toEqual(fingerprint(expected));
    await ready(page);
  }));
  const state = await databaseState(owner, id);
  expect(state.current && state.body === expected && state.crdt === expected).toBe(true);
  return expected;
}
