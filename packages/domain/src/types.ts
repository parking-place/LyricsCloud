declare const brand: unique symbol;
type Brand<Value, Name extends string> = Value & { readonly [brand]: Name };

export type UserId = Brand<string, "UserId">;
export type AccountId = Brand<string, "AccountId">;
export type ResourceId = Brand<string, "ResourceId">;

export interface AuthenticatedUser {
  readonly id: UserId;
  readonly accountId: AccountId;
  readonly displayName: string;
}
