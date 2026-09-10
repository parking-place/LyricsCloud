import { EXPORT_BATCH_SIZE, EXPORT_SCHEMA_VERSION, safeExportFilename, safeMarkdownHeading } from "@lyricscloud/domain";
import type { ExportReadableResource, ExportReadableTemplate, ExportRecord, ExportSnapshot } from "@lyricscloud/database";

interface ArchiveEntry { readonly name: string; readonly content: AsyncIterable<Uint8Array> }
interface CentralEntry { readonly name: Buffer; readonly crc: number; readonly size: number; readonly offset: number; readonly time: number; readonly date: number }

export async function* createExportArchive(snapshot: ExportSnapshot): AsyncGenerator<Uint8Array> {
  let success = false;
  try {
    yield* writeZip(exportEntries(snapshot), snapshot.exportedAt);
    success = true;
  } finally { await snapshot.close(success); }
}

async function* exportEntries(snapshot: ExportSnapshot): AsyncGenerator<ArchiveEntry> {
  yield textEntry("README.md", readme(snapshot.exportedAt));
  yield { name: "lyricscloud-export.json", content: jsonContent(snapshot.records(EXPORT_BATCH_SIZE), snapshot.exportedAt) };
  for await (const resource of snapshot.readableResources(EXPORT_BATCH_SIZE)) yield readableResourceEntry(resource);
  for await (const template of snapshot.readableTemplates(EXPORT_BATCH_SIZE)) yield readableTemplateEntry(template);
  yield textEntry("settings.md", settingsMarkdown(await snapshot.settings()));
}

async function* writeZip(entries: AsyncIterable<ArchiveEntry>, at: Date): AsyncGenerator<Uint8Array> {
  const central: CentralEntry[] = [];
  let offset = 0;
  const [time, date] = dosDateTime(at);
  for await (const entry of entries) {
    if (central.length >= 65_535) throw new Error("EXPORT_ENTRY_LIMIT");
    const name = Buffer.from(entry.name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0808, 6);
    local.writeUInt16LE(0, 8); local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12);
    local.writeUInt16LE(name.length, 26);
    const start = offset; yield local; yield name; offset += local.length + name.length;
    let crc = 0xffffffff; let size = 0;
    for await (const raw of entry.content) {
      const chunk = Buffer.from(raw);
      size += chunk.length; offset += chunk.length;
      if (size > 0xffffffff || offset > 0xffffffff) throw new Error("EXPORT_SIZE_LIMIT");
      crc = updateCrc32(crc, chunk); yield chunk;
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const descriptor = Buffer.alloc(16);
    descriptor.writeUInt32LE(0x08074b50, 0); descriptor.writeUInt32LE(crc, 4);
    descriptor.writeUInt32LE(size, 8); descriptor.writeUInt32LE(size, 12);
    yield descriptor; offset += descriptor.length;
    central.push({ name, crc, size, offset: start, time, date });
  }
  const centralStart = offset;
  for (const entry of central) {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0808, 8); header.writeUInt16LE(0, 10); header.writeUInt16LE(entry.time, 12); header.writeUInt16LE(entry.date, 14);
    header.writeUInt32LE(entry.crc, 16); header.writeUInt32LE(entry.size, 20); header.writeUInt32LE(entry.size, 24);
    header.writeUInt16LE(entry.name.length, 28); header.writeUInt32LE(entry.offset, 42);
    yield header; yield entry.name; offset += header.length + entry.name.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(offset - centralStart, 12); end.writeUInt32LE(centralStart, 16);
  yield end;
}

function readableResourceEntry(resource: ExportReadableResource): ArchiveEntry {
  const deleted = resource.deletedAt ? `\n삭제 시각: ${resource.deletedAt}` : "";
  if (resource.type === "song") return textEntry(`songs/${safeExportFilename(resource.title, resource.id, "md")}`,
    `# ${safeMarkdownHeading(resource.title)}\n\n- ID: ${resource.id}\n- 상태: ${resource.status ?? ""}${deleted}\n\n## 설명\n\n${resource.description}\n\n## 작업 메모\n\n${resource.workNotes}\n`);
  if (resource.type === "lyrics") return textEntry(`lyrics/${safeExportFilename(resource.title, resource.id, "txt")}`,
    `${resource.title}\nID: ${resource.id}\n곡 ID: ${resource.songId ?? ""}\n상태: ${resource.status ?? ""}${deleted}\n메모: ${resource.memo}\n\n${resource.body}`);
  if (resource.type === "rhyme_note") return textEntry(`rhymes/${safeExportFilename(resource.title, resource.id, "txt")}`,
    `${resource.title}\nID: ${resource.id}${deleted}\n\n${resource.body}`);
  return textEntry(`prompts/${safeExportFilename(resource.title, resource.id, "txt")}`,
    `${resource.title}\nID: ${resource.id}\n형식: ${resource.promptMode === "sentence" ? "문장형" : "태그형"}${deleted}\n\n${resource.plainText}`);
}

function readableTemplateEntry(template: ExportReadableTemplate): ArchiveEntry {
  const body = template.type === "lyrics" ? template.lyricBody ?? ""
    : template.promptMode === "sentence" ? template.promptText ?? "" : (template.promptTokens ?? []).join(", ");
  const deleted = template.deletedAt ? `\n삭제 시각: ${template.deletedAt}` : "";
  return textEntry(`templates/${safeExportFilename(template.title, template.id, "txt")}`, `${template.title}\nID: ${template.id}\n유형: ${template.type}${deleted}\n\n${body}`);
}

function settingsMarkdown(settings: Record<string, unknown>): string {
  return `# LyricsCloud 계정 설정\n\n내보내기 시점의 표시 설정과 가사별 재정의입니다.\n\n\`\`\`json\n${JSON.stringify(settings, null, 2)}\n\`\`\`\n`;
}

function readme(at: Date): string {
  return `# LyricsCloud 전체 내보내기\n\n- Schema: \`${EXPORT_SCHEMA_VERSION}\`\n- 생성 시각: ${at.toISOString()}\n- 인코딩: UTF-8\n\n\`lyricscloud-export.json\`은 기계 판독용 전체 snapshot입니다. 나머지 폴더는 사람이 읽기 쉬운 자료별 TXT/Markdown입니다. 휴지통 자료는 삭제 시각과 함께 포함되며 이미 완전 삭제된 자료와 인프라 백업은 포함되지 않습니다.\n`;
}

async function* jsonContent(records: AsyncIterable<ExportRecord>, at: Date): AsyncGenerator<Uint8Array> {
  yield encode(`{"schemaVersion":${JSON.stringify(EXPORT_SCHEMA_VERSION)},"exportedAt":${JSON.stringify(at.toISOString())},"records":[`);
  let first = true;
  for await (const record of records) {
    if (!first) yield encode(",");
    first = false;
    yield encode(JSON.stringify(record));
  }
  yield encode("]}");
}

function textEntry(name: string, value: string): ArchiveEntry { return { name, content: one(encode(value)) }; }
async function* one(value: Uint8Array): AsyncGenerator<Uint8Array> { yield value; }
function encode(value: string): Uint8Array { return Buffer.from(value, "utf8"); }

function dosDateTime(input: Date): [number, number] {
  const year = Math.max(1980, input.getUTCFullYear());
  return [input.getUTCSeconds() >> 1 | input.getUTCMinutes() << 5 | input.getUTCHours() << 11,
    input.getUTCDate() | (input.getUTCMonth() + 1) << 5 | (year - 1980) << 9];
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function updateCrc32(crc: number, chunk: Uint8Array): number {
  let next = crc;
  for (const byte of chunk) next = CRC_TABLE[(next ^ byte) & 0xff]! ^ (next >>> 8);
  return next >>> 0;
}
