import Link from "next/link";

export default function NotFound() {
  return <main className="resource-not-found">
    <span aria-hidden="true">?</span>
    <p className="eyebrow">Resource unavailable</p>
    <h1>요청한 자료를 열 수 없습니다</h1>
    <p>주소가 잘못되었거나 자료가 삭제되었거나 현재 계정에서 접근할 수 없습니다.</p>
    <div>
      <Link className="primary-link" href="/search">내 자료 검색</Link>
      <Link className="secondary-button" href="/workspace">작업 공간으로</Link>
    </div>
  </main>;
}
