import {
  DEFAULT_USER_SETTINGS,
  DisplaySettingsConflictError,
  isResourceId,
  parseResetLyricDisplaySettingsInput,
  parseUpdateLyricDisplaySettingsInput,
  parseUpdateUserSettingsInput,
  resolveWritingDisplaySettings,
  type LyricDisplayOverride,
  type LyricDisplaySettingsRecord,
  type UserSettingsRecord
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface UserSettingsRow extends QueryResultRow {
  theme: "system" | "light" | "dark";
  writing_font: "sans" | "serif" | "mono" | "noto_sans_kr";
  font_size: number;
  line_height: number;
  letter_spacing: number;
  focus_mode_default: boolean;
  row_version: string;
  updated_at: Date;
}

interface LyricDisplayRow extends QueryResultRow {
  writing_font: "sans" | "serif" | "mono" | "noto_sans_kr";
  font_size: number;
  line_height: number;
  letter_spacing: number;
  row_version: string;
  updated_at: Date;
}

export class PostgresDisplaySettingsStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 6) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  getUserSettings(ownerId: string): Promise<UserSettingsRecord> {
    return this.#withUser(ownerId, (client) => selectUserSettings(client, ownerId));
  }

  updateUserSettings(ownerId: string, value: unknown): Promise<UserSettingsRecord> {
    const input = parseUpdateUserSettingsInput(value);
    return this.#withUser(ownerId, async (client) => {
      const current = await selectUserSettingsRow(client, ownerId, true);
      if (!current) {
        if (input.rowVersion !== 0) throw new DisplaySettingsConflictError();
        await client.query(`insert into user_settings
          (owner_id,theme,writing_font,font_size,line_height,letter_spacing,focus_mode_default)
          values($1,$2,$3,$4,$5,$6,$7)`, [ownerId, input.theme, input.font, input.fontSize, input.lineHeight, input.letterSpacing, input.focusModeDefault]);
      } else {
        if (Number(current.row_version) !== input.rowVersion) throw new DisplaySettingsConflictError();
        const result = await client.query(`update user_settings set
          theme=$2,writing_font=$3,font_size=$4,line_height=$5,letter_spacing=$6,focus_mode_default=$7,
          row_version=row_version+1,updated_at=clock_timestamp()
          where owner_id=$1 and row_version=$8`, [ownerId, input.theme, input.font, input.fontSize, input.lineHeight, input.letterSpacing, input.focusModeDefault, input.rowVersion]);
        if (result.rowCount !== 1) throw new DisplaySettingsConflictError();
      }
      return selectUserSettings(client, ownerId);
    });
  }

  getLyricDisplaySettings(ownerId: string, lyricId: string): Promise<LyricDisplaySettingsRecord | null> {
    if (!isResourceId(lyricId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      if (!await activeLyric(client, ownerId, lyricId)) return null;
      return lyricRecord(await selectUserSettings(client, ownerId), await selectLyricOverride(client, ownerId, lyricId));
    });
  }

  updateLyricDisplaySettings(ownerId: string, lyricId: string, value: unknown): Promise<LyricDisplaySettingsRecord | null> {
    if (!isResourceId(lyricId)) return Promise.resolve(null);
    const input = parseUpdateLyricDisplaySettingsInput(value);
    return this.#withUser(ownerId, async (client) => {
      if (!await activeLyric(client, ownerId, lyricId, true)) return null;
      const current = await selectLyricOverrideRow(client, ownerId, lyricId, true);
      if (!current) {
        if (input.rowVersion !== 0) throw new DisplaySettingsConflictError();
        await client.query(`insert into lyric_display_settings
          (lyric_id,owner_id,writing_font,font_size,line_height,letter_spacing)
          values($1,$2,$3,$4,$5,$6)`, [lyricId, ownerId, input.font, input.fontSize, input.lineHeight, input.letterSpacing]);
      } else {
        if (Number(current.row_version) !== input.rowVersion) throw new DisplaySettingsConflictError();
        const result = await client.query(`update lyric_display_settings set
          writing_font=$3,font_size=$4,line_height=$5,letter_spacing=$6,row_version=row_version+1,updated_at=clock_timestamp()
          where lyric_id=$1 and owner_id=$2 and row_version=$7`, [lyricId, ownerId, input.font, input.fontSize, input.lineHeight, input.letterSpacing, input.rowVersion]);
        if (result.rowCount !== 1) throw new DisplaySettingsConflictError();
      }
      return lyricRecord(await selectUserSettings(client, ownerId), (await selectLyricOverride(client, ownerId, lyricId))!);
    });
  }

  resetLyricDisplaySettings(ownerId: string, lyricId: string, value: unknown): Promise<LyricDisplaySettingsRecord | null> {
    if (!isResourceId(lyricId)) return Promise.resolve(null);
    const input = parseResetLyricDisplaySettingsInput(value);
    return this.#withUser(ownerId, async (client) => {
      if (!await activeLyric(client, ownerId, lyricId, true)) return null;
      const result = await client.query(
        "delete from lyric_display_settings where lyric_id=$1 and owner_id=$2 and row_version=$3",
        [lyricId, ownerId, input.rowVersion]
      );
      if (result.rowCount !== 1) throw new DisplaySettingsConflictError();
      return lyricRecord(await selectUserSettings(client, ownerId), null);
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!isResourceId(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

async function selectUserSettings(client: PoolClient, ownerId: string): Promise<UserSettingsRecord> {
  const row = await selectUserSettingsRow(client, ownerId);
  return row ? {
    theme: row.theme,
    font: row.writing_font,
    fontSize: row.font_size,
    lineHeight: row.line_height,
    letterSpacing: row.letter_spacing,
    focusModeDefault: row.focus_mode_default,
    rowVersion: Number(row.row_version),
    updatedAt: row.updated_at.toISOString()
  } : { ...DEFAULT_USER_SETTINGS };
}

async function selectUserSettingsRow(client: PoolClient, ownerId: string, lock = false): Promise<UserSettingsRow | undefined> {
  return (await client.query<UserSettingsRow>(`select theme,writing_font,font_size,line_height,letter_spacing,
    focus_mode_default,row_version::text,updated_at from user_settings where owner_id=$1${lock ? " for update" : ""}`, [ownerId])).rows[0];
}

async function activeLyric(client: PoolClient, ownerId: string, lyricId: string, lock = false): Promise<boolean> {
  const result = await client.query(`select 1 from resources r join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
    where r.id=$1 and r.owner_id=$2 and r.type='lyrics' and r.deleted_at is null${lock ? " for update of r" : ""}`, [lyricId, ownerId]);
  return result.rowCount === 1;
}

async function selectLyricOverride(client: PoolClient, ownerId: string, lyricId: string): Promise<LyricDisplayOverride | null> {
  const row = await selectLyricOverrideRow(client, ownerId, lyricId);
  return row ? {
    font: row.writing_font,
    fontSize: row.font_size,
    lineHeight: row.line_height,
    letterSpacing: row.letter_spacing,
    rowVersion: Number(row.row_version),
    updatedAt: row.updated_at.toISOString()
  } : null;
}

async function selectLyricOverrideRow(client: PoolClient, ownerId: string, lyricId: string, lock = false): Promise<LyricDisplayRow | undefined> {
  return (await client.query<LyricDisplayRow>(`select writing_font,font_size,line_height,letter_spacing,row_version::text,updated_at
    from lyric_display_settings where lyric_id=$1 and owner_id=$2${lock ? " for update" : ""}`, [lyricId, ownerId])).rows[0];
}

function lyricRecord(account: UserSettingsRecord, override: LyricDisplayOverride | null): LyricDisplaySettingsRecord {
  return { account, override, effective: resolveWritingDisplaySettings(account, override) };
}
