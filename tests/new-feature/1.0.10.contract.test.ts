import { describe, expect, it } from "vitest";
import {
  SUNO_MODEL_SUGGESTIONS,
  SunoWorkspaceValidationError,
  parseSunoWorkspaceCommand
} from "../../packages/domain/src/index.js";

const requestId = "10000000-0000-4000-8000-000000000001";
const linkId = "10000000-0000-4000-8000-000000000002";

describe("1.0.10 manual Suno workspace contract", () => {
  it("keeps the user examples as suggestions while preserving custom labels", () => {
    expect(SUNO_MODEL_SUGGESTIONS).toEqual(["v3", "v3.5", "v4", "v4.5", "v4.5+", "v4.5-all", "v5", "v5.5"]);
    expect(parseSunoWorkspaceCommand({ requestId, expectedVersion: 0, command: "set_model", modelLabel: "  v6-wild  " }))
      .toMatchObject({ command: "set_model", modelLabel: "v6-wild" });
  });

  it("accepts only official-host song and short-share paths", () => {
    expect(parseSunoWorkspaceCommand({
      requestId, expectedVersion: 0, command: "create_link",
      url: "https://suno.com/song/871EE320-B22C-4D8F-9F0E-6C373A79CBDB?sh=Example1",
      title: "  첫 결과  ", note: "A\nB"
    })).toMatchObject({
      command: "create_link",
      url: "https://suno.com/song/871ee320-b22c-4d8f-9f0e-6c373a79cbdb?sh=Example1",
      title: "첫 결과", note: "A\nB"
    });
    expect(parseSunoWorkspaceCommand({
      requestId, expectedVersion: 0, command: "create_link",
      url: "https://www.suno.com/s/Abc_123-xY", title: "", note: ""
    })).toMatchObject({ url: "https://www.suno.com/s/Abc_123-xY" });
  });

  it("rejects authority fields, unsafe URLs and malformed reorder sets", () => {
    for (const value of [
      { requestId, expectedVersion: 0, command: "create_link", url: "javascript:alert(1)", title: "", note: "" },
      { requestId, expectedVersion: 0, command: "create_link", url: "https://user@suno.com/song/871ee320-b22c-4d8f-9f0e-6c373a79cbdb", title: "", note: "" },
      { requestId, expectedVersion: 0, command: "create_link", url: "https://suno.com:444/song/871ee320-b22c-4d8f-9f0e-6c373a79cbdb", title: "", note: "" },
      { requestId, expectedVersion: 0, command: "create_link", url: "https://evil.example/song/871ee320-b22c-4d8f-9f0e-6c373a79cbdb", title: "", note: "" },
      { requestId, expectedVersion: 0, command: "create_link", url: "https://suno.com/explore", title: "", note: "" },
      { requestId, expectedVersion: 0, command: "remove_link", linkId, ownerId: linkId },
      { requestId, expectedVersion: 0, command: "reorder_links", linkIds: [linkId, linkId] }
    ]) expect(() => parseSunoWorkspaceCommand(value)).toThrow(SunoWorkspaceValidationError);
  });
});
