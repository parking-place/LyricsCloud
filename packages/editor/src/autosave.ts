export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export interface TextDraft {
  readonly title: string;
  readonly body: string;
}

export interface SaveState {
  readonly status: SaveStatus;
  readonly sequence: number;
  readonly lastSavedAt: Date | null;
  readonly error: unknown | null;
}

export interface SaveResult {
  readonly rowVersion: number;
}

export interface SerializedSaveOptions<Draft extends TextDraft = TextDraft> {
  readonly initialDraft: Draft;
  readonly initialRowVersion: number;
  readonly save: (draft: Draft, rowVersion: number) => Promise<SaveResult>;
  readonly onStateChange?: (state: SaveState) => void;
  readonly delayMs?: number;
  readonly maxWaitMs?: number;
}

/**
 * Keeps one write in flight per document and only marks the latest sequence as
 * saved. Editor DOM, selections and decorations never cross this boundary.
 */
export class SerializedSaveController<Draft extends TextDraft = TextDraft> {
  readonly #save: SerializedSaveOptions<Draft>["save"];
  readonly #onStateChange: NonNullable<SerializedSaveOptions["onStateChange"]>;
  readonly #delayMs: number;
  readonly #maxWaitMs: number;
  #draft: Draft;
  #persisted: Draft;
  #rowVersion: number;
  #sequence = 0;
  #state: SaveState = { status: "saved", sequence: 0, lastSavedAt: null, error: null };
  #queue: Promise<void> = Promise.resolve();
  #delayTimer: ReturnType<typeof setTimeout> | null = null;
  #maxTimer: ReturnType<typeof setTimeout> | null = null;
  #destroyed = false;

  constructor(options: SerializedSaveOptions<Draft>) {
    this.#draft = copy(options.initialDraft);
    this.#persisted = copy(options.initialDraft);
    this.#rowVersion = options.initialRowVersion;
    this.#save = options.save;
    this.#onStateChange = options.onStateChange ?? (() => undefined);
    this.#delayMs = options.delayMs ?? 900;
    this.#maxWaitMs = options.maxWaitMs ?? 5_000;
  }

  get state(): SaveState { return this.#state; }
  get draft(): Draft { return copy(this.#draft); }
  get rowVersion(): number { return this.#rowVersion; }

  change(next: Draft, options: { readonly composing?: boolean } = {}): void {
    if (this.#destroyed || same(next, this.#draft)) return;
    this.#draft = copy(next);
    this.#sequence += 1;
    this.#publish("dirty", null);
    if (!options.composing) this.#schedule();
  }

  compositionEnd(): void {
    if (!this.#destroyed && !same(this.#draft, this.#persisted)) this.#schedule();
  }

  async flush(): Promise<void> {
    if (this.#destroyed || same(this.#draft, this.#persisted)) return this.#queue;
    this.#clearTimers();
    const sequence = this.#sequence;
    const snapshot = copy(this.#draft);
    this.#queue = this.#queue.catch(() => undefined).then(async () => {
      if (this.#destroyed || same(snapshot, this.#persisted)) return;
      this.#publish("saving", null, sequence);
      try {
        const result = await this.#save(snapshot, this.#rowVersion);
        this.#rowVersion = result.rowVersion;
        this.#persisted = snapshot;
        if (sequence === this.#sequence && same(snapshot, this.#draft)) {
          this.#state = { status: "saved", sequence, lastSavedAt: new Date(), error: null };
          this.#onStateChange(this.#state);
        } else {
          this.#publish("dirty", null);
        }
      } catch (error) {
        this.#publish(sequence === this.#sequence ? "error" : "dirty", error);
      }
    });
    return this.#queue;
  }

  retry(): Promise<void> { return this.flush(); }

  async dispose(): Promise<void> {
    this.#clearTimers();
    await this.flush();
    this.#destroyed = true;
    this.#clearTimers();
  }

  destroy(): void {
    this.#destroyed = true;
    this.#clearTimers();
  }

  #schedule(): void {
    if (this.#delayTimer) clearTimeout(this.#delayTimer);
    this.#delayTimer = setTimeout(() => { void this.flush(); }, this.#delayMs);
    if (!this.#maxTimer) this.#maxTimer = setTimeout(() => { void this.flush(); }, this.#maxWaitMs);
  }

  #clearTimers(): void {
    if (this.#delayTimer) clearTimeout(this.#delayTimer);
    if (this.#maxTimer) clearTimeout(this.#maxTimer);
    this.#delayTimer = null;
    this.#maxTimer = null;
  }

  #publish(status: SaveStatus, error: unknown | null, sequence = this.#sequence): void {
    this.#state = { ...this.#state, status, sequence, error };
    this.#onStateChange(this.#state);
  }
}

function copy<Draft extends TextDraft>(draft: Draft): Draft { return { ...draft }; }
function same<Draft extends TextDraft>(left: Draft, right: Draft): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => left[key as keyof Draft] === right[key as keyof Draft]);
}
