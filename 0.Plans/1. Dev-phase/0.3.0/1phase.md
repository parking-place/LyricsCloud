# 0.3.0 Phase 1 — 가사 resource와 CRUD

- 상태: **대기**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

한 곡에 여러 개의 독립 가사를 둘 수 있는 lyrics subtype을 만들고, 순수 텍스트 원본·제목·작업 상태·메모를 안전하게 생성·조회·수정·복제·soft delete한다.

## 선행조건

- 0.2.0의 resources, songs, owner 정책, 대시보드 가사 영역 계약이 완료되어야 한다.
- 데이터 접근과 CRDT 경계 ADR이 Accepted 상태여야 한다.
- CRDT 구현과 자동 수정 기록은 다음 0.3.1이라는 버전 경계를 유지한다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [가사 편집 화면 설명](../../Mock-up/05-lyrics-editor/README.md)
- [곡 대시보드 설명](../../Mock-up/04-song-dashboard/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- lyric resource와 lyrics subtype
- 소속 song, 순수 텍스트 body, 작업 상태, 본문과 분리된 메모
- 한 곡의 여러 가사
- 생성, 한 건 조회, 현재본 수정, 복제, soft delete
- 즐겨찾기와 핀
- 최근 수정순 목록과 lyric_count
- 부모 곡·가사 소유자 일치 제약
- 생성·복제 요청의 idempotency

## 제외 범위

- CRDT update·snapshot·동기화 서버
- resource_revisions와 수정 기록 복원
- 버전 비교
- 가사 템플릿
- 글꼴·크기·자간·줄 간격 override
- 라임·프롬프트 연결

## 작업 체크리스트

- [ ] LC-030-P1-01 — lyric resource가 정확히 하나의 lyrics row와 하나의 소유 song을 갖도록 PK·FK를 정의한다.
- [ ] LC-030-P1-02 — song과 lyric의 owner_id가 반드시 일치하도록 DB와 서비스 양쪽에서 강제한다.
- [ ] LC-030-P1-03 — title, UTF-8 순수 텍스트 body, status, memo의 길이와 빈 값 규칙을 정의한다.
- [ ] LC-030-P1-04 — createLyric이 한 transaction에서 resource와 lyrics를 만들고 재시도 중복을 막는다.
- [ ] LC-030-P1-05 — updateLyricCurrent가 HTML이나 editor 내부 구조가 아닌 전체 순수 텍스트 현재본만 저장하게 한다.
- [ ] LC-030-P1-06 — duplicateLyric이 원본을 바꾸지 않고 제목 규칙과 본문·메모·상태를 새 ID로 복사한다.
- [ ] LC-030-P1-07 — deleteLyric이 soft delete하고 song의 활성 lyric_count가 즉시 줄어들게 한다.
- [ ] LC-030-P1-08 — listSongLyrics가 최근 수정순과 안정된 tie-breaker로 카드 데이터를 반환한다.
- [ ] LC-030-P1-09 — favorite·pin·status 명령을 owner 범위에서 제공하고 삭제된 가사에는 적용하지 않는다.
- [ ] LC-030-P1-10 — CRDT·revision 저장 필드나 특정 CRDT 패키지 구조를 이 migration에 미리 넣지 않는다.

## 검증 방법

- 같은 곡에 제목이 같은 가사를 여러 개 만들 수 있고 각각 다른 ID로 수정되는지 확인한다.
- 사용자 A의 song에 사용자 B의 lyric을 연결하려는 DB·API 요청이 모두 거부되는지 확인한다.
- 한글, 영어, 이모지, 대괄호 송폼, 빈 줄이 포함된 본문을 저장·재조회해 바이트 손실이 없는지 확인한다.
- 같은 생성·복제 요청을 재전송해 한 개만 만들어지는지 확인한다.
- 가사 soft delete 전후 song lyric_count와 최근 목록이 정확한지 확인한다.
- 본문에 HTML 문자열을 넣어도 구조로 실행되지 않고 텍스트 그대로 반환되는지 확인한다.

## 완료 조건

- [ ] lyric schema와 CRUD가 migration·서비스로 재현된다.
- [ ] 한 곡의 여러 가사가 서로 독립적으로 유지된다.
- [ ] 원문이 순수 텍스트로 손실 없이 왕복한다.
- [ ] 부모·자식 owner 무결성과 교차 계정 차단이 동작한다.
- [ ] 복제·삭제·lyric_count가 일관된다.
- [ ] CRDT와 수정 기록이 0.3.0 schema에 결합되지 않았다.

## 산출물

- lyrics migration
- 가사 CRUD·목록 명령
- 제목·본문·메모 validation 계약
- 복제·soft delete 규칙
- 소유권·원문 왕복 통합 테스트

## 다음 Phase 인계

Phase 2에 lyric ID, title·body 응답, 현재본 저장 명령, 서버 변경 token, 오류 코드, 한글·장문 fixture를 전달한다. 서버 변경 token은 동시 병합 형식이나 수정 기록으로 해석하지 않는다.
