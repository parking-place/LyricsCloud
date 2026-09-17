import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const sharp = createRequire(`${process.cwd()}/apps/web/package.json`)("sharp");

test.describe("1.1.7a P4 profile and home cross-boundary regression", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "disposable E2E database is required");

  test("blocks expired, foreign and cross-origin profile/photo reads or writes", async ({ browser }) => {
    const aliceContext = await browser.newContext({ baseURL: origin });
    const bobContext = await browser.newContext({ baseURL: origin });
    const expiredContext = await browser.newContext({ baseURL: origin });
    const anonymousContext = await browser.newContext({ baseURL: origin });
    const owners: string[] = [];
    try {
      const alice = await createOwner(aliceContext, "Alice"); owners.push(alice);
      const bob = await createOwner(bobContext, "Bob"); owners.push(bob);
      const expiredToken = `synthetic-expired-${randomUUID()}`;
      await withE2eDatabase((pool) => pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
        values($1,$2,now()-interval '1 minute',now()+interval '1 hour')`,
      [hashToken(expiredToken), alice]).then(() => undefined));
      await expiredContext.addCookies([{ name: "lc_session", value: expiredToken, url: origin,
        httpOnly: true, sameSite: "Lax" }]);

      const original = (await (await aliceContext.request.get("/api/profile")).json()).profile;
      const name = await aliceContext.request.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: original.rowVersion, displayName: "공유에 보일 합성 Alice" } });
      expect(name.status()).toBe(200);
      const named = (await name.json()).profile;
      const png: Buffer = await sharp({ create: { width: 64, height: 64, channels: 3,
        background: "#7aad31" } }).png().toBuffer();
      const upload = await aliceContext.request.patch("/api/profile/avatar", { headers: { Origin: origin },
        multipart: { expectedRowVersion: String(named.rowVersion),
          avatar: { name: "owner.png", mimeType: "image/png", buffer: png } } });
      expect(upload.status()).toBe(200);
      expect((await aliceContext.request.get("/api/profile/avatar")).status()).toBe(200);
      expect((await bobContext.request.get("/api/profile/avatar")).status()).toBe(404);
      expect((await expiredContext.request.get("/api/profile/avatar")).status()).toBe(401);
      expect((await anonymousContext.request.get("/api/profile/avatar")).status()).toBe(401);
      expect((await expiredContext.request.get("/api/profile")).status()).toBe(401);
      expect((await aliceContext.request.get("/api/profile/avatar?old=owner.png")).status()).toBe(404);

      const bobProfile = (await (await bobContext.request.get("/api/profile")).json()).profile;
      const ownerSpoof = await bobContext.request.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: bobProfile.rowVersion, displayName: "steal", owner_id: alice } });
      expect(ownerSpoof.status()).toBe(400);
      expect((await (await bobContext.request.get("/api/profile")).json()).profile.displayName).toBe("Google Bob");
      expect((await (await aliceContext.request.get("/api/profile")).json()).profile.displayName)
        .toBe("공유에 보일 합성 Alice");
      for (const headers of [{}, { Origin: "https://foreign.example.invalid" }]) {
        expect((await aliceContext.request.patch("/api/profile", { headers,
          data: { expectedRowVersion: named.rowVersion, displayName: "CSRF" } })).status()).toBe(403);
        expect((await aliceContext.request.patch("/api/profile/avatar", { headers,
          multipart: { expectedRowVersion: String(named.rowVersion),
            avatar: { name: "csrf.png", mimeType: "image/png", buffer: png } } })).status()).toBe(403);
      }
      expect((await (await aliceContext.request.get("/api/profile")).json()).profile.displayName)
        .toBe("공유에 보일 합성 Alice");

      const foreignRows = await withE2eDatabase(async (pool) => {
        const client = await pool.connect();
        try {
          await client.query("begin");
          await client.query("set local role lyricscloud_app");
          await client.query("select set_config('app.user_id',$1,true)", [bob]);
          const profile = await client.query("select owner_id from user_profiles where owner_id=$1", [alice]);
          const photo = await client.query("select id from profile_avatar_photos where owner_id=$1", [alice]);
          const sharing = await client.query("select * from app_sharing_identity($1)", [alice]);
          await client.query("rollback");
          return [profile.rowCount, photo.rowCount, sharing.rowCount];
        } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
        finally { client.release(); }
      });
      expect(foreignRows).toEqual([0, 0, 0]);
    } finally {
      await Promise.all([aliceContext.close(), bobContext.close(), expiredContext.close(), anonymousContext.close()]);
      await deleteOwners(owners);
    }
  });

  test("preserves a lost photo ACK and retry draft without leaving old or orphan photos", async ({ context, page }) => {
    const owner = await createOwner(context, "Retry");
    try {
      await page.goto("/settings#account");
      const first: Buffer = await sharp({ create: { width: 64, height: 64, channels: 3,
        background: "#96b94a" } }).png().toBuffer();
      const second: Buffer = await sharp({ create: { width: 64, height: 64, channels: 3,
        background: "#5b80bf" } }).png().toBuffer();
      await page.locator(".profile-file-label input").setInputFiles({ name: "first.png",
        mimeType: "image/png", buffer: first });
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
      expect(await photoCount(owner)).toBe(1);

      await page.locator(".profile-file-label input").setInputFiles({ name: "second.png",
        mimeType: "image/png", buffer: second });
      const beforeLostAck = (await (await page.request.get("/api/profile")).json()).profile;
      let lostAck = false;
      await page.route("**/api/profile/avatar", async (route) => {
        if (route.request().method() !== "PATCH" || lostAck) return route.continue();
        lostAck = true;
        // An independent owner request commits the same photo before the browser
        // loses its ACK. Route.fetch drops WebKit's streamed multipart file body.
        const committed = await page.request.patch("/api/profile/avatar", { headers: { Origin: origin },
          multipart: { expectedRowVersion: String(beforeLostAck.rowVersion),
            avatar: { name: "second.png", mimeType: "image/png", buffer: second } } });
        expect(committed.status()).toBe(200);
        await route.abort("failed");
      });
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필 저장 결과를 확인하지 못했습니다.")).toBeVisible();
      await expect(page.getByText("선택됨: second.png")).toBeVisible();
      expect((await page.request.get("/api/profile/avatar")).status()).toBe(200);
      expect(await photoCount(owner)).toBe(1);
      await homeTarget(page).click();
      await expect(page).toHaveURL(/\/settings/);
      await expect(page.getByText("선택됨: second.png")).toBeVisible();

      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("다른 탭의 저장과 충돌했습니다.")).toBeVisible();
      await expect(page.getByText("선택됨: second.png")).toBeVisible();
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
      expect(await photoCount(owner)).toBe(1);
      const latest = (await (await page.request.get("/api/profile")).json()).profile;
      const giant: Buffer = await sharp({ create: { width: 4100, height: 4100, channels: 3,
        background: "#698495" } }).png().toBuffer();
      expect(giant.length).toBeLessThan(2 * 1024 * 1024);
      const rejected = await page.request.patch("/api/profile/avatar", { headers: { Origin: origin },
        multipart: { expectedRowVersion: String(latest.rowVersion),
          avatar: { name: "giant.png", mimeType: "image/png", buffer: giant } } });
      expect(rejected.status()).toBe(400);
      expect(await photoCount(owner)).toBe(1);
      await page.reload();
      await expect(page.locator(".profile-photo-compare img")).toHaveCount(2);
    } finally { await deleteOwners([owner]); }
  });

  test("keeps profile and guarded home targets coherent across five browser projects", async ({ context, page }, info) => {
    test.slow();
    const owner = await createOwner(context, "Matrix");
    const mobile = info.project.name.includes("mobile");
    try {
      if (mobile) await page.setViewportSize({ width: 320, height: 760 });
      await page.goto("/settings#account");
      await expect(page.getByRole("heading", { name: "내 프로필" })).toBeVisible();
      for (const theme of ["dark", "light"] as const) {
        await page.evaluate((next) => (window as typeof window & {
          __lcApplyTheme?: (value: "dark" | "light") => void
        }).__lcApplyTheme?.(next), theme);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("#profile-display-name")).toBeVisible();
        await expect(homeTarget(page)).toBeVisible();
        if (mobile) expect(await page.evaluate(() =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      }
      await page.locator("#profile-display-name").fill("P4 합성 매트릭스");
      await page.getByRole("button", { name: "프로필 저장" }).click();
      await expect(page.getByText("프로필을 서버에 저장했습니다.")).toBeVisible();
      await page.reload();
      await expect(page.locator("#profile-display-name")).toHaveValue("P4 합성 매트릭스");
      await homeTarget(page).focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/workspace$/);
      await expect(page.getByRole("heading", { name: "안녕하세요, P4 합성 매트릭스님." })).toBeVisible();
      const resources = await createResourceSet(page);
      for (const path of ["/songs", `/songs/${resources.songId}`, `/lyrics/${resources.lyricId}`,
        "/recent", "/rhymes", `/rhymes/${resources.rhymeId}`,
        "/prompts", `/prompts/${resources.promptId}`, `/shared/lyrics/${resources.lyricId}`]) {
        await page.goto(path);
        await expect(homeTarget(page)).toBeVisible();
        if (mobile) await homeTarget(page).tap();
        else await homeTarget(page).click();
        await expect(page).toHaveURL(/\/workspace$/);
        await expect(page.getByRole("heading", { name: "안녕하세요, P4 합성 매트릭스님." })).toBeVisible();
      }
      await page.goto("/songs/new");
      const title = page.getByRole("textbox", { name: "곡 제목" });
      await title.fill("홈 이탈을 막을 미저장 합성 곡");
      await expect(page.locator(".song-form-page")).toHaveAttribute("data-pending-input", "true");
      const dismissed = page.waitForEvent("dialog").then(async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        expect(dialog.message()).toContain("저장하지 않은 변경 내용이 있습니다.");
        await dialog.dismiss();
      });
      if (mobile) await homeTarget(page).tap();
      else await homeTarget(page).click();
      await dismissed;
      await expect(page).toHaveURL(/\/songs\/new$/);
      await expect(title).toHaveValue("홈 이탈을 막을 미저장 합성 곡");
    } finally { await deleteOwners([owner]); }
  });
});

function homeTarget(page: Page) {
  return page.locator(test.info().project.name.includes("mobile") ? ".mobile-home-icon" : ".top-home-mark");
}

async function createOwner(context: BrowserContext, label: string): Promise<string> {
  const id = randomUUID(); const token = `synthetic-p4-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id) values($1)", [id]);
    await pool.query(`insert into auth_identities(issuer,subject,user_id,email,email_verified,display_name)
      values('https://accounts.google.com',$1,$2,$3,true,$4)`,
    [id, id, `p4-${label.toLowerCase()}@example.invalid`, `Google ${label}`]);
    await pool.query(`insert into user_profiles(owner_id,display_name,provider_display_name,
      display_name_source,avatar_source) values($1,$2,$2,'provider','provider')`, [id, `Google ${label}`]);
    await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
      values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [hashToken(token), id]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return id;
}

async function deleteOwners(ids: readonly string[]): Promise<void> {
  if (ids.length) await withE2eDatabase((pool) =>
    pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}

async function photoCount(owner: string): Promise<number> {
  return withE2eDatabase(async (pool) => {
    const result = await pool.query<{ count: number }>(
      "select count(*)::int count from profile_avatar_photos where owner_id=$1", [owner]);
    return result.rows[0]!.count;
  });
}

async function createResourceSet(page: Page): Promise<{
  songId: string; lyricId: string; rhymeId: string; promptId: string
}> {
  const headers = { Origin: origin };
  const song = await page.request.post("/api/songs", { headers,
    data: { requestId: randomUUID(), title: "P4 로고 동선 합성 곡" } });
  expect(song.status()).toBe(201);
  const songId = (await song.json()).song.id as string;
  const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers,
    data: { requestId: randomUUID(), title: "P4 로고 동선 합성 가사", body: "합성 원문" } });
  expect(lyric.status()).toBe(201);
  const rhyme = await page.request.post("/api/rhymes", { headers,
    data: { requestId: randomUUID(), title: "P4 로고 동선 합성 라임", body: "합성 라임" } });
  expect(rhyme.status()).toBe(201);
  const prompt = await page.request.post("/api/prompts", { headers,
    data: { requestId: randomUUID(), title: "P4 로고 동선 합성 프롬프트",
      mode: "sentence", sentenceText: "합성 문장" } });
  expect(prompt.status()).toBe(201);
  return { songId, lyricId: (await lyric.json()).lyric.id as string,
    rhymeId: (await rhyme.json()).rhyme.id as string,
    promptId: (await prompt.json()).prompt.id as string };
}
