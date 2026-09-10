import * as Y from "yjs";
import { findPromptDuplicates, normalizePromptToken, projectUniquePromptTokens, serializePromptContent, serializePromptTokens,
  validatePromptSentenceText, type PromptDuplicate, type PromptMode, type PromptTokenValue } from "@lyricscloud/domain";

const BODY_KEY = "body";
const PROMPT_TITLE_KEY = "prompt-title";
const PROMPT_MODE_KEY = "prompt-mode";
const PROMPT_TOKENS_KEY = "prompt-tokens";
const PROMPT_SENTENCE_KEY = "prompt-sentence";

export interface LyricProjection {
  readonly title: string;
  readonly body: string;
}

export type RhymeProjection = LyricProjection;

export interface PromptSequenceItem {
  readonly occurrenceId: string;
  readonly displayValue: string;
}

export interface PromptProjection {
  readonly title: string;
  readonly mode: PromptMode;
  readonly tokens: readonly PromptTokenValue[];
  readonly readTokens: readonly PromptTokenValue[];
  readonly tagText: string;
  readonly sentenceText: string;
  readonly plainText: string;
  readonly duplicates: readonly PromptDuplicate[];
}

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

export function createPromptDocument(title = "", tokens: readonly PromptSequenceItem[] = [], mode?: PromptMode, sentenceText = ""): Y.Doc {
  const document = new Y.Doc();
  const initialMode = mode ?? (title || tokens.length || sentenceText ? "tags" : undefined);
  document.transact(() => {
    if (title) document.getText(PROMPT_TITLE_KEY).insert(0, title.normalize("NFC").trim());
    if (initialMode) document.getMap<PromptMode>(PROMPT_MODE_KEY).set("value", initialMode);
    if (tokens.length) document.getArray<PromptSequenceItem>(PROMPT_TOKENS_KEY).insert(0, tokens.map(validateSequenceItem));
    const raw = validatePromptSentenceText(sentenceText);
    if (raw) document.getText(PROMPT_SENTENCE_KEY).insert(0, raw);
  });
  return document;
}

export function promptTitle(document: Y.Doc): Y.Text {
  return document.getText(PROMPT_TITLE_KEY);
}

export function promptTokenSequence(document: Y.Doc): Y.Array<PromptSequenceItem> {
  return document.getArray<PromptSequenceItem>(PROMPT_TOKENS_KEY);
}

export function promptMode(document: Y.Doc): PromptMode {
  return document.getMap<unknown>(PROMPT_MODE_KEY).get("value") === "sentence" ? "sentence" : "tags";
}

export function promptSentence(document: Y.Doc): Y.Text {
  return document.getText(PROMPT_SENTENCE_KEY);
}

export function setPromptMode(document: Y.Doc, mode: PromptMode, sentenceText?: string): void {
  document.transact(() => {
    if (sentenceText !== undefined) replacePromptSentence(document, sentenceText);
    document.getMap<PromptMode>(PROMPT_MODE_KEY).set("value", mode);
  });
}

export function replacePromptSentence(document: Y.Doc, value: string): void {
  const raw = validatePromptSentenceText(value);
  const sentence = promptSentence(document);
  sentence.delete(0, sentence.length);
  if (raw) sentence.insert(0, raw);
}

export function replacePromptTokens(document: Y.Doc, items: readonly PromptSequenceItem[]): void {
  const sequence = promptTokenSequence(document);
  const validated = items.map(validateSequenceItem);
  sequence.delete(0, sequence.length);
  if (validated.length) sequence.insert(0, validated);
}

export function insertPromptToken(document: Y.Doc, index: number, item: PromptSequenceItem): void {
  const sequence = promptTokenSequence(document);
  if (!Number.isInteger(index) || index < 0 || index > sequence.length) throw new RangeError("PROMPT_POSITION_OUT_OF_RANGE");
  const validated = validateSequenceItem(item);
  if (sequence.toArray().some((candidate) => candidate.occurrenceId === validated.occurrenceId)) return;
  sequence.insert(index, [validated]);
}

export function removePromptToken(document: Y.Doc, occurrenceId: string): void {
  const sequence = promptTokenSequence(document);
  for (let index = sequence.length - 1; index >= 0; index -= 1) {
    if (sequence.get(index)?.occurrenceId === occurrenceId) sequence.delete(index, 1);
  }
}

export function movePromptToken(document: Y.Doc, occurrenceId: string, targetIndex: number): void {
  const sequence = promptTokenSequence(document);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= sequence.length) throw new RangeError("PROMPT_POSITION_OUT_OF_RANGE");
  const items = sequence.toArray();
  const currentIndex = items.findIndex((item) => item.occurrenceId === occurrenceId);
  if (currentIndex < 0 || currentIndex === targetIndex) return;
  const item = items[currentIndex]!;
  sequence.delete(currentIndex, 1);
  sequence.insert(targetIndex, [item]);
}

export function encodePromptSnapshot(document: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(document);
}

export function applyPromptUpdate(document: Y.Doc, update: Uint8Array): void {
  Y.applyUpdate(document, update);
}

export function projectPrompt(document: Y.Doc): PromptProjection {
  const occurrenceIds = new Set<string>();
  const tokens = promptTokenSequence(document).toArray().filter((item) => {
    if (occurrenceIds.has(item.occurrenceId)) return false;
    occurrenceIds.add(item.occurrenceId);
    return true;
  }).map((item) => normalizePromptToken(item.displayValue));
  const readTokens = projectUniquePromptTokens(tokens);
  const mode = promptMode(document);
  const sentenceText = promptSentence(document).toString();
  const tagText = serializePromptTokens(readTokens);
  return {
    title: promptTitle(document).toString().normalize("NFC").trim(),
    mode,
    tokens,
    readTokens,
    tagText,
    sentenceText,
    plainText: serializePromptContent(mode, readTokens, sentenceText),
    duplicates: findPromptDuplicates(tokens)
  };
}

export function projectLyric(document: Y.Doc, relationalTitle: string): LyricProjection {
  return { title: relationalTitle, body: normalizeLineEndings(lyricBody(document).toString()) };
}

export function projectRhyme(document: Y.Doc, relationalTitle: string): RhymeProjection {
  return projectLyric(document, relationalTitle);
}

export function encodeTextRelativePosition(document: Y.Doc, index: number, association = 0): string {
  const text = lyricBody(document);
  if (!Number.isInteger(index) || index < 0 || index > text.length) throw new RangeError("CRDT_POSITION_OUT_OF_RANGE");
  const encoded = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, index, association));
  return bytesToBase64Url(encoded);
}

export function resolveTextRelativePosition(document: Y.Doc, value: string): number | null {
  try {
    const absolute = Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(base64UrlToBytes(value)), document);
    // Yjs can be bundled more than once by test/build tooling, which makes an
    // otherwise valid shared type fail a strict object identity comparison.
    // A resolved type belonging to this document is sufficient here because
    // lyric/rhyme documents expose only the canonical body shared type.
    return absolute?.type.doc === document ? absolute.index : null;
  } catch { return null; }
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function validateSequenceItem(item: PromptSequenceItem): PromptSequenceItem {
  if (!item || typeof item !== "object" || !/^[A-Za-z0-9_-]{1,128}$/.test(item.occurrenceId)) {
    throw new TypeError("PROMPT_OCCURRENCE_ID_INVALID");
  }
  return { occurrenceId: item.occurrenceId, displayValue: normalizePromptToken(item.displayValue).displayValue };
}

function bytesToBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
