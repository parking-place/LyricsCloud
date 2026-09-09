import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test.describe("P6 withdrawal modal recovery", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("reauthentication error and recovery actions stay inside the modal", async ({ context, page }, info) => {
    test.setTimeout(90_000);
    const userId = randomUUID(), token = `p6-withdrawal-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      await pool.query("begin");
      try {
        await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
        await pool.query("insert into user_profiles(owner_id,display_name) values($1,'P6 합성 계정')", [userId]);
        await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
        await pool.query("commit");
      } catch (error) { await pool.query("rollback"); throw error; }
    });
    try {
      await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
      if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
      // Do not withdraw a real account; the UI handles the same HTTP rejection.
      let requests = 0;
      await page.route("**/api/account/withdrawal", async route => {
        if (route.request().method() !== "POST") { await route.continue(); return; }
        requests++;
        await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "AUTH_REQUIRED" } }) });
      });
      await page.goto("/settings#account");
      await page.getByRole("button", { name: "회원 탈퇴 검토" }).click();
      const dialog = page.getByRole("dialog", { name: "회원 탈퇴 확인" });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("checkbox").check();
      await dialog.getByRole("textbox").fill("탈퇴");
      await dialog.getByRole("button", { name: "탈퇴 요청", exact: true }).click();
      await expect(dialog.getByRole("alert")).toContainText("최근 Google 재인증");
      // Next's route announcer also has role=alert. Count the recovery message,
      // including any duplicate outside the modal, rather than unrelated alerts.
      const recoveryAlerts = page.getByRole("alert").filter({ hasText: "최근 Google 재인증" });
      await expect(recoveryAlerts).toHaveCount(1);
      await expect(dialog.getByRole("link", { name: "Google로 재인증" })).toHaveAttribute("href", "/api/auth/login?returnTo=%2Fsettings%3Fwithdrawal%3Dconfirm%23account");
      await expect(dialog.getByRole("button", { name: "취소", exact: true })).toBeEnabled();
      await expect(dialog.getByRole("button", { name: "탈퇴 요청", exact: true })).toBeEnabled();
      expect(requests).toBe(1);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(recoveryAlerts).toHaveCount(1);
      await expect(recoveryAlerts).toBeVisible();
      await expect(page.getByRole("button", { name: "회원 탈퇴 검토" })).toBeFocused();
    } finally {
      await withE2eDatabase(pool => pool.query("delete from app_users where id=$1", [userId]).then(() => undefined));
    }
  });
});
