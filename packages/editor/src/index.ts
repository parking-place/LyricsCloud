/** Adapter-neutral text boundary. A CRDT adapter may translate transactions without owning editor DOM. */
export interface TextDocumentPort {
  readonly value: string;
  replace(from: number, to: number, value: string): void;
}

export * from "./autosave.js";
export * from "./codemirror.js";
export * from "./copy.js";
export * from "./crdt.js";
export * from "./browser-sync.js";
export * from "./songform.js";
