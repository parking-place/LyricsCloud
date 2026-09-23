import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("historical editor metadata and duplicate recovery", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires the parent's isolated E2E database/runtime");

  for (const kind of ["lyric", "rhyme"] as const) {
    test(`${kind}: recovers metadata after closing an offline tab and preserves over-limit input`, async ({ context, page }, info) => {
      const owner = await account(context);
      try {
        const document = await createDocument(page, kind);
        const path = `/${kind === "lyric" ? "lyrics" : "rhymes"}/${document.id}`;
        await page.goto(path);
        await expect(page.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
        const titleName = kind === "lyric" ? "가사 제목" : "노트 제목";
        const rawTitle = "🎵".repeat(201);
        const rawMemo = "  복구할 작업 메모\n[Extend : 3:00]  ";
        await context.setOffline(true);
        await page.getByRole("textbox", { name: titleName, exact: true }).fill(rawTitle);
        if (kind === "lyric") {
          if (info.project.name === "mobile") await page.getByRole("button", { name: /≋ 다른 가사/ }).click();
          await page.getByRole("textbox", { name: "작업 메모", exact: true }).fill(rawMemo);
        }
        await page.close();
        await context.setOffline(false);
        page = await context.newPage();
        await page.goto(path);
        const title = page.getByRole("textbox", { name: titleName, exact: true });
        await expect(title).toHaveValue("서버 제목");
        await expect(page.getByRole("textbox", { name: "보관된 제목", exact: true })).toHaveValue(rawTitle);
        expect((await (await page.request.get(`/api${path}`)).json())[kind].title).toBe("서버 제목");
        await page.getByRole("button", { name: "이 초안 복원", exact: true }).click();
        await expect(title).toHaveValue(rawTitle);
        await expect(title).toHaveAttribute("aria-invalid", "true");
        await expect(page.getByRole("alert").filter({ hasText: "제목은 200자 이하" })).toBeVisible();
        await title.fill("복원한 제목");
        await expect.poll(async () => (await (await page.request.get(`/api${path}`)).json())[kind].title).toBe("복원한 제목");
        const saved = (await (await page.request.get(`/api${path}`)).json())[kind];
        expect(saved.body).toBe("[Verse]\n원문\n[Extend : 3:00]\n작업 지시");
        if (kind === "lyric") expect(saved.memo).toBe(rawMemo);
        await page.reload();
        await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
        await expect(title).toHaveValue("복원한 제목");
        await expect(page.getByRole("button", { name: "이 초안 복원", exact: true })).toHaveCount(0);
      } finally {
        await context.setOffline(false);
        await remove(owner);
      }
    });
  }

  test("retries a duplicate whose successful server reply was lost without creating another lyric", async ({ context, page }, info) => {
    const owner = await account(context);
    try {
      const document = await createDocument(page, "lyric");
      await page.goto(`/lyrics/${document.id}`);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
      const requestIds: string[] = [];
      let createdId = "";
      await page.route(`**/api/lyrics/${document.id}/duplicate`, async (route) => {
        requestIds.push(route.request().postDataJSON().requestId);
        if (requestIds.length === 1) {
          const response = await route.fetch();
          expect(response.ok()).toBe(true);
          createdId = (await response.json()).lyric.id;
          await route.abort("failed");
        } else await route.continue();
      });
      if (info.project.name === "mobile") await page.getByRole("button", { name: /≋ 다른 가사/ }).click();
      const duplicate = page.getByRole("button", { name: info.project.name === "mobile" ? "현재 가사 복제" : "복제", exact: true });
      await duplicate.click();
      await expect(page.locator(".editor-command-notice")).toContainText("가사를 복제하지 못했습니다.");
      await expect(duplicate).toBeEnabled();
      await duplicate.click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${createdId}(?:\\?|$)`));
      expect(requestIds).toHaveLength(2);
      expect(requestIds[1]).toBe(requestIds[0]);
      expect((await (await page.request.get(`/api/songs/${document.songId}/lyrics`)).json()).items).toHaveLength(2);
    } finally { await remove(owner); }
  });
});

async function account(context: BrowserContext): Promise<string> {
  const owner = randomUUID(), token = randomUUID();
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id) values($1)", [owner]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'합성 편집 사용자')", [owner]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), owner]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return owner;
}

async function createDocument(page: Page, kind: "lyric" | "rhyme"): Promise<{ id: string; songId?: string }> {
  const body = "[Verse]\n원문\n[Extend : 3:00]\n작업 지시";
  if (kind === "rhyme") {
    const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: "서버 제목", body } });
    expect(response.ok()).toBe(true);
    return (await response.json()).rhyme;
  }
  const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "합성 복구 곡" } });
  expect(song.ok()).toBe(true);
  const songId = (await song.json()).song.id as string;
  const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "서버 제목", body, memo: "서버 메모" } });
  expect(response.ok()).toBe(true);
  return (await response.json()).lyric;
}

async function remove(owner: string) {
  await withE2eDatabase(async (pool) => { await pool.query("delete from app_users where id=$1", [owner]); });
}
