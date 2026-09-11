import type { LibraryViewMode, LibraryViewResourceType, LyricStatus, ResourceColor, ResourceType, SongStatus, TemplateType } from "@lyricscloud/domain";
import { bigint, boolean, doublePrecision, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const userProfiles = pgTable("user_profiles", {
  ownerId: uuid("owner_id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const authIdentities = pgTable("auth_identities", {
  issuer: text("issuer").notNull(),
  subject: text("subject").notNull(),
  userId: uuid("user_id").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow()
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  type: text("type").$type<ResourceType>().notNull(),
  title: text("title").notNull(),
  searchTitle: text("search_title"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  pinOrder: integer("pin_order"),
  color: text("color").$type<ResourceColor>(),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletionBatchId: uuid("deletion_batch_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const songs = pgTable("songs", {
  resourceId: uuid("resource_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  status: text("status").$type<SongStatus>().notNull().default("idea"),
  description: text("description").notNull().default(""),
  workNotes: text("work_notes").notNull().default("")
});

export const songCreateRequests = pgTable("song_create_requests", {
  ownerId: uuid("owner_id").notNull(),
  requestId: uuid("request_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.requestId] })]);

export const lyrics = pgTable("lyrics", {
  resourceId: uuid("resource_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  songId: uuid("song_id").notNull(),
  body: text("body").notNull().default(""),
  searchBody: text("search_body"),
  memo: text("memo").notNull().default(""),
  status: text("status").$type<LyricStatus>().notNull().default("draft")
});

export const lyricCreateRequests = pgTable("lyric_create_requests", {
  ownerId: uuid("owner_id").notNull(),
  requestId: uuid("request_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  operation: text("operation").$type<"create" | "duplicate">().notNull(),
  sourceId: uuid("source_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.requestId] })]);

export const rhymeNotes = pgTable("rhyme_notes", {
  resourceId: uuid("resource_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  body: text("body").notNull().default(""),
  searchBody: text("search_body")
});

export const rhymeNoteCreateRequests = pgTable("rhyme_note_create_requests", {
  ownerId: uuid("owner_id").notNull(),
  requestId: uuid("request_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  operation: text("operation").$type<"create" | "duplicate">().notNull(),
  requestSha256: text("request_sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.requestId] })]);

export const prompts = pgTable("prompts", {
  resourceId: uuid("resource_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  mode: text("mode").$type<"tags" | "sentence">().notNull().default("tags"),
  plainText: text("plain_text").notNull().default(""),
  sentenceText: text("sentence_text"),
  searchText: text("search_text")
});

export const promptTokenDictionary = pgTable("prompt_token_dictionary", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  displayValue: text("display_value").notNull(),
  normalizedValue: text("normalized_value").notNull(),
  usageCount: bigint("usage_count", { mode: "number" }).notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const promptTokens = pgTable("prompt_tokens", {
  ownerId: uuid("owner_id").notNull(),
  promptResourceId: uuid("prompt_resource_id").notNull(),
  ordinal: integer("ordinal").notNull(),
  dictionaryTokenId: uuid("dictionary_token_id").notNull(),
  displayValue: text("display_value").notNull(),
  normalizedValue: text("normalized_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.promptResourceId, table.ordinal] })]);

export const promptWriteRequests = pgTable("prompt_write_requests", {
  ownerId: uuid("owner_id").notNull(),
  requestId: uuid("request_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  operation: text("operation").$type<"create" | "duplicate" | "update">().notNull(),
  requestSha256: text("request_sha256").notNull(),
  resultRowVersion: bigint("result_row_version", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.requestId] })]);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  displayValue: text("display_value").notNull(),
  normalizedValue: text("normalized_value").notNull(),
  searchValue: text("search_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const resourceTags = pgTable("resource_tags", {
  ownerId: uuid("owner_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  tagId: uuid("tag_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.resourceId, table.tagId] })]);

export const songResourceLinks = pgTable("song_resource_links", {
  ownerId: uuid("owner_id").notNull(),
  songResourceId: uuid("song_resource_id").notNull(),
  linkedResourceId: uuid("linked_resource_id").notNull(),
  linkedResourceType: text("linked_resource_type").$type<"rhyme_note" | "prompt">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.songResourceId, table.linkedResourceId] })]);

export const recentSearches = pgTable("recent_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  query: text("query").notNull(),
  searchType: text("search_type").$type<"all" | "song" | "lyrics" | "rhyme_note" | "prompt">().notNull().default("all"),
  normalizedQuery: text("normalized_query"),
  searchedAt: timestamp("searched_at", { withTimezone: true }).notNull().defaultNow()
});

export const recentItems = pgTable("recent_items", {
  ownerId: uuid("owner_id").notNull(),
  resourceId: uuid("resource_id").notNull(),
  resourceType: text("resource_type").$type<"song" | "lyrics" | "rhyme_note" | "prompt">().notNull(),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }).notNull().defaultNow(),
  cursorOffset: integer("cursor_offset"),
  songformLabel: text("songform_label"),
  songformOccurrence: integer("songform_occurrence"),
  scrollTop: integer("scroll_top"),
  viewport: text("viewport").$type<"desktop" | "mobile">(),
  positionSavedAt: timestamp("position_saved_at", { withTimezone: true }),
  positionBasisUpdatedAt: timestamp("position_basis_updated_at", { withTimezone: true })
}, (table) => [primaryKey({ columns: [table.ownerId, table.resourceId] })]);

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id"),
  type: text("type").$type<TemplateType>().notNull(),
  title: text("title").notNull(),
  lyricBody: text("lyric_body"),
  promptTokens: text("prompt_tokens").array(),
  promptMode: text("prompt_mode").$type<"tags" | "sentence">().notNull().default("tags"),
  promptText: text("prompt_text"),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const templatePreferences = pgTable("template_preferences", {
  ownerId: uuid("owner_id").notNull(),
  templateId: uuid("template_id").notNull(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  useCount: bigint("use_count", { mode: "number" }).notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.templateId] })]);

export const templateRequests = pgTable("template_requests", {
  ownerId: uuid("owner_id").notNull(),
  requestId: uuid("request_id").notNull(),
  operation: text("operation").$type<"create" | "duplicate" | "apply">().notNull(),
  requestSha256: text("request_sha256").notNull(),
  resultId: uuid("result_id").notNull(),
  resultType: text("result_type").$type<"template" | "lyrics" | "prompt">().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.requestId] })]);

export const userSettings = pgTable("user_settings", {
  ownerId: uuid("owner_id").primaryKey(),
  theme: text("theme").$type<"system" | "light" | "dark">().notNull().default("system"),
  writingFont: text("writing_font").$type<"sans" | "serif" | "mono" | "noto_sans_kr">().notNull().default("sans"),
  fontSize: integer("font_size").notNull().default(18),
  lineHeight: doublePrecision("line_height").notNull().default(1.8),
  letterSpacing: doublePrecision("letter_spacing").notNull().default(0),
  focusModeDefault: boolean("focus_mode_default").notNull().default(false),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const libraryViewSettings = pgTable("library_view_settings", {
  ownerId: uuid("owner_id").notNull(),
  resourceType: text("resource_type").$type<LibraryViewResourceType>().notNull(),
  viewMode: text("view_mode").$type<LibraryViewMode>().notNull().default("list"),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.resourceType] })]);

export const libraryOrderStates = pgTable("library_order_states", {
  ownerId: uuid("owner_id").notNull(),
  resourceType: text("resource_type").$type<"song" | "rhyme_note" | "prompt">().notNull(),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.resourceType] })]);

export const libraryOrderItems = pgTable("library_order_items", {
  ownerId: uuid("owner_id").notNull(),
  resourceType: text("resource_type").$type<"song" | "rhyme_note" | "prompt">().notNull(),
  resourceId: uuid("resource_id").notNull(),
  pinGroup: boolean("pin_group").notNull(),
  sortRank: bigint("sort_rank", { mode: "bigint" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.resourceType, table.resourceId] })]);

export const libraryOrderMoveRequests = pgTable("library_order_move_requests", {
  ownerId: uuid("owner_id").notNull(),
  resourceType: text("resource_type").$type<"song" | "rhyme_note" | "prompt">().notNull(),
  requestId: uuid("request_id").notNull(),
  requestSha256: text("request_sha256").notNull(),
  itemId: uuid("item_id").notNull(),
  beforeId: uuid("before_id"),
  afterId: uuid("after_id"),
  expectedVersion: bigint("expected_version", { mode: "number" }).notNull(),
  resultVersion: bigint("result_version", { mode: "number" }).notNull(),
  changed: boolean("changed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.resourceType, table.requestId] })]);

export const songSunoWorkspaces = pgTable("song_suno_workspaces", {
  songResourceId: uuid("song_resource_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  modelLabel: text("model_label"),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const songSunoLinks = pgTable("song_suno_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  songResourceId: uuid("song_resource_id").notNull(),
  url: text("url").notNull(),
  title: text("title").notNull().default(""),
  note: text("note").notNull().default(""),
  position: smallint("position").notNull(),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const songSunoCommandRequests = pgTable("song_suno_command_requests", {
  ownerId: uuid("owner_id").notNull(),
  songResourceId: uuid("song_resource_id").notNull(),
  requestId: uuid("request_id").notNull(),
  requestSha256: text("request_sha256").notNull(),
  result: jsonb("result").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.ownerId, table.songResourceId, table.requestId] })]);

export const lyricDisplaySettings = pgTable("lyric_display_settings", {
  lyricId: uuid("lyric_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  resourceType: text("resource_type").$type<"lyrics">().notNull(),
  writingFont: text("writing_font").$type<"sans" | "serif" | "mono" | "noto_sans_kr">().notNull(),
  fontSize: integer("font_size").notNull(),
  lineHeight: doublePrecision("line_height").notNull(),
  letterSpacing: doublePrecision("letter_spacing").notNull(),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
