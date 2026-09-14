import { expect, test } from "@playwright/test";

test.describe("1.1.5 P2 approved UI foundation", () => {
  test("publishes B-1 at the document root and resolves both theme token sets", async ({ page }) => {
    await page.goto("/auth");
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-ui-variant", "b1");
    await expect(root).toHaveAttribute("data-theme", "dark");
    expect(await resolvedTokens(page)).toEqual({
      canvas: "rgb(8, 11, 15)",
      panel: "rgb(17, 22, 29)",
      ink: "rgb(245, 248, 250)",
      accent: "rgb(200, 255, 61)"
    });

    await page.emulateMedia({ colorScheme: "light" });
    await expect(root).toHaveAttribute("data-theme", "light");
    expect(await resolvedTokens(page)).toEqual({
      canvas: "rgb(244, 247, 249)",
      panel: "rgb(255, 255, 255)",
      ink: "rgb(23, 33, 43)",
      accent: "rgb(66, 104, 0)"
    });
  });
});

async function resolvedTokens(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const resolve = (name: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    return {
      canvas: resolve("--canvas"),
      panel: resolve("--panel"),
      ink: styles.color,
      accent: resolve("--acid")
    };
  });
}
