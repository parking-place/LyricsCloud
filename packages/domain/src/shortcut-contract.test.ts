import { describe, expect, it } from "vitest";
import { formatShortcut, matchShortcutCommand, SHORTCUT_COMMANDS, shortcutAriaKeys, type ShortcutKeyInput } from "./shortcut-contract.js";

const base: ShortcutKeyInput = { key: "", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };

describe("shortcut contract", () => {
  it("defines every command exactly once and keeps browser-reserved basics unused", () => {
    expect(new Set(SHORTCUT_COMMANDS.map((command) => command.id)).size).toBe(SHORTCUT_COMMANDS.length);
    expect(SHORTCUT_COMMANDS).toHaveLength(8);
    expect((SHORTCUT_COMMANDS as readonly import("./shortcut-contract.js").ShortcutCommand[]).some((command) => command.chord.primary && !command.chord.alt && ["s", "f", "l", "t", "w"].includes(command.chord.key))).toBe(false);
  });

  it("matches exact Windows/Linux and macOS modifiers", () => {
    expect(matchShortcutCommand({ ...base, key: "n", ctrlKey: true, altKey: true }, "global", "windows_linux")).toBe("new_lyric");
    expect(matchShortcutCommand({ ...base, key: "n", metaKey: true, altKey: true }, "global", "mac")).toBe("new_lyric");
    expect(matchShortcutCommand({ ...base, key: "n", ctrlKey: true, altKey: true }, "global", "mac")).toBeNull();
    expect(matchShortcutCommand({ ...base, key: "c", altKey: true, shiftKey: true }, "lyric_editor", "windows_linux")).toBe("copy_whole_lyric");
    expect(matchShortcutCommand({ ...base, key: "c", altKey: true, shiftKey: true, ctrlKey: true }, "lyric_editor", "windows_linux")).toBeNull();
    expect(matchShortcutCommand({ ...base, key: "{", altKey: true, shiftKey: true }, "lyric_editor", "windows_linux")).toBe("previous_lyric");
    expect(matchShortcutCommand({ ...base, key: "}", altKey: true, shiftKey: true }, "lyric_editor", "windows_linux")).toBe("next_lyric");
  });

  it("suppresses composition and already handled events", () => {
    const chord = { ...base, key: "f", altKey: true, shiftKey: true };
    expect(matchShortcutCommand({ ...chord, isComposing: true }, "lyric_editor", "windows_linux")).toBeNull();
    expect(matchShortcutCommand({ ...chord, defaultPrevented: true }, "lyric_editor", "windows_linux")).toBeNull();
  });

  it("formats platform-specific visible and aria labels from the same registry", () => {
    expect(formatShortcut("search", "windows_linux")).toBe("Ctrl+Alt+K");
    expect(formatShortcut("search", "mac")).toBe("Command+Option+K");
    expect(shortcutAriaKeys("search", "windows_linux")).toBe("Control+Alt+K");
    expect(shortcutAriaKeys("search", "mac")).toBe("Meta+Alt+K");
    expect(formatShortcut("previous_lyric", "mac")).toBe("Option+Shift+[");
  });
});
