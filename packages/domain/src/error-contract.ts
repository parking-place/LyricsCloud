export interface PublicErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly requestId?: string;
  };
}

const PUBLIC_ERROR_CODE = /^[A-Z][A-Z0-9_]{0,79}$/;
const PUBLIC_REQUEST_ID = /^req_[0-9a-f]{32}$/;

export function parsePublicErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const error = (value as { readonly error?: unknown }).error;
  const code = typeof error === "string"
    ? error
    : error && typeof error === "object"
      ? (error as { readonly code?: unknown }).code
      : undefined;
  return typeof code === "string" && PUBLIC_ERROR_CODE.test(code) ? code : undefined;
}

export function parsePublicRequestId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const error = (value as { readonly error?: unknown }).error;
  if (!error || typeof error !== "object") return undefined;
  const requestId = (error as { readonly requestId?: unknown }).requestId;
  return typeof requestId === "string" && PUBLIC_REQUEST_ID.test(requestId) ? requestId : undefined;
}
