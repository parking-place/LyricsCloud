interface SharingStorageGuideProps {
  readonly audience: "selected-writer" | "public-guest" | "owner";
  readonly writable?: boolean;
}

export function SharingStorageGuide({ audience, writable = false }: SharingStorageGuideProps) {
  if (audience === "owner") {
    return <section className="sharing-storage-guide" role="region" aria-label="공유 저장 및 복구 안내">
      <strong>저장·복구 기준</strong>
      <ul>
        <li>공동 작성자의 변경은 서버 저장이 확인된 뒤 모든 참여자에게 반영됩니다.</li>
        <li>오프라인 입력은 작성자의 해당 기기에 임시 보관되며, 다시 연결되면 전송됩니다.</li>
        <li>가사나 상위 곡을 삭제하면 기존 공유 권한은 즉시 끝납니다. 휴지통에서 복원해도 이전 권한은 되살아나지 않습니다.</li>
      </ul>
    </section>;
  }

  if (audience === "public-guest") {
    return <section className="sharing-storage-guide" role="region" aria-label="공유 저장 및 복구 안내">
      <strong>{writable ? "게스트 입력의 저장 위치" : "공개 가사의 저장 상태"}</strong>
      {writable ? <ul>
        <li>연결 중에는 서버에 변경을 저장하고, 완료 상태를 확인할 수 있습니다.</li>
        <li>오프라인 입력과 미전송 복구 내용은 이 탭의 게스트 세션과 이 기기에만 보관됩니다.</li>
        <li>권한이 끝나면 새 입력은 저장되지 않습니다. 미전송 내용은 탭을 닫기 전에 복사하거나 파일로 보관하세요.</li>
      </ul> : <p>서버에서 마지막으로 받은 내용만 표시합니다. 이 탭에서 수정하거나 복구할 입력은 만들지 않습니다.</p>}
    </section>;
  }

  return <section className="sharing-storage-guide" role="region" aria-label="공유 저장 및 복구 안내">
    <strong>{writable ? "내 입력의 저장 위치" : "공유 가사의 저장 상태"}</strong>
    {writable ? <ul>
      <li>연결 중에는 서버에 변경을 저장하고, 완료 상태를 확인할 수 있습니다.</li>
      <li>오프라인 입력은 로그인한 내 계정과 이 기기에 임시 보관되며, 다시 연결되면 전송됩니다.</li>
      <li>권한이 끝나면 새 입력은 저장되지 않습니다. 서버에 보내지 못한 내 작성 내용만 복구함에서 꺼낼 수 있습니다.</li>
    </ul> : <p>서버에서 마지막으로 받은 내용만 표시합니다. 이 화면에는 수정 대기 중인 로컬 입력이 생기지 않습니다.</p>}
  </section>;
}
