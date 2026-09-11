import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.10 Suno manual workspace UI", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("stores a custom model and three independent links across re-entry", async ({ context, page }) => {
    const fixture = await accountWithSong(context, page);
    try {
      await page.goto(`/songs/${fixture.songId}`);
      const panel = page.locator(".suno-panel");
      await expect(panel.getByRole("heading", { name: "Suno 작업" })).toBeVisible();
      await panel.getByLabel("사용 모델").selectOption("__custom__");
      await panel.getByLabel("사용자 지정 모델명").fill("모델-커스텀-v6");
      await panel.getByRole("button", { name: "모델 저장" }).click();
      await expect(panel.getByRole("status")).toContainText("모델-커스텀-v6");

      const links = [
        ["https://suno.com/song/11111111-1111-4111-8111-111111111111", "도입부 안", "첫 메모"],
        ["https://www.suno.com/s/Abc_123-xY", "후렴 안", "둘째 메모"],
        ["https://suno.com/song/22222222-2222-4222-8222-222222222222?share=work", "브리지 안", "셋째 메모"]
      ] as const;
      for (const [url, title, note] of links) await addLink(panel, page, url, title, note);
      await expect(panel.locator(".suno-link-card")).toHaveCount(3);
      const firstAnchor = panel.locator(".suno-link-card").first().getByRole("link");
      await expect(firstAnchor).toHaveAttribute("target", "_blank");
      await expect(firstAnchor).toHaveAttribute("rel", /noopener/);
      await expect(firstAnchor).toHaveAttribute("rel", /noreferrer/);

      await panel.getByRole("button", { name: "브리지 안 위로 이동" }).click();
      await expect(panel.getByRole("status")).toContainText("순서를 저장했습니다");
      await page.reload();
      await expect(panel.getByLabel("사용자 지정 모델명")).toHaveValue("모델-커스텀-v6");
      await expect(panel.locator(".suno-link-card strong").allTextContents()).resolves.toEqual(["도입부 안", "브리지 안", "후렴 안"]);
    } finally { await removeAccount(fixture.userId); }
  });

  test("keeps an IME-like link draft after failure and explains local-only removal", async ({ context, page }) => {
    const fixture = await accountWithSong(context, page);
    try {
      await page.goto(`/songs/${fixture.songId}`);
      const panel = page.locator(".suno-panel");
      await panel.getByRole("button", { name: "첫 링크 추가" }).click();
      const dialog = page.getByRole("dialog", { name: "Suno 작업 링크 추가" });
      await dialog.getByLabel("Suno URL").fill("https://suno.com/song/33333333-3333-4333-8333-333333333333");
      await dialog.getByLabel("표시 제목").pressSequentially("한글 조합 초안");
      await dialog.getByLabel("메모").fill("실패해도 유지할 메모");
      await page.route("**/api/songs/*/suno-workspace", (route) => route.abort("failed"), { times: 1 });
      await dialog.getByRole("button", { name: "링크 저장" }).click();
      await expect(dialog.getByRole("alert")).toContainText("입력은 유지");
      await dialog.getByRole("button", { name: "닫기" }).click();
      await panel.getByRole("button", { name: "첫 링크 추가" }).click();
      await expect(dialog.getByLabel("표시 제목")).toHaveValue("한글 조합 초안");
      await expect(dialog.getByLabel("메모")).toHaveValue("실패해도 유지할 메모");
      await dialog.getByRole("button", { name: "링크 저장" }).click();
      await expect(panel.locator(".suno-link-card")).toHaveCount(1);

      await panel.getByRole("button", { name: "제거" }).click();
      const confirm = page.getByRole("alertdialog", { name: /한글 조합 초안/ });
      await expect(confirm).toContainText("Suno에 있는 원곡이나 공유 링크는 삭제되지 않습니다");
      await confirm.getByRole("button", { name: "LyricsCloud에서 제거" }).click();
      await expect(panel.getByRole("status")).toContainText("Suno의 원곡은 그대로 유지");
      await page.reload();
      await expect(panel.locator(".suno-empty")).toBeVisible();
    } finally { await removeAccount(fixture.userId); }
  });

  test("shows validation and refresh failures without discarding the workspace", async ({ context, page }) => {
    const fixture = await accountWithSong(context, page);
    try {
      await page.goto(`/songs/${fixture.songId}`);
      const panel = page.locator(".suno-panel");
      await panel.getByRole("button", { name: "첫 링크 추가" }).click();
      const dialog = page.getByRole("dialog", { name: "Suno 작업 링크 추가" });
      await dialog.getByLabel("Suno URL").fill("javascript:alert(1)");
      await dialog.getByRole("button", { name: "링크 저장" }).click();
      await expect(dialog.getByRole("alert")).toContainText("Suno의 HTTPS 곡 링크만");
      await expect(dialog.getByLabel("Suno URL")).toHaveValue("javascript:alert(1)");
      await dialog.getByRole("button", { name: "닫기" }).click();

      await page.route("**/api/songs/*/suno-workspace", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAVAILABLE" } }) });
      }, { times: 1 });
      await panel.getByRole("button", { name: "새로 고침" }).click();
      await expect(panel).toHaveAttribute("aria-busy", "true");
      await expect(panel.getByRole("alert")).toContainText("불러오지 못했습니다");
      await expect(panel.getByRole("heading", { name: "Suno 작업" })).toBeVisible();
    } finally { await removeAccount(fixture.userId); }
  });

  test("hides another owner's workspace and rejects anonymous commands", async ({ browser, context, page }) => {
    const owner = await accountWithSong(context, page);
    const stranger = await browser.newContext({ baseURL: origin });
    const strangerUser = await account(stranger);
    try {
      const path = `/api/songs/${owner.songId}/suno-workspace`;
      expect((await stranger.request.get(path)).status()).toBe(404);
      expect((await stranger.request.post(path, { headers, data: { requestId: randomUUID(), expectedVersion: 0, command: "set_model", modelLabel: "v5" } })).status()).toBe(404);
      const anonymous = await browser.newContext({ baseURL: origin });
      try {
        expect((await anonymous.request.get(path)).status()).toBe(401);
        expect((await anonymous.request.post(path, { headers, data: { requestId: randomUUID(), expectedVersion: 0, command: "set_model", modelLabel: "v5" } })).status()).toBe(401);
      } finally { await anonymous.close(); }
    } finally {
      await stranger.close();
      await removeAccount(owner.userId);
      await removeAccount(strangerUser);
    }
  });
});

async function addLink(panel: ReturnType<Page["locator"]>, page: Page, url: string, title: string, note: string) {
  await panel.getByRole("button", { name: "＋ 링크 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "Suno 작업 링크 추가" });
  await dialog.getByLabel("Suno URL").fill(url);
  await dialog.getByLabel("표시 제목").fill(title);
  await dialog.getByLabel("메모").fill(note);
  await dialog.getByRole("button", { name: "링크 저장" }).click();
  await expect(dialog).toBeHidden();
}

async function accountWithSong(context: BrowserContext, page: Page) {
  const userId = await account(context);
  const response = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "1.0.10 Suno UI" } });
  expect(response.status()).toBe(201);
  return { userId, songId: ((await response.json()) as { song: { id: string } }).song.id };
}

async function account(context: BrowserContext) {
  const userId = randomUUID();
  const token = `suno-ui-110-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.10 Suno 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
}
