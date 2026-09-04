# Architecture documentation

승인된 ADR을 바탕으로 다음 구조를 문서화합니다.

- 사용자 요청, HTTP, WebSocket, worker, PostgreSQL 사이의 경계
- 인증 세션과 문서 소유권 확인 흐름
- CRDT 업데이트에서 검색용 평문과 revision snapshot이 만들어지는 흐름
- 온라인·오프라인·재연결 상태 변화
- export, 탈퇴, purge, backup의 데이터 생명주기

현재는 후보 디렉터리만 있으며 확정 도식은 `0.0.0` 완료 때 추가합니다.

