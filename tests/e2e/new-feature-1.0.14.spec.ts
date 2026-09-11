import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };
const sample = "한글 가사 · bright rhyme · 光 ひかり · ♫";

test.describe("1.0.14 selectable web font", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("persists the font and applies it to lyric, rhyme and prompt editing without changing source text", async ({ context, page }, info) => {
    const account = await createAccount(context, `폰트 ${info.project.name}`);
    try {
      await page.goto("/settings");
      const scope = info.project.name === "mobile"
        ? await openMobileSettings(page)
        : page.locator(".desktop-display-controls");
      await scope.getByLabel("작성 폰트").selectOption("noto_sans_kr");
      await expect(info.project.name === "mobile" ? scope.locator(".writing-preview") : page.locator(".settings-content > .settings-card .writing-preview")).toContainText(sample);
      if (info.project.name === "mobile") await scope.getByRole("button", { name: "닫기" }).click();
      await page.getByRole("button", { name: "저장", exact: true }).click();
      await expect(page.locator(".settings-message")).toContainText("서버에 저장");
      await page.reload();
      if (info.project.name === "mobile") {
        const dialog = await openMobileSettings(page);
        await expect(dialog.getByLabel("작성 폰트")).toHaveValue("noto_sans_kr");
        await dialog.getByRole("button", { name: "닫기" }).click();
      } else await expect(page.locator(".desktop-display-controls").getByLabel("작성 폰트")).toHaveValue("noto_sans_kr");

      const song = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "폰트 곡" } });
      const songId = (await song.json()).song.id as string;
      const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "폰트 가사", body: sample } });
      const lyricId = (await lyric.json()).lyric.id as string;
      const rhyme = await page.request.post("/api/rhymes", { headers, data: { requestId: randomUUID(), title: "폰트 라임", body: sample } });
      const rhymeId = (await rhyme.json()).rhyme.id as string;
      const prompt = await page.request.post("/api/prompts", { headers, data: { requestId: randomUUID(), title: "폰트 프롬프트", mode: "sentence", sentenceText: sample } });
      const promptId = (await prompt.json()).prompt.id as string;

      await page.goto(`/lyrics/${lyricId}`);
      const lyricEditor = page.getByLabel("가사 본문");
      await expect(lyricEditor).toBeVisible({ timeout: 15_000 });
      await expectNoto(page, ".cm-scroller");
      await lyricEditor.click(); await page.keyboard.press("End"); await page.keyboard.type("Z");
      const displayDialog = await openLyricDisplaySettings(page, info.project.name);
      await displayDialog.getByLabel("폰트").selectOption("sans");
      await displayDialog.getByLabel("폰트").selectOption("noto_sans_kr");
      await expectNoto(page, ".cm-scroller");
      await displayDialog.getByRole("button", { name: "이 가사에 저장" }).click();
      await expect(lyricEditor).toBeFocused();
      await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body).toBe(sample);

      await page.goto(`/rhymes/${rhymeId}`);
      await expect(page.getByLabel("라임 노트 본문")).toBeVisible({ timeout: 15_000 });
      await expectNoto(page, ".cm-scroller");
      expect((await (await page.request.get(`/api/rhymes/${rhymeId}`)).json()).rhyme.body).toBe(sample);

      await page.goto(`/prompts/${promptId}`);
      const sentence = page.getByLabel("문장형 프롬프트 원문");
      await expect(sentence).toHaveValue(sample);
      await expectNoto(page, "#prompt-sentence");
      expect((await (await page.request.get(`/api/prompts/${promptId}`)).json()).prompt.plainText).toBe(sample);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    } finally { await deleteAccounts([account.userId]); }
  });
});

async function openMobileSettings(page: Page) {
  await page.getByRole("button", { name: "작성 표시 세부 설정" }).click();
  const dialog = page.getByRole("dialog", { name: "작성 표시 세부 설정" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openLyricDisplaySettings(page: Page, projectName: string) {
  if (projectName === "desktop") await page.getByRole("button", { name: "표시 설정", exact: true }).click();
  else {
    await page.getByRole("button", { name: /다른 가사.*자료/ }).click();
    await page.getByRole("button", { name: "표시 설정 열기" }).click();
  }
  const dialog = page.getByRole("dialog", { name: "현재 가사 표시 설정" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectNoto(page: Page, selector: string) {
  await expect.poll(() => page.locator(selector).evaluate((node) => getComputedStyle(node).fontFamily)).toContain("LyricsCloud Noto Sans KR");
}

async function createAccount(context: BrowserContext, displayName: string) {
  const userId = randomUUID(); const token = `font-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, displayName]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId };
}

async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
