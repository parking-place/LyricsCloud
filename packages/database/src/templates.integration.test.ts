import { randomUUID } from "node:crypto";
import { parseApplyTemplateInput, parseCreateSongInput, TemplateConflictError, TemplateValidationError } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresSongStore } from "./songs.js";
import { PostgresTemplateStore } from "./templates.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const templates = enabled ? new PostgresTemplateStore(databaseUrl, 4) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("template PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("shares immutable defaults but isolates preferences per owner", async () => {
    const [alice, bob] = users as [string, string];
    const defaults = await templates!.listTemplates(alice, { type: "lyrics", source: "default", sort: "title_asc" });
    expect(defaults).toHaveLength(2); expect(defaults.every((item) => item.source === "default")).toBe(true);
    const selected = defaults[0]!;
    expect(await templates!.updateTemplate(alice, selected.id, { rowVersion: 1, title: "forged" })).toBeNull();
    expect(await templates!.deleteTemplate(alice, selected.id)).toBe(false);
    expect(await templates!.setFavorite(alice, selected.id, true)).toMatchObject({ isFavorite: true });
    expect(await templates!.getTemplate(bob, selected.id)).toMatchObject({ isFavorite: false });
  });

  it("keeps type and source filters independent in every combination", async () => {
    const [alice] = users as [string, string];
    await templates!.createTemplate(alice, { requestId: randomUUID(), type: "lyrics", title: "내 가사 필터", lyricBody: "[Verse]" });
    await templates!.createTemplate(alice, { requestId: randomUUID(), type: "prompt", title: "내 프롬프트 필터", tokens: ["Filter"] });
    for (const type of ["lyrics", "prompt"] as const) {
      for (const source of ["all", "default", "user"] as const) {
        const items = await templates!.listTemplates(alice, { type, source, sort: "title_asc" });
        expect(items.length).toBeGreaterThan(0);
        expect(items.every((item) => item.type === type)).toBe(true);
        if (source !== "all") expect(items.every((item) => item.source === source)).toBe(true);
      }
    }
  });

  it("creates, updates, duplicates and soft-deletes owner templates", async () => {
    const [alice, bob] = users as [string, string];
    const requestId = randomUUID();
    const created = await templates!.createTemplate(alice, { requestId, type: "prompt", title: "합성 템플릿", tokens: ["Dream Pop", "ＤＲＥＡＭ pop", "808 Bass"] });
    expect(created.template.tokens.map((token) => token.displayValue)).toEqual(["Dream Pop", "808 Bass"]);
    expect(await templates!.createTemplate(alice, { requestId, type: "prompt", title: "합성 템플릿", tokens: ["Dream Pop", "ＤＲＥＡＭ pop", "808 Bass"] })).toMatchObject({ replayed: true, template: { id: created.template.id } });
    await expect(templates!.createTemplate(alice, { requestId, type: "prompt", title: "다른 요청", tokens: [] })).rejects.toBeInstanceOf(TemplateConflictError);
    expect(await templates!.getTemplate(bob, created.template.id)).toBeNull();
    expect(await templates!.updateTemplate(bob, created.template.id, { rowVersion: 1, title: "forged" })).toBeNull();
    const updated = await templates!.updateTemplate(alice, created.template.id, { rowVersion: created.template.rowVersion, title: "수정 템플릿", tokens: ["One", "Two"] });
    expect(updated).toMatchObject({ title: "수정 템플릿", rowVersion: 2 });
    const copy = await templates!.duplicateTemplate(alice, created.template.id, randomUUID());
    expect(copy).toMatchObject({ template: { source: "user", title: "수정 템플릿 복사본" } });
    expect(await templates!.deleteTemplate(alice, created.template.id)).toBe(true);
    expect(await templates!.getTemplate(alice, created.template.id)).toBeNull();
  });

  it("applies exact snapshots atomically and rejects type or owner confusion", async () => {
    const [alice, bob] = users as [string, string];
    const song = (await songs!.createSong(alice, parseCreateSongInput({ requestId: randomUUID(), title: "Template parent" }))).song;
    const lyricTemplate = (await templates!.createTemplate(alice, { requestId: randomUUID(), type: "lyrics", title: "구조", lyricBody: "[Verse]\n\n[Hook]" })).template;
    const before = Number((await pool!.query<{ count: string }>("select count(*)::text count from resources where owner_id=$1", [alice])).rows[0]!.count);
    await expect(templates!.applyTemplate(alice, lyricTemplate.id, parseApplyTemplateInput({ requestId: randomUUID(), targetType: "prompt", title: "wrong" }))).rejects.toBeInstanceOf(TemplateValidationError);
    expect(Number((await pool!.query<{ count: string }>("select count(*)::text count from resources where owner_id=$1", [alice])).rows[0]!.count)).toBe(before);
    expect(await templates!.applyTemplate(bob, lyricTemplate.id, parseApplyTemplateInput({ requestId: randomUUID(), targetType: "lyrics", title: "hidden", songId: song.id }))).toBeNull();
    const applied = await templates!.applyTemplate(alice, lyricTemplate.id, parseApplyTemplateInput({ requestId: randomUUID(), targetType: "lyrics", title: "새 가사", songId: song.id }));
    expect(applied).toMatchObject({ resource: { type: "lyrics", title: "새 가사" } });
    expect((await pool!.query<{ body: string }>("select body from lyrics where resource_id=$1", [applied!.resource.id])).rows[0]!.body).toBe("[Verse]\n\n[Hook]");
    await templates!.updateTemplate(alice, lyricTemplate.id, { rowVersion: lyricTemplate.rowVersion, lyricBody: "changed" });
    expect((await pool!.query<{ body: string }>("select body from lyrics where resource_id=$1", [applied!.resource.id])).rows[0]!.body).toBe("[Verse]\n\n[Hook]");

    const promptTemplate = (await templates!.createTemplate(alice, { requestId: randomUUID(), type: "prompt", title: "Prompt", tokens: ["First", "Second"] })).template;
    const requestId = randomUUID();
    const prompt = await templates!.applyTemplate(alice, promptTemplate.id, parseApplyTemplateInput({ requestId, targetType: "prompt", title: "새 프롬프트" }));
    expect((await pool!.query<{ plain_text: string }>("select plain_text from prompts where resource_id=$1", [prompt!.resource.id])).rows[0]!.plain_text).toBe("First, Second");
    expect(await templates!.applyTemplate(alice, promptTemplate.id, parseApplyTemplateInput({ requestId, targetType: "prompt", title: "새 프롬프트" }))).toMatchObject({ replayed: true, resource: { id: prompt!.resource.id } });

    const raw = "  orchestral, yet one sentence.\r\n공백  보존  ";
    const sentenceTemplate = (await templates!.createTemplate(alice, {
      requestId: randomUUID(), type: "prompt", title: "Sentence", promptMode: "sentence", promptText: raw
    })).template;
    expect(sentenceTemplate).toMatchObject({ promptMode: "sentence", promptText: raw, tokens: [] });
    const sentenceCopy = await templates!.duplicateTemplate(alice, sentenceTemplate.id, randomUUID());
    expect(sentenceCopy?.template).toMatchObject({ promptMode: "sentence", promptText: raw, tokens: [] });
    const sentencePrompt = await templates!.applyTemplate(alice, sentenceTemplate.id,
      parseApplyTemplateInput({ requestId: randomUUID(), targetType: "prompt", title: "문장 프롬프트" }));
    expect((await pool!.query<{ mode: string; plain_text: string; sentence_text: string }>(
      "select mode,plain_text,sentence_text from prompts where resource_id=$1", [sentencePrompt!.resource.id])).rows[0])
      .toEqual({ mode: "sentence", plain_text: "", sentence_text: raw });
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([templates?.close(), songs?.close(), pool?.end()]);
});
