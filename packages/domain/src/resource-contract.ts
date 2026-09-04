export const RESOURCE_TYPES = ["song", "lyrics", "rhyme_note", "prompt", "template"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_COLORS = ["red", "yellow", "green", "blue", "gray"] as const;
export type ResourceColor = (typeof RESOURCE_COLORS)[number];

export const SONG_STATUSES = [
  "idea",
  "writing_lyrics",
  "revising",
  "suno_generating",
  "mixing",
  "completed",
  "on_hold"
] as const;
export type SongStatus = (typeof SONG_STATUSES)[number];

export const SONG_STATUS_LABELS: Readonly<Record<SongStatus, string>> = {
  idea: "아이디어",
  writing_lyrics: "가사 작성 중",
  revising: "수정 중",
  suno_generating: "Suno 생성 중",
  mixing: "믹싱 중",
  completed: "완성",
  on_hold: "보류"
};

export const RESOURCE_LIMITS = {
  title: 200,
  songDescription: 2_000,
  songWorkNotes: 10_000
} as const;

export function normalizeResourceTitle(value: string): string {
  return value.trim();
}
