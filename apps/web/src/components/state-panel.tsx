import type { ReactNode } from "react";

export type StatePanelKind = "empty" | "loading" | "error" | "offline" | "permission" | "deleted";

const labels: Record<StatePanelKind, string> = {
  empty: "빈 상태",
  loading: "불러오는 중",
  error: "오류",
  offline: "오프라인",
  permission: "권한 없음",
  deleted: "삭제된 자료"
};

const icons: Record<StatePanelKind, string> = {
  empty: "○",
  loading: "…",
  error: "!",
  offline: "↯",
  permission: "×",
  deleted: "♲"
};

export function StatePanel({ kind, title, detail, action, className = "" }: {
  kind: StatePanelKind;
  title: string;
  detail: string;
  action?: ReactNode;
  className?: string;
}) {
  const urgent = kind === "error" || kind === "permission";
  const role = kind === "empty" ? "region" : urgent ? "alert" : "status";
  return <div className={`state-panel state-${kind}${className ? ` ${className}` : ""}`} data-state-kind={kind} role={role} aria-label={`${labels[kind]}: ${title}`} aria-live={role === "region" ? undefined : urgent ? "assertive" : "polite"}>
    <span aria-hidden="true">{icons[kind]}</span>
    <strong className="state-kind-label">{labels[kind]}</strong>
    <h2>{title}</h2>
    <p>{detail}</p>
    {action ? <div className="state-panel-action">{action}</div> : null}
  </div>;
}
