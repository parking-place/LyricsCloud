import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("1.1.8 settings save race", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("preserves newer previews across delayed saves, defaults and conflict retry", async ({ context, page }, info) => {
    const userId = randomUUID(); const token = `settings-race-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [userId, "설정 저장 회귀"]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
    });
    await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);

    let releaseResponse: (() => void) | undefined;
    const display = page.locator("#display");
    const save = display.getByRole("button", { name: "저장", exact: true });
    const preview = display.locator(".writing-preview p");
    async function edit(fontSize: string, theme: "라이트" | "다크") {
      const mobile = info.project.name === "mobile";
      if (mobile) await page.getByRole("button", { name: "작성 표시 세부 설정" }).click();
      const controls = mobile ? page.getByRole("dialog", { name: "작성 표시 세부 설정" }) : display.locator(".desktop-display-controls");
      await controls.locator('input[type="range"]').first().fill(fontSize);
      await controls.getByLabel(theme, { exact: true }).check();
      if (mobile) await controls.getByRole("button", { name: "닫기" }).click();
    }
    async function delayNextResponse(method: "GET" | "PUT") {
      let reached = false;
      let pending = true;
      const gate = new Promise<void>((resolve) => { releaseResponse = resolve; });
      await page.route("**/api/settings", async (route) => {
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
      const response = await context.request.get("/api/settings");
      expect(response.status()).toBe(200);
      return (await response.json()).settings;
    }

    try {
      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
      await edit("20", "라이트");
      const firstSaved = await delayNextResponse("PUT");
      await save.click();
      await expect.poll(firstSaved).toBe(true);
      await edit("24", "다크");
      await expect(preview).toHaveCSS("font-size", "24px");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      releaseResponse!();

      // A reached the server, but B must remain the current unsaved preview.
      await expect(save).toBeEnabled();
      await expect(preview).toHaveCSS("font-size", "24px");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const first = await serverSettings();
      expect(first).toMatchObject({ theme: "light", fontSize: 20 });
      await display.getByRole("button", { name: "취소", exact: true }).click();
      await expect(preview).toHaveCSS("font-size", "20px");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(save).toBeDisabled();

      // Defaults chosen during another save are a new draft, not its response.
      await edit("24", "다크");
      const secondSaved = await delayNextResponse("PUT");
      await save.click();
      await expect.poll(secondSaved).toBe(true);
      await display.getByRole("button", { name: "제품 기본값" }).click();
      releaseResponse!();
      await expect(save).toBeEnabled();
      await expect(preview).toHaveCSS("font-size", "18px");
      await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "system");
      const second = await serverSettings();
      expect(second).toMatchObject({ theme: "dark", fontSize: 24, rowVersion: first.rowVersion + 1 });

      // A separate device creates a real 409; retry snapshots defaults before GET.
      const external = await context.request.put("/api/settings", { headers, data: { ...second, theme: "light", fontSize: 22 } });
      expect(external.status()).toBe(200);
      await save.click();
      await expect(display.getByRole("alert")).toContainText("다른 기기에서 서버 설정이 변경");
      await expect(preview).toHaveCSS("font-size", "18px");
      const versionRead = await delayNextResponse("GET");
      await display.getByRole("button", { name: "최신 서버 버전에 다시 저장" }).click();
      await expect.poll(versionRead).toBe(true);
      await edit("26", "다크");
      releaseResponse!();
      await expect(save).toBeEnabled();
      await expect(preview).toHaveCSS("font-size", "26px");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const retried = await serverSettings();
      expect(retried).toMatchObject({ theme: "system", fontSize: 18, rowVersion: second.rowVersion + 2 });

      // The retained draft can save against the acknowledged version and survive reload.
      await save.click();
      await expect(page.locator('.settings-message[role="status"]')).toHaveText("설정을 서버에 저장했습니다.");
      await expect(save).toBeDisabled();
      expect(await serverSettings()).toMatchObject({ theme: "dark", fontSize: 26, rowVersion: retried.rowVersion + 1 });
      await page.reload();
      await expect(preview).toHaveCSS("font-size", "26px");
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(save).toBeDisabled();
    } finally {
      releaseResponse?.();
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
    }
  });
});
