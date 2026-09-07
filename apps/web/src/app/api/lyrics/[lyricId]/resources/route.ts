import { AuthError } from "@lyricscloud/auth";
import {
  EditorResourceValidationError,
  LYRIC_STATUS_LABELS,
  isEditorResourceId,
  parseEditorResourcePanelInput,
  type EditorResourcePanelItem,
  type EditorResourcePanelResult
} from "@lyricscloud/domain";
import { getAuthContext, RequestAuthError, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ lyricId: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { lyricId } = await params;
    if (!isEditorResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const input = parseEditorResourcePanelInput(new URL(request.url).searchParams);
    const context = getAuthContext();
    const lyric = await context.lyrics.getLyric(auth.userId, lyricId);
    if (!lyric) return errorResponse("NOT_FOUND", 404);

    let items: readonly EditorResourcePanelItem[];
    let totalCount: number;
    if (input.tab === "songs") {
      const result = await context.songs.listSongs(auth.userId, {
        ...(input.search ? { search: input.search } : {}), sort: "updated_desc", limit: input.limit
      });
      items = result.items.filter(({ id }) => id !== lyric.songId).map((song) => ({
        id: song.id, kind: "song", title: song.title,
        preview: song.description.trim() || `가사 ${song.lyricCount}개`, updatedAt: song.updatedAt,
        availability: "available", lyricCount: song.lyricCount
      }));
      totalCount = Math.max(0, result.totalCount - (result.items.some(({ id }) => id === lyric.songId) ? 1 : 0));
    } else if (input.tab === "lyrics") {
      const lyrics = await context.lyrics.listSongLyrics(auth.userId, lyric.songId);
      if (!lyrics) return errorResponse("NOT_FOUND", 404);
      const needle = input.search?.toLocaleLowerCase("ko-KR");
      const filtered = needle ? lyrics.filter((item) =>
        item.title.toLocaleLowerCase("ko-KR").includes(needle) || item.body.toLocaleLowerCase("ko-KR").includes(needle)
      ) : lyrics;
      items = filtered.slice(0, input.limit).map((item) => ({
        id: item.id, kind: "lyrics", title: item.title,
        preview: preview(item.body) || `${LYRIC_STATUS_LABELS[item.status]} 가사`, updatedAt: item.updatedAt,
        availability: item.id === lyricId ? "current" : "available", status: item.status
      }));
      totalCount = filtered.length;
    } else {
      const kind = input.tab === "prompts" ? "prompt" : "rhyme_note";
      const result = await context.songs.listSongLinks(auth.userId, lyric.songId, {
        type: kind, state: input.scope === "linked" ? "linked" : "all",
        ...(input.search ? { search: input.search } : {}), limit: input.limit
      });
      if (!result) return errorResponse("NOT_FOUND", 404);
      items = result.items.map((item) => ({
        id: item.id, kind, title: item.title, preview: preview(item.preview), updatedAt: item.updatedAt,
        availability: "available", isLinked: item.isLinked
      }));
      totalCount = result.totalCount;
    }

    const result: EditorResourcePanelResult = {
      tab: input.tab, scope: input.scope, search: input.search ?? "", items, totalCount
    };
    return Response.json(result, { headers: { ...privateResponseHeaders, ...(auth.renewalCookie ? { "Set-Cookie": auth.renewalCookie } : {}) } });
  } catch (error) {
    if (error instanceof RequestAuthError || error instanceof AuthError) return errorResponse("AUTH_REQUIRED", 401);
    if (error instanceof EditorResourceValidationError) return errorResponse("VALIDATION_FAILED", 400, undefined, error.issues);
    return errorResponse("DEPENDENCY_UNAVAILABLE", 503);
  }
}

function preview(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized;
}
