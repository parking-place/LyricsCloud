/** Adapter-neutral editor boundary. CodeMirror and Yjs arrive in 0.3.x. */
export interface TextDocumentPort {
  readonly value: string;
  replace(from: number, to: number, value: string): void;
}

export * from "./autosave.js";
export * from "./codemirror.js";
export * from "./copy.js";
export * from "./songform.js";
