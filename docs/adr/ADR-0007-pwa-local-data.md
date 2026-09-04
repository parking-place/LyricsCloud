# ADR-0007 — PWA와 계정별 로컬 저장

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-04-A

## 대안

1. Workbox + Dexie: service worker lifecycle과 IndexedDB schema를 명시적으로 관리한다.
2. 브라우저 API 직접 구현: 의존성은 적지만 migration·재시도·update 처리 부담이 크다.
3. 로컬 저장 없음: 오프라인 초안 복구 요구를 충족하지 못한다.

## 권고 결정

Dexie DB 이름과 모든 row key를 내부 `account_id` + `resource_id`로 격리한다. 로컬에는 미전송 CRDT update, 최신 draft metadata, 재시도 상태만 두고 인증 응답과 전체 서버 자료는 Cache Storage에 넣지 않는다. Workbox precache는 해시된 app shell 정적 자원만 허용한다.

새 service worker는 dirty 문서가 없을 때만 activate/reload한다. dirty 상태면 저장·내보내기·나중에 업데이트 선택을 제공한다. 로그아웃·계정 전환·탈퇴는 해당 계정 IndexedDB, Cache Storage, BroadcastChannel 상태를 정리하고 완료 전 다른 계정 화면을 열지 않는다.

## 검증·보안·철회

- offline typing, browser kill, quota 초과, schema migration 실패, 계정 A→B 전환, update 대기를 시험한다.
- Dexie 교체 시 versioned local-store adapter와 export/clear contract를 유지한다.
