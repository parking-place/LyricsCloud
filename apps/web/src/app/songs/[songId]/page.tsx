import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SongSavedPage({ params }: { params: Promise<{ songId: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { songId } = await params;
  const song = await getAuthContext().songs.getSong(user.userId, songId).catch(() => null);
  if (!song) notFound();
  return <WorkspaceShell profile={user} active="songs"><section className="songs-page preparation-page" aria-labelledby="saved-song-title"><p className="eyebrow">저장 완료</p><h1 id="saved-song-title">{song.title}</h1><p>곡 정보가 안전하게 저장되었습니다. 기본 대시보드는 다음 Phase에서 이 자리에 연결됩니다.</p><div className="preparation-actions"><a className="primary-link" href={`/songs/${song.id}/edit`}>곡 정보 수정</a><a className="secondary-button button-link" href="/songs">곡 목록</a></div></section></WorkspaceShell>;
}
