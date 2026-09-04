import type { UserId } from "./types.js";

export interface OwnerContext {
  readonly userId: UserId;
}

export type OwnedCreateValues<Values extends object> = Omit<Values, "ownerId">;

export function bindOwnerContext<Values extends object>(
  context: OwnerContext,
  clientValues: OwnedCreateValues<Values>
): OwnedCreateValues<Values> & { readonly ownerId: UserId } {
  if (!context?.userId) throw new Error("AUTH_CONTEXT_REQUIRED");
  const { ownerId: _untrustedOwnerId, ...serverValues } = clientValues as Values & { ownerId?: unknown };
  return { ...serverValues, ownerId: context.userId } as OwnedCreateValues<Values> & { readonly ownerId: UserId };
}
