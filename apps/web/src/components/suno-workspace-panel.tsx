"use client";

import {
  SUNO_MODEL_SUGGESTIONS,
  SUNO_WORKSPACE_LIMITS,
  type SunoWorkspace,
  type SunoWorkspaceLink
} from "@lyricscloud/domain";
import { useEffect, useState } from "react";
import { DialogFocusBoundary } from "../lib/dialog-focus.js";

type LinkDraft = {
  readonly mode: "create" | "edit";
  readonly linkId?: string;
  readonly url: string;
  readonly title: string;
  readonly note: string;
};

const CUSTOM_MODEL = "__custom__";

export function SunoWorkspacePanel({ songId, initialWorkspace }: {
  songId: string;
  initialWorkspace: SunoWorkspace | null;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [loadError, setLoadError] = useState(initialWorkspace === null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modelChoice, setModelChoice] = useState(() => modelChoiceFor(initialWorkspace?.modelLabel ?? null));
  const [customModel, setCustomModel] = useState(() => customModelFor(initialWorkspace?.modelLabel ?? null));
  const [editor, setEditor] = useState<LinkDraft | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SunoWorkspaceLink | null>(null);

  useEffect(() => {
    if (!editor) return;
    try { sessionStorage.setItem(draftKey(songId, editor), JSON.stringify(editor)); } catch { /* storage is optional */ }
  }, [editor, songId]);

  async function reload(preserveDraft = false) {
    setLoadError(false);
    setBusy("reload");
    if (!preserveDraft) setError("");
    try {
      const response = await fetch(`/api/songs/${songId}/suno-workspace`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { workspace: SunoWorkspace };
      setWorkspace(result.workspace);
      if (!preserveDraft) {
        setModelChoice(modelChoiceFor(result.workspace.modelLabel));
        setCustomModel(customModelFor(result.workspace.modelLabel));
      }
    } catch {
      setLoadError(true);
      setError("Suno 작업 정보를 불러오지 못했습니다. 다른 작업은 계속할 수 있습니다.");
    } finally { setBusy(""); }
  }

  async function apply(command: Record<string, unknown>, pending: string): Promise<SunoWorkspace | null> {
    if (!workspace || busy) return null;
    setBusy(pending);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/songs/${songId}/suno-workspace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), expectedVersion: workspace.rowVersion, ...command })
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: { details?: { currentVersion?: unknown } } } | null;
        if (response.status === 409 && typeof failure?.error?.details?.currentVersion === "number") {
          await reload(true);
          setError("다른 화면에서 정보가 변경되었습니다. 최신 내용을 불러왔으며 입력 중인 초안은 유지했습니다.");
          return null;
        }
        if (response.status === 400 || response.status === 422) {
          setError("입력값을 확인해 주세요. Suno의 HTTPS 곡 링크만 저장할 수 있습니다.");
          return null;
        }
        if (response.status === 409) {
          setError("같은 URL이 이미 있거나 현재 링크 목록과 충돌했습니다. 입력은 유지됩니다.");
          return null;
        }
        throw new Error();
      }
      const result = await response.json() as { workspace: SunoWorkspace };
      setWorkspace(result.workspace);
      return result.workspace;
    } catch {
      setError("변경을 저장하지 못했습니다. 입력은 유지되므로 연결을 확인한 뒤 다시 시도해 주세요.");
      return null;
    } finally { setBusy(""); }
  }

  async function saveModel() {
    const modelLabel = modelChoice === CUSTOM_MODEL ? customModel : modelChoice || null;
    const next = await apply({ command: "set_model", modelLabel }, "model");
    if (!next) return;
    setModelChoice(modelChoiceFor(next.modelLabel));
    setCustomModel(customModelFor(next.modelLabel));
    setNotice(next.modelLabel ? `Suno 모델을 ${next.modelLabel}(으)로 저장했습니다.` : "Suno 모델 지정을 해제했습니다.");
  }

  function openLinkEditor(link?: SunoWorkspaceLink) {
    const fallback: LinkDraft = link
      ? { mode: "edit", linkId: link.id, url: link.url, title: link.title, note: link.note }
      : { mode: "create", url: "", title: "", note: "" };
    try {
      const saved = sessionStorage.getItem(draftKey(songId, fallback));
      setEditor(saved ? { ...fallback, ...JSON.parse(saved) as LinkDraft } : fallback);
    } catch { setEditor(fallback); }
    setError("");
  }

  async function saveLink() {
    if (!editor) return;
    const command = editor.mode === "create"
      ? { command: "create_link", url: editor.url, title: editor.title, note: editor.note }
      : { command: "update_link", linkId: editor.linkId, url: editor.url, title: editor.title, note: editor.note };
    const next = await apply(command, "link");
    if (!next) return;
    try { sessionStorage.removeItem(draftKey(songId, editor)); } catch { /* storage is optional */ }
    setEditor(null);
    setNotice(editor.mode === "create" ? "Suno 작업 링크를 추가했습니다." : "Suno 작업 링크를 수정했습니다.");
  }

  async function removeLink() {
    if (!removeTarget) return;
    const next = await apply({ command: "remove_link", linkId: removeTarget.id }, "remove");
    if (!next) return;
    setRemoveTarget(null);
    setNotice("LyricsCloud에서 링크를 제거했습니다. Suno의 원곡은 그대로 유지됩니다.");
  }

  async function moveLink(index: number, direction: -1 | 1) {
    if (!workspace) return;
    const target = index + direction;
    if (target < 0 || target >= workspace.links.length) return;
    const ids = workspace.links.map(({ id }) => id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    const next = await apply({ command: "reorder_links", linkIds: ids }, "order");
    if (next) setNotice("Suno 작업 링크 순서를 저장했습니다.");
  }

  if (!workspace) return <section className="dashboard-panel suno-panel" aria-labelledby="suno-heading">
    <div className="suno-panel-heading"><div><p className="eyebrow">Suno workspace</p><h2 id="suno-heading">Suno 작업</h2></div></div>
    <div className="dashboard-section-error" role="alert"><strong>Suno 작업 정보를 불러오지 못했습니다.</strong><button type="button" disabled={busy === "reload"} onClick={() => void reload()}>{busy === "reload" ? "확인 중…" : "다시 시도"}</button></div>
  </section>;

  return <section className="dashboard-panel suno-panel" aria-labelledby="suno-heading" aria-busy={Boolean(busy)}>
    <div className="suno-panel-heading"><div><p className="eyebrow">Suno workspace</p><h2 id="suno-heading">Suno 작업</h2></div><button type="button" disabled={Boolean(busy)} onClick={() => void reload()}>새로 고침</button></div>
    {notice ? <p className="suno-message" role="status">{notice}</p> : null}
    {error || loadError ? <p className="suno-message is-error" role="alert">{error || "최신 정보를 확인하지 못했습니다."}</p> : null}
    <div className="suno-model-editor">
      <label><span>사용 모델</span><select value={modelChoice} disabled={Boolean(busy)} onChange={(event) => setModelChoice(event.target.value)}>
        <option value="">미지정</option>
        {SUNO_MODEL_SUGGESTIONS.map((model) => <option value={model} key={model}>{model}</option>)}
        <option value={CUSTOM_MODEL}>사용자 지정…</option>
      </select></label>
      {modelChoice === CUSTOM_MODEL ? <label><span>사용자 지정 모델명</span><input autoComplete="off" value={customModel} onChange={(event) => setCustomModel(event.target.value)} placeholder="예: custom-v6" /></label> : null}
      <button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => void saveModel()}>{busy === "model" ? "저장 중…" : "모델 저장"}</button>
    </div>
    <div className="suno-links-heading"><div><h3>작업 링크</h3><span>{workspace.links.length} / {SUNO_WORKSPACE_LIMITS.links}</span></div><button className="primary-button" type="button" disabled={Boolean(busy) || workspace.links.length >= SUNO_WORKSPACE_LIMITS.links} onClick={() => openLinkEditor()}>＋ 링크 추가</button></div>
    <p className="suno-guidance">URL과 직접 입력한 제목·메모만 저장합니다. 자동 썸네일·생성 시간은 가져오지 않습니다.</p>
    {workspace.links.length ? <div className="suno-link-list">{workspace.links.map((link, index) => <article className="suno-link-card" key={link.id}>
      <div><a href={link.url} target="_blank" rel="noopener noreferrer"><strong>{link.title || `Suno 작업 링크 ${index + 1}`}</strong><span>새 탭에서 열기 ↗</span></a><p>{link.note || "메모 없음"}</p><small>{link.url}</small></div>
      <div className="suno-link-actions"><button type="button" disabled={Boolean(busy) || index === 0} aria-label={`${link.title || `링크 ${index + 1}`} 위로 이동`} onClick={() => void moveLink(index, -1)}>↑</button><button type="button" disabled={Boolean(busy) || index === workspace.links.length - 1} aria-label={`${link.title || `링크 ${index + 1}`} 아래로 이동`} onClick={() => void moveLink(index, 1)}>↓</button><button type="button" disabled={Boolean(busy)} onClick={() => openLinkEditor(link)}>수정</button><button className="danger-text" type="button" disabled={Boolean(busy)} onClick={() => setRemoveTarget(link)}>제거</button></div>
    </article>)}</div> : <div className="suno-empty"><strong>아직 저장한 Suno 작업 링크가 없습니다.</strong><p>Suno 곡 또는 공유 링크를 직접 추가해 작업 흐름을 이어가세요.</p><button type="button" onClick={() => openLinkEditor()}>첫 링크 추가</button></div>}

    {editor ? <div className="dialog-backdrop suno-dialog-backdrop" role="presentation"><section className="suno-link-dialog" role="dialog" aria-modal="true" aria-labelledby="suno-link-dialog-title">
      <DialogFocusBoundary selector=".suno-link-dialog" onClose={() => setEditor(null)} blocked={busy === "link"} initialFocus="input" />
      <p className="eyebrow">Manual link</p><h2 id="suno-link-dialog-title">Suno 작업 링크 {editor.mode === "create" ? "추가" : "수정"}</h2>
      <p>닫아도 이 브라우저 탭에서는 입력 초안을 유지합니다.</p>
      <label><span>Suno URL</span><input type="url" inputMode="url" autoComplete="url" value={editor.url} onChange={(event) => setEditor({ ...editor, url: event.target.value })} placeholder="https://suno.com/song/…" /></label>
      <label><span>표시 제목</span><input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder="예: 후렴 2안" /></label>
      <label><span>메모</span><textarea value={editor.note} onChange={(event) => setEditor({ ...editor, note: event.target.value })} placeholder="비교할 점이나 다음 작업을 남겨보세요." /></label>
      <small>{[...editor.note].length.toLocaleString("ko-KR")} / {SUNO_WORKSPACE_LIMITS.note.toLocaleString("ko-KR")}자</small>
      {error ? <p className="suno-dialog-error" role="alert">{error}</p> : null}
      <footer><button className="secondary-button" type="button" disabled={busy === "link"} onClick={() => setEditor(null)}>닫기</button><button className="primary-button" type="button" disabled={busy === "link" || !editor.url.trim()} onClick={() => void saveLink()}>{busy === "link" ? "저장 중…" : "링크 저장"}</button></footer>
    </section></div> : null}

    {removeTarget ? <div className="dialog-backdrop suno-dialog-backdrop" role="presentation"><section className="delete-dialog suno-remove-dialog" role="alertdialog" aria-modal="true" aria-labelledby="suno-remove-title" aria-describedby="suno-remove-description">
      <DialogFocusBoundary selector=".suno-remove-dialog" onClose={() => setRemoveTarget(null)} blocked={busy === "remove"} />
      <p className="eyebrow">LyricsCloud에서만 제거</p><h2 id="suno-remove-title">‘{removeTarget.title || "Suno 작업 링크"}’를 제거할까요?</h2><p id="suno-remove-description">이 목록에서 URL·제목·메모만 제거합니다. Suno에 있는 원곡이나 공유 링크는 삭제되지 않습니다.</p>
      <div><button className="secondary-button" type="button" disabled={busy === "remove"} onClick={() => setRemoveTarget(null)}>취소</button><button className="danger-button" type="button" disabled={busy === "remove"} onClick={() => void removeLink()}>{busy === "remove" ? "제거 중…" : "LyricsCloud에서 제거"}</button></div>
    </section></div> : null}
  </section>;
}

function modelChoiceFor(model: string | null): string {
  if (!model) return "";
  return (SUNO_MODEL_SUGGESTIONS as readonly string[]).includes(model) ? model : CUSTOM_MODEL;
}

function customModelFor(model: string | null): string {
  return model && !(SUNO_MODEL_SUGGESTIONS as readonly string[]).includes(model) ? model : "";
}

function draftKey(songId: string, draft: Pick<LinkDraft, "mode" | "linkId">): string {
  return `lyricscloud:suno-link-draft:${songId}:${draft.mode}:${draft.linkId ?? "new"}`;
}
