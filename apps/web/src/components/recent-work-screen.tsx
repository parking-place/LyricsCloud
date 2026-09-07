import {
  LYRIC_STATUS_LABELS,
  SONG_STATUS_LABELS,
  type RecentWorkItem,
  type RecentWorkTypeFilter
} from "@lyricscloud/domain";
import { StatePanel } from "./state-panel.js";

const FILTERS: ReadonlyArray<{ type: RecentWorkTypeFilter; label: string }> = [
  { type: "all", label: "전체" },
  { type: "song", label: "곡" },
  { type: "lyrics", label: "가사" },
  { type: "rhyme_note", label: "라임 노트" },
  { type: "prompt", label: "프롬프트" }
];
const TYPE_LABELS = { song: "곡", lyrics: "가사", rhyme_note: "라임 노트", prompt: "프롬프트" } as const;

export function RecentWorkScreen({ items, type }: { items: readonly RecentWorkItem[] | null; type: RecentWorkTypeFilter }) {
  const returnTo = type === "all" ? "/recent" : `/recent?type=${encodeURIComponent(type)}`;
  const groups = items ? groupItems(items) : [];
  const focus = items?.find((item) => item.type === "lyrics") ?? items?.[0] ?? null;
  return <section className="recent-page" aria-labelledby="recent-title">
    <header className="recent-heading">
      <div><p className="eyebrow">Recent work</p><h1 id="recent-title">최근 작업</h1><p>수정과 열람을 구분해, 마지막으로 멈춘 자료와 가사 위치를 다시 엽니다.</p></div>
      <a className="secondary-button" href="/search">통합 검색</a>
    </header>
    <nav className="recent-filters" aria-label="최근 작업 자료 유형">
      {FILTERS.map((filter) => <a key={filter.type} href={filter.type === "all" ? "/recent" : `/recent?type=${filter.type}`}
        className={filter.type === type ? "active" : ""} aria-current={filter.type === type ? "page" : undefined}>{filter.label}</a>)}
    </nav>
    {items === null ? <StatePanel className="recent-empty" kind="error" title="최근 작업을 불러오지 못했습니다." detail="현재 자료는 변경되지 않았습니다. 온라인 연결과 로그인 상태를 확인한 뒤 다시 시도해 주세요." action={<a className="primary-link" href={returnTo}>다시 시도</a>} />
      : items.length === 0 ? <StatePanel className="recent-empty" kind="empty" title="표시할 최근 작업이 없습니다." detail="자료를 열거나 수정하면 수정 시각과 열람 시각을 구분해 이곳에 표시합니다." action={<a className="primary-link" href="/songs">첫 작업 열기</a>} />
        : <div className="recent-layout">
          <div className="recent-timeline">
            {groups.map((group) => <section className="recent-group" key={group.key} aria-labelledby={`recent-group-${group.key}`}>
              <header><h2 id={`recent-group-${group.key}`}>{group.label}</h2><span>{group.items.length}개</span></header>
              <div className="recent-cards">{group.items.map((item) => <RecentCard key={item.id} item={item} returnTo={returnTo} />)}</div>
            </section>)}
          </div>
          <aside className="recent-focus" aria-label="현재 집중 작업 요약">
            <p className="eyebrow">Continue</p>
            {focus ? <><span className="recent-type">{TYPE_LABELS[focus.type]}</span><h2>{focus.title}</h2>
              <p>{focus.type === "lyrics" && focus.position
                ? `${positionLabel(focus)}에서 이어서 쓸 수 있습니다.`
                : "가장 최근 활동 자료를 바로 열 수 있습니다."}</p>
              <a className="primary-link" href={resourceHref(focus, returnTo)}>{focus.type === "lyrics" ? "계속 편집" : "자료 열기"}</a></>
              : null}
          </aside>
        </div>}
  </section>;
}

function RecentCard({ item, returnTo }: { item: RecentWorkItem; returnTo: string }) {
  const status = statusLabel(item);
  return <article className={`recent-card recent-${item.type}`}>
    <div className="recent-card-main">
      <div className="recent-card-meta"><span className="recent-type">{TYPE_LABELS[item.type]}</span><span>{item.activityKind === "opened" ? "최근 열람" : "최근 수정"}</span></div>
      <h3><a href={resourceHref(item, returnTo)}>{item.title}</a></h3>
      <div className="recent-context">
        {item.parentSong ? <span>소속 곡 · {item.parentSong.title}{item.linkedSongCount > 1 ? ` 외 ${item.linkedSongCount - 1}곡` : ""}</span> : item.type === "song" ? <span>독립 곡 자료</span> : <span>연결 곡 없음</span>}
        {status ? <span>상태 · {status}</span> : null}
        {item.hasWorkNote ? <span>{item.type === "lyrics" ? "가사 메모 있음" : "작업 메모 있음"}</span> : null}
        {item.type === "lyrics" && item.position ? <span>마지막 위치 · {positionLabel(item)}</span> : null}
      </div>
    </div>
    <footer><span>{item.activityKind === "opened" ? "열람" : "수정"}</span><time dateTime={item.activityAt}>{formatTime(item.activityAt)}</time><a href={resourceHref(item, returnTo)}>{item.type === "lyrics" ? "계속 편집 →" : "열기 →"}</a></footer>
  </article>;
}

function resourceHref(item: RecentWorkItem, returnTo: string): string {
  const suffix = `?returnTo=${encodeURIComponent(returnTo)}`;
  if (item.type === "song") return `/songs/${item.id}${suffix}`;
  if (item.type === "lyrics") return `/lyrics/${item.id}${suffix}`;
  if (item.type === "rhyme_note") return `/rhymes/${item.id}${suffix}`;
  return `/prompts/${item.id}${suffix}`;
}

function positionLabel(item: RecentWorkItem): string {
  const position = item.position;
  if (!position?.songformLabel) return "저장된 커서";
  return `${position.songformLabel}${(position.songformOccurrence ?? 1) > 1 ? ` ${position.songformOccurrence}번째` : ""}`;
}

function statusLabel(item: RecentWorkItem): string | null {
  if (!item.status) return null;
  if (item.type === "song" && item.status in SONG_STATUS_LABELS) return SONG_STATUS_LABELS[item.status as keyof typeof SONG_STATUS_LABELS];
  if (item.type === "lyrics" && item.status in LYRIC_STATUS_LABELS) return LYRIC_STATUS_LABELS[item.status as keyof typeof LYRIC_STATUS_LABELS];
  return null;
}

function groupItems(items: readonly RecentWorkItem[]): Array<{ key: string; label: string; items: RecentWorkItem[] }> {
  const today = dateKey(new Date());
  const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateKey(yesterdayDate);
  const groups = new Map<string, { key: string; label: string; items: RecentWorkItem[] }>();
  for (const item of items) {
    const key = dateKey(new Date(item.activityAt));
    const label = key === today ? "오늘" : key === yesterday ? "어제" : new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short"
    }).format(new Date(item.activityAt));
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function dateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
