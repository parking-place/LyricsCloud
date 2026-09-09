import { isResourceId } from "./lyric-contract.js";
import type { LyricStatus } from "./lyric-contract.js";
import type { ValidationIssue } from "./result.js";

export const EDITOR_RESOURCE_TABS = ["songs", "lyrics", "rhymes", "prompts"] as const;
export type EditorResourceTab = (typeof EDITOR_RESOURCE_TABS)[number];

export const EDITOR_RESOURCE_SCOPES = ["linked", "all"] as const;
export type EditorResourceScope = (typeof EDITOR_RESOURCE_SCOPES)[number];

export const EDITOR_RESOURCE_LIMITS = { default: 50, maximum: 50 } as const;

export interface EditorResourcePanelInput {
  readonly tab: EditorResourceTab;
  readonly scope: EditorResourceScope;
  readonly search?: string;
  readonly limit: number;
}

export type EditorResourcePanelItem = {
  readonly id: string;
  readonly title: string;
  readonly preview: string;
  readonly updatedAt: string;
  readonly availability: "available" | "current" | "deleted";
} & (
  | { readonly kind: "song"; readonly lyricCount: number }
  | { readonly kind: "lyrics"; readonly status: LyricStatus }
  | { readonly kind: "rhyme_note" | "prompt"; readonly isLinked: boolean }
);

export interface EditorResourcePanelResult {
  readonly tab: EditorResourceTab;
  readonly scope: EditorResourceScope;
  readonly search: string;
  readonly items: readonly EditorResourcePanelItem[];
  readonly totalCount: number;
}

export class EditorResourceValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "EditorResourceValidationError";
  }
}

export function parseEditorResourcePanelInput(params: URLSearchParams): EditorResourcePanelInput {
  const issues: ValidationIssue[] = [];
  const rawTab = params.get("tab") ?? "lyrics";
  const tab = EDITOR_RESOURCE_TABS.includes(rawTab as EditorResourceTab)
    ? rawTab as EditorResourceTab
    : (issues.push({ field: "tab", code: "unsupported_value" }), "lyrics");
  const rawScope = params.get("scope") ?? "linked";
  const scope = EDITOR_RESOURCE_SCOPES.includes(rawScope as EditorResourceScope)
    ? rawScope as EditorResourceScope
    : (issues.push({ field: "scope", code: "unsupported_value" }), "linked");
  const search = params.get("search")?.normalize("NFC").trim() ?? "";
  if ([...search].length > 200) issues.push({ field: "search", code: "too_long" });
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? EDITOR_RESOURCE_LIMITS.default : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > EDITOR_RESOURCE_LIMITS.maximum) {
    issues.push({ field: "limit", code: "integer_between_1_and_50" });
  }
  if (issues.length) throw new EditorResourceValidationError(issues);
  return { tab, scope: tab === "rhymes" || tab === "prompts" ? scope : "all", ...(search ? { search } : {}), limit };
}

export function isEditorResourceId(value: unknown): value is string {
  return isResourceId(value);
}
