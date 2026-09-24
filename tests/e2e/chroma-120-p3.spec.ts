import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.2.0 P3 Chroma writing surfaces", () => {
  test.skip(process.env.LC_UI_VARIANT !== "chroma", "requires the opt-in Chroma variant");
  test.skip(!process.env.E2E_DATABASE_URL, "requires an isolated E2E database");

  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
  });

  test("keeps the same CodeMirror and draft through four resources, theme and responsive dock", async ({ page }, info) => {
    const songId = await create(page, "/api/songs", { title: `P3 편집 ${randomUUID().slice(0, 8)}` }, "song");
    const lyricId = await create(page, `/api/songs/${songId}/lyrics`, { title: "코발트 가사", body: "[Verse]\n처음 원문" }, "lyric");
    try {
      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.locator(".cm-content");
      await expect(editor).toHaveAttribute("contenteditable", "true");
      const instance = await page.locator(".cm-editor").elementHandle();
      expect(instance).not.toBeNull();
      await editor.fill("[Verse]\n보존할 한글 가사 🎵");
      await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
        .toBe("[Verse]\n보존할 한글 가사 🎵");

      for (const theme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: theme });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        for (const width of [320, 390, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: width === 320 ? 700 : 900 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), `${theme} ${width}px overflow`).toBe(false);
          if (width <= 720) {
            const bottom = await page.getByRole("navigation", { name: "모바일 주 메뉴" }).boundingBox();
            const tools = await page.getByRole("group", { name: "가사 편집 도구" }).boundingBox();
            expect(bottom && tools && tools.y + tools.height <= bottom.y + 1, `${theme} ${width}px editor tools clear main dock`).toBe(true);
          }
        }
        expect(await instance!.evaluate((element) => element === document.querySelector(".cm-editor"))).toBe(true);
      }
      await page.setViewportSize({ width: info.project.name === "mobile" ? 390 : 1440, height: info.project.name === "mobile" ? 844 : 1000 });
      if (info.project.name === "mobile") {
        await page.getByRole("group", { name: "가사 편집 도구" }).getByRole("button", { name: /다른 가사 .*자료/ }).click();
      }
      const panel = info.project.name === "mobile"
        ? page.getByRole("dialog", { name: "작업 자료" })
        : page.getByRole("complementary", { name: "작업 자료" });
      await expect(panel).toBeVisible();
      if (info.project.name === "desktop") {
        const quick = await page.locator(".top-quick-add").boundingBox();
        const tabs = await panel.getByRole("tablist").boundingBox();
        expect(quick && tabs && !intersects(quick, tabs), "quick add must not cover resource tabs").toBe(true);
      }
      for (const tab of ["다른 곡", "다른 가사", "라임", "프롬프트"]) {
        await panel.getByRole("tab", { name: tab, exact: true }).click();
        await expect(panel.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("aria-selected", "true");
      }
      await page.emulateMedia({ colorScheme: "light" });
      await page.screenshot({ path: info.outputPath(`chroma-editor-${info.project.name}.png`), animations: "disabled" });
      if (info.project.name === "mobile") await panel.getByRole("button", { name: "닫기" }).click();
      else {
        await page.getByRole("button", { name: "집중 모드", exact: true }).click();
        await page.getByRole("button", { name: "집중 모드 종료", exact: true }).click();
      }
      expect(await instance!.evaluate((element) => element === document.querySelector(".cm-editor"))).toBe(true);
      await expect(editor).toContainText("보존할 한글 가사 🎵");
      const audit = await new AxeBuilder({ page }).include(".lyric-editor-page").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(audit.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
    } finally {
      expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
    }
  });

  test("keeps rhyme, prompt, account and recovery controls reachable in both themes", async ({ page }, info) => {
    const rhymeId = await create(page, "/api/rhymes", { title: "코발트 라임", body: "라임 원문" }, "rhyme");
    const promptId = await create(page, "/api/prompts", { title: "코발트 프롬프트", tokens: ["dream pop", "한글 보컬"] }, "prompt");
    try {
      for (const theme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: theme });
        for (const [path, selector] of [
          [`/rhymes/${rhymeId}`, ".rhyme-editor-page"],
          [`/prompts/${promptId}`, ".prompt-editor-page"],
          ["/settings", ".settings-page"],
          ["/trash", ".trash-page"]
        ] as const) {
          await page.goto(path);
          await expect(page.locator(selector)).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), `${theme} ${path} overflow`).toBe(false);
          if (path === "/settings") {
            await expect(page.getByRole("heading", { name: "내 프로필" })).toBeVisible();
            await expect(page.getByRole("button", { name: "프로필 저장" })).toBeDisabled();
          }
        }
      }
      await page.goto(`/prompts/${promptId}`);
      await expect(page.locator(".prompt-editor-token")).toHaveCount(2);
      await page.emulateMedia({ colorScheme: "light" });
      await page.screenshot({ path: info.outputPath(`chroma-prompt-${info.project.name}.png`), animations: "disabled" });
      await page.goto(`/rhymes/${rhymeId}`);
      await expect(page.locator(".rhyme-editor-surface .cm-content")).toContainText("라임 원문");
    } finally {
      expect((await page.request.delete(`/api/rhymes/${rhymeId}`, { headers })).status()).toBe(200);
      expect((await page.request.delete(`/api/prompts/${promptId}`, { headers })).status()).toBe(200);
    }
  });

  test("keeps creation and sign-in surfaces usable in both themes", async ({ page }, info) => {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const [path, selector] of [
        ["/songs/new", ".song-form-page"],
        ["/lyrics/new", ".lyric-new-page"],
        ["/rhymes/new", ".rhyme-new-page"],
        ["/prompts/new", ".prompt-editor-page"]
      ] as const) {
        await page.goto(path);
        await expect(page.locator(selector)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), `${theme} ${path} overflow`).toBe(false);
      }
    }
    await page.context().clearCookies();
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/auth");
    await expect(page.locator(".auth-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: info.project.name === "mobile"
      ? "한 줄의 아이디어가 한 곡이 되는 곳." : "다시 작업을 시작해볼까요?" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    await page.screenshot({ path: info.outputPath(`chroma-auth-${info.project.name}.png`), animations: "disabled" });
    const audit = await new AxeBuilder({ page }).include(".auth-layout").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(audit.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
});

async function create(page: Page, path: string, input: Record<string, unknown>, kind: "song" | "lyric" | "rhyme" | "prompt"): Promise<string> {
  const response = await page.request.post(path, { headers, data: { requestId: randomUUID(), ...input } });
  expect(response.status()).toBe(201);
  return (await response.json())[kind].id as string;
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
