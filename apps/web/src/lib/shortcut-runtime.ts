import { matchShortcutCommand, type ShortcutCommandId, type ShortcutContext, type ShortcutPlatform } from "@lyricscloud/domain";

export const BEFORE_SHORTCUT_NAVIGATION_EVENT = "lyricscloud:before-shortcut-navigation";

export interface ShortcutNavigationDetail {
  readonly href: string;
  readonly commandId: "new_lyric" | "search";
}

export function currentShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === "undefined") return "windows_linux";
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent) ? "mac" : "windows_linux";
}

export function commandForKeyboardEvent(event: KeyboardEvent, context: ShortcutContext): ShortcutCommandId | null {
  return matchShortcutCommand(event, context, currentShortcutPlatform());
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true'], .cm-editor"));
}

export function requestShortcutNavigation(detail: ShortcutNavigationDetail): void {
  const allowed = window.dispatchEvent(new CustomEvent<ShortcutNavigationDetail>(BEFORE_SHORTCUT_NAVIGATION_EVENT, {
    bubbles: false,
    cancelable: true,
    detail
  }));
  if (allowed) window.location.assign(detail.href);
}
