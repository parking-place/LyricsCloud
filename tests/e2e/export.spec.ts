import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext } from "@playwright/test";
import { validateExportDocument } from "@lyricscloud/domain";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const headers = { Origin: origin };

test.describe("0.8.0 full account export", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "requires isolated E2E database");

  test("exports one consistent owner snapshot as readable UTF-8 files and versioned JSON", async ({ browser, context, page }, info) => {
    test.setTimeout(90_000);
    const fixture = await createFixture(context);
    const otherContext = await browser.newContext({ baseURL: origin });
    expect((await otherContext.request.get("/api/export")).status()).toBe(401);
    const other = await createOther(otherContext);
    try {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 800 });
      await page.goto("/templates");
      await expect(page.getByRole("heading", { name: "템플릿", exact: true })).toBeVisible();
      await expect(page.getByText("NUL", { exact: true }).first()).toBeVisible();
      await page.goto("/settings#account");
      const exportLink = page.getByRole("link", { name: "전체 ZIP 내려받기", exact: true }).first();
      await expect(exportLink).toHaveAttribute("href", "/api/export");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `docs/runbooks/evidence/0.8.0-phase5-export-${info.project.name}.png`, fullPage: true });

      expect((await page.request.delete(`/api/songs/${fixture.songId}`, { headers })).status()).toBe(200);
      await page.goto("/trash");
      const target = info.project.name === "mobile"
        ? page.locator(".trash-card").filter({ has: page.getByRole("heading", { name: "CON/같은:곡", exact: true }) })
        : page.locator(".trash-table tbody tr").filter({ has: page.locator("td:nth-child(2) > strong").filter({ hasText: /^CON\/같은:곡$/ }) });
      await target.getByRole("button", { name: "복원", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "복원", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("원래 위치로 복원");

      const response = await page.request.get("/api/export");
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("application/zip");
      expect(response.headers()["content-disposition"]).toMatch(/^attachment; filename="lyricscloud-export-\d{8}\.zip"$/);
      expect(response.headers()["cache-control"]).toContain("no-store");
      const entries = readStoredZip(await response.body());
      expect(entries.has("README.md")).toBe(true);
      expect(entries.has("settings.md")).toBe(true);
      const names = [...entries.keys()];
      expect(names.some((name) => name.startsWith("songs/CON_같은_곡--") && name.endsWith(".md"))).toBe(true);
      const lyricNames = names.filter((name) => name.startsWith("lyrics/같은_가사_--"));
      expect(lyricNames).toHaveLength(2);
      expect(new Set(lyricNames).size).toBe(2);
      expect(names.some((name) => name.startsWith("templates/_NUL--"))).toBe(true);

      const data = validateExportDocument(JSON.parse(entries.get("lyricscloud-export.json")!.toString("utf8")));
      expect(data.schemaVersion).toBe("lyricscloud.export.v1");
      const serialized = JSON.stringify(data);
      expect(serialized).toContain(fixture.songId);
      expect(serialized).toContain(fixture.tagId);
      expect(serialized).toContain(fixture.templateId);
      expect(serialized).not.toContain(other.songId);
      const lyricFile = lyricNames.map((name) => entries.get(name)!.toString("utf8")).find((value) => value.includes("한글-대용량-시작"))!;
      expect(lyricFile).toContain("한글-대용량-시작");
      expect(lyricFile.length).toBeGreaterThan(90_000);

      const otherResponse = await otherContext.request.get("/api/export");
      expect(otherResponse.status()).toBe(200);
      const otherData = validateExportDocument(JSON.parse(readStoredZip(await otherResponse.body()).get("lyricscloud-export.json")!.toString("utf8")));
      expect(JSON.stringify(otherData)).toContain(other.songId);
      expect(JSON.stringify(otherData)).not.toContain(fixture.songId);

      await page.goto("/settings#account");
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("link", { name: "전체 ZIP 내려받기", exact: true }).first().click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^lyricscloud-export-\d{8}\.zip$/);
      await download.delete();
    } finally {
      await otherContext.close();
      await deleteAccounts([fixture.userId, other.userId]);
    }
  });
});

async function createFixture(context: BrowserContext) {
  const userId = randomUUID(), token = `export-${randomUUID()}`;
  const songId = randomUUID(), lyricOne = randomUUID(), lyricTwo = randomUUID(), rhymeId = randomUUID(), promptId = randomUUID();
  const tagId = randomUUID(), templateId = randomUUID(), dictionaryId = randomUUID();
  await withE2eDatabase(async (pool) => {
    await pool.query("begin");
    try {
      await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'내보내기 합성')", [userId]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
      await pool.query(`insert into resources(id,owner_id,type,title) values
        ($1,$6,'song','CON/같은:곡'),($2,$6,'lyrics','같은*가사?'),($3,$6,'lyrics','같은*가사?'),
        ($4,$6,'rhyme_note','라임|노트'),($5,$6,'prompt','프롬프트<하나>')`, [songId, lyricOne, lyricTwo, rhymeId, promptId, userId]);
      await pool.query("insert into songs(resource_id,owner_id,status,description,work_notes) values($1,$2,'writing_lyrics','합성 설명','합성 작업 메모')", [songId, userId]);
      await pool.query("insert into lyrics(resource_id,owner_id,song_id,body,memo,status) values($1,$3,$4,$5,'첫 메모','draft'),($2,$3,$4,'둘째 본문','둘째 메모','revising')", [lyricOne, lyricTwo, userId, songId, `한글-대용량-시작\n${"가".repeat(99_000)}`]);
      await pool.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,'라임 합성 본문')", [rhymeId, userId]);
      await pool.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,'Warm pop, 한글 보컬')", [promptId, userId]);
      await pool.query("insert into prompt_token_dictionary(id,owner_id,display_value,normalized_value) values($1,$2,'Warm pop','warm pop')", [dictionaryId, userId]);
      await pool.query("insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value) values($1,$2,0,$3,'Warm pop','warm pop')", [userId, promptId, dictionaryId]);
      await pool.query("insert into tags(id,owner_id,display_value,normalized_value) values($1,$2,'새벽','새벽')", [tagId, userId]);
      await pool.query("insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)", [userId, rhymeId, tagId]);
      await pool.query("insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type) values($1,$2,$3,'rhyme_note'),($1,$2,$4,'prompt')", [userId, songId, rhymeId, promptId]);
      await pool.query("insert into templates(id,owner_id,type,title,lyric_body) values($1,$2,'lyrics','NUL','[Verse]')", [templateId, userId]);
      await pool.query("insert into user_settings(owner_id,theme,writing_font) values($1,'dark','serif')", [userId]);
      await pool.query("commit");
    } catch (error) { await pool.query("rollback"); throw error; }
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, songId, tagId, templateId };
}

async function createOther(context: BrowserContext) {
  const userId = randomUUID(), songId = randomUUID(), token = `export-other-${randomUUID()}`;
  await withE2eDatabase(async (pool) => {
    await pool.query("begin");
    try {
      await pool.query("insert into app_users(id,status) values($1,'active')", [userId]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'내보내기 다른 계정')", [userId]);
      await pool.query("insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at) values($1,$2,now()+interval '1 hour',now()+interval '2 hours')", [hashToken(token), userId]);
      await pool.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','다른 계정 곡')", [songId, userId]);
      await pool.query("insert into songs(resource_id,owner_id,status) values($1,$2,'idea')", [songId, userId]);
      await pool.query("commit");
    } catch (error) { await pool.query("rollback"); throw error; }
  });
  await context.addCookies([{ name: "lc_session", value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
  return { userId, songId };
}

function readStoredZip(archive: Buffer): Map<string, Buffer> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("ZIP_END_MISSING");
  const count = archive.readUInt16LE(end + 10);
  let central = archive.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();
  for (let index = 0; index < count; index++) {
    if (archive.readUInt32LE(central) !== 0x02014b50) throw new Error("ZIP_CENTRAL_INVALID");
    const size = archive.readUInt32LE(central + 24), nameLength = archive.readUInt16LE(central + 28);
    const extraLength = archive.readUInt16LE(central + 30), commentLength = archive.readUInt16LE(central + 32);
    const localOffset = archive.readUInt32LE(central + 42);
    const name = archive.subarray(central + 46, central + 46 + nameLength).toString("utf8");
    const localNameLength = archive.readUInt16LE(localOffset + 26), localExtraLength = archive.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    entries.set(name, archive.subarray(start, start + size));
    central += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function deleteAccounts(ids: readonly string[]) {
  await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [ids]).then(() => undefined));
}
