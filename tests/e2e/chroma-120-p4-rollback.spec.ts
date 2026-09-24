import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const chromaOrigin = "http://127.0.0.1:3000";
const b1Origin = process.env.LC_120_B1_ORIGIN;

test("P4 reads the same authored body and account settings after Chroma → B1 → Chroma", async ({ browser, context, page }, info) => {
  test.skip(!b1Origin || !process.env.E2E_DATABASE_URL || process.env.LC_UI_VARIANT !== "chroma",
    "requires isolated simultaneous Chroma and B1 runtimes");
  test.skip(info.project.name !== "desktop", "one exact same-database rollback path");
  await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: chromaOrigin, httpOnly: true, sameSite: "Lax" }]);
  const title = `P4 복귀 호환 ${randomUUID().slice(0, 8)}`;
  const created = await page.request.post("/api/songs", { headers: { Origin: chromaOrigin }, data: { requestId: randomUUID(), title } });
  expect(created.status()).toBe(201);
  const songId = (await created.json()).song.id as string;
  try {
    const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers: { Origin: chromaOrigin }, data: {
      requestId: randomUUID(), title: "호환 가사", body: "[Verse]\n이전 내용"
    } });
    expect(lyric.status()).toBe(201);
    const lyricId = (await lyric.json()).lyric.id as string;
    await page.goto(`/lyrics/${lyricId}`);
    await expect(page.locator("html")).toHaveAttribute("data-ui-variant", "chroma");
    await page.locator(".cm-content[contenteditable='true']").fill("[Verse]\n보존할 한글 가사 🎵");
    await expect.poll(async () => (await (await page.request.get(`/api/lyrics/${lyricId}`)).json()).lyric.body)
      .toBe("[Verse]\n보존할 한글 가사 🎵");

    const saved = (await (await page.request.get("/api/settings")).json()).settings;
    const theme = saved.theme === "dark" ? "light" : "dark";
    const updated = await page.request.put("/api/settings", { headers: { Origin: chromaOrigin }, data: {
      rowVersion: saved.rowVersion, theme, font: saved.font, fontSize: saved.fontSize,
      lineHeight: saved.lineHeight, letterSpacing: saved.letterSpacing, focusModeDefault: saved.focusModeDefault
    } });
    expect(updated.status()).toBe(200);

    const b1 = await browser.newContext({ baseURL: b1Origin, serviceWorkers: "block" });
    try {
      await b1.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: b1Origin, httpOnly: true, sameSite: "Lax" }]);
      const oldUi = await b1.newPage();
      const b1Errors: string[] = [];
      oldUi.on("pageerror", (error) => b1Errors.push(error.message));
      await oldUi.goto(`/songs/${songId}`);
      await expect(oldUi.locator("html")).toHaveAttribute("data-ui-variant", "b1");
      await expect(oldUi.getByRole("heading", { name: title })).toBeVisible();
      const b1Lyric = await b1.request.get(`/api/lyrics/${lyricId}`);
      expect(b1Lyric.status()).toBe(200);
      expect((await b1Lyric.json()).lyric.body).toBe("[Verse]\n보존할 한글 가사 🎵");
      const b1Settings = await b1.request.get("/api/settings");
      expect(b1Settings.status()).toBe(200);
      expect((await b1Settings.json()).settings.theme).toBe(theme);
      await oldUi.goto("/settings");
      await expect(oldUi.getByRole("heading", { name: "화면 및 작성 기본값" })).toBeVisible();
      await expect(oldUi.getByRole("radio", { name: theme === "dark" ? "다크" : "라이트" })).toBeChecked();
      expect(b1Errors).toEqual([]);
    } finally { await b1.close(); }

    await page.goto(`/lyrics/${lyricId}`);
    await expect(page.locator("html")).toHaveAttribute("data-ui-variant", "chroma");
    await expect(page.locator(".cm-content[contenteditable='true']")).toContainText("보존할 한글 가사 🎵");
    expect((await (await page.request.get("/api/settings")).json()).settings.theme).toBe(theme);
  } finally {
    expect((await page.request.delete(`/api/songs/${songId}`, { headers: { Origin: chromaOrigin } })).status()).toBe(200);
    const removed = await page.request.post("/api/trash/permanent", { headers: { Origin: chromaOrigin }, data: {
      items: [{ kind: "resource", id: songId }], confirmedTitles: [{ kind: "resource", id: songId, title }]
    } });
    expect(removed.status()).toBe(200);
  }
});
