import { expect, test } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

test("auth UI is responsive, reports failures, and links to real policy pages", async ({ page }, testInfo) => {
  const response = await page.goto("/auth?error=AUTH_NOT_ALLOWED&requestId=synthetic-request");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByRole("heading", { name: /가사와 라임|한 줄의 아이디어/ })).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("heading", { name: "다시 작업을 시작해볼까요?" })).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: "다시 작업을 시작해볼까요?" })).toBeHidden();
  }
  await expect(page.locator(".auth-error")).toContainText("아직 초대되지 않은 계정이에요");
  await expect(page.getByRole("link", { name: "Google 계정으로 계속하기" })).toHaveAttribute("href", /\/api\/auth\/login/);
  await expect(page.getByRole("heading", { name: "초대 코드로 가입" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "초대 코드", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Google 계정 이메일", exact: true })).toBeVisible();
  await expect(page.getByText("정책 버전 2026-09-04")).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const control of [
    page.getByRole("link", { name: "Google 계정으로 계속하기" }),
    page.getByRole("textbox", { name: "초대 코드", exact: true }),
    page.getByRole("textbox", { name: "Google 계정 이메일", exact: true }),
    page.getByRole("button", { name: "가입하고 Google로 확인" })
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const story = await page.locator(".auth-story").boundingBox();
  const panel = await page.locator(".auth-panel").boundingBox();
  expect(story).not.toBeNull();
  expect(panel).not.toBeNull();
  if (testInfo.project.name === "mobile") {
    expect(panel!.y).toBeGreaterThanOrEqual(story!.y + story!.height - 1);
    expect(panel!.width).toBeLessThanOrEqual(viewport!.width + 1);
  } else {
    expect(panel!.x).toBeGreaterThanOrEqual(story!.x + story!.width - 1);
  }
  await page.screenshot({ path: `docs/runbooks/evidence/1.0.1-phase4-beta-signup-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("link", { name: "이용 안내" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "이용 안내", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "로그인 화면으로 돌아가기" }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await page.getByRole("link", { name: "개인정보 안내" }).click();
  await expect(page.getByRole("heading", { name: "개인정보 안내", exact: true })).toBeVisible();
});

test("signup keeps code and email visible when the preflight request fails", async ({ page }) => {
  await page.route("**/api/auth/signup", (route) => route.fulfill({ status: 422, contentType: "application/json",
    body: JSON.stringify({ error: { code: "BETA_SIGNUP_INVALID", requestId: "synthetic" } }) }));
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "초대 코드", exact: true }).fill("a1b2c3");
  await page.getByRole("textbox", { name: "Google 계정 이메일", exact: true }).fill("writer@example.invalid");
  await page.getByRole("button", { name: "가입하고 Google로 확인" }).click();
  await expect(page.locator(".beta-signup-error")).toContainText("초대 코드 6자리");
  await expect(page.getByRole("textbox", { name: "초대 코드", exact: true })).toHaveValue("A1B2C3");
  await expect(page.getByRole("textbox", { name: "Google 계정 이메일", exact: true })).toHaveValue("writer@example.invalid");
});

test("login pending state prevents duplicate starts", async ({ page }) => {
  let starts = 0;
  await page.route("**/api/auth/login**", async (route) => {
    starts += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ status: 204 });
  });
  await page.goto("/auth");
  const login = page.getByRole("link", { name: "Google 계정으로 계속하기" });
  await login.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Google 계정을 확인하는 중")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Google 로그인을 시작합니다." })).toHaveText("Google 로그인을 시작합니다.");
  await page.getByText("Google 계정을 확인하는 중").click({ force: true, noWaitAfter: true });
  await page.waitForTimeout(350);
  expect(starts).toBe(1);
});

test("protected workspace redirects without a session", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/auth$/);
});

test("authenticated workspace exposes the desktop and mobile shell", async ({ context, page }, testInfo) => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required for the protected shell fixture");
  await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
  const response = await page.goto("/workspace?auth=success");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const title = page.getByRole("heading", { name: /안녕하세요, 테스트 사용자님/ });
  await expect(title).toBeFocused();
  await expect(page.getByRole("status")).toContainText("로그인이 완료되었습니다");
  await expect(page.getByRole("link", { name: "곡 목록 열기" })).toHaveAttribute("href", "/songs");
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await expect(page).toHaveScreenshot(`0.1.0-phase5-shell-${testInfo.project.name}.png`, { fullPage: true });
  await page.screenshot({ path: `docs/runbooks/evidence/0.1.0-phase5-shell-${testInfo.project.name}.png`, fullPage: true });

  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "데스크톱 주 메뉴" })).toBeVisible();
    const toggle = page.getByRole("button", { name: "좌측 메뉴 접기" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "좌측 메뉴 펼치기" })).toBeVisible();
  await expect(page.getByText("0.7.0 예정")).toBeHidden();
    const logout = page.locator(".top-logout");
    await logout.focus();
    await expect(logout).toBeFocused();
  } else {
    await expect(page.getByRole("navigation", { name: "모바일 주 메뉴" })).toBeVisible();
    await expect(page.getByRole("link", { name: "새 곡 추가" })).toHaveAttribute("href", /^\/songs\/new/);
  }
});

test("auth actions fit a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/auth?error=AUTH_PROVIDER_UNAVAILABLE");
  await expect(page.getByRole("link", { name: "Google 계정으로 계속하기" })).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test("auth actions remain reachable with large text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect(page.getByRole("link", { name: "Google 계정으로 계속하기" })).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test("auth actions remain reachable at a 200% browser zoom equivalent", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto("/auth");
  await expect(page.getByRole("link", { name: "Google 계정으로 계속하기" })).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

async function hasHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
