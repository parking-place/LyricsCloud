# 0.3.0 Phase 3 — 송폼 인식·강조·구간 탐색

- 상태: **대기**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

가사 원문을 바꾸지 않고 대괄호 송폼 줄을 파싱해 편집기 안에서 구분하고, PC 좌측 목차와 모바일 시트에서 반복되는 구간까지 정확히 찾아 이동하게 한다.

## 선행조건

- 0.0.0의 관련 ADR이 모두 Accepted 상태이며 이 Phase는 승인 결과를 따라야 한다.
- 0.3.0 Phase 2의 CodeMirror transaction·scroll·selection 경계가 준비되어야 한다.
- 송폼 문법과 사용자 정의 label 처리 규칙을 수용 기준으로 기록해야 한다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [가사 편집 화면 설명](../../Mock-up/05-lyrics-editor/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- 줄 전체가 대괄호 label인 송폼 문법
- Intro, Verse, Pre-Chorus, Chorus, Hook, Bridge, Outro와 번호·Final 변형
- 사용자 정의 대괄호 label
- 반복 label의 표시 순서와 고유 section ID
- CodeMirror line decoration
- PC 좌측 송폼 목차
- 모바일 송폼 bottom sheet
- 현재 viewport·cursor에 따른 active section
- section 시작·끝 offset 계산

## 제외 범위

- 송폼을 별도 DB row로 저장
- AI 기반 구조 추론
- 구간 드래그 재배치
- CRDT position 매핑
- 구간 복사는 Phase 4
- 이전 revision의 송폼 비교

## 작업 체크리스트

- [ ] LC-030-P3-01 — 앞뒤 공백을 제외한 한 줄 전체가 비어 있지 않은 대괄호 label일 때만 section으로 인식한다.
- [ ] LC-030-P3-02 — Intro, Verse 1, Pre-Chorus, Final Hook과 한글·사용자 label을 원문 그대로 보존한다.
- [ ] LC-030-P3-03 — 같은 Hook이 반복될 때 문서 순서 기반 occurrence와 offset으로 각각 다른 section ID를 만든다.
- [ ] LC-030-P3-04 — 닫는 대괄호 누락, 줄 안쪽 대괄호 문장, 빈 대괄호는 일반 가사로 처리한다.
- [ ] LC-030-P3-05 — parser 결과로 tag line과 section 범위를 계산하고 별도 파서 복사본을 UI마다 만들지 않는다.
- [ ] LC-030-P3-06 — CodeMirror decoration으로 tag line을 강조하되 editor document와 undo history를 변경하지 않는다.
- [ ] LC-030-P3-07 — PC 좌측 목차에서 section을 선택하면 해당 tag line을 읽을 수 있는 여백으로 스크롤한다.
- [ ] LC-030-P3-08 — 모바일 시트에서 section 선택 후 시트를 닫고 editor focus와 해당 위치를 복원한다.
- [ ] LC-030-P3-09 — cursor·viewport 변화에 따라 active section을 갱신하되 스크롤 중 과도한 렌더를 제한한다.
- [ ] LC-030-P3-10 — 10만 자·수백 section 문서에서 변경된 범위 중심으로 parser·decoration 성능을 검증한다.

## 검증 방법

- 표준 영문 태그, 한글 태그, 번호·Final 변형, 반복 Hook fixture의 목차와 offset을 snapshot 비교한다.
- 불완전 대괄호와 본문 안의 대괄호가 오탐되지 않는지 확인한다.
- tag 바로 앞·본문 중간·다음 tag 직전 cursor에서 active section이 맞는지 확인한다.
- 목차 이동 후 PC와 모바일 모두 정확한 tag가 보이고 focus가 editor로 돌아오는지 확인한다.
- decoration을 켰다 꺼도 body 문자열과 undo history가 동일한지 확인한다.
- 장문 문서에서 입력·스크롤 프레임 저하가 정한 기준을 넘지 않는지 측정한다.

## 완료 조건

- [ ] 표준·사용자 송폼을 원문 변경 없이 인식한다.
- [ ] 반복 section마다 고유 탐색 대상이 있다.
- [ ] PC 목차와 모바일 시트가 같은 parser 결과를 사용한다.
- [ ] 잘못된 대괄호 문장이 section으로 오인되지 않는다.
- [ ] 이동 뒤 focus와 스크롤 위치가 정확하다.
- [ ] 장문에서도 편집 반응성이 유지된다.

## 산출물

- 순수 송폼 parser
- section·offset 타입
- CodeMirror 송폼 decoration
- PC 송폼 목차
- 모바일 송폼 시트
- parser·탐색·성능 테스트

## 다음 Phase 인계

Phase 4에 원문 순서의 section 배열, 각 tag 포함 범위, 반복 label 식별자, 현재 active section과 선택 상태 API를 전달한다.
