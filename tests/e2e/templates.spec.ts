import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000"; const headers = { Origin: origin };

test.describe("0.8.0 lyric and prompt templates", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps defaults immutable, owners private and apply transactions type-safe", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "API contract runs once");
    const aliceContext = await browser.newContext({ baseURL: origin }); const bobContext = await browser.newContext({ baseURL: origin });
    const alice = await createAccount(aliceContext, "템플릿 앨리스"); const bob = await createAccount(bobContext, "템플릿 밥");
    try {
      const defaults = await aliceContext.request.get("/api/templates?type=lyrics&source=default&sort=title_asc");
      expect(defaults.status()).toBe(200); const defaultItems = (await defaults.json()).items as Array<{ id: string; source: string }>;
      expect(defaultItems).toHaveLength(2); expect(defaultItems.every(({ source }) => source === "default")).toBe(true);
      expect((await aliceContext.request.put(`/api/templates/${defaultItems[0]!.id}`, { headers, data: { rowVersion: 1, title: "forged" } })).status()).toBe(404);
      expect((await aliceContext.request.put(`/api/templates/${defaultItems[0]!.id}/favorite`, { headers, data: { value: true } })).status()).toBe(200);
      expect((await (await bobContext.request.get(`/api/templates/${defaultItems[0]!.id}`)).json()).template.isFavorite).toBe(false);

      const lyricTemplateResponse = await aliceContext.request.post("/api/templates", { headers, data: { requestId: randomUUID(), type: "lyrics", title: "앨리스 구조", lyricBody: "[Verse]\n안전한 합성 본문\n[Hook]" } });
      expect(lyricTemplateResponse.status()).toBe(201); const lyricTemplate = (await lyricTemplateResponse.json()).template as { id: string; rowVersion: number };
      expect((await bobContext.request.get(`/api/templates/${lyricTemplate.id}`)).status()).toBe(404);
      const songResponse = await aliceContext.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "템플릿 부모 곡" } });
      const songId = (await songResponse.json()).song.id as string;
      const before = await resourceCount(alice.userId);
      expect((await aliceContext.request.post(`/api/templates/${lyricTemplate.id}/apply`, { headers, data: { requestId: randomUUID(), targetType: "prompt", title: "잘못된 유형" } })).status()).toBe(400);
      expect(await resourceCount(alice.userId)).toBe(before);
      expect((await bobContext.request.post(`/api/templates/${lyricTemplate.id}/apply`, { headers, data: { requestId: randomUUID(), targetType: "lyrics", title: "숨은 적용", songId } })).status()).toBe(404);
      const appliedResponse = await aliceContext.request.post(`/api/templates/${lyricTemplate.id}/apply`, { headers, data: { requestId: randomUUID(), targetType: "lyrics", title: "독립 가사", songId } });
      expect(appliedResponse.status()).toBe(201); const lyricId = (await appliedResponse.json()).resource.id as string;
      expect((await (await aliceContext.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe("[Verse]\n안전한 합성 본문\n[Hook]");
      await aliceContext.request.put(`/api/templates/${lyricTemplate.id}`, { headers, data: { rowVersion: lyricTemplate.rowVersion, lyricBody: "바뀐 템플릿" } });
      expect((await (await aliceContext.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe("[Verse]\n안전한 합성 본문\n[Hook]");

      const promptTemplateResponse = await aliceContext.request.post("/api/templates", { headers, data: { requestId: randomUUID(), type: "prompt", title: "순서 프롬프트", tokens: ["First", "Second", "ＦＩＲＳＴ"] } });
      const promptTemplateId = (await promptTemplateResponse.json()).template.id as string; const applyId = randomUUID();
      const promptApplied = await aliceContext.request.post(`/api/templates/${promptTemplateId}/apply`, { headers, data: { requestId: applyId, targetType: "prompt", title: "독립 프롬프트" } });
      expect(promptApplied.status()).toBe(201); const promptId = (await promptApplied.json()).resource.id as string;
      expect((await (await aliceContext.request.get(`/api/prompts/${promptId}`)).json()).prompt.plainText).toBe("First, Second");
      expect((await aliceContext.request.post(`/api/templates/${promptTemplateId}/apply`, { headers, data: { requestId: applyId, targetType: "prompt", title: "독립 프롬프트" } })).status()).toBe(200);
    } finally { await Promise.all([aliceContext.close(), bobContext.close()]); await deleteAccounts([alice.userId, bob.userId]); }
  });

  test("supports responsive list, preview and user CRUD as plain text", async ({ context, page }, info) => {
    const account = await createAccount(context, `템플릿 화면 ${info.project.name}`);
    try {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
      await page.goto("/templates?type=lyrics&source=all&sort=favorite_first");
      await expect(page.getByRole("heading", { name: "템플릿", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expect(page.getByRole("button", { name: /기본 송폼/ })).toBeVisible();
      await page.getByRole("button", { name: "새 템플릿" }).click();
      await page.getByLabel("템플릿 제목").fill("안전한 사용자 구조");
      await page.getByLabel("가사 구조 원문").fill("<img src=x onerror=alert(1)>\n[Hook]");
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("내 템플릿을 만들었습니다");
      await expect(page.locator(".template-content")).toContainText("<img src=x onerror=alert(1)>");
      await expect(page.locator(".template-content img")).toHaveCount(0);
      await page.getByRole("button", { name: "복제", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("복사본");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `docs/runbooks/evidence/0.8.0-phase1-templates-${info.project.name}.png` });
      await expect(page).toHaveScreenshot(`0.8.0-phase1-templates-${info.project.name}.png`);
      await page.goto("/templates?type=prompt&source=default&sort=title_asc");
      await page.getByRole("button", { name: /따뜻한 팝/ }).click();
      await page.getByRole("link", { name: "이 템플릿으로 시작" }).click();
      await expect(page).toHaveURL(/\/prompts\/new\?template=/);
      await expect(page.getByRole("textbox", { name: "프롬프트 제목" })).toHaveValue("따뜻한 팝 작업");
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText("새 프롬프트 작성을 취소할까요");
      await page.getByRole("button", { name: "계속 작성" }).click();
      await expect(page.getByRole("textbox", { name: "프롬프트 제목" })).toHaveValue("따뜻한 팝 작업");
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]{36}$/, { timeout: 15_000 });
      await expect(page.getByText("Warm pop, Emotional vocal, Clean production", { exact: true })).toBeVisible();
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `template-${randomUUID()}`;
  await withE2eDatabase(async (pool) => { await pool.query("insert into app_users(id,status) values($1,'active')", [userId]); await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]); await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]); });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]); return { userId };
}
async function resourceCount(ownerId: string) { return withE2eDatabase(async (pool) => Number((await pool.query<{ count: string }>("select count(*)::text count from resources where owner_id=$1", [ownerId])).rows[0]!.count)); }
async function deleteAccounts(ids: readonly string[]) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined)); }
