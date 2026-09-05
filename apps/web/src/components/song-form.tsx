"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { validateSongForm, type SongFormErrors, type SongFormValues } from "../lib/song-form-validation.js";

const STATUS_OPTIONS: readonly [SongFormValues["status"], string, string][] = [
  ["idea", "아이디어", "처음 떠오른 생각을 정리하는 단계"],
  ["writing_lyrics", "가사 작성 중", "가사의 초안을 쓰는 단계"],
  ["revising", "수정 중", "가사와 구성을 다듬는 단계"],
  ["suno_generating", "Suno 생성 중", "Suno에서 결과를 만드는 단계"],
  ["mixing", "믹싱 중", "사운드를 정리하는 단계"],
  ["completed", "완성", "현재 작업을 마친 상태"],
  ["on_hold", "보류", "나중에 다시 이어갈 상태"]
];
const COLOR_OPTIONS: readonly [NonNullable<SongFormValues["color"]>, string][] = [
  ["red", "빨강"], ["yellow", "노랑"], ["green", "초록"], ["blue", "파랑"], ["gray", "회색"]
];

interface ExistingSong extends SongFormValues {
  readonly id: string;
}

const defaults: SongFormValues = {
  title: "",
  description: "",
  workNotes: "",
  status: "idea",
  color: null,
  isFavorite: false,
  isPinned: false
};

export function SongForm({ song }: { song?: ExistingSong }) {
  const initial = useMemo<SongFormValues>(() => song ? {
    title: song.title,
    description: song.description,
    workNotes: song.workNotes,
    status: song.status,
    color: song.color,
    isFavorite: song.isFavorite,
    isPinned: song.isPinned
  } : defaults, [song]);
  const [values, setValues] = useState<SongFormValues>(initial);
  const [errors, setErrors] = useState<SongFormErrors>({});
  const [formError, setFormError] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const submitting = useRef(false);
  const requestId = useRef<string>(crypto.randomUUID());
  const router = useRouter();
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || state === "saved") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    const confirmLink = (event: MouseEvent) => {
      if (!dirty || state === "saved" || event.defaultPrevented || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target) return;
      if (!window.confirm("저장하지 않은 변경 내용이 있습니다. 이 페이지를 나갈까요?")) event.preventDefault();
    };
    document.addEventListener("click", confirmLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", confirmLink, true);
    };
  }, [dirty, state]);

  function update<Key extends keyof SongFormValues>(key: Key, value: SongFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "title" || key === "description" || key === "workNotes") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const nextErrors = validateSongForm(values);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;
    submitting.current = true;
    setState("saving");
    try {
      const songId = song ? await updateSong(song.id, values) : await createSong(values, requestId.current);
      setState("saved");
      router.replace(`/songs/${songId}`);
      router.refresh();
    } catch (caught) {
      const failure = caught as SongFormFailure;
      if (failure.issues) {
        const mapped: SongFormErrors = {};
        for (const issue of failure.issues) {
          if (issue.field === "title" || issue.field === "description" || issue.field === "workNotes") {
            mapped[issue.field] = issueMessage(issue.field, issue.code);
          }
        }
        setErrors(mapped);
      }
      setFormError(failure.status === 401 ? "로그인 시간이 만료되었습니다. 입력을 복사한 뒤 다시 로그인해 주세요." : "저장하지 못했습니다. 입력은 그대로 유지됩니다. 다시 시도해 주세요.");
      setState("idle");
    } finally {
      submitting.current = false;
    }
  }

  return <section className="song-form-page" aria-labelledby="song-form-title">
    <header className="form-heading"><div><a className="back-inline" href="/songs">← 곡 목록</a><p className="eyebrow">0.2.0 · Song details</p><h1 id="song-form-title">{song ? "곡 정보 수정" : "새 곡 만들기"}</h1><p>{song ? "현재 곡의 기본 정보와 작업 상태를 정리합니다." : "제목 하나로 시작해도 괜찮아요. 나머지는 언제든 채울 수 있습니다."}</p></div></header>
    {formError ? <div className="form-error-banner" role="alert"><strong>저장 오류</strong><span>{formError}</span></div> : null}
    <form className="song-form" onSubmit={submit} noValidate>
      <div className="form-main">
        <FormField label="곡 제목" required error={errors.title} count={values.title.length} maximum={200}>
          <input name="title" aria-label="곡 제목" autoFocus value={values.title} maxLength={201} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : "title-help"} onChange={(event) => update("title", event.target.value)} placeholder="예: 새벽의 잔상" />
          <small id="title-help">목록과 대시보드에 표시되는 이름입니다.</small>
        </FormField>
        <FormField label="곡 설명" error={errors.description} count={values.description.length} maximum={2000}>
          <textarea name="description" aria-label="곡 설명" value={values.description} maxLength={2001} aria-invalid={Boolean(errors.description)} onChange={(event) => update("description", event.target.value)} placeholder="곡의 분위기, 이야기, 핵심 이미지를 적어보세요." rows={5} />
        </FormField>
        <FormField label="작업 메모" error={errors.workNotes} count={values.workNotes.length} maximum={10000}>
          <textarea name="workNotes" aria-label="작업 메모" value={values.workNotes} maxLength={10001} aria-invalid={Boolean(errors.workNotes)} onChange={(event) => update("workNotes", event.target.value)} placeholder="다음에 할 일, 시도할 표현, 참고할 내용을 자유롭게 적어보세요." rows={8} />
        </FormField>
      </div>
      <aside className="form-side" aria-label="곡 설정">
        <fieldset className="option-group status-options"><legend>작업 상태</legend>{STATUS_OPTIONS.map(([value, label, description]) => <label key={value} className={values.status === value ? "selected" : ""}><input type="radio" name="status" value={value} checked={values.status === value} onChange={() => update("status", value)} /><span><strong>{label}</strong><small>{description}</small></span></label>)}</fieldset>
        <fieldset className="option-group color-options"><legend>표시 색상</legend><button type="button" className={values.color === null ? "selected" : ""} aria-pressed={values.color === null} onClick={() => update("color", null)}>색상 없음</button>{COLOR_OPTIONS.map(([value, label]) => <button type="button" key={value} className={`color-choice color-${value}${values.color === value ? " selected" : ""}`} aria-pressed={values.color === value} onClick={() => update("color", value)}><span aria-hidden="true" />{label}</button>)}</fieldset>
        <div className="switch-options"><label><input type="checkbox" checked={values.isPinned} onChange={(event) => update("isPinned", event.target.checked)} /><span><strong>목록 상단에 고정</strong><small>중요한 곡을 먼저 보여줍니다.</small></span></label><label><input type="checkbox" checked={values.isFavorite} onChange={(event) => update("isFavorite", event.target.checked)} /><span><strong>즐겨찾기에 추가</strong><small>즐겨찾기 우선 정렬에 반영됩니다.</small></span></label></div>
      </aside>
      <footer className="song-form-actions"><a className="secondary-button button-link" href={song ? `/songs/${song.id}` : "/songs"}>취소</a><button className="primary-link" type="submit" disabled={state === "saving"}>{state === "saving" ? "저장 중…" : state === "saved" ? "저장 완료" : song ? "변경 저장" : "곡 만들기"}</button><span className="sr-only" role="status">{state === "saving" ? "곡을 저장하는 중입니다." : state === "saved" ? "곡 저장이 완료되었습니다." : ""}</span></footer>
    </form>
  </section>;
}

function FormField({ label, required, error, count, maximum, children }: { label: string; required?: boolean; error?: string; count: number; maximum: number; children: React.ReactNode }) {
  const id = label === "곡 제목" ? "title" : label === "곡 설명" ? "description" : "workNotes";
  return <label className="form-field"><span className="field-label">{label}{required ? <em>필수</em> : <small>선택</small>}<span className={count > maximum ? "over" : ""}>{count.toLocaleString("ko-KR")} / {maximum.toLocaleString("ko-KR")}</span></span>{children}{error ? <strong className="field-error" id={`${id}-error`} role="alert">{error}</strong> : null}</label>;
}

interface SongFormFailure {
  readonly status?: number;
  readonly issues?: readonly { field: string; code: string }[];
}

async function createSong(values: SongFormValues, requestId: string): Promise<string> {
  const response = await fetch("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, requestId, pinOrder: values.isPinned ? 0 : null })
  });
  const result = await response.json();
  if (!response.ok) throw { status: response.status, issues: result.error?.issues } satisfies SongFormFailure;
  return result.song.id as string;
}

async function updateSong(songId: string, values: SongFormValues): Promise<string> {
  const main = await fetch(`/api/songs/${songId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: values.title, description: values.description, workNotes: values.workNotes, status: values.status })
  });
  const mainResult = await main.json();
  if (!main.ok) throw { status: main.status, issues: mainResult.error?.issues } satisfies SongFormFailure;
  for (const [path, body] of [
    ["color", { value: values.color }],
    ["pin", { value: values.isPinned, pinOrder: values.isPinned ? 0 : null }],
    ["favorite", { value: values.isFavorite }]
  ] as const) {
    const response = await fetch(`/api/songs/${songId}/${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw { status: response.status } satisfies SongFormFailure;
  }
  return songId;
}

function issueMessage(field: string, code: string) {
  if (field === "title" && code === "required") return "곡 제목을 입력해 주세요.";
  if (field === "title") return "제목은 200자 이하여야 합니다.";
  if (field === "description") return "설명은 2,000자 이하여야 합니다.";
  return "작업 메모는 10,000자 이하여야 합니다.";
}
