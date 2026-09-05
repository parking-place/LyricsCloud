import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewSongPreparationPage() {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  return <WorkspaceShell profile={user} active="songs">
    <section className="songs-page preparation-page" aria-labelledby="new-song-title">
      <p className="eyebrow">0.2.0 · 다음 단계</p>
      <h1 id="new-song-title">새 곡</h1>
      <p>곡 작성 화면을 준비하고 있습니다. 목록 화면에서 계속 둘러볼 수 있어요.</p>
      <a className="secondary-button button-link" href="/songs">곡 목록으로 돌아가기</a>
    </section>
  </WorkspaceShell>;
}
