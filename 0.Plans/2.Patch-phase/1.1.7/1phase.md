# 1.1.7 Phase 1 — 실제 과제·동선 관찰

상태: **완료** (`complete`, 문서·관찰 Phase). `NF-REQ-039`의 이번 Phase 범위만 수행한다.

## 선행조건과 담당 경계

[1.1.6](../1.1.6/README.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DESIGN-NATIVE.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.1.7-P1-01` 승인 디자인이 적용된 웹에서 가입→곡 생성→라임/사전→프롬프트→복사→공유→복구 과제를 PC/iOS/Android별로 관찰한다. — Linux Chromium desktop과 Chromium/WebKit mobile 대리 3환경을 분리했고 실제 iOS/Android 미실행을 표시했다.
- [x] `LC-NF-1.1.7-P1-02` 기존 사용자 작업을 합성 자료로 대체해 단계 수·막힘·되돌아가기·오류 이해를 기록하고 근거 있는 개선만 우선순위화한다. — 6개 browser 관찰과 정식 5-browser 공유 증거를 연결해 화면 전환/control/복구를 기록했다.
- [x] `LC-NF-1.1.7-P1-03` 기능/데이터 계약을 바꾸는 요청은 별도 결정으로 분리하고 이번 패치의 작은 동선 개선 범위를 확정한다. — P2는 라임/프롬프트 `returnTo` 보존만 담당하고 API/DB/권한/사전/provider/native는 제외했다.

## 수용 기준

`AC-1.1.7-01`: 관찰 근거와 수정할 동선·기준 화면·성공 기준이 연결된다.

## 검증·완료·인계

- [x] 위 작업과 수용 기준에 실제 증거·환경·SHA를 연결하고 실패/미실행을 기록했다.
- [x] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [x] 설계/문서 단계는 검토와 결정 증거로 인수했고 runtime/image/개발 배포 성공을 주장하지 않았다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 같은 변경은 이전 기록을 참조했다.
- [x] SDK/외부 제공·실제 OS/기기·서명/스토어·release gate의 상태를 숨기지 않았다.

## 실행 증거

- runtime source `f8d24c610ce24a1ff926e77204783473b936da88`, 릴리스 기록 main `5a727804d7a668bf38c51b6513e3da3cb257eb6e`를 기준으로 [P1 동선 관찰](../../../docs/ux/1.1.7-flow-observation.md)을 작성했다.
- Playwright 1.62.1·격리 `_test` PostgreSQL에서 PC Chromium, Android 대리 Chromium mobile, iOS 대리 WebKit mobile의 합성 가입 오류 보존과 수직 창작 흐름 6 PASS(26.6초)다. 정식 tag CI `34871969616`의 공유/복구 5-browser 결과를 재사용했다.
- 새 라임/프롬프트 quick-add가 현재 `returnTo`를 전달하지 않는 막힘을 실제 component/page/router 경계에 연결했다. 외부 NAVER 사전은 1.0.13 no-go라 관찰 PASS로 세지 않았다.
- P1은 앱·VERSION·API·DB·migration·image·서버를 변경하지 않았다. 실제 Windows/Linux/macOS/Android/iOS 기기, 실제 OS IME/AT/zoom과 이번 P1의 Google callback은 미실행이다.

[P2](2phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
