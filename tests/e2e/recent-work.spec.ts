import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.7.0 recent work and lyric resume", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("recent APIs separate open time, enforce owner and keep position content-free", async ({ browser, request: anonymous }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API contract only needs one browser project");
    const aliceContext = await browser.newContext({ baseURL: origin });
    const bobContext = await browser.newContext({ baseURL: origin });
    const alice = await createAccount(aliceContext, "최근 API 앨리스");
    const bob = await createAccount(bobContext, "최근 API 밥");
    try {
      const fixture = await createRecentFixture(aliceContext.request);
      const before = await resourceUpdatedAt(fixture.songId);
      const open = await aliceContext.request.post(`/api/recent/${fixture.songId}/open`, { headers });
      expect(open.status()).toBe(204);
      expect(await resourceUpdatedAt(fixture.songId)).toBe(before);

      expect((await bobContext.request.post(`/api/recent/${fixture.songId}/open`, { headers })).status()).toBe(404);
      expect((await anonymous.get("/api/recent")).status()).toBe(401);
      expect((await aliceContext.request.put(`/api/recent/${fixture.lyricId}/position`, {
        headers: { Origin: "https://foreign.example" },
        data: { cursorOffset: 18, songformLabel: "Hook", songformOccurrence: 1, scrollTop: 120, viewport: "mobile" }
      })).status()).toBe(403);
      expect((await bobContext.request.put(`/api/recent/${fixture.lyricId}/position`, {
        headers,
        data: { cursorOffset: 18, songformLabel: "Hook", songformOccurrence: 1, scrollTop: 120, viewport: "mobile" }
      })).status()).toBe(404);

      const saved = await aliceContext.request.put(`/api/recent/${fixture.lyricId}/position`, {
        headers,
        data: { cursorOffset: 18, songformLabel: "Hook", songformOccurrence: 1, scrollTop: 120.4, viewport: "mobile" }
      });
      expect(saved.status()).toBe(200);
      expect((await saved.json()).position).toMatchObject({ cursorOffset: 18, songformLabel: "Hook", scrollTop: 120, viewport: "mobile" });

      const response = await aliceContext.request.get("/api/recent?type=all&limit=50");
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      const items = (await response.json()).items as Array<Record<string, unknown>>;
      expect(new Set(items.map((item) => item.type))).toEqual(new Set(["song", "lyrics", "rhyme_note", "prompt"]));
      expect(items.find(({ id }) => id === fixture.lyricId)).toMatchObject({
        parentSong: { id: fixture.songId, title: "최근 작업 곡" }, hasWorkNote: true,
        position: { cursorOffset: 18, songformLabel: "Hook", viewport: "mobile" }
      });
      for (const item of items) {
        expect(item).not.toHaveProperty("body");
        expect(item).not.toHaveProperty("memo");
        expect(JSON.stringify(item)).not.toContain("비공개 본문");
      }

      expect((await bobContext.request.get("/api/recent")).status()).toBe(200);
      expect((await (await bobContext.request.get("/api/recent")).json()).items).toEqual([]);
      expect((await aliceContext.request.delete(`/api/rhymes/${fixture.rhymeId}`, { headers })).status()).toBe(200);
      expect(((await (await aliceContext.request.get("/api/recent")).json()).items as Array<{ id: string }>).some(({ id }) => id === fixture.rhymeId)).toBe(false);
    } finally {
      await Promise.all([aliceContext.close(), bobContext.close()]);
      await deleteAccounts([alice.userId, bob.userId]);
    }
  });

  test("shows typed recent cards and restores a mobile Hook naturally on desktop", async ({ context, page }, testInfo) => {
    test.setTimeout(80_000);
    const account = await createAccount(context, `최근 화면 ${testInfo.project.name}`);
    try {
      const fixture = await createRecentFixture(page.request);
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(`/lyrics/${fixture.lyricId}`);
      await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
      await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /송폼 3/ }).click();
      await page.getByRole("dialog", { name: "송폼 이동" }).getByRole("button", { name: "Hook 구간으로 이동" }).click();
      await expect.poll(async () => {
        const items = (await (await page.request.get("/api/recent?type=lyrics")).json()).items as Array<{ id: string; position: { songformLabel: string } | null }>;
        return items.find(({ id }) => id === fixture.lyricId)?.position?.songformLabel;
      }, { timeout: 8_000 }).toBe("Hook");

      const desktop = await context.newPage();
      await desktop.setViewportSize({ width: 1440, height: 900 });
      await desktop.goto(`/lyrics/${fixture.lyricId}`);
      await expect(desktop.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
      await expect(desktop.getByRole("status").filter({ hasText: "마지막 Hook 구간" })).toBeVisible();
      await expect(desktop.getByRole("button", { name: "Hook 구간으로 이동" })).toHaveAttribute("aria-current", "location");
      await desktop.close();

      await page.request.put(`/api/recent/${fixture.lyricId}/position`, {
        headers,
        data: { cursorOffset: 100_000, songformLabel: null, songformOccurrence: null, scrollTop: 9_999_999, viewport: "mobile" }
      });
      await page.reload();
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true");
      await editor.press("End");
      await page.keyboard.insertText("끝");
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${fixture.lyricId}`)).json()).lyric.body.endsWith("끝")).toBe(true);

      await page.goto("/recent");
      await expect(page.getByRole("heading", { name: "최근 작업", exact: true })).toBeVisible();
      await expect(page.locator(".recent-card")).toHaveCount(4);
      for (const type of ["곡", "가사", "라임 노트", "프롬프트"]) await expect(page.locator(".recent-card", { hasText: type }).first()).toBeVisible();
      const lyricCard = page.locator(".recent-card", { hasText: "최근 작업 가사" });
      await expect(lyricCard).toContainText("소속 곡 · 최근 작업 곡");
      await expect(lyricCard).toContainText("가사 메모 있음");
      await page.getByRole("link", { name: "가사", exact: true }).click();
      await expect(page).toHaveURL(/\/recent\?type=lyrics/);
      await expect(page.locator(".recent-card")).toHaveCount(1);
      await page.locator(".recent-card").getByRole("link", { name: "계속 편집 →" }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${fixture.lyricId}\\?returnTo=`));
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function createRecentFixture(request: APIRequestContext) {
  const songResponse = await request.post("/api/songs", { headers, data: {
    requestId: randomUUID(), title: "최근 작업 곡", workNotes: "비공개 작업 메모", status: "writing_lyrics"
  } });
  expect(songResponse.status()).toBe(201);
  const songId = (await songResponse.json()).song.id as string;
  const lyricResponse = await request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: "최근 작업 가사", body: "[Verse]\n비공개 본문 첫 줄\n[Hook]\n후렴\n[Outro]\n끝", memo: "비공개 가사 메모", status: "revising"
  } });
  expect(lyricResponse.status()).toBe(201);
  const lyricId = (await lyricResponse.json()).lyric.id as string;
  const rhymeResponse = await request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: "최근 작업 라임", body: "비공개 본문 라임" } });
  expect(rhymeResponse.status()).toBe(201);
  const rhymeId = (await rhymeResponse.json()).rhyme.id as string;
  const promptResponse = await request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title: "최근 작업 프롬프트", tokens: ["비공개 본문 프롬프트"] } });
  expect(promptResponse.status()).toBe(201);
  return { songId, lyricId, rhymeId, promptId: (await promptResponse.json()).prompt.id as string };
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `recent-work-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function resourceUpdatedAt(resourceId: string): Promise<string> {
  return withE2eDatabase(async (pool) => (await pool.query<{ updated_at: Date }>("select updated_at from resources where id=$1", [resourceId])).rows[0]!.updated_at.toISOString());
}

async function deleteAccounts(userIds: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [userIds]).then(() => undefined));
}
