/** Adapter-neutral editor boundary. CodeMirror and Yjs arrive in 0.3.x. */
export interface TextDocumentPort {
  readonly value: string;
  replace(from: number, to: number, value: string): void;
}
