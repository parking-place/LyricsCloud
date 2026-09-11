import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.0.9 rhyme and prompt manual order UI", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("moves rhyme and prompt cards, persists both, and preserves prompt copy text", async ({ context, page }) => {
    const userId = await account(context);
    try {
      for (const title of ["라임 순서 A", "라임 순서 B", "라임 순서 C"]) await createRhyme(page, title);
      const prompts: Array<{ id: string; plainText: string }> = [];
      for (const title of ["프롬프트 순서 A", "프롬프트 순서 B", "프롬프트 순서 C"]) prompts.push(await createPrompt(page, title));

      await page.goto("/rhymes?sort=title_asc");
      await page.locator(".rhyme-card", { hasText: "라임 순서 C" }).getByRole("button", { name: "라임 순서 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await expect.poll(() => titles(page, ".rhyme-card h2")).toEqual(["라임 순서 C", "라임 순서 A", "라임 순서 B"]);
      await page.reload();
      await expect.poll(() => titles(page, ".rhyme-card h2")).toEqual(["라임 순서 C", "라임 순서 A", "라임 순서 B"]);

      await page.goto("/prompts?sort=title_asc");
      await page.locator(".prompt-card", { hasText: "프롬프트 순서 C" }).getByRole("button", { name: "프롬프트 순서 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await expect.poll(() => titles(page, ".prompt-card h2")).toEqual(["프롬프트 순서 C", "프롬프트 순서 A", "프롬프트 순서 B"]);
      const read = await page.request.get(`/api/prompts/${prompts[0]!.id}`);
      expect(read.status()).toBe(200);
      expect((await read.json()).prompt.plainText).toBe(prompts[0]!.plainText);
      await page.reload();
      await expect.poll(() => titles(page, ".prompt-card h2")).toEqual(["프롬프트 순서 C", "프롬프트 순서 A", "프롬프트 순서 B"]);
    } finally { await removeAccount(userId); }
  });

  test("keeps touch copy separate from order controls and recovers a lost move response", async ({ context, page }) => {
    const userId = await account(context);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: (value: string) => { const state = window as unknown as { copied: string; copyCount: number };
        state.copied = value; state.copyCount = (state.copyCount ?? 0) + 1; return Promise.resolve(); }
    } }));
    try {
      for (const title of ["복사 분리 A", "복사 분리 B", "복사 분리 C"]) await createPrompt(page, title);
      await page.goto("/prompts?sort=title_asc");
      await page.evaluate(() => { (window as unknown as { copyCount: number }).copyCount = 0; });
      const card = page.locator(".prompt-card", { hasText: "복사 분리 C" });
      const box = await card.boundingBox();
      await card.dispatchEvent("pointerdown", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 20 });
      await card.dispatchEvent("pointermove", { pointerType: "touch", clientX: box!.x + 20, clientY: box!.y + 45 });
      await page.waitForTimeout(700);
      expect(await page.evaluate(() => (window as unknown as { copyCount: number }).copyCount)).toBe(0);

      await page.route("**/api/prompts/order/moves", async (route) => {
        const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("failed");
      }, { times: 1 });
      await card.getByRole("button", { name: "복사 분리 C 맨 앞으로 이동" }).click();
      await expect(page.getByRole("status")).toContainText("원래 순서로 복원했습니다");
      expect(await page.evaluate(() => (window as unknown as { copyCount: number }).copyCount)).toBe(0);
      await page.getByRole("button", { name: "같은 이동 다시 시도" }).click();
      await expect(page.getByRole("status")).toContainText("사용자 정렬로 저장했습니다");
      await page.reload();
      await expect.poll(() => titles(page, ".prompt-card h2")).toEqual(["복사 분리 C", "복사 분리 A", "복사 분리 B"]);
    } finally { await removeAccount(userId); }
  });

  test("rejects anonymous fixed-type moves", async ({ browser }) => {
    const anonymous = await browser.newContext({ baseURL: origin });
    try {
      const body = { requestId: randomUUID(), itemId: randomUUID(), beforeId: randomUUID(), afterId: null, expectedVersion: 0 };
      expect((await anonymous.request.post("/api/rhymes/order/moves", { headers, data: body })).status()).toBe(401);
      expect((await anonymous.request.post("/api/prompts/order/moves", { headers, data: body })).status()).toBe(401);
    } finally { await anonymous.close(); }
  });
});

async function titles(page: Page, selector: string) { return page.locator(selector).allTextContents(); }

async function account(context: BrowserContext) {
  const userId = randomUUID();
  const token = `library-order-109-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'1.0.9 순서 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return userId;
}

async function createRhyme(page: Page, title: string) {
  const response = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title, body: `${title} 본문` } });
  expect(response.status()).toBe(201);
}

async function createPrompt(page: Page, title: string) {
  const response = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title, tokens: [`${title} one`, "two", "three"] } });
  expect(response.status()).toBe(201);
  const prompt = (await response.json()).prompt as { id: string; plainText: string };
  return prompt;
}

async function removeAccount(id: string) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [id]).then(() => undefined));
}
