# 1.0.1 Phase 5 — Windows 한글 IME 수정·다른 입력 필드 보존

상태: **계획 검토 / 구현 미착수**. 문서 작업만으로 실행 STATUS·runtime version을 바꾸지 않는다.

## 목표와 경계

실제 Windows Microsoft 한국어 IME의 세 관찰 문장이 저장·재열기·복사·다중 탭 이후 문자 단위로 같다. fill/paste/synthetic 이벤트는 실기기 인수를 대신하지 않는다.

담당 경로: editor/browser-sync·라임/가사/프롬프트 및 입력 필드. 정확한 파일·명령은 착수 당시 소스로 확정한다. 다른 Phase 기능·후속 선택 아이디어·승인 없는 운영 변경은 포함하지 않는다.

## 선행조건·입출력

- [P4](4phase.md)의 산출물·해당 구현 인수, 소비할 ADR/PROD/OPS와 파일 소유권을 확인한다.
- 입력은 정확한 SHA·계약·합성 fixture·실제 환경과 잔여 결함이다. 출력은 아래 작업의 산출물과 수용 증거·실패 복구·다음 담당자의 경계다.
- [베타 계약](../contracts/BETA-ACCESS.md), [버전 정책](../VERSIONING.md), [릴리스 정책](../RELEASE-POLICY.md), [품질 게이트](../QUALITY-GATES.md)를 소비한다.
- P2는 P1의 승인된 코드/운영 계약을 즉시 소비한다. P3/P4 전에는 신규 가입을 열지 않으며 CLI 인수를 UI·로고 최종 승인까지 기다리게 하지 않는다.

## 작업 체크리스트

- [ ] `LC-NF-1.0.1-P5-01` compositionstart/beforeinput/input/compositionend와 CodeMirror transaction, Yjs remote echo, React 재마운트·autosave 응답의 순서를 최소 합성 사례로 재현한 뒤 원인 경로만 수정한다.
- [ ] `LC-NF-1.0.1-P5-02` 조합 중 문서 전체 교체·stale 응답 덮어쓰기·중복 echo를 막되 조합이 오래 지속되는 Android에서 저장이 영구 대기하지 않게 확정·blur·종료 처리를 시험한다.
- [ ] `LC-NF-1.0.1-P5-03` Windows Chrome·Edge 실제 한국어 IME를 필수로 하고 Firefox 및 Android/iOS 입력을 교차 시험한다. 라임·가사·프롬프트·metadata와 offline/multitab를 같은 자료로 대조한다.
- [ ] `LC-NF-1.0.1-P5-04` 의존성·Yjs 경고를 실제 입력 결함과 분리해 조사하고 공식 보안/호환성 근거가 있는 수정만 넣는다. 무관한 major 업그레이드와 전면 포맷 변경은 제외한다.

## 구체적 수용 기준

1. 실제 Windows Microsoft 한국어 IME의 세 관찰 문장이 저장·재열기·복사·다중 탭 이후 문자 단위로 같다. fill/paste/synthetic 이벤트는 실기기 인수를 대신하지 않는다.
2. 조합 중 autosave·원격 echo·blur·undo·오프라인 재연결을 확인하고 다른 입력 필드 비교에서 손실이 없다.
3. 성공한 동일 입력/환경의 증거를 재사용하며 원인이 없는 전면 리팩터링이나 무관한 의존성 업그레이드를 하지 않는다.

## 검증과 완료 조건

- [ ] 영향받은 실제 트리거와 결과를 기존 검사 중심으로 검증하고 명령·환경·SHA·미실행을 기록했다. 동일 입력/환경의 성공 증거를 재사용한다.
- [ ] 원문·권한·기존 사용자·복구 불변조건과 위 수용 기준에 실제 증거가 있다.
- [ ] 구현 Phase의 필수 CI·동일 SHA 개발 배포·공개 smoke와 상태 기록을 인수했다. 문서-only 변경은 링크·범위·결정 검토로 구분했다.
- [ ] [FUTURE-INTAKE](../FUTURE-INTAKE.md)에 따라 저장소 전역 Future 변경을 push 전 및 Phase 완료 때 한 번 대조하고 동일 변경은 재처리하지 않았다.
- [ ] 실제 OS/기기·Google 설정·백업·외부 승인 잔여를 숨기지 않았으며 main/release 서버 변경을 별도 현재 승인 없이 실행하지 않았다.

## 다음 Phase 인계

[P6](6phase.md)에 변경 파일·migration·계약·수용 증거·잔여 항목을 넘긴다. 전체 10 Phase 인수 뒤에만 Private Beta release를 판단한다. 기존 task 재배정은 [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)에 남긴다.
