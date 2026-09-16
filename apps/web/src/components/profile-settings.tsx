"use client";

import { useEffect, useRef, useState } from "react";
import { notifyProfileSaved, profileChannelName, type ProfileView } from "../lib/profile-state.js";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function ProfileSettings({ initialProfile, googleEmail }: {
  initialProfile: ProfileView; googleEmail: string | null;
}) {
  const [saved, setSaved] = useState(initialProfile);
  const [draftName, setDraftName] = useState(initialProfile.displayName);
  const [resetName, setResetName] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [resetAvatar, setResetAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [conflicted, setConflicted] = useState(false);
  const composing = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const snapshot = useRef({ saved, dirty: false, nameDirty: false, busy });
  const nameChanged = resetName || draftName !== saved.displayName;
  const photoChanged = resetAvatar || selectedFile !== null;
  const dirty = nameChanged || photoChanged;
  const fileInvalid = selectedFile !== null && (!IMAGE_TYPES.has(selectedFile.type) || selectedFile.size > MAX_FILE_BYTES);
  snapshot.current = { saved, dirty, nameDirty: nameChanged, busy };

  useEffect(() => {
    if (!selectedFile || !IMAGE_TYPES.has(selectedFile.type)) { setFilePreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    let active = true;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(profileChannelName(initialProfile.userId));
    async function reload() {
      if (snapshot.current.busy) return;
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!active || !response.ok) return;
        const latest = ((await response.json()) as { profile: ProfileView }).profile;
        if (!active || latest.userId !== initialProfile.userId) return;
        const current = snapshot.current;
        if (current.dirty) {
          if (latest.rowVersion !== current.saved.rowVersion) {
            setSaved(latest); setConflicted(true);
            // A photo-only draft must not write an old name over another tab's new name.
            if (!current.nameDirty) { setDraftName(latest.displayName); setResetName(false); }
            setNotice("다른 탭에서 서버 프로필이 변경되었습니다. 이 화면의 입력과 선택 사진은 유지했습니다. 최신 서버 값과 비교한 뒤 다시 저장하세요.");
          }
          return;
        }
        setSaved(latest); setDraftName(latest.displayName); setResetName(false);
        setSelectedFile(null); setResetAvatar(false);
      } catch { /* Keep this tab's input on a transient network failure. */ }
    }
    void reload();
    window.addEventListener("focus", reload);
    window.addEventListener("online", reload);
    channel?.addEventListener("message", reload);
    return () => { active = false; window.removeEventListener("focus", reload); window.removeEventListener("online", reload);
      channel?.removeEventListener("message", reload); channel?.close(); };
  }, [initialProfile.userId]);

  function cancel() {
    setDraftName(saved.displayName); setResetName(false); setSelectedFile(null); setResetAvatar(false);
    if (fileInput.current) fileInput.current.value = "";
    setConflicted(false); setNotice("저장하지 않은 이름과 사진 선택을 취소했습니다. 서버 프로필은 그대로입니다.");
  }

  async function save() {
    if (busy || composing.current || fileInvalid || !dirty) return;
    setBusy(true); setNotice("프로필을 서버에 저장 중입니다."); setConflicted(false);
    let current = saved;
    let nameSaved = false;
    try {
      if (nameChanged) {
        const value = resetName ? null : draftName;
        if (value !== null && (!value.trim() || Array.from(value.trim()).length > 120)) {
          setNotice("닉네임은 공백을 제외하고 1~120자로 입력하세요. 현재 입력은 그대로 보관했습니다."); return;
        }
        const response = await fetch("/api/profile", { method: "PATCH", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedRowVersion: current.rowVersion, displayName: value }) });
        if (!response.ok) { await handleFailure(response); return; }
        current = ((await response.json()) as { profile: ProfileView }).profile;
        if (current.userId !== initialProfile.userId) throw new Error("OWNER_CHANGED");
        setSaved(current); setDraftName(current.displayName); setResetName(false);
        notifyProfileSaved(current); nameSaved = true;
      }
      if (photoChanged) {
        setNotice(selectedFile ? "선택한 사진을 서버에서 확인하고 업로드 중입니다. 현재 사진은 성공 전까지 유지됩니다."
          : "기본 사진으로 되돌리는 중입니다.");
        let response: Response;
        if (resetAvatar) {
          response = await fetch("/api/profile", { method: "PATCH", cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expectedRowVersion: current.rowVersion, avatar: null }) });
        } else {
          const body = new FormData();
          body.set("expectedRowVersion", String(current.rowVersion));
          body.set("avatar", selectedFile!);
          response = await fetch("/api/profile/avatar", { method: "PATCH", cache: "no-store", body });
        }
        if (!response.ok) { await handleFailure(response, nameSaved); return; }
        current = ((await response.json()) as { profile: ProfileView }).profile;
        if (current.userId !== initialProfile.userId) throw new Error("OWNER_CHANGED");
        setSaved(current); setSelectedFile(null); setResetAvatar(false);
        if (fileInput.current) fileInput.current.value = "";
        notifyProfileSaved(current);
      }
      setNotice("프로필을 서버에 저장했습니다. 다른 기기에서도 다시 열면 같은 값이 보입니다.");
    } catch {
      setNotice(nameSaved ? "닉네임은 저장됐지만 사진 결과를 확인하지 못했습니다. 선택 사진은 유지했습니다. 연결 후 다시 확인해 주세요."
        : "프로필 저장 결과를 확인하지 못했습니다. 입력과 선택 사진을 유지했습니다. 연결을 확인해 주세요.");
    } finally { setBusy(false); }
  }

  async function handleFailure(response: Response, nameSaved = false) {
    if (response.status === 409) {
      const body = await response.json().catch(() => null) as { error?: { details?: { profile?: ProfileView } } } | null;
      const latest = body?.error?.details?.profile;
      if (latest?.userId === initialProfile.userId) {
        setSaved(latest);
        if (!nameChanged) { setDraftName(latest.displayName); setResetName(false); }
      }
      setConflicted(true);
      setNotice("다른 탭의 저장과 충돌했습니다. 서버 값은 갱신했지만 이 입력과 선택 사진은 보존했습니다. 비교 후 다시 저장하세요.");
    } else if (response.status === 401) setNotice("로그인이 만료되었습니다. 입력과 선택 사진은 이 화면에 유지했습니다. 새 탭에서 다시 로그인한 뒤 재시도하세요.");
    else if (response.status === 400 || response.status === 413) setNotice(nameSaved
      ? "닉네임은 저장됐지만 사진이 형식·용량·내용 검사에서 거부됐습니다. 사진 선택은 유지했습니다."
      : "입력이나 사진을 서버가 거부했습니다. PNG/JPEG/WebP·2 MiB 이하 사진과 1~120자 닉네임을 확인하세요. 입력은 유지했습니다.");
    else setNotice(nameSaved ? "닉네임은 저장됐지만 사진을 저장하지 못했습니다. 선택 사진은 유지했습니다."
      : "프로필을 저장하지 못했습니다. 입력과 선택 사진은 유지했습니다. 잠시 후 다시 시도하세요.");
  }

  return <div className="profile-settings" data-pending-profile={dirty || busy ? "true" : undefined}>
    <div className="profile-settings-heading"><div><h3>내 프로필</h3><p>닉네임과 사진만 변경할 수 있습니다. Google 계정 이메일은 변경되지 않습니다.</p></div></div>
    <div className="profile-settings-grid">
      <div className="profile-photo-control">
        <div className="profile-photo-compare">
          <div><span>서버에 저장된 사진</span><ProfileAvatar key={`saved-${saved.rowVersion}`} name={saved.displayName} src={saved.avatarUrl} /></div>
          <div><span>{selectedFile ? "선택한 사진 · 미저장" : resetAvatar ? "기본 사진 복귀 · 미저장" : "현재 미리보기"}</span>
            <ProfileAvatar key={filePreview || `draft-${saved.rowVersion}-${resetAvatar}`} name={draftName || saved.displayName}
              src={resetAvatar ? null : filePreview || saved.avatarUrl} /></div>
        </div>
        <label className="profile-file-label">사진 선택 · PNG/JPEG/WebP, 2 MiB 이하
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file); setResetAvatar(false); setConflicted(false);
            setNotice(file ? "사진은 아직 서버에 저장되지 않았습니다. 저장을 누르면 형식과 내용을 다시 검사합니다." : "");
          }} disabled={busy} />
        </label>
        {selectedFile ? <p className={fileInvalid ? "profile-file-error" : "profile-file-note"}>
          {fileInvalid ? "이 파일은 허용된 형식 또는 2 MiB 한도를 벗어납니다. 다른 사진을 선택하세요." : `선택됨: ${selectedFile.name}`}</p> : null}
        <button className="secondary-button" type="button" disabled={busy} onClick={() => {
          setSelectedFile(null); setResetAvatar(true); setNotice("사진을 기본값으로 되돌릴 준비가 됐습니다. 저장 전까지 현재 서버 사진은 그대로입니다.");
          if (fileInput.current) fileInput.current.value = "";
        }}>기본 사진으로 되돌리기</button>
      </div>
      <div className="profile-name-control">
        <label htmlFor="profile-display-name">닉네임</label>
        <input id="profile-display-name" value={draftName} maxLength={240} autoComplete="nickname" disabled={busy}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
          onChange={(event) => { setDraftName(event.target.value); setResetName(false); setConflicted(false); setNotice(""); }} />
        <p>현재 서버 이름: <strong>{saved.displayName}</strong> · {saved.displayNameSource === "override" ? "사용자 지정" : "Google/기존 기본값"}</p>
        <button className="secondary-button" type="button" disabled={busy} aria-pressed={resetName} onClick={() => {
          setResetName(true); setNotice("닉네임을 최신 Google 기본값으로 되돌릴 준비가 됐습니다. 저장 전까지 서버 이름은 그대로입니다.");
        }}>Google 이름으로 되돌리기</button>
        <label htmlFor="profile-google-email">Google 계정 이메일 · 읽기 전용</label>
        <input id="profile-google-email" readOnly value={googleEmail ?? "확인된 Google 이메일 없음"} />
      </div>
    </div>
    <div className="settings-actions"><button className="secondary-button" type="button" disabled={!dirty || busy} onClick={cancel}>취소</button>
      <button className="primary-link" type="button" disabled={!dirty || busy || fileInvalid} onClick={() => void save()}>{busy ? "저장 중" : "프로필 저장"}</button></div>
    {notice ? <p className={`settings-message${conflicted || notice.includes("못했습니다") || notice.includes("거부") || notice.includes("만료") ? " warning" : ""}`}
      role={conflicted || notice.includes("못했습니다") || notice.includes("거부") || notice.includes("만료") ? "alert" : "status"}>{notice}
      {conflicted ? <button type="button" disabled={busy || fileInvalid} onClick={() => void save()}>서버 최신 버전으로 재시도</button> : null}</p> : null}
  </div>;
}

function ProfileAvatar({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  const fallback = Array.from(name.trim())[0] || "•";
  return src && !failed ? <img className="profile-photo-preview" src={src} alt="" referrerPolicy="no-referrer"
    onError={() => setFailed(true)} /> : <span className="profile-photo-preview profile-photo-fallback" aria-label={`${name || "사용자"}의 기본 사진`}>{fallback}</span>;
}
