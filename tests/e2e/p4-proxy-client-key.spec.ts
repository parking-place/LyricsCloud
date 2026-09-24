import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:3000";
const token = "A".repeat(43);

test("public read and guest-session limits ignore a changing forwarded chain when Cloudflare sets client IP", async ({ request }, info) => {
  test.skip(!process.env.E2E_DATABASE_URL || info.project.name !== "desktop", "isolated desktop HTTP boundary");
  const clientIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
  for (const [path, limit] of [["/api/public/shared-lyric", 30], ["/api/public/shared-lyric/session", 20]] as const) {
    for (let index = 0; index <= limit; index++) {
      const response = await request.post(`${origin}${path}`, { headers: {
        Origin: origin,
        "CF-Connecting-IP": clientIp,
        "X-Forwarded-For": `198.51.100.${index + 1}, 203.0.113.9`
      }, data: { token } });
      expect(response.status(), `${path} request ${index + 1}`).toBe(index === limit ? 429 : 404);
    }
  }
});
