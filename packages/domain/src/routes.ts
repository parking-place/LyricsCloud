export interface ProductRoute {
  readonly screen: string;
  readonly path: string;
  readonly access: "public" | "authenticated";
  readonly availability: "available" | "planned";
}

export const productRoutes = [
  { screen: "01-auth", path: "/login", access: "public", availability: "planned" },
  { screen: "02-songs", path: "/songs", access: "authenticated", availability: "planned" },
  { screen: "03-song-form", path: "/songs/new", access: "authenticated", availability: "planned" },
  { screen: "04-song-dashboard", path: "/songs/:songId", access: "authenticated", availability: "planned" },
  { screen: "05-lyrics-editor", path: "/songs/:songId/lyrics/:lyricsId", access: "authenticated", availability: "planned" },
  { screen: "06-rhyme-notes", path: "/rhymes", access: "authenticated", availability: "planned" },
  { screen: "07-rhyme-editor", path: "/rhymes/:rhymeId", access: "authenticated", availability: "planned" },
  { screen: "08-prompts", path: "/prompts", access: "authenticated", availability: "planned" },
  { screen: "09-prompt-editor", path: "/prompts/:promptId", access: "authenticated", availability: "planned" },
  { screen: "10-search", path: "/search", access: "authenticated", availability: "planned" },
  { screen: "11-recent", path: "/recent", access: "authenticated", availability: "planned" },
  { screen: "12-favorites", path: "/favorites", access: "authenticated", availability: "planned" },
  { screen: "13-trash", path: "/trash", access: "authenticated", availability: "planned" },
  { screen: "14-templates", path: "/templates", access: "authenticated", availability: "planned" },
  { screen: "15-settings", path: "/settings", access: "authenticated", availability: "planned" }
] as const satisfies readonly ProductRoute[];
