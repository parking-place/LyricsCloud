import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hashToken, withE2eDatabase } from "./fixtures.js";

test.describe("1.1.8 Windows read-only API", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "E2E_DATABASE_URL is required");

  test("keeps native bearer reads owner-scoped and revalidates selected sharing", async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one API execution is sufficient");
    const alice = randomUUID(); const bob = randomUUID();
    const aliceToken = randomBytes(32).toString("base64url"); const bobToken = randomBytes(32).toString("base64url");
    const song = randomUUID(); const lyric = randomUUID(); const rhyme = randomUUID();
    const grant = randomUUID(); const sunoLink = randomUUID();
    await withE2eDatabase(async (pool) => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        for (const [id, name, token] of [[alice, "네이티브 앨리스", aliceToken], [bob, "네이티브 밥", bobToken]]) {
          await client.query("insert into app_users(id,status) values($1,'active')", [id]);
          await client.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, name]);
          await client.query(`insert into native_sessions(token_hash,user_id,scope,expires_at,absolute_expires_at)
            values($1,$2,'read',now()+interval '1 hour',now()+interval '2 hours')`, [hashToken(token), id]);
        }
        await client.query(`insert into resources(id,owner_id,type,title) values
          ($1,$2,'song','합성 Windows 곡'),($3,$2,'lyrics','합성 Windows 가사'),($4,$2,'rhyme_note','합성 Windows 라임')`,
        [song, alice, lyric, rhyme]);
        await client.query("insert into songs(resource_id,owner_id,work_notes) values($1,$2,'합성 작업 메모')", [song, alice]);
        await client.query("insert into lyrics(resource_id,owner_id,song_id,body,memo) values($1,$2,$3,'바라봐, 마냥','합성 메모')", [lyric, alice, song]);
        await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,'라임 원문')", [rhyme, alice]);
        await client.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
          values($1,$2,$3,'rhyme_note')`, [alice, song, rhyme]);
        await client.query("insert into song_suno_workspaces(song_resource_id,owner_id,model_label,row_version) values($1,$2,'v5',1)", [song, alice]);
        await client.query(`insert into song_suno_links(id,owner_id,song_resource_id,url,title,note,position)
          values($1,$2,$3,$4,'합성 링크','',0)`, [sunoLink, alice, song, `https://suno.com/song/${randomUUID()}`]);
        await client.query(`insert into lyric_read_grants(id,resource_id,owner_id,grantee_id,permission_epoch)
          values($1,$2,$3,$4,1)`, [grant, lyric, alice, bob]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    });
    const aliceHeaders = { Authorization: `Bearer ${aliceToken}` };
    const bobHeaders = { Authorization: `Bearer ${bobToken}` };

    const capabilities = await request.get("/api/native/v1/capabilities");
    expect(capabilities.status()).toBe(200);
    expect(await capabilities.json()).toMatchObject({ contract: "lyricscloud.native.read.v1", writes: false,
      webView2: false, authentication: { pkceMethods: ["S256"], sessionScope: "read" } });
    expect((await request.get("/api/native/v1/session", { headers: aliceHeaders })).status()).toBe(200);
    expect(await (await request.get(`/api/native/v1/songs/${song}`, { headers: aliceHeaders })).json())
      .toMatchObject({ song: { id: song, title: "합성 Windows 곡", workNotes: "합성 작업 메모" } });
    expect((await request.get(`/api/native/v1/songs/${song}`, { headers: bobHeaders })).status()).toBe(404);
    expect(await (await request.get(`/api/native/v1/lyrics/${lyric}`, { headers: aliceHeaders })).json())
      .toMatchObject({ lyric: { body: "바라봐, 마냥", memo: "합성 메모" } });
    expect(await (await request.get(`/api/native/v1/songs/${song}/links?type=rhyme_note&state=linked`, { headers: aliceHeaders })).json())
      .toMatchObject({ items: [{ id: rhyme, isLinked: true }] });
    expect(await (await request.get(`/api/native/v1/songs/${song}/suno-workspace`, { headers: aliceHeaders })).json())
      .toMatchObject({ workspace: { modelLabel: "v5", links: [{ id: sunoLink, title: "합성 링크" }] } });
    expect(await (await request.get(`/api/native/v1/shared/lyrics/${lyric}`, { headers: bobHeaders })).json())
      .toMatchObject({ lyric: { id: lyric, access: { mode: "read", permissionEpoch: 1 } } });

    await withE2eDatabase((pool) => pool.query("update lyric_read_grants set state='revoked',revoked_at=now(),permission_epoch=2 where id=$1", [grant]).then(() => undefined));
    expect((await request.get(`/api/native/v1/shared/lyrics/${lyric}`, { headers: bobHeaders })).status()).toBe(404);
    expect((await request.post("/api/native/v1/songs", { headers: aliceHeaders, data: {} })).status()).toBe(405);
    expect((await request.post("/api/songs", { headers: { ...aliceHeaders, Origin: "http://127.0.0.1:3000" },
      data: { requestId: randomUUID(), title: "쓰면 안 됨" } })).status()).toBe(401);
    expect((await request.get("/api/native/v1/session", { headers: { Authorization: "Bearer invalid" } })).status()).toBe(401);

    await withE2eDatabase((pool) => pool.query("delete from app_users where id=any($1::uuid[])", [[alice, bob]]).then(() => undefined));
  });

  test("exchanges an authenticated browser callback with exact state and PKCE only once", async ({ browser, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one API execution is sufficient");
    const owner = randomUUID();
    const webToken = `native-browser-${randomUUID()}`;
    await withE2eDatabase(async (pool) => {
      await pool.query("insert into app_users(id,status) values($1,'active')", [owner]);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,'네이티브 브라우저')", [owner]);
      await pool.query(`insert into auth_sessions(token_hash,user_id,expires_at,absolute_expires_at)
        values($1,$2,now()+interval '1 hour',now()+interval '2 hours')`, [hashToken(webToken), owner]);
    });
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const callbackPath = `/lyricscloud/oauth/${randomBytes(32).toString("base64url")}`;
    const callback = `http://127.0.0.1:49152${callbackPath}`;
    const invalidCallback = await request.post("/api/native/v1/auth/transactions", {
      data: { codeChallenge: challenge, redirectUri: `http://localhost:49152${callbackPath}` }
    });
    expect(invalidCallback.status()).toBe(400);

    const startedResponse = await request.post("/api/native/v1/auth/transactions", {
      data: { codeChallenge: challenge, redirectUri: callback }
    });
    expect(startedResponse.status()).toBe(201);
    const started = await startedResponse.json() as { authorizationUrl: string; transaction: string; state: string };
    const unauthenticated = await request.get(started.authorizationUrl, { maxRedirects: 0 });
    expect(unauthenticated.status()).toBe(303);
    expect(unauthenticated.headers().location).toContain("/api/auth/login?");

    const browserContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000" });
    await browserContext.addCookies([{ name: "lc_session", value: webToken, url: "http://127.0.0.1:3000",
      httpOnly: true, sameSite: "Lax" }]);
    const authorized = await browserContext.request.get(started.authorizationUrl, { maxRedirects: 0 });
    expect(authorized.status()).toBe(303);
    const location = new URL(authorized.headers().location!);
    expect(`${location.origin}${location.pathname}`).toBe(callback);
    expect(location.searchParams.get("state")).toBe(started.state);
    const code = location.searchParams.get("code")!;
    expect(code).toHaveLength(43);
    expect((await withE2eDatabase((pool) => pool.query("select count(*)::int count from native_sessions where user_id=$1", [owner]))).rows[0].count)
      .toBe(0);

    const wrongState = await request.post("/api/native/v1/auth/token", { data: {
      transaction: started.transaction, state: "x".repeat(43), code, codeVerifier: verifier
    } });
    expect(wrongState.status()).toBe(401);
    const exchanged = await request.post("/api/native/v1/auth/token", { data: {
      transaction: started.transaction, state: started.state, code, codeVerifier: verifier
    } });
    expect(exchanged.status()).toBe(200);
    const token = await exchanged.json() as { accessToken: string; scope: string; user: { id: string } };
    expect(token).toMatchObject({ scope: "read", user: { id: owner } });
    expect((await request.get("/api/native/v1/session", { headers: { Authorization: `Bearer ${token.accessToken}` } })).status()).toBe(200);
    expect((await request.post("/api/native/v1/auth/token", { data: {
      transaction: started.transaction, state: started.state, code, codeVerifier: verifier
    } })).status()).toBe(401);

    await browserContext.close();
    await withE2eDatabase((pool) => pool.query("delete from app_users where id=$1", [owner]).then(() => undefined));
  });
});
