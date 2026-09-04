export function accountCachePrefix(userId: string): string {
  return `lc:${userId}:`;
}

export function clearAccountCache(userId: string): void {
  const prefix = accountCachePrefix(userId);
  clearMatchingKeys(window.localStorage, prefix);
  clearMatchingKeys(window.sessionStorage, prefix);
}

function clearMatchingKeys(storage: Storage, prefix: string): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(prefix)));
  for (const key of keys) storage.removeItem(key);
}
