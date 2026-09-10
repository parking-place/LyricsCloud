import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const mutationHeaders = { Origin: origin };

test("1.0.2 signup exposes empty, loading, failure and permission recovery states", async ({ page }, testInfo) => {
  await page.goto("/auth?error=BETA_EMAIL_MISMATCH&flow=signup&requestId=synthetic");
  const code = page.getByRole("textbox", { name: "초대 코드", exact: true });
  const email = page.getByRole("textbox", { name: "Google 계정 이메일", exact: true });
  const submit = page.getByRole("button", { name: "가입하고 Google로 확인" });
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("link", { name: "기존 사용자 로그인" })).toHaveAttribute("href", "#existing-user-login");
  await expect(page.getByRole("link", { name: "가입 다시 시도" })).toHaveAttribute("href", "#beta-signup");

  let finishRequest!: () => void;
  await page.route("**/api/auth/signup", async (route) => {
    await new Promise<void>((resolve) => { finishRequest = resolve; });
    await route.fulfill({ status: 422, contentType: "application/json",
      body: JSON.stringify({ error: { code: "BETA_SIGNUP_INVALID", requestId: "synthetic" } }) });
  });
  await code.fill("a1b2c3");
  await email.fill("writer@example.invalid");
  await submit.click();
  await expect(page.getByRole("button", { name: "Google 계정 확인 준비 중…" })).toBeDisabled();
  await expect(code).toBeDisabled();
  finishRequest();
  await expect(page.locator(".beta-signup-error")).toContainText("입력한 코드는 사용되지 않았습니다");
  await expect(code).toHaveValue("A1B2C3");
  await expect(email).toHaveValue("writer@example.invalid");
  await expect(page.getByRole("link", { name: "기존 사용자 로그인으로 이동" })).toHaveAttribute("href", "#existing-user-login");
  await page.screenshot({ path: `docs/runbooks/evidence/1.0.2-p3-signup-recovery-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "입력 지우고 취소" }).click();
  await expect(code).toHaveValue("");
  await expect(email).toHaveValue("");
  await expect(page.locator(".beta-signup-error")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("1.0.2 save failure keeps current lyric and offers exact-copy recovery", async ({ context, page }, testInfo) => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for the save recovery fixture");
  const account = await createAccount(context);
  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
        writeText: (text: string) => { (window as typeof window & { __copiedText?: string }).__copiedText = text; return Promise.resolve(); }
      } });
    });
    const lyricId = await createLyric(page);
    let failOnce = true;
    await page.route(`**/api/lyrics/${lyricId}`, async (route) => {
      if (route.request().method() === "PATCH" && failOnce) {
        failOnce = false;
        return route.abort("internetdisconnected");
      }
      return route.continue();
    });
    await page.goto(`/lyrics/${lyricId}`);
    await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
    const text = "저장 실패여도 화면과 복사본에 남는 한글 👩‍🎤";
    await page.locator(".cm-content").fill(text);
    await page.getByRole("textbox", { name: "가사 제목" }).fill("서버 저장 실패 상태");
    await expect(page.getByText("저장하지 못했습니다")).toBeVisible();
    await expect(page.locator(".lyric-editor-page")).toHaveAttribute("data-pending-input", "true");
    await page.getByRole("button", { name: "현재 입력 복사" }).first().click();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { __copiedText?: string }).__copiedText)).toBe(text);
    await expect(page.locator(".cm-content")).toContainText(text);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    await page.screenshot({ path: `docs/runbooks/evidence/1.0.2-p3-save-recovery-${testInfo.project.name}.png`, fullPage: true });
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
    await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe(text);
  } finally {
    await deleteAccount(account.userId);
  }
});

async function createAccount(context: BrowserContext) {
  const userId = randomUUID();
  const token = `new-feature-102-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id, status) values ($1, 'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id, display_name) values ($1, $2)", [userId, "1.0.2 복구 사용자"]);
    await pool.query(`insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at)
      values ($1, $2, now() + interval '1 hour', now() + interval '2 hours')`, [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function createLyric(page: Page) {
  const songResponse = await page.request.post("/api/songs", { headers: mutationHeaders,
    data: { requestId: randomUUID(), title: "1.0.2 복구 합성 곡" } });
  expect(songResponse.status()).toBe(201);
  const songId = (await songResponse.json()).song.id as string;
  const lyricResponse = await page.request.post(`/api/songs/${songId}/lyrics`, { headers: mutationHeaders,
    data: { requestId: randomUUID(), title: "1.0.2 복구 합성 가사", body: "기준 본문" } });
  expect(lyricResponse.status()).toBe(201);
  return (await lyricResponse.json()).lyric.id as string;
}

async function deleteAccount(userId: string) {
  await withE2eDatabase(async (pool) => { await pool.query("delete from app_users where id = $1", [userId]); });
}
