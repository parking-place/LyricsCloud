import { expect, test } from "@playwright/test";

test("root routes to the public auth screen and exposes health semantics", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("heading", { name: /가사와 라임|한 줄의 아이디어/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);

  const live = await page.request.get("/api/health/live");
  expect(live.status()).toBe(200);
  await expect(live.json()).resolves.toMatchObject({ build: { version: "0.4.0", id: "playwright" } });
  const ready = await page.request.get("/api/health/ready");
  if (process.env.E2E_DATABASE_URL || process.env.E2E_SESSION_TOKEN) {
    expect(ready.status()).toBe(200);
    await expect(ready.json()).resolves.toMatchObject({ status: "ok" });
  } else {
    expect(ready.status()).toBe(503);
    await expect(ready.json()).resolves.toMatchObject({ status: "unavailable", reason: expect.stringMatching(/^DATABASE_/) });
  }
});
