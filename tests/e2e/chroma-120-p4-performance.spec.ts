import { randomUUID } from "node:crypto";
import { performance as nodePerformance } from "node:perf_hooks";
import { expect, test } from "@playwright/test";
import { fixtureTokens } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test("P4 compares B1 and Chroma with five identical writing rounds", async ({ context, page }, info) => {
  test.skip(process.env.LC_120_PERF !== "1", "run explicitly for local same-host baseline comparison");
  test.skip(!process.env.E2E_DATABASE_URL, "requires an isolated E2E database");
  test.skip(info.project.name !== "desktop", "compare the same desktop viewport");
  test.setTimeout(120_000);
  const variant = process.env.LC_UI_VARIANT;
  expect(["b1", "chroma"]).toContain(variant);
  await context.addCookies([{ name: "lc_session", value: fixtureTokens.visual, url: origin, httpOnly: true, sameSite: "Lax" }]);
  const title = `P4 성능 동일 입력 ${randomUUID().slice(0, 8)}`;
  const created = await page.request.post("/api/songs", { headers, data: { requestId: randomUUID(), title } });
  expect(created.status()).toBe(201);
  const songId = (await created.json()).song.id as string;
  try {
    const lyric = await page.request.post(`/api/songs/${songId}/lyrics`, { headers, data: {
      requestId: randomUUID(), title: "성능 장문", body: `[Verse]\n${"한글 가사와 이모지 🎵\n".repeat(200)}`
    } });
    expect(lyric.status()).toBe(201);
    const lyricId = (await lyric.json()).lyric.id as string;
    const results = { homeMs: [] as number[], listMs: [] as number[], editorMs: [] as number[], inputMs: [] as number[], scrollMs: [] as number[], focusMs: [] as number[], longTasks: [] as number[] };
    for (let round = 0; round < 5; round += 1) {
      let started = nodePerformance.now();
      await page.goto("/workspace", { waitUntil: "domcontentloaded" });
      await expect(page.locator("#workspace-title")).toBeVisible();
      results.homeMs.push(nodePerformance.now() - started);

      started = nodePerformance.now();
      await page.goto("/songs", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      results.listMs.push(nodePerformance.now() - started);

      started = nodePerformance.now();
      await page.goto(`/lyrics/${lyricId}`, { waitUntil: "domcontentloaded" });
      const editor = page.locator(".cm-content[contenteditable='true']");
      await expect(editor).toBeVisible();
      results.editorMs.push(nodePerformance.now() - started);
      await editor.click();
      await page.keyboard.press("End");
      started = nodePerformance.now();
      await page.keyboard.insertText("가");
      results.inputMs.push(nodePerformance.now() - started);
      await expect(editor).toContainText("가");

      results.scrollMs.push(await page.evaluate(async () => {
        const scroller = document.querySelector(".cm-scroller")!;
        scroller.scrollTop = 0;
        const startedAt = globalThis.performance.now();
        scroller.scrollTop = scroller.scrollHeight;
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        return globalThis.performance.now() - startedAt;
      }));

      const focus = page.getByRole("button", { name: "집중 모드", exact: true }).first();
      started = nodePerformance.now();
      await focus.click();
      await expect(page.getByRole("button", { name: /집중 (모드 )?종료/ }).first()).toBeVisible();
      results.focusMs.push(nodePerformance.now() - started);
      results.longTasks.push(await page.evaluate(() => globalThis.performance.getEntriesByType("longtask").filter((entry) => entry.duration >= 50).length));
      await page.getByRole("button", { name: /집중 (모드 )?종료/ }).first().click();
    }
    const summarize = (samples: number[]) => {
      const sorted = [...samples].sort((a, b) => a - b);
      return { samples: samples.map((value) => Math.round(value * 100) / 100), median: Math.round(sorted[2]! * 100) / 100,
        p95: Math.round(sorted[4]! * 100) / 100 };
    };
    console.log(`LC_120_P4_PERFORMANCE ${JSON.stringify({ variant, browser: info.project.name, rounds: 5,
      warmupRounds: 0, firstRoundIncludesCold: true, measurement: "local Playwright action and two-frame proxy; not device INP",
      results: Object.fromEntries(Object.entries(results).map(([key, values]) => [key, summarize(values)])) })}`);
  } finally {
    expect((await page.request.delete(`/api/songs/${songId}`, { headers })).status()).toBe(200);
  }
});
