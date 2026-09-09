import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("prompt list", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for prompt list integration");

  test("distinguishes empty and no-result states and resets invalid URL values", async ({ context, page }) => {
    const account = await createAccount(context, "빈 프롬프트 사용자");
    try {
      await page.goto("/prompts?sort=unsafe&song=unsafe&favorite=unsafe&recent=unsafe");
      await expect(page.getByRole("heading", { name: "자주 쓰는 스타일 조합을 만들어보세요" })).toBeVisible();
      await expect(page).toHaveURL(/\/prompts$/);
      await page.getByRole("searchbox", { name: "프롬프트 검색" }).fill("없는 조합");
      await expect(page.getByRole("heading", { name: "조건에 맞는 프롬프트가 없어요" })).toBeVisible();
      await page.getByRole("button", { name: "검색 조건 지우기" }).click();
      await expect(page.getByRole("heading", { name: "자주 쓰는 스타일 조합을 만들어보세요" })).toBeVisible();
    } finally { await deleteAccount(account.userId); }
  });

  test("supports responsive previews, combined filters, URL persistence, copy fallback and idempotent duplication", async ({ context, page }, testInfo) => {
    test.setTimeout(70_000);
    const account = await createAccount(context, "프롬프트 목록 사용자");
    const fixture = await seedPrompts(account.userId, 14);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); }
    } }));
    try {
      let failed = false;
      await page.route("**/api/prompts?*", async (route) => {
        if (!failed) { failed = true; await route.fulfill({ status: 503, contentType: "application/json", body: "{}" }); }
        else await route.continue();
      });
      await page.goto("/prompts?sort=title_asc");
      await expect(page.locator(".list-error")).toContainText("불러오지 못했습니다");
      await page.getByRole("button", { name: "다시 시도" }).click();
      await expect(page.getByText("총 14개")).toBeVisible();
      await page.unroute("**/api/prompts?*");

      const cards = page.locator(".prompt-card:not(.skeleton)");
      await expect(cards).toHaveCount(12);
      const firstBox = await cards.nth(0).boundingBox(); const secondBox = await cards.nth(1).boundingBox();
      expect(firstBox).not.toBeNull(); expect(secondBox).not.toBeNull();
      if (testInfo.project.name === "desktop") expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(4);
      else expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 4);
      expect(await hasHorizontalOverflow(page)).toBe(false);

      const title = "프롬프트 00";
      const first = page.locator(".prompt-card", { has: page.getByRole("heading", { name: title }) });
      const expectedPreviewCount = testInfo.project.name === "desktop" ? 6 : 4;
      await expect(first.locator(testInfo.project.name === "desktop" ? ".desktop-tokens li" : ".mobile-tokens li")).toHaveCount(expectedPreviewCount);
      await expect(first.getByText(testInfo.project.name === "desktop" ? "+2" : "+4", { exact: true })).toBeVisible();
      await expect(cards.nth(1).locator(".prompt-tokens:visible li.is-empty")).toHaveText("토큰 없음");
      await expect(cards.nth(2).locator(".prompt-tokens:visible li")).toHaveCount(1);
      await first.getByRole("button", { name: "⧉ 복사" }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(fixture.firstPlainText);
      await expect(page.getByText(`${title} 프롬프트를 복사했습니다.`)).toBeVisible();

      const second = page.locator(".prompt-card", { has: page.getByRole("heading", { name: "프롬프트 01" }) });
      await second.getByRole("button", { name: "프롬프트 01 즐겨찾기" }).click();
      await expect(second.getByRole("button", { name: "프롬프트 01 즐겨찾기 해제" })).toHaveAttribute("aria-pressed", "true");
      await second.getByRole("button", { name: "프롬프트 01 고정" }).click();
      await expect(second.getByRole("button", { name: "프롬프트 01 고정 해제" })).toHaveAttribute("aria-pressed", "true");

      await page.getByRole("searchbox", { name: "프롬프트 검색" }).fill("precise %_tone");
      await page.getByLabel("프롬프트 연결 곡 필터").selectOption(fixture.songId);
      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await page.getByRole("button", { name: "◷ 최근 사용" }).click();
      await expect(page.getByText("총 1개")).toBeVisible();
      await expect(page).toHaveURL(/search=.*song=.*favorite=true.*recent=true.*sort=title_asc/);
      await page.reload();
      await expect(page.getByText("총 1개")).toBeVisible();
      await page.getByRole("searchbox", { name: "프롬프트 검색" }).fill("");
      await page.getByLabel("프롬프트 연결 곡 필터").selectOption("");
      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await page.getByRole("button", { name: "◷ 최근 사용" }).click();
      await expect(page.getByText("총 14개")).toBeVisible();
      await page.getByRole("button", { name: "더 불러오기" }).click();
      await expect(cards).toHaveCount(14);

      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
      await first.getByRole("button", { name: "⧉ 복사" }).click();
      const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
      expect(await dialog.locator("textarea").inputValue()).toBe(fixture.firstPlainText);
      await dialog.getByRole("button", { name: "취소" }).click();

      const duplicateRequest = randomUUID();
      const firstCopy = await page.request.post(`/api/prompts/${fixture.firstId}/duplicate`, {
        headers: { Origin: origin }, data: { requestId: duplicateRequest }
      });
      const replay = await page.request.post(`/api/prompts/${fixture.firstId}/duplicate`, {
        headers: { Origin: origin }, data: { requestId: duplicateRequest }
      });
      expect(firstCopy.status()).toBe(201); expect(replay.status()).toBe(200);
      expect((await replay.json()).prompt.id).toBe((await firstCopy.json()).prompt.id);

      if (testInfo.project.name === "mobile") {
        await page.setViewportSize({ width: 360, height: 780 });
        await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
          writeText: (value: string) => { const state = window as unknown as { copied: string; copyCount: number };
            state.copied = value; state.copyCount = (state.copyCount ?? 0) + 1; return Promise.resolve(); }
        } }));
        const target = first;
        const box = await target.boundingBox();
        await page.evaluate(() => { const state = window as unknown as { copied: string; copyCount: number }; state.copied = ""; state.copyCount = 0; });
        await target.dispatchEvent("pointerdown", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 20 });
        await target.dispatchEvent("pointermove", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 40 });
        await target.dispatchEvent("pointerup", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 40 });
        await page.waitForTimeout(700);
        expect(await page.evaluate(() => (window as unknown as { copyCount: number }).copyCount)).toBe(0);
        await target.dispatchEvent("pointerdown", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 20 });
        await page.waitForTimeout(700);
        await target.dispatchEvent("pointerup", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 20 });
        await expect.poll(() => page.evaluate(() => (window as unknown as { copyCount: number }).copyCount)).toBe(1);
        expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(fixture.firstPlainText);
        expect(await hasHorizontalOverflow(page)).toBe(false);
      }
    } finally { await deleteAccount(account.userId); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `prompt-list-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function seedPrompts(ownerId: string, count: number) {
  const songId = randomUUID(); let firstId = "";
  const firstTokens = ["cinematic", "precise %_tone", "female vocal", "dream pop", "808 bass", "wide reverb", "slow build"];
  await withE2eDatabase(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','프롬프트 연결 테스트 곡')", [songId, ownerId]);
      await client.query("insert into songs(resource_id,owner_id) values($1,$2)", [songId, ownerId]);
      for (let index = 0; index < count; index += 1) {
        const id = randomUUID(); if (index === 0) firstId = id;
        const tokens = index === 0 ? firstTokens : index === 1 ? [] : [`marker-token-${index}`];
        const plainText = tokens.join(", ");
        await client.query("insert into resources(id,owner_id,type,title,is_favorite) values($1,$2,'prompt',$3,$4)", [id, ownerId, `프롬프트 ${String(index).padStart(2, "0")}`, index === 0]);
        await client.query("insert into prompts(resource_id,owner_id,plain_text,use_count,last_used_at) values($1,$2,$3,$4,$5)", [id, ownerId, plainText, index === 0 ? 2 : 0, index === 0 ? new Date() : null]);
        for (const [ordinal, display] of tokens.entries()) {
          const dictionary = (await client.query(`insert into prompt_token_dictionary(owner_id,display_value,normalized_value)
            values($1,$2,'ignored') on conflict(owner_id,normalized_value) do update set display_value=excluded.display_value returning id`, [ownerId, display])).rows[0]!.id;
          await client.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
            values($1,$2,$3,$4,$5,'ignored')`, [ownerId, id, ordinal, dictionary, display]);
        }
        if (index < 3) await client.query("insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type) values($1,$2,$3,'prompt')", [ownerId, songId, id]);
      }
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  });
  return { songId, firstId, firstPlainText: firstTokens.join(", ") };
}

async function deleteAccount(userId: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined)); }
async function hasHorizontalOverflow(page: Page) { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); }
