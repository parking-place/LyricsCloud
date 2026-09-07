export interface BufferedPositionSaveOptions<Value extends object> {
  readonly save: (value: Value) => Promise<void>;
  readonly delayMs?: number;
  readonly maxWaitMs?: number;
}

/**
 * Coalesces high-frequency cursor/viewport updates into one serialized,
 * latest-value write. Position persistence never owns or blocks document save.
 */
export class BufferedPositionSaver<Value extends object> {
  readonly #save: BufferedPositionSaveOptions<Value>["save"];
  readonly #delayMs: number;
  readonly #maxWaitMs: number;
  #pending: Value | null = null;
  #persisted: Value | null = null;
  #queue: Promise<void> = Promise.resolve();
  #delayTimer: ReturnType<typeof setTimeout> | null = null;
  #maxTimer: ReturnType<typeof setTimeout> | null = null;
  #destroyed = false;

  constructor(options: BufferedPositionSaveOptions<Value>) {
    this.#save = options.save;
    this.#delayMs = options.delayMs ?? 2_000;
    this.#maxWaitMs = options.maxWaitMs ?? 15_000;
  }

  change(value: Value): void {
    if (this.#destroyed || same(value, this.#pending)) return;
    this.#pending = copy(value);
    if (same(this.#pending, this.#persisted)) {
      this.#clearTimers();
      return;
    }
    this.#schedule();
  }

  async flush(): Promise<void> {
    if (this.#destroyed || !this.#pending || same(this.#pending, this.#persisted)) return this.#queue;
    this.#clearTimers();
    const snapshot = copy(this.#pending);
    this.#queue = this.#queue.catch(() => undefined).then(async () => {
      if (this.#destroyed || same(snapshot, this.#persisted)) return;
      await this.#save(snapshot);
      this.#persisted = snapshot;
      if (this.#pending && !same(this.#pending, this.#persisted)) this.#schedule();
      else this.#clearTimers();
    });
    return this.#queue;
  }

  async dispose(): Promise<void> {
    this.#clearTimers();
    await this.flush().catch(() => undefined);
    this.#destroyed = true;
    this.#clearTimers();
  }

  destroy(): void {
    this.#destroyed = true;
    this.#clearTimers();
  }

  #schedule(): void {
    if (this.#delayTimer) clearTimeout(this.#delayTimer);
    this.#delayTimer = setTimeout(() => { void this.flush().catch(() => undefined); }, this.#delayMs);
    if (!this.#maxTimer) this.#maxTimer = setTimeout(() => { void this.flush().catch(() => undefined); }, this.#maxWaitMs);
  }

  #clearTimers(): void {
    if (this.#delayTimer) clearTimeout(this.#delayTimer);
    if (this.#maxTimer) clearTimeout(this.#maxTimer);
    this.#delayTimer = null;
    this.#maxTimer = null;
  }
}

function copy<Value extends object>(value: Value): Value { return { ...value }; }
function same<Value extends object>(left: Value | null, right: Value | null): boolean {
  if (left === null || right === null) return left === right;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => left[key as keyof Value] === right[key as keyof Value]);
}
