import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_SETTINGS,
  DisplaySettingsValidationError,
  parseUpdateLyricDisplaySettingsInput,
  parseUpdateUserSettingsInput,
  resolveWritingDisplaySettings
} from "./display-settings-contract.js";

describe("display settings contract", () => {
  it("accepts only bounded, built-in account display values", () => {
    expect(parseUpdateUserSettingsInput({
      rowVersion: 0, theme: "system", font: "serif", fontSize: 20,
      lineHeight: 1.7, letterSpacing: 0.02, focusModeDefault: true
    })).toMatchObject({ rowVersion: 0, theme: "system", font: "serif", fontSize: 20, focusModeDefault: true });

    for (const value of [
      { ...DEFAULT_USER_SETTINGS, font: "url(https://example.com/font.woff2)" },
      { ...DEFAULT_USER_SETTINGS, theme: "auto-dark" },
      { ...DEFAULT_USER_SETTINGS, fontSize: 13 },
      { ...DEFAULT_USER_SETTINGS, lineHeight: Number.NaN },
      { ...DEFAULT_USER_SETTINGS, letterSpacing: 0.21 },
      { ...DEFAULT_USER_SETTINGS, rowVersion: -1 }
    ]) expect(() => parseUpdateUserSettingsInput(value)).toThrow(DisplaySettingsValidationError);
  });

  it("validates a complete lyric override and resolves override before account", () => {
    const override = parseUpdateLyricDisplaySettingsInput({ rowVersion: 0, font: "mono", fontSize: 16, lineHeight: 2, letterSpacing: -0.01 });
    expect(resolveWritingDisplaySettings(DEFAULT_USER_SETTINGS, override)).toEqual({ font: "mono", fontSize: 16, lineHeight: 2, letterSpacing: -0.01 });
    expect(resolveWritingDisplaySettings(DEFAULT_USER_SETTINGS, null)).toEqual({ font: "sans", fontSize: 18, lineHeight: 1.8, letterSpacing: 0 });
  });

  it("accepts the 1.0.14 self-hosted font selection", () => {
    expect(parseUpdateUserSettingsInput({
      rowVersion: 0, theme: "system", font: "noto_sans_kr", fontSize: 18,
      lineHeight: 1.8, letterSpacing: 0, focusModeDefault: false
    }).font).toBe("noto_sans_kr");
    expect(parseUpdateLyricDisplaySettingsInput({
      rowVersion: 0, font: "noto_sans_kr", fontSize: 18, lineHeight: 1.8, letterSpacing: 0
    }).font).toBe("noto_sans_kr");
  });
});
