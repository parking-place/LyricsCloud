import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test("PWA update and unload stay blocked while rhyme metadata or prompt text is only in memory", async ({ browser }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated database");
  const mobile = info.project.name.includes("mobile");
  const context = await browser.newContext({ baseURL: origin,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile, hasTouch: mobile });
  await context.addInitScript(() => {
    const events = new EventTarget();
    const waiting = { postMessage() {} };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: Object.assign(events, {
      controller: waiting,
      register: async () => ({ waiting, active: waiting, addEventListener() {}, update: async () => {} })
    }) });
  });
  const account = await createAccount(context);
  let releaseMetadata = () => {};
  try {
    const rhyme = await context.request.post("/api/rhymes", { headers, data: {
      requestId: randomUUID(), title: "원래 라임 제목", body: "합성 라임 원문"
    } });
    expect(rhyme.status()).toBe(201);
    const rhymeId = (await rhyme.json()).rhyme.id as string;
    const prompt = await context.request.post("/api/prompts", { headers, data: {
      requestId: randomUUID(), title: "원래 프롬프트 제목", mode: "sentence", sentenceText: "합성 문장 원문"
    } });
    expect(prompt.status()).toBe(201);
    const promptId = (await prompt.json()).prompt.id as string;

    const page = await context.newPage();
    await page.goto(`/rhymes/${rhymeId}`);
    await expect(page.getByText("방금 저장됨", { exact: true }).first()).toBeVisible();
    const update = page.getByRole("button", { name: "업데이트 적용" });
    await expect(update).toBeEnabled();
    let metadataStarted!: () => void;
    const started = new Promise<void>((resolve) => { metadataStarted = resolve; });
    const hold = new Promise<void>((resolve) => { releaseMetadata = resolve; });
    await page.route(`**/api/rhymes/${rhymeId}`, async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      metadataStarted();
      await hold;
      await route.continue();
    });
    await page.getByRole("textbox", { name: "노트 제목" }).fill("아직 서버에 없는 라임 제목");
    await started;
    await expect(update).toBeDisabled();
    expect(await beforeUnloadBlocked(page)).toBe(true);
    releaseMetadata();
    await expect.poll(async () => (await (await page.request.get(`/api/rhymes/${rhymeId}`)).json()).rhyme.title)
      .toBe("아직 서버에 없는 라임 제목");
    await expect(page.locator(".rhyme-editor-page")).not.toHaveAttribute("data-pending-input", "true");
    await expect(update).toBeEnabled();

    await page.goto(`/prompts/${promptId}`);
    await expect(page.getByText("방금 저장됨", { exact: true })).toBeVisible();
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args) {
        if (this.name === "documents" || this.name === "updates") throw new DOMException("quota", "QuotaExceededError");
        return original.apply(this, args);
      };
    });
    await page.getByRole("textbox", { name: "문장형 프롬프트 원문" }).fill("메모리에만 남은 문장 원문");
    await expect(page.getByText("저장 실패 · 다시 시도 필요")).toBeVisible();
    await expect(update).toBeDisabled();
    expect(await beforeUnloadBlocked(page)).toBe(true);
    const current = await (await page.request.get(`/api/prompts/${promptId}`)).json();
    expect(current.prompt.sentenceText).toBe("합성 문장 원문");
    await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue("메모리에만 남은 문장 원문");
  } finally {
    releaseMetadata();
    await context.close();
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [account.userId]).then(() => undefined));
  }
});

async function beforeUnloadBlocked(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

async function createAccount(context: BrowserContext) {
  const userId = randomUUID(), token = `p4-volatile-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'휘발성 입력 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}
