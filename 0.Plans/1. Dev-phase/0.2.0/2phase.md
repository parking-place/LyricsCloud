# 0.2.0 Phase 2 — 곡 CRUD 명령과 목록 조회

- 상태: **대기**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

곡 생성·상세 조회·수정·soft delete와 즐겨찾기·핀·색상 변경을 소유자 경계 안에서 제공한다. 곡 목록 화면이 요구하는 검색·필터·정렬 결과를 안정된 query 계약으로 만든다.

## 선행조건

- 0.2.0 Phase 1의 resource·song migration과 owner 정책이 완료되어야 한다.
- Accepted ADR의 데이터 접근 어댑터와 transaction 방식이 준비되어야 한다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [곡 목록 화면 설명](../../Mock-up/02-songs/README.md)
- [곡 작성 화면 설명](../../Mock-up/03-song-form/README.md)
- [곡 대시보드 설명](../../Mock-up/04-song-dashboard/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- 곡 생성, 한 건 조회, 수정, soft delete
- 같은 요청 재전송에 안전한 생성 idempotency
- 즐겨찾기·핀·핀 순서·색상·상태 변경
- 제목과 곡 메모의 부분 검색
- 상태 필터
- 최근 수정, 최근 생성, 오래된, 제목, 즐겨찾기 우선 정렬
- cursor 기반 목록 조회와 총 개수
- 대시보드 기본 집계 형식

## 제외 범위

- 가사 본문을 포함한 곡 검색
- 라임·프롬프트 연결 자료 필터
- 곡의 영구 삭제와 휴지통 목록
- 사용자 정의 상태 종류
- revision history와 CRDT

## 작업 체크리스트

- [ ] LC-020-P2-01 — createSong이 resource와 song을 한 transaction에서 만들고 클라이언트 요청 ID 재전송을 중복 처리하지 않게 한다.
- [ ] LC-020-P2-02 — getSong이 owner와 deleted_at 조건을 항상 포함하고 미소유 ID를 노출하지 않게 한다.
- [ ] LC-020-P2-03 — updateSong이 제목, 설명, 메모, 상태를 필드별 validation 후 함께 저장한다.
- [ ] LC-020-P2-04 — favorite, pin, pin_order, color 변경을 명시적 명령으로 분리하고 허용 값만 받는다.
- [ ] LC-020-P2-05 — deleteSong이 확인된 song만 soft delete하고 같은 요청을 다시 받아도 안전하게 종료한다.
- [ ] LC-020-P2-06 — listSongs가 제목·메모 검색, 상태 필터, 삭제 제외 조건을 조합한다.
- [ ] LC-020-P2-07 — 다섯 정렬 방식에 고유 ID tie-breaker를 추가해 cursor 페이지가 중복·누락되지 않게 한다.
- [ ] LC-020-P2-08 — 목록 결과에 제목, 메모 요약, 상태, favorite, pin, color, 수정일, lyric_count 0을 반환한다.
- [ ] LC-020-P2-09 — 대시보드 응답에 현재 버전에서 지원하지 않는 연결 수치를 0과 명시적 가능 여부로 구분한다.
- [ ] LC-020-P2-10 — 모든 명령·조회에 성공, validation, 미인증, 미소유, 이미 삭제됨 오류 코드를 적용한다.

## 검증 방법

- 같은 생성 요청 ID를 두 번 보내도 곡이 한 개만 생기는지 확인한다.
- 각 정렬에서 같은 날짜·같은 제목 fixture가 여러 페이지에 중복되지 않는지 확인한다.
- 검색어의 앞뒤 공백, 한글, 영문 대소문자, LIKE 특수문자가 안전하게 처리되는지 확인한다.
- 사용자 A/B가 같은 제목을 사용해도 서로의 검색 결과에 노출되지 않는지 확인한다.
- 삭제한 곡이 목록과 상세에서 제외되고 재삭제가 서버 오류를 만들지 않는지 확인한다.
- 상태·핀·즐겨찾기 변경 후 정렬 위치가 기대대로 달라지는지 확인한다.

## 완료 조건

- [ ] 곡 CRUD와 공통 메타데이터 명령이 owner 범위에서 동작한다.
- [ ] 생성 재시도로 중복 곡이 생기지 않는다.
- [ ] 검색·필터·다섯 정렬의 pagination이 안정적이다.
- [ ] 삭제된 곡은 기본 조회에 나타나지 않는다.
- [ ] 미지원 연결 수치가 실제 데이터처럼 오인되지 않는다.

## 산출물

- 곡 명령·조회 서비스
- 곡 API 또는 route 계약
- cursor·정렬 명세
- 오류 코드와 validation 응답
- CRUD·검색·정렬 통합 테스트

## 다음 Phase 인계

Phase 3에 listSongs query parameter, cursor, 카드용 응답, 상태·정렬 값, 빈 목록과 오류 fixture를 전달한다.
