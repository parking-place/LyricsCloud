# Worker boundary

HTTP 요청과 분리해 재시도해야 하는 예약·비동기 작업을 담당합니다. 0.8.0부터 시작 2초 뒤와 기본 5분 간격으로 만료된 휴지통·탈퇴 계정을 최대 100개씩 정리하며, 중복 실행을 advisory lock으로 직렬화하고 내용 없는 실행 결과와 실패 코드를 `lifecycle_purge_runs`에 남깁니다.

추가 후보 작업은 revision 보존 한도 정리, CRDT compaction, 내보내기 만료입니다. 백업 자체의 실행 위치와 키 관리는 [`infra/backup`](../../infra/backup/)에서 별도로 다룹니다.
