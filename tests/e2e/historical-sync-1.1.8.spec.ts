import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";

test("R02 preserves remote sentence edits during IME and cancels a conversion changed during checkpoint", async ({ context, page }) => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");
  const userId = randomUUID(); const token = `historical-sync-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
    await pool.query("insert into user_profiles(owner_id,display_name) values($1,'동기화 회귀 사용자')", [userId]);
    await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const second = await context.newPage();
  try {
    const response = await page.request.post("/api/prompts", { headers: { Origin: origin }, data: {
      requestId: randomUUID(), title: "체크포인트 경합", mode: "sentence", sentenceText: "ambient, quiet" } });
    expect(response.status()).toBe(201);
    const id = (await response.json()).prompt.id as string;
    await Promise.all([page.goto(`/prompts/${id}`), second.goto(`/prompts/${id}`)]);
    for (const tab of [page, second]) await expect(tab.getByText("방금 저장됨", { exact: true })).toBeVisible();
    const sentence = page.getByRole("textbox", { name: "문장형 프롬프트 원문" });
    await sentence.dispatchEvent("compositionstart");
    await sentence.fill("ambient, quiet한");
    await second.getByRole("textbox", { name: "문장형 프롬프트 원문" }).fill("bright, ambient, quiet");
    await expect.poll(async () => (await (await page.request.get(`/api/prompts/${id}`)).json()).prompt.sentenceText)
      .toBe("bright, ambient, quiet");
    await expect(sentence).toHaveValue("ambient, quiet한");
    await sentence.dispatchEvent("compositionend", { data: "한" });
    for (const tab of [page, second]) {
      await expect(tab.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue("bright, ambient, quiet한");
      await expect(tab.getByText("방금 저장됨", { exact: true })).toBeVisible();
    }
    let reached!: () => void;
    const checkpoint = new Promise<void>((resolve) => { reached = resolve; });
    await page.route("**/collaboration/documents/*/revisions", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const result = await route.fetch();
      expect(result.status()).toBe(200);
      reached(); await gate; await route.fulfill({ response: result });
    });
    await page.getByRole("radio", { name: /태그형/ }).click();
    const dialog = page.getByRole("dialog", { name: "문장을 태그형으로 변환할까요?" });
    await dialog.getByRole("button", { name: "확인하고 변환" }).click();
    await checkpoint;
    const updated = "ambient, 새 원문은 보존";
    await second.getByRole("textbox", { name: "문장형 프롬프트 원문" }).fill(updated);
    await expect(page.getByRole("textbox", { name: "문장형 프롬프트 원문" })).toHaveValue(updated);
    release();
    await expect(page.getByText("미리보기 뒤 다른 변경이 반영되어 변환을 취소했습니다. 최신 내용을 다시 확인해 주세요.")).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("radio", { name: /문장형/ })).toBeChecked();
    await expect.poll(async () => (await (await page.request.get(`/api/prompts/${id}`)).json()).prompt)
      .toMatchObject({ mode: "sentence", sentenceText: updated, plainText: updated, tokens: [] });
  } finally {
    release(); await second.close();
    await withE2eDatabase(async (pool) => { await pool.query("delete from app_users where id=$1", [userId]); });
  }
});
