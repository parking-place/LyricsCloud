# 0.2.0 Phase 1 — 공통 resource와 곡 데이터 모델

- 상태: **완료**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

곡, 가사, 라임 노트, 프롬프트가 이후 통합 검색·즐겨찾기·핀·휴지통에서 같은 방식으로 다뤄질 수 있도록 공통 resource를 만들고, 첫 subtype인 song의 무결성과 소유권을 migration으로 고정한다.

## 선행조건

- 0.1.0이 완료되어 검증된 내부 사용자 ID와 owner context가 있어야 한다.
- 데이터 접근·migration ADR이 Accepted 상태여야 한다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [곡 목록 화면 설명](../../Mock-up/02-songs/README.md)
- [곡 작성 화면 설명](../../Mock-up/03-song-form/README.md)
- [곡 대시보드 설명](../../Mock-up/04-song-dashboard/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- resources 공통 식별자와 owner
- 제목, 즐겨찾기, 핀, 핀 순서, 색상, 생성·수정·삭제 시각
- songs의 설명, 작업 메모, 작업 상태
- 고정 상태 목록과 DB 제약
- owner·삭제 여부·정렬에 필요한 index
- 공통 resource와 song의 1:1 무결성
- 소유자 경계와 soft delete 기본 규칙
- fixture와 migration rollback 검증

## 제외 범위

- lyrics, rhyme_notes, prompts, templates subtype
- resource revision과 CRDT 업데이트
- 곡 연결 자료
- 통합 검색 문서
- 휴지통 화면과 완전 삭제

## 작업 체크리스트

- [x] LC-020-P1-01 — resources에 UUID, owner_id, type, title, favorite, pin, pin_order, color, created_at, updated_at, deleted_at을 정의한다.
- [x] LC-020-P1-02 — songs가 정확히 하나의 song resource만 참조하도록 PK·FK·type 일치 규칙을 만든다.
- [x] LC-020-P1-03 — 아이디어, 가사 작성 중, 수정 중, Suno 생성 중, 믹싱 중, 완성, 보류 상태만 저장되게 한다.
- [x] LC-020-P1-04 — 제목 필수 여부, 앞뒤 공백 처리, 제목·설명·메모 길이 상한을 schema와 validation 계약에 맞춘다.
- [x] LC-020-P1-05 — owner_id와 deleted_at, updated_at, pin 순서 조합의 실제 목록 query에 맞는 index를 설계한다.
- [x] LC-020-P1-06 — 생성·수정 시각은 DB 시간이 결정하고 updated_at이 업무 변경에만 갱신되게 한다.
- [x] LC-020-P1-07 — 현재 사용자의 resource와 song만 읽고 변경할 수 있도록 owner 정책을 적용한다.
- [x] LC-020-P1-08 — song soft delete가 resource의 deleted_at을 한 transaction에서 갱신하도록 규칙을 만든다.
- [x] LC-020-P1-09 — migration up·down 또는 안전한 후속 rollback 절차와 대표 fixture를 준비한다.

## 검증 방법

- song subtype 없이 song resource만 만들거나 반대로 song row만 만드는 시도가 거부되는지 확인한다.
- 허용되지 않은 상태, 빈 제목, 과도한 길이, 잘못된 색상 값을 넣어 제약이 동작하는지 확인한다.
- 사용자 A가 사용자 B의 resource와 song을 직접 조회·갱신·삭제하지 못하는지 확인한다.
- soft delete 후 기본 목록 query에서 사라지고 원본 row는 남는지 확인한다.
- 최근 수정, 제목, 핀 우선 query를 대표 데이터로 실행해 index 사용 계획을 검토한다.
- 빈 DB부터 migration 후 fixture 생성, rollback 또는 복구 절차를 반복한다.

## 완료 조건

- [x] resource와 song schema가 migration으로 재현된다.
- [x] 공통 메타데이터와 song 상태의 DB 무결성이 보장된다.
- [x] owner 교차 접근이 차단된다.
- [x] soft delete가 기본 조회에서 제외된다.
- [x] 목록 정렬용 index가 대표 query와 일치한다.
- [x] revision·CRDT가 이 버전에 섞이지 않았다.

## 산출물

- resources·songs migration
- 상태·색상·길이 validation 계약
- owner·soft delete 정책
- 대표 fixture
- schema·index 검증 기록

## 다음 Phase 인계

Phase 2에 resource·song 생성 transaction, 허용 상태, validation 제한, owner 정책, soft delete query 조건과 fixture를 전달한다.
