import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

const origin = "http://127.0.0.1:3000";
const sharp = createRequire(`${process.cwd()}/apps/web/package.json`)("sharp");

test.describe("1.1.7a owner profile HTTP boundary", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "disposable E2E database is required");

  test("partial save, photo owner isolation, reset and optimistic concurrency", async ({ browser }) => {
    const alice = randomUUID(); const bob = randomUUID();
    const aliceToken = `synthetic-117a-${randomUUID()}`;
    const bobToken = `synthetic-117a-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id) values($1),($2)", [alice, bob]);
      await pool.query(`insert into user_profiles(owner_id,display_name,avatar_url,provider_display_name,
        provider_avatar_url,display_name_source,avatar_source) values
        ($1,'Google Alice','https://example.test/google-a.png','Google Alice','https://example.test/google-a.png','provider','provider'),
        ($2,'Google Bob',null,'Google Bob',null,'provider','provider')`, [alice, bob]);
      await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
        values($1,$2,now()+interval '30 minutes',now()+interval '1 day'),
        ($3,$4,now()+interval '30 minutes',now()+interval '1 day')`,
      [hashToken(aliceToken), alice, hashToken(bobToken), bob]);
    });
    const aliceContext = await browser.newContext({ baseURL: origin });
    const bobContext = await browser.newContext({ baseURL: origin });
    try {
      await aliceContext.addCookies([{ name: "lc_session", value: aliceToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      await bobContext.addCookies([{ name: "lc_session", value: bobToken, url: origin, httpOnly: true, sameSite: "Lax" }]);
      const a = aliceContext.request; const b = bobContext.request;
      const initial = (await (await a.get("/api/profile")).json()).profile;
      expect(initial).toMatchObject({ userId: alice, displayName: "Google Alice", rowVersion: 1 });
      const badOrigin = await a.patch("/api/profile", {
        data: { expectedRowVersion: 1, displayName: "CSRF" } });
      expect(badOrigin.status()).toBe(403);
      const nickname = await a.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: 1, displayName: "  새 닉네임  " } });
      expect(nickname.status()).toBe(200);
      const named = (await nickname.json()).profile;
      expect(named).toMatchObject({ displayName: "새 닉네임", avatarUrl: "https://example.test/google-a.png" });
      const stale = await a.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: 1, displayName: "stale" } });
      expect(stale.status()).toBe(409);
      expect((await stale.json()).error.details.profile.displayName).toBe("새 닉네임");
      const invalid = await a.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: named.rowVersion, avatarUrl: "https://evil.example/a.png" } });
      expect(invalid.status()).toBe(400);
      const spoof = await a.patch("/api/profile/avatar", { headers: { Origin: origin }, multipart: {
        expectedRowVersion: String(named.rowVersion), avatar: { name: "fake.png", mimeType: "image/png",
          buffer: Buffer.from("<svg></svg>") }
      } });
      expect(spoof.status()).toBe(400);
      const largeInvalid = await a.patch("/api/profile/avatar", { headers: { Origin: origin }, multipart: {
        expectedRowVersion: String(named.rowVersion), avatar: { name: "invalid-large.png", mimeType: "image/png",
          buffer: Buffer.alloc(1200 * 1024, 65) }
      } });
      expect(largeInvalid.status()).toBe(400); // Avatar-only proxy limit allows decoding to reject it.
      const tooLarge = await a.patch("/api/profile/avatar", { headers: { Origin: origin }, multipart: {
        expectedRowVersion: String(named.rowVersion), avatar: { name: "over-limit.png", mimeType: "image/png",
          buffer: Buffer.alloc(2200 * 1024, 65) }
      } });
      expect(tooLarge.status()).toBe(413);
      const generalLarge = await a.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: named.rowVersion, displayName: "x".repeat(1200 * 1024) } });
      expect(generalLarge.status()).toBe(413);
      const validLargePng: Buffer = await sharp(randomBytes(640 * 640 * 3),
        { raw: { width: 640, height: 640, channels: 3 } }).png().toBuffer();
      expect(validLargePng.length).toBeGreaterThan(1024 * 1024);
      expect(validLargePng.length).toBeLessThan(2 * 1024 * 1024);
      const uploaded = await a.patch("/api/profile/avatar", { headers: { Origin: origin }, multipart: {
        expectedRowVersion: String(named.rowVersion), avatar: { name: "untrusted.png", mimeType: "image/png", buffer: validLargePng }
      } });
      expect(uploaded.status()).toBe(200);
      const saved = (await uploaded.json()).profile;
      expect(saved.avatarUrl).toBe("/api/profile/avatar");
      const photo = await a.get(saved.avatarUrl);
      expect(photo.status()).toBe(200);
      expect(photo.headers()["content-type"]).toContain("image/webp");
      expect(photo.headers()["cache-control"]).toContain("no-store");
      expect((await b.get(saved.avatarUrl)).status()).toBe(404);
      expect((await a.get("/api/profile/avatar?photo=attacker-supplied-id")).status()).toBe(404);
      const reset = await a.patch("/api/profile", { headers: { Origin: origin },
        data: { expectedRowVersion: saved.rowVersion, avatar: null } });
      expect(reset.status()).toBe(200);
      expect((await reset.json()).profile.avatarUrl).toBe("https://example.test/google-a.png");
      expect((await a.get(saved.avatarUrl)).status()).toBe(404);
    } finally {
      await aliceContext.close(); await bobContext.close();
      await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [[alice, bob]])
        .then(() => undefined));
    }
  });
});
