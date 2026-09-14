# 1.1.7 Phase 2 — 탐색·복귀 기반 개선

상태: **검토 중** (`review`, 로컬 후보 검증 완료·CI/동일 SHA 개발 인수 대기). `NF-REQ-039`의 이번 Phase 범위만 수행한다.

## 선행조건과 담당 경계

[P1](1phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DESIGN-NATIVE.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.1.7-P2-01` 실제 막힘이 있는 메뉴/패널/이전 위치 복원·새 문서 후 이동을 기존 라우팅 안에서 수정한다. — quick-add가 현재 가사 경로를 새 라임·프롬프트에 전달하고 생성 성공·편집기 back이 같은 경로로 복귀한다.
- [x] `LC-NF-1.1.7-P2-02` 현재 선택 자료·permission revoked·오프라인 상태를 이동 뒤에도 보존하고 잘못된 성공 안내를 없앤다. — 허용된 path/query를 그대로 보존하되 외부·계정 경로는 자료별 목록으로 차단하며 API·DB·권한·저장 상태는 변경하지 않았다.
- [x] `LC-NF-1.1.7-P2-03` 키보드 focus와 모바일 back의 반환 위치를 명시하여 초안·history·copy를 보존한다. — desktop 편집기 back과 mobile browser back에서 원래 가사 URL·한글 본문·focus 가능·overflow 없음이 3환경에서 통과했다.

## 수용 기준

`AC-1.1.7-02`: 관찰한 실패 과제가 최소 경로에서 재현되지 않고 데이터/이동 상태가 맞는다.

## 실행 증거

- 기준 main은 `ce28a63f71853b4254efd7dbdd42cddd62ad8571`이다. 실패 우선 계약은 구현 전 2 FAIL/1 PASS였고 최소 구현 뒤 계약·return helper·runtime config 24 PASS다.
- Node 24.20.0에서 architecture boundary·lint·typecheck·Next production build가 통과했다.
- 격리 PostgreSQL에서 Chromium desktop·Chromium mobile(Android browser 대리)·WebKit mobile(iOS browser 대리)의 새 라임/프롬프트 생성→정확한 중첩 `returnTo`→가사 본문 복귀가 3 PASS다.
- 같은 세 환경에서 기존 곡→가사→라임 삽입→문장형 프롬프트→Suno→재진입, 1.1.6 생성·연결 화면과 신규 복귀의 영향 회귀가 9 PASS다.
- 첫 원격 후보 `5ae6f30ca44dc7771059677035ab6f448967702a`는 명시되지 않은 기본 목록 복귀도 편집 URL query에 붙여 기존 직접 생성·템플릿·오프라인 복구 14건을 실패시켰다. 기존 URL 계약을 유지하도록 명시적 `returnTo`에만 query를 붙인 뒤 실패 14건과 신규 복귀 2건을 desktop/mobile에서 16 PASS했고 전체 CI를 다시 요구한다.
- API·DB schema·migration·권한·copy 형식은 변경하지 않았다. 실제 Android/iOS 앱·물리 기기·OS IME·AT·OS zoom은 미실행이며 browser 대리 PASS로 바꾸어 쓰지 않는다.
- 상세 명령·공개 개발 인수/rollback 조건은 [P2 인수 문서](../../../docs/runbooks/1.1.7-phase2-return-flow.md)에 고정했다. 필수 CI·네 dev image·동일 SHA 개발 공개 smoke 전에는 Phase 완료가 아니다.

## 검증·완료·인계

- [ ] 위 작업과 수용 기준에 실제 증거·환경·SHA를 연결하고 실패/미실행을 기록했다.
- [ ] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [ ] 설계/문서 단계는 검토와 결정 증거로, 구현 단계는 필수 CI·동일 SHA 개발 공개 smoke 및 플랫폼별 실제 앱 증거로 인수했다.
- [ ] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 같은 변경은 이전 기록을 참조했다.
- [ ] SDK/외부 제공·실제 OS/기기·서명/스토어·release gate의 상태를 숨기지 않았다.

[P3](3phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
