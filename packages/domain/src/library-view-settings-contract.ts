import type { ValidationIssue } from "./result.js";

export const LIBRARY_VIEW_RESOURCE_TYPES = ["songs", "rhymes", "prompts"] as const;
export type LibraryViewResourceType = (typeof LIBRARY_VIEW_RESOURCE_TYPES)[number];

export const LIBRARY_VIEW_MODES = ["list", "grid-small", "grid-medium", "grid-large"] as const;
export type LibraryViewMode = (typeof LIBRARY_VIEW_MODES)[number];
export const DEFAULT_LIBRARY_VIEW_MODE: LibraryViewMode = "list";

export interface LibraryViewSettingRecord {
  readonly resourceType: LibraryViewResourceType;
  readonly viewMode: LibraryViewMode;
  readonly rowVersion: number;
  readonly updatedAt: string | null;
}

export interface UpdateLibraryViewSettingInput {
  readonly viewMode: LibraryViewMode;
  readonly rowVersion: number;
}

export class LibraryViewSettingsValidationError extends Error {
  constructor(readonly issues: readonly ValidationIssue[]) {
    super("VALIDATION_FAILED");
    this.name = "LibraryViewSettingsValidationError";
  }
}

export class LibraryViewSettingsConflictError extends Error {
  constructor() {
    super("VERSION_CONFLICT");
    this.name = "LibraryViewSettingsConflictError";
  }
}

export function parseLibraryViewResourceType(value: unknown): LibraryViewResourceType {
  if (!LIBRARY_VIEW_RESOURCE_TYPES.includes(value as LibraryViewResourceType)) fail("resourceType", "unsupported_value");
  return value as LibraryViewResourceType;
}

export function parseUpdateLibraryViewSettingInput(value: unknown): UpdateLibraryViewSettingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("body", "object_required");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "viewMode" && key !== "rowVersion")) fail("body", "unsupported_field");
  if (!LIBRARY_VIEW_MODES.includes(input.viewMode as LibraryViewMode)) fail("viewMode", "unsupported_value");
  if (!Number.isSafeInteger(input.rowVersion) || Number(input.rowVersion) < 0) fail("rowVersion", "non_negative_integer_required");
  return { viewMode: input.viewMode as LibraryViewMode, rowVersion: Number(input.rowVersion) };
}

export function libraryViewSettingDefault(resourceType: LibraryViewResourceType): LibraryViewSettingRecord {
  return { resourceType, viewMode: DEFAULT_LIBRARY_VIEW_MODE, rowVersion: 0, updatedAt: null };
}

export function withLibraryViewMode<T extends object>(state: T, viewMode: LibraryViewMode): T & { readonly viewMode: LibraryViewMode } {
  return { ...state, viewMode };
}

function fail(field: string, code: string): never {
  throw new LibraryViewSettingsValidationError([{ field, code }]);
}
