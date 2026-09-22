import { afterEach, describe, expect, it, vi } from "vitest";
import { BEFORE_SHORTCUT_NAVIGATION_EVENT, requestShortcutNavigation } from "./shortcut-runtime.js";

afterEach(() => vi.unstubAllGlobals());

describe("historical same-document shortcut navigation", () => {
  function browser(href: string) {
    const location = Object.assign(new URL(href), { assign: vi.fn() });
    const window = Object.assign(new EventTarget(), { location });
    vi.stubGlobal("window", window);
    return { window, location, navigate: vi.fn() };
  }

  it("does no work for repeated search shortcuts on the exact current URL", () => {
    const fixture = browser("https://lyrics.example/search");
    const guard = vi.fn();
    fixture.window.addEventListener(BEFORE_SHORTCUT_NAVIGATION_EVENT, guard);
    requestShortcutNavigation({ commandId: "search", href: "/search" }, fixture.navigate);
    expect(fixture.location.assign).not.toHaveBeenCalled();
    expect(fixture.navigate).not.toHaveBeenCalled();
    expect(guard).not.toHaveBeenCalled();
  });

  it("uses the supplied guarded Next navigation and keeps editor vetoes", () => {
    const fixture = browser("https://lyrics.example/songs");
    requestShortcutNavigation({ commandId: "search", href: "/search" }, fixture.navigate);
    expect(fixture.navigate).toHaveBeenCalledExactlyOnceWith("/search");
    expect(fixture.location.assign).not.toHaveBeenCalled();
    fixture.window.addEventListener(BEFORE_SHORTCUT_NAVIGATION_EVENT, (event) => event.preventDefault());
    requestShortcutNavigation({ commandId: "new_lyric", href: "/lyrics/new" }, fixture.navigate);
    expect(fixture.navigate).toHaveBeenCalledTimes(1);
  });
});
