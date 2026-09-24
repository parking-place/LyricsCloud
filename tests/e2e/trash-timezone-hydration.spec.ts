import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test("hydrates a nonempty trash list without changing Korean dates across time zones", async ({ browser, context, page }) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires an isolated E2E database");
  await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const title = `시간대 검증 ${randomUUID().slice(0, 8)}`;
  const created = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, tokens: ["test"] } });
  expect(created.status()).toBe(201);
  const promptId = (await created.json()).prompt.id as string;
  try {
    expect((await page.request.delete(`/api/prompts/${promptId}`, { headers })).status()).toBe(200);
    for (const timezoneId of ["UTC", "Asia/Seoul"]) {
      const isolated = await browser.newContext({ baseURL: origin, timezoneId });
      try {
        await isolated.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
        const screen = await isolated.newPage();
        const errors: string[] = [];
        screen.on("pageerror", (error) => errors.push(error.message));
        await screen.goto("/trash");
        await expect(screen.getByRole("heading", { name: "휴지통" })).toBeVisible();
        await expect(screen.locator(".trash-page")).toContainText(title);
        await screen.waitForLoadState("networkidle");
        expect(errors, timezoneId).toEqual([]);
      } finally { await isolated.close(); }
    }
  } finally {
    const removed = await page.request.post("/api/trash/permanent", { headers, data: {
      items: [{ kind: "resource", id: promptId }],
      confirmedTitles: [{ kind: "resource", id: promptId, title }]
    } });
    expect(removed.status()).toBe(200);
  }
});
