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
- [`0.3.0 가사 영역 인계`](./0.3.0-LYRICS-HANDOFF.md)
- [`0.4.0 라임 노트 증적과 0.5.0·0.6.0 인계`](./0.4.0-RHYME-HANDOFF.md)
- [`0.5.0 프롬프트 토큰 계약`](./0.5.0-PROMPT-CONTRACT.md)
- [`0.5.0 프롬프트 증적과 0.6.0·0.8.0 인계`](./0.5.0-PROMPT-HANDOFF.md)
- [`0.6.0 곡 중심 창작 흐름 증적과 0.7.0 인계`](./0.6.0-CREATIVE-FLOW-HANDOFF.md)
- [`0.7.0 통합 검색 계약`](./0.7.0-SEARCH-CONTRACT.md)
- [`0.7.0 통합 검색 화면·딥링크 계약`](./0.7.0-SEARCH-UI-CONTRACT.md)
- [`0.7.0 최근 작업·가사 위치 계약`](./0.7.0-RECENT-WORK-CONTRACT.md)
- [`0.8.0 템플릿 데이터·적용 계약`](./0.8.0-TEMPLATE-CONTRACT.md)
- [`1.0.3 프롬프트 mode/raw 후보 추적`](./1.0.3-FINAL-TRACEABILITY.md)
- [`1.0.4 프롬프트 표시·복사 후보 추적`](./1.0.4-FINAL-TRACEABILITY.md)
- [`1.0.5 서브 송폼·가사 복사 후보 추적`](./1.0.5-FINAL-TRACEABILITY.md)
- [`1.0.6 Extend·송폼 삽입 최종 추적`](./1.0.6-FINAL-TRACEABILITY.md)
- [`1.0.7 목록 보기·밀도 최종 추적`](./1.0.7-FINAL-TRACEABILITY.md)
- [`1.0.8 곡 사용자정렬 최종 추적`](./1.0.8-FINAL-TRACEABILITY.md)
- [`1.0.9 라임·프롬프트 사용자정렬 최종 추적`](./1.0.9-FINAL-TRACEABILITY.md)
- [`1.0.10 Suno 수동 작업공간 최종 추적`](./1.0.10-FINAL-TRACEABILITY.md)
- [`1.0.12 개인 창작 흐름 통합 최종 추적`](./1.0.12-FINAL-TRACEABILITY.md)
- [`1.0.14 자체 호스팅 웹폰트 최종 추적`](./1.0.14-FINAL-TRACEABILITY.md)
- [`1.1.0 지정 사용자 읽기 공유 최종 추적`](./1.1.0-FINAL-TRACEABILITY.md)
- [`1.1.1 공개 링크 읽기 최종 추적`](./1.1.1-FINAL-TRACEABILITY.md)
