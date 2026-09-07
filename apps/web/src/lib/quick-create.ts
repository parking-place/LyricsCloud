import {
  clearQuickCreationDraft,
  writeQuickCreationDraft,
  type QuickCreationDraft
} from "@lyricscloud/editor";
import { PROMPT_LIMITS, RHYME_LIMITS } from "@lyricscloud/domain";

export function buildQuickCreationDraft(kind: QuickCreationDraft["kind"], value: string, requestId = crypto.randomUUID()): QuickCreationDraft {
  const body = value.replace(/\r\n?/g, "\n").trim();
  if (!body) throw new Error("QUICK_IDEA_EMPTY");
  const title = [...(body.split("\n")[0] ?? "새 아이디어")].slice(0, Math.min(RHYME_LIMITS.title, PROMPT_LIMITS.title)).join("");
  if (kind === "rhyme_note" && [...body].length > RHYME_LIMITS.body) throw new Error("QUICK_IDEA_TOO_LONG");
  if (kind === "prompt") promptTokens(body);
  return { requestId, kind, title, body, updatedAt: new Date().toISOString() };
}

export function quickCreationRequest(draft: QuickCreationDraft): { readonly path: string; readonly body: Record<string, unknown> } {
  return draft.kind === "rhyme_note" ? {
    path: "/api/rhymes",
    body: { requestId: draft.requestId, title: draft.title, body: draft.body, isFavorite: false, isPinned: false, pinOrder: null, color: null }
  } : {
    path: "/api/prompts",
    body: { requestId: draft.requestId, title: draft.title, tokens: promptTokens(draft.body), isFavorite: false, isPinned: false, pinOrder: null, color: null }
  };
}

export async function persistAndCreateQuickIdea(ownerId: string, draft: QuickCreationDraft): Promise<string | null> {
  await writeQuickCreationDraft(ownerId, draft);
  if (!navigator.onLine) return null;
  const input = quickCreationRequest(draft);
  const response = await fetch(input.path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input.body) });
  const result = await response.json().catch(() => ({})) as { rhyme?: { id?: string }; prompt?: { id?: string } };
  const id = draft.kind === "rhyme_note" ? result.rhyme?.id : result.prompt?.id;
  if (!response.ok || !id) throw new Error("QUICK_CREATE_FAILED");
  await clearQuickCreationDraft(ownerId);
  return draft.kind === "rhyme_note" ? `/rhymes/${id}` : `/prompts/${id}`;
}

function promptTokens(value: string): string[] {
  const seen = new Set<string>();
  const tokens = value.split(/[,\n]/u).map((token) => token.trim()).filter((token) => {
    if (!token) return false;
    const normalized = token.normalize("NFKC").replace(/\s+/gu, " ").toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized); return true;
  });
  if (!tokens.length || tokens.length > PROMPT_LIMITS.tokensPerPrompt || tokens.some((token) => [...token].length > PROMPT_LIMITS.token)) {
    throw new Error("QUICK_IDEA_TOO_LONG");
  }
  return tokens;
}
