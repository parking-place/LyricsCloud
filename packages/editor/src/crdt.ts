import * as Y from "yjs";

const BODY_KEY = "body";

export interface LyricProjection {
  readonly title: string;
  readonly body: string;
}

export type RhymeProjection = LyricProjection;

export function createLyricDocument(initialBody = ""): Y.Doc {
  const document = new Y.Doc();
  if (initialBody) document.getText(BODY_KEY).insert(0, normalizeLineEndings(initialBody));
  return document;
}

export const createRhymeDocument = createLyricDocument;

export function lyricBody(document: Y.Doc): Y.Text {
  return document.getText(BODY_KEY);
}

export const rhymeBody = lyricBody;

export function encodeLyricSnapshot(document: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(document);
}

export const encodeRhymeSnapshot = encodeLyricSnapshot;

export function applyLyricUpdate(document: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(document, update);
}

export const applyRhymeUpdate = applyLyricUpdate;

export function projectLyric(document: Y.Doc, relationalTitle: string): LyricProjection {
  return { title: relationalTitle, body: normalizeLineEndings(lyricBody(document).toString()) };
}

export function projectRhyme(document: Y.Doc, relationalTitle: string): RhymeProjection {
  return projectLyric(document, relationalTitle);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}
