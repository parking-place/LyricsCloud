import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("rhyme note list", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for rhyme list integration");

  test("distinguishes empty and no-result states and resets invalid URL values", async ({ context, page }) => {
    const account = await createAccount(context, "빈 라임 사용자");
    try {
      await page.goto("/rhymes?sort=unsafe&tag=unsafe&song=unsafe");
      await expect(page.getByRole("heading", { name: "아직 라임 노트가 없어요" })).toBeVisible();
      await expect(page).toHaveURL(/\/rhymes$/);
      await page.getByRole("searchbox", { name: "라임 노트 검색" }).fill("없는 표현");
      await expect(page.getByRole("heading", { name: "조건에 맞는 라임 노트가 없어요" })).toBeVisible();
      await page.getByRole("button", { name: "검색 조건 지우기" }).click();
      await expect(page.getByRole("heading", { name: "아직 라임 노트가 없어요" })).toBeVisible();
    } finally { await deleteAccount(account.userId); }
  });

  test("supports responsive cards, combined filters, URL persistence, metadata, copy, retry and cursors", async ({ context, page }, testInfo) => {
    test.setTimeout(60_000);
    const account = await createAccount(context, "라임 목록 사용자");
    const fixture = await seedNotes(account.userId, 14);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (value: string) => { (window as unknown as { copied: string }).copied = value; return Promise.resolve(); } } }));
    try {
      let failed = false;
      await page.route("**/api/rhymes?*", async (route) => {
        if (!failed) { failed = true; await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); }
        else await route.continue();
      });
      await page.goto("/rhymes");
      await expect(page.locator(".list-error")).toContainText("불러오지 못했습니다");
      await page.getByRole("button", { name: "다시 시도" }).click();
      await expect(page.getByText("총 14개")).toBeVisible();
      await page.unroute("**/api/rhymes?*");

      const cards = page.locator(".rhyme-card:not(.skeleton)");
      await expect(cards).toHaveCount(12);
      const firstBox = await cards.nth(0).boundingBox(); const secondBox = await cards.nth(1).boundingBox();
      expect(firstBox).not.toBeNull(); expect(secondBox).not.toBeNull();
      if (testInfo.project.name === "desktop") expect(Math.abs(firstBox!.y - secondBox!.y)).toBeLessThan(4);
      else expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 4);
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.getByLabel("라임 노트 정렬").selectOption("title_asc");
      const title = "라임 노트 00";
      const card = page.locator(".rhyme-card", { has: page.getByRole("heading", { name: title }) });
      await card.getByRole("button", { name: `${title} 고정` }).click();
      await expect(card.getByRole("button", { name: `${title} 고정 해제` })).toHaveAttribute("aria-pressed", "true");
      await card.getByRole("button", { name: `${title} 즐겨찾기` }).click();
      await expect(card.getByRole("button", { name: `${title} 즐겨찾기 해제` })).toHaveAttribute("aria-pressed", "true");
      await card.getByRole("button", { name: new RegExp(`${title} 색상`) }).click();
      await expect(card.getByRole("button", { name: new RegExp("색상: 빨강") })).toBeVisible();
      await card.getByRole("button", { name: `${title} 본문 전체 복사` }).click();
      expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(fixture.firstBody);
      await expect(page).toHaveURL(/\/rhymes\?sort=title_asc$/);
      await expect(card.getByRole("link", { name: `${title} 라임 노트 열기` })).toHaveAttribute("href", /^\/rhymes\/[0-9a-f-]+$/);

      await page.getByRole("searchbox", { name: "라임 노트 검색" }).fill("정확한 %_검색 본문");
      await expect(page.getByText("총 1개")).toBeVisible();
      await expect(page).toHaveURL(/search=/);
      await page.getByRole("button", { name: `#${fixture.tagLabel}` }).click();
      await page.getByLabel("연결 곡 필터").selectOption(fixture.songId);
      await expect(page.getByText("총 1개")).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`tag=${fixture.tagId}.*song=${fixture.songId}|song=${fixture.songId}.*tag=${fixture.tagId}`));
      await page.reload();
      await expect(page.getByText("총 1개")).toBeVisible();
      await page.getByRole("searchbox", { name: "라임 노트 검색" }).fill("");
      await page.getByRole("button", { name: "전체", exact: true }).click();
      await page.getByLabel("연결 곡 필터").selectOption("");
      await expect(page.getByText("총 14개")).toBeVisible();
      await page.getByRole("button", { name: "더 불러오기" }).click();
      await expect(cards).toHaveCount(14);

      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("denied")) } }));
      await cards.first().getByRole("button", { name: /본문 전체 복사/ }).click();
      const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
      expect(await dialog.locator("textarea").inputValue()).toBeTruthy();
      await dialog.getByRole("button", { name: "닫기" }).click();

      if (testInfo.project.name === "mobile") {
        await page.setViewportSize({ width: 360, height: 780 });
        await page.getByRole("button", { name: `#${fixture.tagLabel}` }).focus();
        await expect(page.getByRole("button", { name: `#${fixture.tagLabel}` })).toBeFocused();
        expect(await hasHorizontalOverflow(page)).toBe(false);
      }
    } finally { await deleteAccount(account.userId); }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `rhyme-list-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function seedNotes(ownerId: string, count: number) {
  const songId = randomUUID(); const tagId = randomUUID(); const tagLabel = "Flow 태그"; const firstBody = "정확한 %_검색 본문\n둘째 줄도 그대로";
  await withE2eDatabase(async (pool) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','연결 테스트 곡')", [songId, ownerId]);
      await client.query("insert into songs(resource_id,owner_id) values($1,$2)", [songId, ownerId]);
      await client.query("insert into tags(id,owner_id,display_value,normalized_value) values($1,$2,$3,$4)", [tagId, ownerId, tagLabel, tagLabel.toLowerCase()]);
      for (let index = 0; index < count; index += 1) {
        const id = randomUUID();
        await client.query("insert into resources(id,owner_id,type,title,color) values($1,$2,'rhyme_note',$3,$4)", [id, ownerId, `라임 노트 ${String(index).padStart(2, "0")}`, index % 2 ? "blue" : null]);
        await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,$3)", [id, ownerId, index === 0 ? firstBody : `긴 라임 본문 ${index} `.repeat(18)]);
        if (index < 3) {
          await client.query("insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)", [ownerId, id, tagId]);
          await client.query("insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type) values($1,$2,$3,'rhyme_note')", [ownerId, songId, id]);
        }
      }
      await client.query("commit");
    } catch (error) { await client.query("rollback"); throw error; }
    finally { client.release(); }
  });
  return { songId, tagId, tagLabel, firstBody };
}

async function deleteAccount(userId: string) { await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined)); }
async function hasHorizontalOverflow(page: Page) { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); }
