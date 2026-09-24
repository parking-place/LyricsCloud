export default function WorkspaceLoading() {
  return <main className="workspace-loading" role="status" aria-live="polite">
    <span aria-hidden="true">✦</span>
    <p>작업 공간을 불러오는 중입니다.</p>
  </main>;
}
