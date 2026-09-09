import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
let ownerId: string;

test.describe("P6 creation preservation", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");
  test.beforeEach(async ({ context }) => {
    ownerId = randomUUID();
    const token = `p6-creation-${randomUUID()}`;
    await withE2eDatabase(async pool => {
      await pool.query("insert into app_users(id,status) values($1,'active')", [ownerId]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'P6 합성 계정')", [ownerId]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), ownerId]);
    });
    await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  });
  test.afterEach(async ({ context }) => {
    await context.close();
    await withE2eDatabase(pool => pool.query("delete from app_users where id=$1", [ownerId]).then(() => undefined));
  });

  for (const kind of ["rhymes", "prompts"] as const) {
    const titleName = kind === "rhymes" ? "노트 제목" : "프롬프트 제목";
    async function enterBody(page: Page, value: string) {
      if (kind === "rhymes") await page.getByLabel("자유 본문").fill(value);
      else {
        await page.getByRole("combobox", { name: "태그 입력" }).fill(value);
        await page.getByRole("button", { name: "태그 추가", exact: true }).click();
      }
      await expect(page.locator(".local-draft-state")).toContainText("임시 저장됨");
    }
    async function expectBody(page: Page, value: string) {
      if (kind === "rhymes") await expect(page.getByLabel("자유 본문")).toHaveValue(value);
      else await expect(page.locator(".prompt-editor-token")).toHaveText([new RegExp(value)]);
    }

    test(`${kind}: separate active drafts survive reentry and another tab's discard`, async ({ context, page }) => {
      await page.goto(`/${kind}/new`);
      await expect(page.getByRole("textbox", { name: titleName })).toBeEnabled();
      await enterBody(page, "first-tab-content");
      const second = await context.newPage();
      await second.goto(`/${kind}/new`);
      await expect(second.getByRole("textbox", { name: titleName })).toBeEnabled();
      if (kind === "rhymes") await expect(second.getByLabel("자유 본문")).toHaveValue("");
      else await expect(second.locator(".prompt-editor-token")).toHaveCount(0);
      await enterBody(second, "second-tab-content");
      await page.getByRole("button", { name: "취소", exact: true }).click();
      await page.getByRole("button", { name: "초안 삭제 후 나가기" }).click();
      await expect(page).toHaveURL(new RegExp(`/${kind}$`));
      await second.close();
      await page.goto(`/${kind}/new`);
      await expectBody(page, "second-tab-content");
    });

    test(`${kind}: a lost create response retries the same payload after reload`, async ({ page }) => {
      let lost = false;
      let submitted = "";
      await page.route(`**/api/${kind}`, async route => {
        if (route.request().method() !== "POST") return route.continue();
        submitted = route.request().postData()!;
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        lost = true;
        await route.abort("failed");
      });
      await page.goto(`/${kind}/new`);
      await expect(page.getByRole("textbox", { name: titleName })).toBeEnabled();
      await enterBody(page, "response-loss-content");
      await page.getByRole("textbox", { name: titleName }).fill("response-loss-title");
      await expect.poll(() => lost).toBe(true);
      await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
      await expect(page.getByRole("textbox", { name: titleName })).toBeDisabled();
      await page.unroute(`**/api/${kind}`);
      let retried = "";
      await page.route(`**/api/${kind}`, async route => {
        if (route.request().method() === "POST") retried = route.request().postData()!;
        await route.continue();
      });
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/${kind}/[0-9a-f-]{36}$`), { timeout: 20_000 });
      expect(retried).toBe(submitted);
      const result = await (await page.request.get(`/api/${kind}`)).json();
      expect(result.items).toHaveLength(1);
    });

    test(`${kind}: discard prevents a late creation response from navigating`, async ({ page }) => {
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      let reached = false;
      await page.route(`**/api/${kind}`, async route => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        reached = true;
        await gate;
        await route.fulfill({ response }).catch(() => undefined);
      });
      try {
        await page.goto(`/${kind}/new`);
        await page.getByRole("textbox", { name: titleName }).fill("cancel-inflight-title");
        await expect.poll(() => reached).toBe(true);
        await page.getByRole("button", { name: "취소", exact: true }).click();
        await page.getByRole("button", { name: "초안 삭제 후 나가기" }).click();
        await expect(page).toHaveURL(new RegExp(`/${kind}$`));
        release();
        await page.waitForTimeout(1_000); // Let the held success callback and old autosave timer run.
        await expect(page).toHaveURL(new RegExp(`/${kind}$`));
        await page.goto(`/${kind}/new`);
        await expect(page.getByRole("textbox", { name: titleName })).toHaveValue("");
      } finally { release(); }
    });
  }

  test("restores edited template tokens even when the template is unavailable", async ({ page }) => {
    const response = await page.request.post("/api/templates", { headers, data: { requestId: randomUUID(), type: "prompt", title: "seed", tokens: ["original"] } });
    expect(response.status()).toBe(201);
    const id = (await response.json()).template.id as string;
    await page.goto(`/prompts/new?template=${id}`);
    await expect(page.getByRole("textbox", { name: "프롬프트 제목" })).toHaveValue("seed 작업");
    await page.getByRole("textbox", { name: "프롬프트 제목" }).fill("x".repeat(201));
    await page.getByRole("combobox", { name: "태그 입력" }).fill("local-change");
    await page.getByRole("button", { name: "태그 추가", exact: true }).click();
    await expect(page.locator(".local-draft-state")).toContainText("임시 저장됨");
    await page.route(`**/api/templates/${id}`, route => route.fulfill({ status: 503, body: "{}" }));
    await page.reload();
    await expect(page.getByRole("textbox", { name: "프롬프트 제목" })).toHaveValue("x".repeat(201));
    await expect(page.locator(".prompt-editor-token")).toHaveCount(2);
    await expect(page.locator(".prompt-editor-token").last()).toContainText("local-change");
  });

  test("template save freezes inputs and selection until its response is known", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let reached = false;
    await page.route("**/api/templates", async route => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch(); reached = true; await gate;
      await route.fulfill({ response });
    });
    try {
      await page.goto("/templates?type=lyrics");
      await page.getByRole("button", { name: "새 템플릿" }).click();
      await page.getByLabel("템플릿 제목").fill("pending-template");
      await page.getByLabel("가사 구조 원문").fill("[Verse]\npreserved");
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect.poll(() => reached).toBe(true);
      await expect(page.getByLabel("템플릿 제목")).toBeDisabled();
      await expect(page.getByLabel("가사 구조 원문")).toBeDisabled();
      await expect(page.getByRole("button", { name: "새 템플릿" })).toBeDisabled();
      release();
      await expect(page.locator(".template-content")).toContainText("preserved");
    } finally { release(); }
  });

  test("PWA defers updates for memory inputs, IME and edits after approval", async ({ context, page }) => {
    // Control lifecycle event timing; pwa.spec.ts separately exercises a real SW.
    await context.addInitScript(() => {
      const events = new EventTarget();
      const waiting = { postMessage() {} };
      Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: Object.assign(events, {
        controller: waiting,
        register: async () => ({ waiting, active: waiting, addEventListener() {}, update: async () => {} })
      }) });
    });
    await page.goto("/lyrics/new");
    const update = page.getByRole("button", { name: "업데이트 적용" });
    const title = page.getByRole("textbox", { name: "가사 제목" });
    await expect(update).toBeEnabled();
    await title.fill("memory-only-lyric");
    await expect(update).toBeDisabled();
    await title.fill("");
    await expect(update).toBeEnabled();
    await title.dispatchEvent("compositionstart");
    await expect(update).toBeDisabled();
    await title.dispatchEvent("compositionend");
    await expect(update).toBeEnabled();
    await update.click();
    await expect(page.locator(".pwa-message")).toContainText("업데이트를 적용하고 있습니다");
    await title.fill("edit-after-approval");
    await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event("controllerchange")));
    await expect(page.locator(".pwa-message")).toContainText("입력을 보존");
    await expect(title).toHaveValue("edit-after-approval");
    await page.goto("/templates?type=lyrics");
    await page.getByRole("button", { name: "새 템플릿" }).click();
    await page.getByLabel("템플릿 제목").fill("memory-only-template");
    await expect(update).toBeDisabled();
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await expect(update).toBeEnabled();
  });

  test("lyric creation keeps the submitted title and parent fixed until recovery", async ({ page }) => {
    const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "parent" } });
    const songId = (await song.json()).song.id as string;
    await page.route(`**/api/songs/${songId}/lyrics`, async route => {
      await route.fetch();
      await route.abort("failed");
    });
    await page.goto(`/lyrics/new?songId=${songId}`);
    const title = page.getByRole("textbox", { name: "가사 제목" });
    await title.fill("submitted-lyric");
    await page.getByRole("button", { name: "가사 만들고 편집" }).click();
    await expect(page.locator(".form-error-banner")).toBeVisible();
    await expect(title).toBeDisabled();
    await expect(page.getByRole("radio").first()).toBeDisabled();
    await page.unroute(`**/api/songs/${songId}/lyrics`);
    await page.getByRole("button", { name: "가사 만들고 편집" }).click();
    await expect(page).toHaveURL(/\/lyrics\/[0-9a-f-]{36}\?/);
    const result = await (await page.request.get(`/api/songs/${songId}/lyrics`)).json();
    expect(result.items).toHaveLength(1);
  });
});
