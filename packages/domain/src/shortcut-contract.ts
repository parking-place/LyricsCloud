export type ShortcutContext = "global" | "lyric_editor";
export type ShortcutPlatform = "windows_linux" | "mac";

export interface ShortcutChord {
  readonly key: string;
  readonly primary?: boolean;
  readonly alt?: boolean;
  readonly shift?: boolean;
}

export interface ShortcutCommand {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly context: ShortcutContext;
  readonly chord: ShortcutChord;
}

export const SHORTCUT_COMMANDS = [
  { id: "new_lyric", label: "새 가사", description: "부모 곡을 선택해 새 가사를 시작합니다.", context: "global", chord: { key: "n", primary: true, alt: true } },
  { id: "search", label: "통합 검색", description: "통합 검색 화면을 엽니다.", context: "global", chord: { key: "k", primary: true, alt: true } },
  { id: "shortcut_help", label: "단축키 도움말", description: "검색 가능한 단축키 안내를 엽니다.", context: "global", chord: { key: "/", primary: true, alt: true } },
  { id: "copy_whole_lyric", label: "가사 전체 복사", description: "현재 가사의 순수 텍스트 전체를 복사합니다.", context: "lyric_editor", chord: { key: "c", alt: true, shift: true } },
  { id: "toggle_focus_mode", label: "집중 모드 전환", description: "가사 편집기의 주변 도구를 접거나 복원합니다.", context: "lyric_editor", chord: { key: "f", alt: true, shift: true } },
  { id: "toggle_resource_panel", label: "자료 패널 열기·닫기", description: "현재 편집 위치를 유지한 채 보조 자료 패널을 전환합니다.", context: "lyric_editor", chord: { key: "p", alt: true, shift: true } },
  { id: "previous_lyric", label: "이전 가사", description: "현재 곡의 이전 가사로 안전하게 이동합니다.", context: "lyric_editor", chord: { key: "[", alt: true, shift: true } },
  { id: "next_lyric", label: "다음 가사", description: "현재 곡의 다음 가사로 안전하게 이동합니다.", context: "lyric_editor", chord: { key: "]", alt: true, shift: true } }
] as const satisfies readonly ShortcutCommand[];

export type ShortcutCommandId = (typeof SHORTCUT_COMMANDS)[number]["id"];

export interface ShortcutKeyInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly defaultPrevented?: boolean;
  readonly isComposing?: boolean;
}

export function matchShortcutCommand(input: ShortcutKeyInput, context: ShortcutContext, platform: ShortcutPlatform): ShortcutCommandId | null {
  if (input.defaultPrevented || input.isComposing) return null;
  const command = findShortcut((candidate) => candidate.context === context && matchesChord(input, candidate.chord, platform));
  return (command?.id as ShortcutCommandId | undefined) ?? null;
}

export function formatShortcut(commandId: ShortcutCommandId, platform: ShortcutPlatform): string {
  const command = findShortcut((candidate) => candidate.id === commandId);
  if (!command) return "";
  const keys: string[] = [];
  if (command.chord.primary) keys.push(platform === "mac" ? "Command" : "Ctrl");
  if (command.chord.alt) keys.push(platform === "mac" ? "Option" : "Alt");
  if (command.chord.shift) keys.push("Shift");
  keys.push(displayKey(command.chord.key));
  return keys.join("+");
}

export function shortcutAriaKeys(commandId: ShortcutCommandId, platform: ShortcutPlatform): string {
  const command = findShortcut((candidate) => candidate.id === commandId);
  if (!command) return "";
  const keys: string[] = [];
  if (command.chord.primary) keys.push(platform === "mac" ? "Meta" : "Control");
  if (command.chord.alt) keys.push("Alt");
  if (command.chord.shift) keys.push("Shift");
  keys.push(command.chord.key.length === 1 ? command.chord.key.toUpperCase() : command.chord.key);
  return keys.join("+");
}

function matchesChord(input: ShortcutKeyInput, chord: ShortcutChord, platform: ShortcutPlatform): boolean {
  const expectedControl = Boolean(chord.primary && platform === "windows_linux");
  const expectedMeta = Boolean(chord.primary && platform === "mac");
  return matchesKey(input.key, chord)
    && input.ctrlKey === expectedControl
    && input.metaKey === expectedMeta
    && input.altKey === Boolean(chord.alt)
    && input.shiftKey === Boolean(chord.shift);
}

function matchesKey(inputKey: string, chord: ShortcutChord): boolean {
  if (inputKey.toLowerCase() === chord.key.toLowerCase()) return true;
  if (!chord.shift) return false;
  return (chord.key === "[" && inputKey === "{") || (chord.key === "]" && inputKey === "}");
}

function displayKey(key: string): string {
  if (key === "[") return "[";
  if (key === "]") return "]";
  if (key === "/") return "/";
  return key.toUpperCase();
}

function findShortcut(predicate: (command: ShortcutCommand) => boolean): ShortcutCommand | undefined {
  return (SHORTCUT_COMMANDS as readonly ShortcutCommand[]).find(predicate);
}
