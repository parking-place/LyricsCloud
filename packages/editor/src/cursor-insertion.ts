import * as Y from "yjs";
import type { CrdtTextSelectionReference } from "@lyricscloud/domain";
import { encodeTextRelativePosition, lyricBody } from "./crdt.js";

export interface PortableTextSource {
  readonly resourceId: string;
  readonly documentKey: string;
  readonly snapshot: string;
  readonly body: string;
}

export function capturePortableTextSelection(source: PortableTextSource, anchor: number, head: number): CrdtTextSelectionReference | null {
  if (!Number.isInteger(anchor) || !Number.isInteger(head) || anchor < 0 || head < 0) return null;
  const document = new Y.Doc();
  try {
    Y.applyUpdate(document, decodeBase64Url(source.snapshot));
    const body = lyricBody(document).toString();
    if (body !== source.body || anchor > body.length || head > body.length) return null;
    return {
      resourceId: source.resourceId,
      documentKey: source.documentKey,
      anchorRelativePosition: encodeTextRelativePosition(document, anchor),
      headRelativePosition: encodeTextRelativePosition(document, head)
    };
  } catch { return null; }
  finally { document.destroy(); }
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
