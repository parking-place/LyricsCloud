# Architecture documentation

승인된 ADR을 바탕으로 다음 구조를 문서화합니다.

- 사용자 요청, HTTP, WebSocket, worker, PostgreSQL 사이의 경계
- 인증 세션과 문서 소유권 확인 흐름
- CRDT 업데이트에서 검색용 평문과 revision snapshot이 만들어지는 흐름
- 온라인·오프라인·재연결 상태 변화
- export, 탈퇴, purge, backup의 데이터 생명주기

현재 확정 계약:

- [`경계와 의존 방향`](./BOUNDARIES.md)
- [`오류 응답`](./ERROR-CONTRACT.md)
- [`사용자 소유권`](./OWNERSHIP-CONTRACT.md)
- [`계정별 클라이언트 캐시`](./ACCOUNT-CACHE-CONTRACT.md)
- [`0.2.0 owner context 인계`](./0.2.0-OWNER-CONTEXT-HANDOFF.md)
- [`0.2.0 곡 API와 cursor`](./0.2.0-SONG-API.md)
