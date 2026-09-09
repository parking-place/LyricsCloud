import type { ValidationIssue } from "./result.js";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const WRITING_FONTS = ["sans", "serif", "mono"] as const;
export type WritingFont = (typeof WRITING_FONTS)[number];

export const DISPLAY_SETTING_LIMITS = {
  fontSize: { min: 14, max: 28 },
  lineHeight: { min: 1.2, max: 2.4 },
  letterSpacing: { min: -0.05, max: 0.2 }
} as const;

export interface WritingDisplaySettings {
  readonly font: WritingFont;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
}

export interface UserSettingsRecord extends WritingDisplaySettings {
  readonly theme: ThemePreference;
  readonly focusModeDefault: boolean;
  readonly rowVersion: number;
  readonly updatedAt: string | null;
}

export interface LyricDisplayOverride extends WritingDisplaySettings {
  readonly rowVersion: number;
  readonly updatedAt: string;
}

export interface LyricDisplaySettingsRecord {
  readonly account: UserSettingsRecord;
  readonly override: LyricDisplayOverride | null;
  readonly effective: WritingDisplaySettings;
}

export interface UpdateUserSettingsInput extends WritingDisplaySettings {
  readonly theme: ThemePreference;
  readonly focusModeDefault: boolean;
  readonly rowVersion: number;
}

export interface UpdateLyricDisplaySettingsInput extends WritingDisplaySettings {
  readonly rowVersion: number;
}

export const DEFAULT_USER_SETTINGS: UserSettingsRecord = {
  theme: "system",
  font: "sans",
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0,
  focusModeDefault: false,
  rowVersion: 0,
  updatedAt: null
};

export class DisplaySettingsValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "DisplaySettingsValidationError";
  }
}

export class DisplaySettingsConflictError extends Error {
  constructor() {
    super("VERSION_CONFLICT");
    this.name = "DisplaySettingsConflictError";
  }
}

export function parseUpdateUserSettingsInput(value: unknown): UpdateUserSettingsInput {
  const input = object(value);
  const writing = writingSettings(input);
  if (!THEME_PREFERENCES.includes(input.theme as ThemePreference)) fail("theme", "unsupported_value");
  if (typeof input.focusModeDefault !== "boolean") fail("focusModeDefault", "boolean_required");
  return {
    rowVersion: rowVersion(input.rowVersion),
    theme: input.theme as ThemePreference,
    ...writing,
    focusModeDefault: input.focusModeDefault
  };
}

export function parseUpdateLyricDisplaySettingsInput(value: unknown): UpdateLyricDisplaySettingsInput {
  const input = object(value);
  return { rowVersion: rowVersion(input.rowVersion), ...writingSettings(input) };
}

export function parseResetLyricDisplaySettingsInput(value: unknown): { readonly rowVersion: number } {
  const input = object(value);
  const version = rowVersion(input.rowVersion);
  if (version < 1) fail("rowVersion", "positive_integer_required");
  return { rowVersion: version };
}

export function resolveWritingDisplaySettings(
  account: WritingDisplaySettings,
  override: WritingDisplaySettings | null
): WritingDisplaySettings {
  return override ? { font: override.font, fontSize: override.fontSize, lineHeight: override.lineHeight, letterSpacing: override.letterSpacing }
    : { font: account.font, fontSize: account.fontSize, lineHeight: account.lineHeight, letterSpacing: account.letterSpacing };
}

function writingSettings(input: Record<string, unknown>): WritingDisplaySettings {
  if (!WRITING_FONTS.includes(input.font as WritingFont)) fail("font", "unsupported_value");
  return {
    font: input.font as WritingFont,
    fontSize: boundedNumber(input.fontSize, "fontSize", DISPLAY_SETTING_LIMITS.fontSize.min, DISPLAY_SETTING_LIMITS.fontSize.max, true),
    lineHeight: boundedNumber(input.lineHeight, "lineHeight", DISPLAY_SETTING_LIMITS.lineHeight.min, DISPLAY_SETTING_LIMITS.lineHeight.max),
    letterSpacing: boundedNumber(input.letterSpacing, "letterSpacing", DISPLAY_SETTING_LIMITS.letterSpacing.min, DISPLAY_SETTING_LIMITS.letterSpacing.max)
  };
}

function boundedNumber(value: unknown, field: string, min: number, max: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    fail(field, integer ? "integer_out_of_range" : "number_out_of_range");
  }
  return value;
}

function rowVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail("rowVersion", "non_negative_integer_required");
  return Number(value);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("body", "object_required");
  return value as Record<string, unknown>;
}

function fail(field: string, code: string): never {
  throw new DisplaySettingsValidationError([{ field, code }]);
}
