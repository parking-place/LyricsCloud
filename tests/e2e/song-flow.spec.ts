import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("complete song flow", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for song flow integration");

  test("list, create, dashboard, edit, ownership, and soft delete remain consistent", async ({ browser, context, page }, testInfo) => {
    if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
    const owner = await createAccount(context, "전체 흐름 사용자");
    const otherContext = await browser.newContext({ baseURL: origin });
    const other = await createAccount(otherContext, "다른 흐름 사용자");
    try {
      await page.goto("/songs?sort=title_asc");
      await expect(page.getByRole("heading", { name: "아직 만든 곡이 없어요" })).toBeVisible();
      await page.getByRole("link", { name: "첫 곡 만들기" }).click();
      await expect(page).toHaveURL(/\/songs\/new\?returnTo=/);

      await page.getByLabel("곡 제목").fill("전체 흐름 곡");
      await page.getByLabel("곡 설명").fill("대시보드에서 확인할 곡 설명");
      await page.getByLabel("작업 메모").fill("첫 줄 작업 메모\n둘째 줄도 그대로 보존");
      await page.getByRole("radio", { name: /가사 작성 중/ }).check();
      await page.getByRole("button", { name: "초록" }).click();
      await page.getByRole("button", { name: "곡 만들기" }).click();
      await expect(page).toHaveURL(/\/songs\/[0-9a-f-]+\?returnTo=/);
      const songId = new URL(page.url()).pathname.split("/").at(-1)!;

      await expect(page.getByRole("heading", { name: "전체 흐름 곡" })).toBeVisible();
      await expect(page.getByText("대시보드에서 확인할 곡 설명")).toBeVisible();
      await expect(page.getByRole("heading", { name: "가사 작업 공간" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "연결 자료" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "작업 메모" })).toBeVisible();
      await expect(page.locator(".count-grid strong")).toHaveText(["0", "0", "0"]);
      await expect(page.getByText("삭제되지 않은 현재 자료")).toHaveCount(3);
      await expect(page.getByText("첫 줄 작업 메모")).toContainText("둘째 줄도 그대로 보존");
      expect(await hasHorizontalOverflow(page)).toBe(false);
      const mainBox = await page.locator(".dashboard-main").boundingBox();
      const sideBox = await page.locator(".dashboard-side").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(sideBox).not.toBeNull();
      if (page.viewportSize()!.width > 720) {
        expect(sideBox!.x).toBeGreaterThan(mainBox!.x + mainBox!.width - 4);
      } else {
        expect(sideBox!.y).toBeGreaterThan(mainBox!.y + mainBox!.height - 4);
        const linkedBox = await page.locator(".linked-empty").boundingBox();
        const notesBox = await page.locator(".notes-panel").boundingBox();
        expect(linkedBox!.y).toBeLessThan(notesBox!.y);
      }

      const linked = await createLinkedDashboardResources(page, songId);
      await page.route(`**/api/songs/${songId}`, (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await page.getByRole("button", { name: "자료 수 새로 고침" }).click();
      const countError = page.locator(".count-error");
      await expect(countError).toContainText("자료 수를 불러오지 못했습니다.");
      await countError.getByRole("button", { name: "다시 시도" }).click();
      await expect(page.locator(".count-grid strong")).toHaveText(["1", "1", "1"]);

      await page.route(`**/api/songs/${songId}/lyrics`, (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await page.getByRole("button", { name: "목록 새로 고침" }).click();
      const lyricsPanel = page.locator(".lyrics-panel");
      await expect(lyricsPanel).toContainText("가사 버전을 불러오지 못했습니다.");
      await lyricsPanel.getByRole("button", { name: "다시 시도" }).click();
      const lyricCard = page.locator(".lyric-card", { hasText: linked.lyricTitle });
      await expect(lyricCard).toContainText("현재 작업");
      await expect(lyricCard).toContainText("첫 줄 · 둘째 줄");

      const rhymeSection = page.getByRole("heading", { name: "라임 노트", exact: true }).locator("..").locator("..");
      await page.route("**/api/rhymes?*", (route) => route.fulfill({ status: 503, body: "{}" }), { times: 1 });
      await rhymeSection.getByRole("button", { name: "새로 고침" }).click();
      await expect(rhymeSection).toContainText("연결 라임을 불러오지 못했습니다.");
      await rhymeSection.getByRole("button", { name: "다시 시도" }).click();
      await expect(rhymeSection.getByRole("link", { name: /대시보드 라임/ })).toContainText("chair · flare");
      const promptSection = page.getByRole("heading", { name: "프롬프트", exact: true }).locator("..").locator("..");
      await promptSection.getByRole("button", { name: "새로 고침" }).click();
      await expect(promptSection.getByRole("link", { name: /대시보드 프롬프트/ })).toContainText("cinematic, female vocal");

      await page.getByRole("button", { name: "곡 메모 편집" }).click();
      let noteDialog = page.getByRole("dialog", { name: "전체 흐름 곡 작업 메모" });
      await noteDialog.getByLabel("메모 내용").fill("대시보드에서 고친 곡 메모");
      await noteDialog.getByRole("button", { name: "메모 저장" }).click();
      await expect(page.locator(".work-note", { hasText: "전체 흐름 곡" })).toContainText("대시보드에서 고친 곡 메모");
      await lyricCard.getByRole("button", { name: "메모 추가" }).click();
      noteDialog = page.getByRole("dialog", { name: `${linked.lyricTitle} 작업 메모` });
      await noteDialog.getByLabel("메모 내용").fill("후렴 호흡 다시 확인");
      await noteDialog.getByRole("button", { name: "메모 저장" }).click();
      await expect(page.locator(".work-note", { hasText: linked.lyricTitle })).toContainText("후렴 호흡 다시 확인");

      await lyricCard.getByRole("link", { name: "열기" }).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${linked.lyricId}\\?returnTo=`));
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole("link", { name: `← 전체 흐름 곡` }).click();
      await expect(page.getByRole("heading", { name: "전체 흐름 곡" })).toBeVisible();

      const sourceCard = page.locator(".lyric-card", { hasText: linked.lyricTitle });
      await sourceCard.getByRole("button", { name: "복제" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+\?returnTo=/);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole("link", { name: `← 전체 흐름 곡` }).click();
      const copiedCard = page.locator(".lyric-card", { hasText: `${linked.lyricTitle} (복사본)` });
      await copiedCard.getByRole("button", { name: "삭제" }).click();
      await expect(page.getByRole("dialog")).toContainText(`‘${linked.lyricTitle} (복사본)’ 가사를 삭제할까요?`);
      await expect(page.getByRole("button", { name: "취소" })).toBeFocused();
      await page.getByRole("button", { name: "가사 삭제 확인" }).click();
      await expect(copiedCard).toHaveCount(0);

      await page.route(`**/api/songs/${songId}/pin`, (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DATABASE_UNAVAILABLE" } }) }));
      await page.getByRole("button", { name: "⌁ 고정" }).click();
      await expect(page.getByText("변경을 저장하지 못해 이전 상태로 되돌렸습니다.")).toBeVisible();
      await expect(page.getByRole("button", { name: "⌁ 고정" })).toHaveAttribute("aria-pressed", "false");
      await page.unroute(`**/api/songs/${songId}/pin`);

      await page.getByRole("button", { name: "⌁ 고정" }).click();
      await expect(page.getByRole("button", { name: "⌁ 고정됨" })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "★ 즐겨찾기" }).click();
      await expect(page.getByRole("button", { name: "★ 즐겨찾기됨" })).toHaveAttribute("aria-pressed", "true");

      const otherPage = await otherContext.newPage();
      const otherView = await otherPage.goto(`/songs/${songId}`);
      expect(otherView?.status()).toBe(404);
      await expect(otherPage.getByText("전체 흐름 곡")).toHaveCount(0);
      const otherDelete = await otherPage.request.delete(`/api/songs/${songId}`, { headers: { Origin: origin } });
      expect(await otherDelete.json()).toEqual({ deleted: false });

      await page.getByRole("link", { name: "곡 정보 수정" }).click();
      await expect(page.getByLabel("곡 제목")).toHaveValue("전체 흐름 곡");
      await page.getByLabel("곡 제목").fill("완성된 전체 흐름 곡");
      await page.getByRole("radio", { name: /완성/ }).check();
      await page.getByRole("button", { name: "파랑" }).click();
      await page.getByRole("button", { name: "변경 저장" }).click();
      await expect(page.getByRole("heading", { name: "완성된 전체 흐름 곡" })).toBeVisible();
      await expect(page.getByText("완성", { exact: true })).toBeVisible();
      await expect(page.getByText("파랑", { exact: true })).toBeVisible();

      await page.getByRole("link", { name: "← 곡 목록" }).click();
      await expect(page).toHaveURL(/\/songs\?sort=title_asc$/);
      const card = page.locator(".song-card", { hasText: "완성된 전체 흐름 곡" });
      await expect(card).toBeVisible();
      await expect(card.getByText("완성", { exact: true })).toBeVisible();
      await expect(card.getByRole("button", { name: /고정 해제/ })).toHaveAttribute("aria-pressed", "true");
      await card.getByRole("link").click();

      await page.getByRole("button", { name: "곡 삭제" }).click();
      await expect(page.getByRole("dialog")).toContainText("‘완성된 전체 흐름 곡’ 곡을 삭제할까요?");
      await expect(page.getByRole("dialog")).toContainText("가사도 함께 숨겨집니다");
      await expect(page.getByRole("button", { name: "취소" })).toBeFocused();
      await page.getByRole("button", { name: "취소" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "곡 삭제" }).click();
      await page.getByRole("button", { name: "곡 삭제 확인" }).click();
      await expect(page).toHaveURL(/\/songs\?sort=title_asc$/);
      await expect(page.getByText("완성된 전체 흐름 곡")).toHaveCount(0);
      const deletedView = await page.goto(`/songs/${songId}`);
      expect(deletedView?.status()).toBe(404);

      await withE2eDatabase(async (pool) => {
        const orphanSongs = await pool.query("select count(*)::int as count from songs s left join resources r on r.id = s.resource_id and r.owner_id = s.owner_id where r.id is null");
        const orphanResources = await pool.query("select count(*)::int as count from resources r left join songs s on s.resource_id = r.id and s.owner_id = r.owner_id where r.type = 'song' and s.resource_id is null");
        expect(orphanSongs.rows[0].count).toBe(0);
        expect(orphanResources.rows[0].count).toBe(0);
      });
    } finally {
      await otherContext.close();
      await deleteAccount(owner.userId);
      await deleteAccount(other.userId);
    }
  });

  test("dashboard and lyric round trips preserve song filters and list scroll", async ({ context, page }) => {
    const owner = await createAccount(context, "목록 복원 사용자");
    const marker = `스크롤-${randomUUID().slice(0, 8)}`;
    try {
      for (let index = 0; index < 18; index += 1) {
        const response = await page.request.post("/api/songs", { headers: { Origin: origin }, data: {
          requestId: randomUUID(), title: `${marker}-${String(index).padStart(2, "0")}`, status: "idea",
          description: "목록 스크롤 복원 확인을 위한 충분히 긴 카드 설명입니다."
        } });
        expect(response.status()).toBe(201);
      }
      await page.goto(`/songs?search=${encodeURIComponent(marker)}&status=idea&sort=title_asc`);
      await expect(page.getByText("총 18곡")).toBeVisible();
      await page.getByRole("button", { name: "더 불러오기" }).click();
      await expect(page.getByRole("button", { name: "모든 곡을 불러왔습니다" })).toBeVisible();
      await scrollSongListToBottom(page);
      const scrollBefore = await songListScrollTop(page);
      expect(scrollBefore).toBeGreaterThan(100);
      const lastCard = page.locator(".song-card").last();
      const title = await lastCard.getByRole("heading").innerText();
      await lastCard.getByRole("link", { name: `${title} 대시보드 열기` }).click();
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await page.getByRole("button", { name: "＋ 새 가사" }).click();
      await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]+\?returnTo=/);
      await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible({ timeout: 20_000 });
      await page.getByRole("link", { name: `← ${title}` }).click();
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await page.getByRole("link", { name: "← 곡 목록" }).click();
      await expect(page.getByText("총 18곡")).toBeVisible();
      const restoredUrl = new URL(page.url());
      expect(restoredUrl.searchParams.get("search")).toBe(marker);
      expect(restoredUrl.searchParams.get("status")).toBe("idea");
      expect(restoredUrl.searchParams.get("sort")).toBe("title_asc");
      await expect.poll(() => songListScrollTop(page)).toBeGreaterThan(scrollBefore - 80);
    } finally {
      await deleteAccount(owner.userId);
    }
  });
});

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID();
  const token = `song-flow-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, displayName]);
    await pool.query(
      "insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at) values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')",
      [hashToken(token), userId]
    );
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function deleteAccount(userId: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id = $1", [userId]).then(() => undefined));
}

async function createLinkedDashboardResources(page: Page, songId: string) {
  const headers = { Origin: origin };
  const lyricTitle = "대시보드 가사";
  const lyricResponse = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
    requestId: randomUUID(), title: lyricTitle, body: "첫 줄\n둘째 줄", memo: "", status: "revising"
  } });
  expect(lyricResponse.status()).toBe(201);
  const lyricId = (await lyricResponse.json()).lyric.id as string;

  const rhymeResponse = await page.request.post("/api/rhymes", { headers, data: {
    requestId: randomUUID(), title: "대시보드 라임", body: "chair\nflare"
  } });
  expect(rhymeResponse.status()).toBe(201);
  const rhymeId = (await rhymeResponse.json()).rhyme.id as string;
  expect((await page.request.put(`/api/rhymes/${rhymeId}/songs/${songId}`, { headers })).status()).toBe(200);

  const promptResponse = await page.request.post("/api/prompts", { headers, data: {
    requestId: randomUUID(), title: "대시보드 프롬프트", tokens: ["cinematic", "female vocal"]
  } });
  expect(promptResponse.status()).toBe(201);
  const promptId = (await promptResponse.json()).prompt.id as string;
  expect((await page.request.put(`/api/prompts/${promptId}/songs/${songId}`, { headers })).status()).toBe(200);
  return { lyricId, lyricTitle };
}

async function hasHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

async function scrollSongListToBottom(page: Page) {
  await page.locator(".songs-page").evaluate((element) => {
    if (element.scrollHeight > element.clientHeight + 1) element.scrollTo({ top: element.scrollHeight });
    else window.scrollTo({ top: document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight });
  });
}

async function songListScrollTop(page: Page) {
  return page.locator(".songs-page").evaluate((element) => element.scrollHeight > element.clientHeight + 1 ? element.scrollTop : window.scrollY);
}
