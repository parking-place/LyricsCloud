import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { LyricRecord } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const mutationHeaders = { Origin: origin };

test.describe("complete lyric flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for lyric flow integration");

  test("creates, edits, switches, copies, duplicates, deletes, counts and searches owner lyrics", async ({ browser, context, page }) => {
    const owner = await createAccount(context, "가사 전체 흐름 사용자");
    const otherContext = await browser.newContext({ baseURL: origin });
    const other = await createAccount(otherContext, "가사 검색 격리 사용자");
    const marker = `본문검색-${randomUUID().slice(0, 8)}`;
    try {
      await installClipboardRecorder(page);
      const songId = await createSong(page, "가사 전체 흐름 곡");
      await page.goto(`/songs/${songId}`);
      await expect(page.getByRole("heading", { name: "첫 가사를 시작해보세요" })).toBeVisible();
      await expect(page.locator(".count-grid article", { hasText: "가사" }).locator("strong")).toHaveText("0");

      await page.getByRole("button", { name: "첫 가사 작성" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+$/);
      const firstId = page.url().split("/").at(-1)!;
      await page.getByRole("textbox", { name: "가사 제목" }).fill("한글 1차 가사");
      const body = `[Verse]\n${marker} 첫 절\n\n[Hook]\n첫 후렴\n[Verse 2]\n둘째 절\n[Hook]\n마지막 후렴`;
      await page.locator(".cm-content").fill(body);
      const mobile = (page.viewportSize()?.width ?? 1440) <= 720;
      let metadata = page.getByLabel("가사 설정");
      if (mobile) {
        await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 1/ }).click();
        metadata = page.getByRole("dialog", { name: "다른 가사와 설정" }).getByLabel("가사 설정");
      }
      await metadata.getByLabel("상태").selectOption("revising");
      await metadata.getByLabel("작업 메모").fill("후렴의 마지막 문장을 다듬기");
      await metadata.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await metadata.getByRole("button", { name: "⌁ 고정" }).click();
      if (mobile) await page.getByRole("dialog", { name: "다른 가사와 설정" }).getByRole("button", { name: "닫기" }).click();
      await expect(page.getByText("방금 저장됨")).toBeVisible();

      if (mobile) await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /송폼 4/ }).click();
      const songForm = mobile ? page.getByRole("dialog", { name: "송폼 이동" }) : page.getByRole("complementary", { name: "송폼 목차" });
      await songForm.getByRole("checkbox", { name: "Hook 2번째 구간 선택" }).check();
      await songForm.getByRole("checkbox", { name: "Verse 구간 선택" }).check();
      await songForm.getByRole("button", { name: "선택 복사" }).click();
      await expect.poll(() => copiedText(page)).toBe(`[Verse]\n${marker} 첫 절\n\n[Hook]\n마지막 후렴`);
      if (mobile) await songForm.getByRole("button", { name: "닫기" }).click();

      await page.reload();
      await expect(page.getByRole("textbox", { name: "가사 제목" })).toHaveValue("한글 1차 가사");
      await expect(page.locator(".cm-content")).toContainText(marker);
      metadata = page.getByLabel("가사 설정");
      if (mobile) {
        await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 1/ }).click();
        metadata = page.getByRole("dialog", { name: "다른 가사와 설정" }).getByLabel("가사 설정");
      }
      await expect(metadata.getByLabel("상태")).toHaveValue("revising");
      await expect(metadata.getByLabel("작업 메모")).toHaveValue("후렴의 마지막 문장을 다듬기");
      await expect(metadata.getByRole("button", { name: "★ 즐겨찾기됨" })).toHaveAttribute("aria-pressed", "true");
      await expect(metadata.getByRole("button", { name: "⌁ 고정됨" })).toHaveAttribute("aria-pressed", "true");
      if (mobile) await page.getByRole("dialog", { name: "다른 가사와 설정" }).getByRole("button", { name: "닫기" }).click();

      await page.getByRole("link", { name: `← 가사 전체 흐름 곡` }).click();
      await expect(page.locator(".lyric-card")).toHaveCount(1);
      await expect(page.locator(".lyric-card")).toContainText("한글 1차 가사");
      await page.getByRole("button", { name: /새 가사/ }).click();
      await page.getByRole("textbox", { name: "가사 제목" }).fill("두 번째 가사");
      await page.locator(".cm-content").fill("[Intro]\n다른 현재본");
      await expect(page.getByText("방금 저장됨")).toBeVisible();

      if (mobile) await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 2/ }).click();
      const otherLyrics = mobile ? page.getByRole("dialog", { name: "다른 가사와 설정" }).getByLabel("다른 가사 목록") : page.getByRole("complementary", { name: "다른 가사" }).getByLabel("다른 가사 목록");
      await expect(otherLyrics.getByRole("button")).toHaveCount(2);
      await otherLyrics.getByRole("button", { name: /한글 1차 가사/ }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${firstId}$`));
      await expect(page.locator(".cm-content")).toContainText(marker);

      await page.getByRole("link", { name: `← 가사 전체 흐름 곡` }).click();
      const firstCard = page.locator(".lyric-card", { hasText: "한글 1차 가사" });
      await expect(firstCard).toContainText("수정 중");
      await expect(firstCard.getByRole("button", { name: "한글 1차 가사 즐겨찾기 해제" })).toHaveAttribute("aria-pressed", "true");
      await firstCard.getByRole("button", { name: "복제" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+$/);
      const copyId = page.url().split("/").at(-1)!;
      expect(copyId).not.toBe(firstId);
      await expect(page.getByRole("textbox", { name: "가사 제목" })).toHaveValue("한글 1차 가사 (복사본)");
      await expect(page.locator(".cm-content")).toContainText(marker);

      if (mobile) {
        await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 3/ }).click();
        await page.getByRole("dialog", { name: "다른 가사와 설정" }).getByRole("button", { name: "현재 가사 삭제" }).click();
      } else {
        await page.getByRole("button", { name: "삭제", exact: true }).click();
      }
      await page.getByRole("dialog", { name: /가사를 삭제할까요/ }).getByRole("button", { name: "가사 삭제 확인" }).click();
      await expect(page).not.toHaveURL(new RegExp(`/lyrics/${copyId}$`));
      await page.getByRole("link", { name: `← 가사 전체 흐름 곡` }).click();
      await expect(page.locator(".lyric-card")).toHaveCount(2);
      await expect(page.locator(".count-grid article", { hasText: "가사" }).locator("strong")).toHaveText("2");

      await firstCard.getByRole("button", { name: "삭제" }).click();
      await page.getByRole("dialog", { name: /가사를 삭제할까요/ }).getByRole("button", { name: "가사 삭제 확인" }).click();
      await expect(page.locator(".lyric-card")).toHaveCount(1);
      await expect(page.locator(".count-grid article", { hasText: "가사" }).locator("strong")).toHaveText("1");
      await page.getByRole("link", { name: "← 곡 목록" }).click();
      await expect(page.locator(".song-card", { hasText: "가사 전체 흐름 곡" })).toContainText("가사 1개");
      await page.getByRole("searchbox", { name: "곡 검색" }).fill(marker);
      await expect(page.getByRole("heading", { name: "조건에 맞는 곡이 없어요" })).toBeVisible();

      const otherPage = await otherContext.newPage();
      await otherPage.goto("/songs");
      await otherPage.getByRole("searchbox", { name: "곡 검색" }).fill(marker);
      await expect(otherPage.getByRole("heading", { name: "조건에 맞는 곡이 없어요" })).toBeVisible();
      await expect(otherPage.getByText("가사 전체 흐름 곡")).toHaveCount(0);
    } finally {
      await otherContext.close();
      await deleteAccount(owner.userId);
      await deleteAccount(other.userId);
    }
  });

  test("renders twenty lyrics newest-first with exact cards and count", async ({ context, page }) => {
    const account = await createAccount(context, "가사 20개 사용자");
    try {
      const songId = await createSong(page, "가사 20개 곡");
      const created: LyricRecord[] = [];
      for (let index = 1; index <= 20; index += 1) {
        const response = await page.request.post(`/api/songs/${songId}/lyrics`, { headers: mutationHeaders,
          data: { requestId: randomUUID(), title: `가사 ${String(index).padStart(2, "0")}`, body: `[Verse]\n미리보기 ${index}`, status: index === 20 ? "final" : "draft" } });
        expect(response.status()).toBe(201);
        created.push((await response.json()).lyric);
      }
      const first = created[0]!;
      const update = await page.request.patch(`/api/lyrics/${first.id}`, { headers: mutationHeaders,
        data: { rowVersion: first.rowVersion, title: "가장 최근 가사", body: "[Hook]\n가장 최근 미리보기", isFavorite: true } });
      expect(update.status()).toBe(200);
      await page.goto(`/songs/${songId}`);
      await expect(page.locator(".lyric-card")).toHaveCount(20);
      await expect(page.locator(".count-grid article", { hasText: "가사" }).locator("strong")).toHaveText("20");
      await expect(page.locator(".lyric-card").first()).toContainText("가장 최근 가사");
      await expect(page.locator(".lyric-card").first()).toContainText("가장 최근 미리보기");
      await expect(page.locator(".lyric-card", { hasText: "가사 20" })).toContainText("최종본");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    } finally { await deleteAccount(account.userId); }
  });
});

async function installClipboardRecorder(page: Page) {
  await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    writeText: (text: string) => { (window as typeof window & { __copiedText?: string }).__copiedText = text; return Promise.resolve(); }
  } }));
}

async function copiedText(page: Page) {
  return page.evaluate(() => (window as typeof window & { __copiedText?: string }).__copiedText ?? "");
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `lyric-flow-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at) values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function createSong(page: Page, title: string) {
  const response = await page.request.post("/api/songs", { headers: mutationHeaders, data: { requestId: randomUUID(), title } });
  expect(response.status()).toBe(201);
  return (await response.json()).song.id as string;
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id = $1", [userId]).then(() => undefined));
}
