import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.7 P2 creation return flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("returns from quick-add rhyme and prompt creation to the exact lyric context", async ({ context, page }, testInfo) => {
    test.setTimeout(90_000);
    const userId = await account(context);
    const songId = await createSong(context);
    const lyricId = await createLyric(context, songId);
    const returnTo = `/lyrics/${lyricId}?returnTo=${encodeURIComponent("/recent?type=lyrics")}`;
    try {
      await page.goto(returnTo);
      await expect(page.locator(".cm-content")).toContainText("돌아와야 하는 한글 원문");

      await openQuickAdd(page);
      await page.getByRole("dialog", { name: "빠른 추가" }).getByRole("link", { name: /새 라임/ }).click();
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
      await page.getByRole("textbox", { name: "노트 제목" }).fill("1.1.7 복귀 라임");
      await page.getByRole("textbox", { name: "자유 본문" }).fill("문맥을 보존하는 라임");
      await expect(page).toHaveURL(/\/rhymes\/[0-9a-f-]+\?returnTo=/, { timeout: 15_000 });
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
      await page.getByRole("button", { name: "← 라임 노트" }).click();
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(returnTo)}$`));
      await expect(page.locator(".cm-content")).toContainText("돌아와야 하는 한글 원문");

      await openQuickAdd(page);
      await page.getByRole("dialog", { name: "빠른 추가" }).getByRole("link", { name: /새 프롬프트/ }).click();
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
      await page.getByRole("textbox", { name: "프롬프트 제목" }).fill("1.1.7 복귀 프롬프트");
      await page.getByRole("radio", { name: /문장형/ }).check();
      await page.getByRole("textbox", { name: "문장형 프롬프트 원문" }).fill("한글 공백  문맥을 그대로 보존");
      await expect(page).toHaveURL(/\/prompts\/[0-9a-f-]+\?returnTo=/, { timeout: 15_000 });
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
      if (testInfo.project.name.endsWith("-mobile") || testInfo.project.name === "mobile") {
        await page.goBack();
      } else {
        await page.getByRole("button", { name: "← 프롬프트" }).click();
      }
      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(returnTo)}$`));
      const editor = page.locator(".cm-content");
      await expect(editor).toContainText("돌아와야 하는 한글 원문");
      await editor.focus();
      await expect(editor).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    } finally {
      await removeAccount(userId);
    }
  });
});

test.describe("1.1.7 P3 platform interaction flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps exact list context through lyric sharing and a Suno new tab", async ({ context, page }, testInfo) => {
    test.setTimeout(90_000);
    const userId = await account(context);
    const songId = await createSong(context, "1.1.7 플랫폼 곡");
    const lyricId = await createLyric(context, songId, "1.1.7 플랫폼 가사");
    const listPath = "/songs?status=idea&sort=title_asc";
    const sunoUrl = "https://suno.com/song/44444444-4444-4444-8444-444444444444";
    await createSunoLink(context, songId, sunoUrl);
    await context.route("https://suno.com/**", (route) => route.fulfill({
      status: 200, contentType: "text/html", body: "<!doctype html><title>Suno fixture</title>"
    }));
    try {
      await page.goto(listPath);
      await page.getByRole("link", { name: "1.1.7 플랫폼 곡 대시보드 열기" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(`/songs/${songId}`);
      expect(new URL(page.url()).pathname).toBe(`/songs/${songId}`);
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(listPath);

      await page.getByRole("link", { name: "1.1.7 플랫폼 가사" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(`/lyrics/${lyricId}`);
      expect(new URL(page.url()).pathname).toBe(`/lyrics/${lyricId}`);
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(listPath);
      await expect(page.locator(".cm-content")).toContainText("돌아와야 하는 한글 원문");

      const shareTrigger = page.getByRole("button", { name: "공유", exact: true });
      await shareTrigger.focus();
      await shareTrigger.click();
      await expect(page.getByRole("dialog", { name: "가사 공유" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "가사 공유" })).toBeHidden();
      await expect(shareTrigger).toBeFocused();

      await page.getByRole("link", { name: "← 1.1.7 플랫폼 곡" }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(`/songs/${songId}`);
      expect(new URL(page.url()).pathname).toBe(`/songs/${songId}`);
      expect(new URL(page.url()).searchParams.get("returnTo")).toBe(listPath);

      const sunoLink = page.getByRole("link", { name: /1\.1\.7 Suno 결과/ });
      await expect(sunoLink).toHaveAttribute("target", "_blank");
      await expect(sunoLink).toHaveAttribute("rel", /noopener/);
      await expect(sunoLink).toHaveAttribute("rel", /noreferrer/);
      const popupPromise = page.waitForEvent("popup");
      await sunoLink.click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(sunoUrl);
      await popup.close();

      await page.getByRole("link", { name: "← 곡 목록" }).click();
      await expect(page).toHaveURL(`${origin}${listPath}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

      if (testInfo.project.name.includes("mobile")) {
        const more = page.getByRole("button", { name: "더보기" });
        await more.click();
        await expect(page.getByRole("dialog", { name: "더보기" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog", { name: "더보기" })).toBeHidden();
        await expect(more).toBeFocused();
      } else {
        await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
        const songsRailLink = page.getByRole("navigation", { name: "데스크톱 주 메뉴" })
          .getByRole("link", { name: "곡", exact: true });
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await expect(songsRailLink).toBeFocused();
        const target = await songsRailLink.boundingBox();
        expect(target?.width).toBeGreaterThanOrEqual(40);
        expect(target?.height).toBeGreaterThanOrEqual(40);
        await expect(songsRailLink).toHaveAttribute("title", "곡");
        await expect.poll(() => songsRailLink.evaluate((element) => {
          const style = getComputedStyle(element, "::after");
          return `${style.visibility}:${style.opacity}`;
        })).toBe("visible:1");
      }
    } finally {
      await removeAccount(userId);
    }
  });
});

async function openQuickAdd(page: Page) {
  await page.locator(".top-quick-add:visible, .quick-add:visible").first().click();
  await expect(page.getByRole("dialog", { name: "빠른 추가" })).toBeVisible();
}

async function account(context: BrowserContext) {
  const userId = randomUUID();
  const token = `return-flow-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.1.7 복귀 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function createSong(context: BrowserContext, title = "1.1.7 복귀 곡") {
  const response = await context.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function createLyric(context: BrowserContext, songId: string, title = "1.1.7 복귀 가사") {
  const response = await context.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title, body: "[Verse]\n돌아와야 하는 한글 원문"
  } });
  expect(response.status()).toBe(201);
  return (await response.json()).lyric.id as string;
}

async function createSunoLink(context: BrowserContext, songId: string, url: string) {
  const response = await context.request.post(`/api/songs/${songId}/suno-workspace`, { headers, data: {
    requestId: randomUUID(), expectedVersion: 0, command: "create_link", url, title: "1.1.7 Suno 결과", note: "새 탭 복귀 확인"
  } });
  expect(response.status()).toBe(200);
}

async function removeAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
