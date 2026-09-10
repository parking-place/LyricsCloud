import { expect, test } from "@playwright/test";

test.describe("1.0.1 P7 brand and build metadata", () => {
  test("uses the approved theme logo and the same runtime metadata as health", async ({ page }, testInfo) => {
    await page.goto("/auth");
    const brand = page.locator(".auth-story .brand");
    await expect(brand).toBeVisible();
    await expect(brand).toHaveAttribute("aria-label", "LyricsCloud");
    await expect(page.locator("#runtime-build-label")).toHaveText("v1.0.5-p4 dev");
    expect(await brand.locator(".brand-build").evaluate((element) => getComputedStyle(element, "::after").content))
      .toBe('"v1.0.5-p4 dev"');
    await expect(brand.locator(".brand-mark-dark")).toBeVisible();
    await expect(brand.locator(".brand-mark-light")).toBeHidden();
    if (testInfo.project.name === "mobile") await expect(page.locator(".auth-card .brand-mark-dark")).toBeHidden();
    else await expect(page.locator(".auth-card .brand-mark-dark")).toBeVisible();

    const live = await (await page.request.get("/api/health/live")).json() as {
      build: { version: string; channel: string; phase: string | null };
    };
    expect(`v${live.build.version}-${live.build.phase} ${live.build.channel}`).toBe("v1.0.5-p4 dev");

    await page.emulateMedia({ colorScheme: "light" });
    await page.reload();
    await expect(brand.locator(".brand-mark-light")).toBeVisible();
    await expect(brand.locator(".brand-mark-dark")).toBeHidden();
    if (testInfo.project.name === "mobile") await expect(page.locator(".auth-card .brand-mark-light")).toBeHidden();
    else await expect(page.locator(".auth-card .brand-mark-light")).toBeVisible();
  });

  test("publishes favicon, PWA and maskable SVG assets without legacy tab versions", async ({ page }) => {
    await page.goto("/auth");
    for (const path of [
      "/icons/lyricscloud-favicon.svg",
      "/icons/lyricscloud-mark-light.svg",
      "/icons/lyricscloud-mark-dark.svg",
      "/icons/lyricscloud-monochrome.svg",
      "/icons/lyricscloud-maskable.svg"
    ]) {
      const response = await page.request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toContain("image/svg+xml");
    }
    const manifest = await (await page.request.get("/manifest.webmanifest")).json() as { icons: Array<{ src: string; purpose: string }> };
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icons/lyricscloud-mark-light.svg", purpose: "any" }),
      expect.objectContaining({ src: "/icons/lyricscloud-maskable.svg", purpose: "maskable" })
    ]));
  });
});
