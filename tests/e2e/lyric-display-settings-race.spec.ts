import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.8 lyric display settings race", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("keeps newer previews after delayed save and retries a reset conflict as DELETE", async ({ context, page }, info) => {
    const userId = randomUUID(); const token = `lyric-display-race-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "가사 표시 저장 회귀"]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    });
    await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    let releaseResponse: (() => void) | undefined;

    try {
      const songResponse = await context.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title: "표시 저장 회귀 곡" } });
      expect(songResponse.ok()).toBe(true);
      const songId = (await songResponse.json()).song.id as string;
      const body = "[Verse]\n표시 설정을 바꾸어도 남아 있는 가사";
      const lyricResponse = await context.request.post(`/api/songs/${songId}/lyrics`, { headers, data: { requestId: randomUUID(), title: "표시 저장 회귀 가사", body } });
      expect(lyricResponse.ok()).toBe(true);
      const lyricId = (await lyricResponse.json()).lyric.id as string;
      const endpoint = `/api/lyrics/${lyricId}/display-settings`;
      const initial = await context.request.get(endpoint);
      expect(initial.status()).toBe(200);
      const defaults = (await initial.json()).settings.effective;
      const seeded = await context.request.put(endpoint, { headers, data: { ...defaults, rowVersion: 0, fontSize: 20 } });
      expect(seeded.status()).toBe(200);

      async function delayNextResponse(method: "GET" | "PUT") {
        let pending = true; let reached = false;
        const gate = new Promise<void>((resolve) => { releaseResponse = resolve; });
        await page.route(`**${endpoint}`, async (route) => {
          if (!pending || route.request().method() !== method) { await route.fallback(); return; }
          pending = false;
          const response = await route.fetch();
          expect(response.status()).toBe(200);
          reached = true;
          await gate;
          await route.fulfill({ response });
        });
        return () => reached;
      }
      async function serverSettings() {
        const response = await context.request.get(endpoint);
        expect(response.status()).toBe(200);
        return (await response.json()).settings;
      }
      async function openSettings() {
        if (info.project.name === "mobile") {
          await page.getByRole("button", { name: /다른 가사.*자료/ }).click();
          await page.getByRole("button", { name: "표시 설정 열기" }).click();
        } else await page.getByRole("button", { name: "표시 설정", exact: true }).click();
      }

      await page.goto(`/lyrics/${lyricId}`);
      const editor = page.getByLabel("가사 본문");
      await expect(editor).toBeVisible({ timeout: 15_000 });
      await expect(editor.locator(".cm-line")).toHaveText(body.split("\n"));
      await editor.click();
      await page.keyboard.press("End");
      await openSettings();
      const dialog = page.getByRole("dialog", { name: "현재 가사 표시 설정" });
      const size = dialog.locator('input[type="range"]').first();
      const save = dialog.getByRole("button", { name: "이 가사에 저장", exact: true });
      await size.fill("22");
      const saved = await delayNextResponse("PUT");
      await save.click();
      await expect.poll(saved).toBe(true);
      await size.fill("26");
      releaseResponse!();

      // A is persisted; B remains visible in both the open dialog and editor.
      await expect(save).toBeEnabled();
      await expect(size).toHaveValue("26");
      await expect(page.locator(".cm-scroller")).toHaveCSS("font-size", "26px");
      const first = await serverSettings();
      expect(first.effective.fontSize).toBe(22);
      await save.click();
      await expect(dialog).toBeHidden();
      await expect(editor).toBeFocused();
      const second = await serverSettings();
      expect(second).toMatchObject({ override: { rowVersion: first.override.rowVersion + 1 }, effective: { fontSize: 26 } });

      await openSettings();
      // Another device invalidates the dialog's baseline before reset.
      const external = await context.request.put(endpoint, { headers, data: { ...second.effective, rowVersion: second.override.rowVersion, fontSize: 24 } });
      expect(external.status()).toBe(200);
      const resetMethods: string[] = [];
      page.on("request", (request) => { if (new URL(request.url()).pathname === endpoint) resetMethods.push(request.method()); });
      await dialog.getByRole("button", { name: "계정 기본값으로 초기화" }).click();
      await expect(dialog.getByRole("alert")).toContainText("다시 초기화");
      expect((await serverSettings()).effective.fontSize).toBe(24);
      const refreshed = await delayNextResponse("GET");
      await dialog.getByRole("button", { name: "최신 버전으로 다시 초기화" }).click();
      await expect.poll(refreshed).toBe(true);
      await size.fill("28");
      releaseResponse!();

      // Reset retains DELETE intent, while edits made during retry remain a draft.
      await expect(save).toBeEnabled();
      await expect(size).toHaveValue("28");
      await expect(page.locator(".cm-scroller")).toHaveCSS("font-size", "28px");
      expect(resetMethods).toEqual(["DELETE", "GET", "DELETE"]);
      expect(await serverSettings()).toMatchObject({ override: null, effective: defaults });
      await dialog.getByRole("button", { name: "취소", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(editor).toBeFocused();
      await expect(page.locator(".cm-scroller")).toHaveCSS("font-size", `${defaults.fontSize}px`);
      await expect(editor.locator(".cm-line")).toHaveText(body.split("\n"));
      await page.reload();
      await expect(page.locator(".cm-scroller")).toHaveCSS("font-size", `${defaults.fontSize}px`);
      await expect(editor.locator(".cm-line")).toHaveText(body.split("\n"));
    } finally {
      releaseResponse?.();
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
    }
  });
});
