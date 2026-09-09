import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreatePromptInput, parseCreateRhymeNoteInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresAuthStore } from "./auth.js";
import { LifecycleConflictError, PostgresLifecycleStore } from "./lifecycle.js";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresPromptStore } from "./prompts.js";
import { PostgresRhymeStore } from "./rhymes.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const lifecycle = enabled ? new PostgresLifecycleStore(databaseUrl, 3) : null;
const auth = enabled ? new PostgresAuthStore(databaseUrl) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 2) : null;
const rhymes = enabled ? new PostgresRhymeStore(databaseUrl, 2) : null;
const prompts = enabled ? new PostgresPromptStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("trash and withdrawal lifecycle PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (let index = 0; index < 4; index++) {
      const user = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      users.push(user);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [user, `Lifecycle ${index}`]);
    }
  });

  it("assigns exact 30-day deadlines and restores only the song deletion batch", async () => {
    const owner = users[0]!;
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "복원 곡" }))).song;
    const first = (await lyrics!.createLyric(owner, parseCreateLyricInput({ requestId: randomUUID(), title: "먼저 삭제", body: "first" }, song.id)))!.lyric;
    const second = (await lyrics!.createLyric(owner, parseCreateLyricInput({ requestId: randomUUID(), title: "곡과 삭제", body: "second" }, song.id)))!.lyric;
    await lyrics!.deleteLyric(owner, first.id);
    await songs!.deleteSong(owner, song.id);

    const trash = await lifecycle!.listTrash(owner);
    const parent = trash.find((item) => item.id === song.id)!;
    expect(parent.affectedLyrics).toBe(1);
    expect(new Date(parent.purgeAt).getTime() - new Date(parent.deletedAt).getTime()).toBe(30 * 86_400_000);
    await lifecycle!.restore(owner, [{ kind: "resource", id: song.id }]);
    expect(await songs!.getSong(owner, song.id)).not.toBeNull();
    expect(await lyrics!.getLyric(owner, second.id)).not.toBeNull();
    expect(await lyrics!.getLyric(owner, first.id)).toBeNull();
    await lifecycle!.restore(owner, [{ kind: "resource", id: first.id }]);
    expect(await lyrics!.getLyric(owner, first.id)).not.toBeNull();
  });

  it("requires an explicit parent restore or active destination for orphaned lyrics", async () => {
    const owner = users[0]!;
    const parent = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "삭제 부모" }))).song;
    const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ requestId: randomUUID(), title: "이동 가사" }, parent.id)))!.lyric;
    const destination = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "새 위치" }))).song;
    await songs!.deleteSong(owner, parent.id);
    await expect(lifecycle!.restore(owner, [{ kind: "resource", id: lyric.id }])).rejects.toMatchObject({ code: "LYRIC_PARENT_ACTION_REQUIRED" });
    await lifecycle!.restore(owner, [{ kind: "resource", id: lyric.id }], "move_to_song", destination.id);
    expect((await lyrics!.getLyric(owner, lyric.id))?.songId).toBe(destination.id);
    expect(await songs!.getSong(owner, parent.id)).toBeNull();
  });

  it("keeps permanent deletion atomic, title-confirmed and owner scoped", async () => {
    const [alice, bob] = users as [string, string];
    const rhyme = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "완전 삭제 라임", body: "synthetic" }))).rhyme;
    await rhymes!.deleteRhymeNote(alice, rhyme.id);
    const ref = { kind: "resource" as const, id: rhyme.id };
    await expect(lifecycle!.permanentlyDelete(bob, [ref], [{ ...ref, title: rhyme.title }])).rejects.toBeInstanceOf(LifecycleConflictError);
    await expect(lifecycle!.permanentlyDelete(alice, [ref], [{ ...ref, title: "다른 이름" }])).rejects.toMatchObject({ code: "TRASH_CHANGED" });
    expect(await lifecycle!.permanentlyDelete(alice, [ref], [{ ...ref, title: rhyme.title }])).toBe(1);
    expect((await pool!.query("select 1 from resources where id=$1", [rhyme.id])).rowCount).toBe(0);
  });

  it("purges only due resources and templates, is idempotent, and leaves another owner untouched", async () => {
    const [alice, bob] = users as [string, string];
    const now = new Date("2020-06-30T00:00:00.000Z");
    const notes = [];
    for (const title of ["before", "exact", "after"]) {
      const note = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title, body: "fixture" }))).rhyme;
      await rhymes!.deleteRhymeNote(alice, note.id); notes.push(note.id);
    }
    const bobPrompt = (await prompts!.createPrompt(bob, parseCreatePromptInput({ requestId: randomUUID(), title: "other owner", tokens: ["safe"] }))).prompt;
    await prompts!.deletePrompt(bob, bobPrompt.id);
    const templateId = randomUUID();
    await pool!.query(`insert into templates(id,owner_id,type,title,lyric_body)
      values($1,$2,'lyrics','기한 템플릿','fixture')`, [templateId, alice]);
    const fixtureClient = await pool!.connect();
    try {
      await fixtureClient.query("begin");
      await fixtureClient.query("set local session_replication_role=replica");
      for (const [id, deletedAt] of [
        [notes[0]!, new Date(now.getTime() - 30 * 86_400_000 - 1)],
        [notes[1]!, new Date(now.getTime() - 30 * 86_400_000)],
        [notes[2]!, new Date(now.getTime() - 30 * 86_400_000 + 1)]
      ] as const) await fixtureClient.query("update resources set created_at=$2::timestamptz-interval '1 day',deleted_at=$2,purge_at=$2::timestamptz+interval '30 days' where id=$1", [id, deletedAt]);
      const templateDeletedAt = new Date(now.getTime() - 30 * 86_400_000);
      await fixtureClient.query("update templates set created_at=$2::timestamptz-interval '1 day',deleted_at=$2,purge_at=$2::timestamptz+interval '30 days' where id=$1", [templateId, templateDeletedAt]);
      await fixtureClient.query("commit");
    } catch (error) { await fixtureClient.query("rollback"); throw error; }
    finally { fixtureClient.release(); }

    const firstRun = await lifecycle!.runDuePurge(now);
    expect(firstRun.resourceCount).toBe(2);
    expect(firstRun).toMatchObject({ templateCount: 1, accountCount: 0 });
    expect((await pool!.query("select id from resources where id=any($1::uuid[]) order by id", [notes])).rows).toEqual([{ id: notes[2] }]);
    expect((await pool!.query("select 1 from resources where id=$1", [bobPrompt.id])).rowCount).toBe(1);
    expect(await lifecycle!.runDuePurge(now)).toMatchObject({ resourceCount: 0, templateCount: 0, accountCount: 0 });
  });

  it("requires recent reauthentication, blocks every old session, allows explicit cancellation, and purges at seven days", async () => {
    const owner = users[2]!;
    const now = new Date("2026-07-08T00:00:00.000Z");
    await insertSession(owner, "old-session", new Date(now.getTime() - 11 * 60_000));
    await expect(lifecycle!.requestWithdrawal(owner, "old-session", now)).rejects.toMatchObject({ code: "REAUTH_REQUIRED" });
    await insertSession(owner, "recent-session", new Date(now.getTime() - 60_000));
    expect((await lifecycle!.requestWithdrawal(owner, "recent-session", now)).getTime()).toBe(now.getTime() + 7 * 86_400_000);
    expect(await auth!.readSession("recent-session", now)).toBeNull();
    expect((await pool!.query("select count(*)::int count from auth_sessions where user_id=$1 and revoked_at is null", [owner])).rows[0]!.count).toBe(0);

    await insertSession(owner, "recovery-session", new Date(now.getTime() + 60_000));
    expect((await lifecycle!.resolvePendingWithdrawalSession("recovery-session", new Date(now.getTime() + 60_000)))?.userId).toBe(owner);
    expect(await lifecycle!.cancelWithdrawal(owner, "recovery-session", new Date(now.getTime() + 60_000))).toBe(true);
    expect((await lifecycle!.getAccountLifecycle(owner))?.status).toBe("active");

    const requestedAt = new Date(now.getTime() - 7 * 86_400_000);
    await pool!.query(`insert into auth_identities(issuer,subject,user_id,email,email_verified,display_name)
      values('https://accounts.example.invalid','withdrawal-relogin',$1,'relogin@example.invalid',true,'재로그인')`, [owner]);
    await insertSession(owner, "final-session", requestedAt);
    await lifecycle!.requestWithdrawal(owner, "final-session", requestedAt);
    expect((await lifecycle!.runDuePurge(now)).accountCount).toBe(1);
    expect((await pool!.query("select 1 from app_users where id=$1", [owner])).rowCount).toBe(0);
    const reloggedUser = await auth!.upsertIdentity({
      issuer: "https://accounts.example.invalid", subject: "withdrawal-relogin",
      email: "relogin@example.invalid", emailVerified: true, displayName: "재로그인"
    }, new Date(now.getTime() + 60_000));
    users.push(reloggedUser);
    expect(reloggedUser).not.toBe(owner);
    expect((await lifecycle!.getAccountLifecycle(reloggedUser))?.status).toBe("active");
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([lifecycle?.close(), auth?.close(), songs?.close(), lyrics?.close(), rhymes?.close(), prompts?.close(), pool?.end()]);
});

async function insertSession(userId: string, tokenHash: string, createdAt: Date) {
  await pool!.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at,created_at,last_seen_at)
    values($1,$2,$3,$4,$5,$5)`, [tokenHash, userId, new Date(createdAt.getTime() + 30 * 86_400_000), new Date(createdAt.getTime() + 90 * 86_400_000), createdAt]);
}
