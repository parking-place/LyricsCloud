# Worker boundary

HTTP 요청과 분리해 재시도해야 하는 예약·비동기 작업을 담당할 예정입니다.

후보 작업은 휴지통 `purge_at` 정리, 탈퇴 유예 만료, revision 보존 한도 정리, CRDT compaction, 내보내기 만료입니다. 백업 자체의 실행 위치와 키 관리는 [`infra/backup`](../../infra/backup/)에서 별도로 다룹니다.

