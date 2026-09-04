import { expect, test } from "@playwright/test";

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
  await expect(page.getByText("정책 버전 2026-09-04")).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.screenshot({ path: `docs/runbooks/evidence/0.1.0-phase4-auth-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("link", { name: "이용 안내" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "이용 안내", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "로그인 화면으로 돌아가기" }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await page.getByRole("link", { name: "개인정보 안내" }).click();
  await expect(page.getByRole("heading", { name: "개인정보 안내", exact: true })).toBeVisible();
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
  await expect(page.getByRole("status")).toHaveText("Google 로그인을 시작합니다.");
  await page.getByText("Google 계정을 확인하는 중").click({ force: true, noWaitAfter: true });
  await page.waitForTimeout(350);
  expect(starts).toBe(1);
});

test("protected workspace redirects without a session", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/auth$/);
});

test("authenticated workspace exposes the desktop and mobile shell", async ({ context, page }, testInfo) => {
  const token = process.env.E2E_SESSION_TOKEN;
  test.skip(!token, "E2E_SESSION_TOKEN is required for the protected shell fixture");
  await context.addCookies([{ name: "lc_session", value: token!, url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
  const response = await page.goto("/workspace?auth=success");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  const title = page.getByRole("heading", { name: /안녕하세요, 테스트 사용자님/ });
  await expect(title).toBeFocused();
  await expect(page.getByRole("status")).toContainText("로그인이 완료되었습니다");
  await expect(page.getByText("0.2.0에서 곡 관리 시작")).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await page.screenshot({ path: `docs/runbooks/evidence/0.1.0-phase4-shell-${testInfo.project.name}.png`, fullPage: true });

  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "데스크톱 주 메뉴" })).toBeVisible();
    const toggle = page.getByRole("button", { name: "좌측 메뉴 접기" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "좌측 메뉴 펼치기" })).toBeVisible();
    await expect(page.getByText("0.4.0 예정")).toBeHidden();
    const logout = page.locator(".top-logout");
    await logout.focus();
    await expect(logout).toBeFocused();
  } else {
    await expect(page.getByRole("navigation", { name: "모바일 주 메뉴" })).toBeVisible();
    await expect(page.getByRole("button", { name: "빠른 추가, 준비 중" })).toBeDisabled();
  }
});

test("auth actions fit a 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/auth?error=AUTH_PROVIDER_UNAVAILABLE");
  await expect(page.getByRole("link", { name: "Google 계정으로 계속하기" })).toBeVisible();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

async function hasHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
