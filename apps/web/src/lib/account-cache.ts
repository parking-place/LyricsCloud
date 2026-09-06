export function accountCachePrefix(userId: string): string {
  return `lc:${userId}:`;
}

interface RecoveryDraft { resourceId: string; body: string; title?: string; memo?: string }
const saveBeforeLogout = new Map<() => Promise<boolean>, () => RecoveryDraft>();

export function registerLogoutSave(save: () => Promise<boolean>, read: () => RecoveryDraft): () => void {
  saveBeforeLogout.set(save, read);
  return () => { saveBeforeLogout.delete(save); };
}

async function saveOpenEditors(): Promise<boolean> {
  if (!navigator.onLine) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.all([...saveBeforeLogout.keys()].map((save) => save())).then((results) => results.every(Boolean)),
      new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 8_000); })
    ]);
  } finally { clearTimeout(timer); }
}

export async function downloadRecoveryDrafts(userId: string): Promise<void> {
  const { readOwnerPendingDrafts } = await import("@lyricscloud/editor");
  const drafts = new Map<string, RecoveryDraft>((await readOwnerPendingDrafts(userId)).map((draft) => [draft.resourceId, draft]));
  for (const read of saveBeforeLogout.values()) { const draft = read(); drafts.set(draft.resourceId, draft); }
  const content = [...drafts.values()].map(({ body, title, memo }) => ({ title, body, memo }));
  const url = URL.createObjectURL(new Blob([JSON.stringify({ drafts: content }, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "lyricscloud-unsent-drafts.json";
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function coordinateAccountLogout(userId: string, pauseView: (paused: boolean) => void, signedOut: () => void) {
  const name = `${accountCachePrefix(userId)}logout`;
  const channel = new BroadcastChannel(name);
  let release: (() => void) | undefined;
  let holding: Promise<void> | undefined;
  let disposed = false;
  let paused = false;
  let running = false;
  let generation = 0;
  let mayRelease = false;
  let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  function hold() {
    if (disposed || holding) return;
    pauseView(true);
    holding = navigator.locks.request(name, { mode: "shared" }, async () => {
      if (disposed) return;
      await new Promise<void>((resolve) => {
        release = resolve;
        if (!paused) pauseView(false);
        else if (mayRelease) resolve();
      });
      release = undefined;
    }).then(() => undefined).finally(() => { holding = undefined; });
  }
  async function pause(force: boolean) {
    const attempt = ++generation;
    paused = true; pauseView(true);
    const saved = force || await saveOpenEditors().catch(() => false);
    if (attempt !== generation || disposed) return false;
    mayRelease = saved;
    if (saved) { release?.(); await holding; }
    return saved;
  }
  function resume() {
    clearTimeout(recoveryTimer);
    if (disposed) return;
    generation++; paused = false; mayRelease = false;
    if (release) pauseView(false);
    else if (holding) void holding.then(hold);
    else hold();
  }
  channel.onmessage = (event: MessageEvent<{ action?: string; force?: boolean }>) => {
    if (event.data.action === "pause") {
      clearTimeout(recoveryTimer);
      void pause(event.data.force === true);
      // The initiating tab can close without broadcasting its outcome. Reacquiring
      // our shared lock still prevents input while a live logout holds exclusivity.
      recoveryTimer = setTimeout(resume, 30_000);
    }
    if (event.data.action === "resume") resume();
    if (event.data.action === "complete") {
      clearTimeout(recoveryTimer);
      disposed = true; generation++; release?.(); signedOut();
    }
  };
  hold();
  return {
    async run(action: () => Promise<void>, force = false): Promise<boolean> {
      if (running) return false;
      running = true;
      let completed = false;
      try {
        channel.postMessage({ action: "pause", force });
        if (!await pause(force)) return false;
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 8_000);
        try {
          completed = await navigator.locks.request(name, { mode: "exclusive", signal: abort.signal }, async () => {
            clearTimeout(timer);
            const { hasOwnerPendingDrafts } = await import("@lyricscloud/editor");
            if (!force && await hasOwnerPendingDrafts(userId)) return false;
            await action();
            channel.postMessage({ action: "complete" });
            return true;
          });
        } catch (error) {
          if (!abort.signal.aborted) throw error;
        } finally { clearTimeout(timer); }
        return completed;
      } finally {
        running = false;
        if (!completed) { channel.postMessage({ action: "resume" }); resume(); }
      }
    },
    dispose() { disposed = true; clearTimeout(recoveryTimer); release?.(); channel.close(); }
  };
}

export async function clearOtherAccountCaches(userId: string): Promise<void> {
  const current = accountCachePrefix(userId);
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key?.startsWith("lc:") && !key.startsWith(current)) storage.removeItem(key);
  }
  const { clearOtherOwnerLocalDrafts } = await import("@lyricscloud/editor");
  await clearOtherOwnerLocalDrafts(userId);
}

export async function clearAccountCache(userId: string): Promise<void> {
  const prefix = accountCachePrefix(userId);
  clearMatchingKeys(window.localStorage, prefix);
  clearMatchingKeys(window.sessionStorage, prefix);
  const { clearOwnerLocalDrafts } = await import("@lyricscloud/editor");
  await clearOwnerLocalDrafts(userId);
}

function clearMatchingKeys(storage: Storage, prefix: string): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(prefix)));
  for (const key of keys) storage.removeItem(key);
}
