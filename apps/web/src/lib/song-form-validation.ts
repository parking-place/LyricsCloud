import { RESOURCE_LIMITS, normalizeResourceTitle } from "@lyricscloud/domain";

export interface SongFormValues {
  readonly title: string;
  readonly description: string;
  readonly workNotes: string;
  readonly status: "idea" | "writing_lyrics" | "revising" | "suno_generating" | "mixing" | "completed" | "on_hold";
  readonly color: "red" | "yellow" | "green" | "blue" | "gray" | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
}

export type SongFormErrors = Partial<Record<"title" | "description" | "workNotes", string>>;

export function validateSongForm(values: SongFormValues): SongFormErrors {
  const errors: SongFormErrors = {};
  const title = normalizeResourceTitle(values.title);
  if (!title) errors.title = "곡 제목을 입력해 주세요.";
  else if (title.length > RESOURCE_LIMITS.title) errors.title = `제목은 ${RESOURCE_LIMITS.title}자 이하여야 합니다.`;
  if (values.description.length > RESOURCE_LIMITS.songDescription) {
    errors.description = `설명은 ${RESOURCE_LIMITS.songDescription.toLocaleString("ko-KR")}자 이하여야 합니다.`;
  }
  if (values.workNotes.length > RESOURCE_LIMITS.songWorkNotes) {
    errors.workNotes = `작업 메모는 ${RESOURCE_LIMITS.songWorkNotes.toLocaleString("ko-KR")}자 이하여야 합니다.`;
  }
  return errors;
}
