import { expect, test } from "@playwright/test";

test("execution shell fits the viewport and exposes health semantics", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "LyricsCloud" })).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(15);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `docs/runbooks/evidence/0.1.0-phase1-${testInfo.project.name}.png`, fullPage: true });

  const live = await page.request.get("/api/health/live");
  expect(live.status()).toBe(200);
  await expect(live.json()).resolves.toMatchObject({ build: { version: "0.1.0", id: "playwright" } });
  const ready = await page.request.get("/api/health/ready");
  expect(ready.status()).toBe(503);
  await expect(ready.json()).resolves.toMatchObject({ status: "unavailable", reason: expect.stringMatching(/^DATABASE_/) });
});
