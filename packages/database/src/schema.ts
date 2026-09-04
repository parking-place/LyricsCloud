import type { ResourceColor, ResourceType, SongStatus } from "@lyricscloud/domain";
import { bigint, boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  isFavorite: boolean("is_favorite").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  pinOrder: integer("pin_order"),
  color: text("color").$type<ResourceColor>(),
  rowVersion: bigint("row_version", { mode: "number" }).notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const songs = pgTable("songs", {
  resourceId: uuid("resource_id").primaryKey(),
  ownerId: uuid("owner_id").notNull(),
  status: text("status").$type<SongStatus>().notNull().default("idea"),
  description: text("description").notNull().default(""),
  workNotes: text("work_notes").notNull().default("")
});
