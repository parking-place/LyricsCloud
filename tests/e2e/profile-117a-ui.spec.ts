import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const sharp = createRequire(`${process.cwd()}/apps/web/package.json`)("sharp");

test.describe("1.1.7a profile UI and home mark", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "disposable E2E database is required");

  test("saves name/photo, rereads server, keeps invalid selection and handles two tabs", async ({ context, page }) => {
    const owner = await createOwner(context);
    try {
      await page.goto("/settings#account");
      await expect(page.getByRole("heading", { name: "내 프로필" })).toBeVisible();
      await expect(page.locator("#profile-google-email")).toHaveValue("profile-ui@example.invalid");
      await expect(page.locator("#profile-google-email")).toHaveAttribute("readonly", "");
      await page.evaluate(() => (window as typeof window & { __lcApplyTheme?: (theme: "light" | "dark") => void }).__lcApplyTheme?.("dark"));
      const darkPath = test.info().outputPath("account-dark.png");
      await page.screenshot({ path: darkPath });
      await test.info().attach("account-dark", { path: darkPath, contentType: "image/png" });
      await page.evaluate(() => (window as typeof window & { __lcApplyTheme?: (theme: "light" | "dark") => void }).__lcApplyTheme?.("light"));
      const lightPath = test.info().outputPath("account-light.png");
      await page.screenshot({ path: lightPath });
      await test.info().attach("account-light", { path: lightPath, contentType: "image/png" });
      await page.locator("#profile-display-name").fill("  새 프로필 이름  ");
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
      await expect(page.locator(profileNameSelector())).toContainText("새 프로필 이름");
      await page.reload();
      await expect(page.locator("#profile-display-name")).toHaveValue("새 프로필 이름");
      const png: Buffer = await sharp({ create: { width: 64, height: 64, channels: 3,
        background: { r: 110, g: 180, b: 60 } } }).png().toBuffer();
      await page.locator(".profile-file-label input").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: png });
      await expect(page.getByText("선택한 사진 · 미저장")).toBeVisible();
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
      await expect(page.locator(".profile-photo-compare img")).toHaveCount(2);
      await page.reload();
      await expect(page.locator(".profile-photo-compare img")).toHaveCount(2);
      expect((await page.request.get("/api/profile/avatar")).status()).toBe(200);
      await page.locator(".profile-file-label input").setInputFiles({ name: "spoof.png", mimeType: "image/png",
        buffer: Buffer.from("<svg>bad</svg>") });
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("입력이나 사진을 서버가 거부했습니다.")).toBeVisible();
      await expect(page.getByText("선택됨: spoof.png")).toBeVisible();
      expect((await page.request.get("/api/profile/avatar")).status()).toBe(200);
      await page.getByRole("button", { name: "취소", exact: true }).last().click();
      const second = await context.newPage();
      try {
        await second.goto("/settings#account");
        await page.locator("#profile-display-name").fill("첫 탭 입력 보존");
        await second.locator("#profile-display-name").fill("둘째 탭 저장");
        await second.getByRole("button", { name: "프로필 저장" }).click();
        await expect(second.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
        await expect(page.locator("#profile-display-name")).toHaveValue("첫 탭 입력 보존");
        await expect(page.getByText("다른 탭에서 서버 프로필이 변경되었습니다.")).toBeVisible();
      } finally { await second.close(); }
      await page.getByRole("button", { name: "취소", exact: true }).last().click();
      await page.locator(".profile-file-label input").setInputFiles({ name: "photo-only.png", mimeType: "image/png", buffer: png });
      const photoOtherTab = await context.newPage();
      try {
        await photoOtherTab.goto("/settings#account");
        await photoOtherTab.locator("#profile-display-name").fill("사진 초안 중 다른 탭 이름");
        await photoOtherTab.getByRole("button", { name: "프로필 저장" }).click();
        await expect(photoOtherTab.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
        await expect(page.getByText("다른 탭에서 서버 프로필이 변경되었습니다.")).toBeVisible();
        await expect(page.getByText("선택됨: photo-only.png")).toBeVisible();
        await expect(page.locator("#profile-display-name")).toHaveValue("사진 초안 중 다른 탭 이름");
        await page.getByRole("button", { name: "프로필 저장" }).click();
        await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
        await expect(page.locator("#profile-display-name")).toHaveValue("사진 초안 중 다른 탭 이름");
      } finally { await photoOtherTab.close(); }
      await page.getByRole("button", { name: "기본 사진으로 되돌리기" }).click();
      await page.getByRole("button", { name: "Google 이름으로 되돌리기" }).click();
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.locator("#profile-display-name")).toHaveValue("Google 기본 이름");
      expect((await page.request.get("/api/profile/avatar")).status()).toBe(404);
      await page.reload();
      await expect(page.locator("#profile-display-name")).toHaveValue("Google 기본 이름");
    } finally { await deleteOwner(owner); }
  });

  test("home targets preserve unsaved account and editor input, then navigate safely", async ({ context, page }) => {
    test.slow();
    const owner = await createOwner(context);
    try {
      await page.goto("/settings#account");
      if (test.info().project.name === "mobile") {
        await page.setViewportSize({ width: 320, height: 760 });
        const box = await page.locator(".mobile-home-icon").boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(320);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
        const narrowPath = test.info().outputPath("account-mobile-320.png");
        await page.screenshot({ path: narrowPath });
        await test.info().attach("account-mobile-320", { path: narrowPath, contentType: "image/png" });
      } else {
        await page.getByRole("button", { name: "좌측 메뉴 접기" }).click();
        await expect(page.locator(".side-nav .brand-home-link")).toBeVisible();
        for (const width of [1440, 1200, 960, 721]) {
          await page.setViewportSize({ width, height: 1000 });
          for (const selector of [".top-home-mark", ".top-shortcut-help", ".top-settings", ".top-quick-add"]) {
            const unobscured = await page.locator(selector).evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
              return rect.width > 0 && rect.height > 0 && Boolean(center && (element === center || element.contains(center)));
            });
            expect(unobscured, `${selector} must remain clickable at ${width}px`).toBe(true);
          }
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      await page.locator("#profile-display-name").fill("홈 이동 전에 남길 입력");
      await homeTarget(page).click();
      await expect(page).toHaveURL(/\/settings/);
      if (test.info().project.name === "mobile") {
        const targetPath = test.info().outputPath("mobile-home-target-320.png");
        await page.screenshot({ path: targetPath });
        await test.info().attach("mobile-home-target-320", { path: targetPath, contentType: "image/png" });
      }
      await expect(page.locator("#profile-display-name")).toHaveValue("홈 이동 전에 남길 입력");
      await expect(page.getByText("아직 저장되지 않은 입력이나 사진 선택")).toBeVisible();
      await page.getByRole("button", { name: "취소", exact: true }).last().click();
      await homeTarget(page).click();
      await expect(page).toHaveURL(/\/workspace$/);
      await expect(page.getByRole("heading", { name: /안녕하세요, Google 기본 이름님/ })).toBeVisible();
      await homeTarget(page).click();
      await expect(page.getByText("이미 창작 홈입니다.")).toBeVisible();
      await page.goto("/settings#account");
      await page.locator(test.info().project.name === "mobile" ? ".mobile-header .brand-home-link" : ".side-nav .brand-home-link").click();
      await expect(page).toHaveURL(/\/workspace$/);

      const { lyricId } = await createLyric(page);
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true");
      await editor.fill("오프라인에서도 유지할 가사 입력");
      await editor.focus();
      const selection = await page.evaluate(() => document.getSelection()?.anchorOffset ?? -1);
      await context.setOffline(true);
      await homeTarget(page).click();
      await expect(page).toHaveURL(new RegExp(`/lyrics/${lyricId}`));
      await expect(editor).toContainText("오프라인에서도 유지할 가사 입력");
      expect(await page.evaluate(() => document.getSelection()?.anchorOffset ?? -1)).toBe(selection);
      await context.setOffline(false);
    } finally { await deleteOwner(owner); }
  });

  test("keeps IME input and session-expired draft without sending a premature write", async ({ context, page }) => {
    const owner = await createOwner(context);
    try {
      await page.goto("/settings#account");
      let patches = 0;
      await page.route("**/api/profile", async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        patches += 1;
        return route.fulfill({ status: 401, contentType: "application/json", body: '{"error":{"code":"AUTH_REQUIRED"}}' });
      });
      const name = page.locator("#profile-display-name");
      await name.evaluate((node) => node.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "ㅎ" })));
      await name.fill("조합 중인 이름");
      await page.getByRole("button", { name: "프로필 저장" }).click();
      expect(patches).toBe(0);
      await expect(name).toHaveValue("조합 중인 이름");
      await name.evaluate((node) => node.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "한글" })));
      await page.getByRole("button", { name: "프로필 저장" }).click();
      expect(patches).toBe(1);
      await expect(page.getByText("로그인이 만료되었습니다.")).toBeVisible();
      await expect(name).toHaveValue("조합 중인 이름");
      await page.unroute("**/api/profile");
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
      await page.reload();
      await expect(name).toHaveValue("조합 중인 이름");
    } finally { await deleteOwner(owner); }
  });
});

function profileNameSelector(): string { return test.info().project.name === "mobile" ? ".mobile-profile-name" : ".profile-mini strong"; }
function homeTarget(page: Page) { return page.locator(test.info().project.name === "mobile" ? ".mobile-home-icon" : ".top-home-mark"); }

async function createOwner(context: BrowserContext): Promise<string> {
  const owner = randomUUID(); const token = `synthetic-profile-ui-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id) values($1)", [owner]);
    await pool.query(`insert into user_profiles(owner_id,display_name,provider_display_name,
      display_name_source,avatar_source) values($1,'Google 기본 이름','Google 기본 이름','provider','provider')`, [owner]);
    await pool.query(`insert into auth_identities(issuer,subject,user_id,email,email_verified)
      values('synthetic-issuer',$1,$2,'profile-ui@example.invalid',true)`, [owner, owner]);
    await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
      values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [hashToken(token), owner]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return owner;
}
async function deleteOwner(owner: string): Promise<void> {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [owner]).then(() => undefined));
}
async function createLyric(page: Page): Promise<{ lyricId: string }> {
  const headers = { Origin: origin };
  const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "홈 이동 합성 곡" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers,
    data: { requestId: randomUUID(), title: "홈 이동 합성 가사", body: "처음 가사" } });
  expect(lyric.status()).toBe(201);
  return { lyricId: (await lyric.json()).lyric.id as string };
}
