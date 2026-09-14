# B-1 interaction·overlay 계약

정적 prototype에 구현하지 않은 modal/sheet/portal 동작을 제품 전환 전에 고정한다.

## navigation·focus

- viewport마다 primary navigation은 하나만 노출한다. desktop rail과 mobile bottom navigation을 동시에 keyboard 순서에 넣지 않는다.
- 761px 이상은 rail, 760px 이하는 bottom navigation을 사용한다. 전환 뒤 현재 route와 main heading에 focus 문맥을 유지한다.
- 화면 이동은 현행 URL/deep link와 browser back/forward를 유지한다. 최근 작업은 저장된 자료/cursor가 유효할 때만 복귀한다.
- desktop rail 축소 상태를 구현한다면 icon마다 접근성 이름과 40px 이상 target을 유지하고 tooltip은 hover뿐 아니라 focus에도 연다.

## modal·sheet·portal

- 열 때 trigger를 저장하고 최초 heading 또는 첫 의미 있는 control로 focus를 옮긴다.
- 열린 동안 Tab/Shift+Tab을 overlay 안에 가두고 Escape/닫기/완료 뒤 원래 trigger로 복귀한다. trigger가 제거됐으면 관련 section heading으로 복귀한다.
- mobile keyboard가 열리면 sheet는 visual viewport와 safe-area를 따르고 저장/취소/복구 action을 가리지 않는다.
- portal root는 문서의 semantic light/dark token을 상속한다. system theme 변경 중 editor와 입력을 재마운트하지 않는다.
- destructive confirm과 permission revoke는 별도 dialog이며 기본 focus를 파괴 동작에 두지 않는다.

## editor·복구

- context panel/sheet 전환은 같은 CodeMirror/Yjs instance를 유지하고 selection·undo·IME composition을 보존한다.
- 조합 중 navigation·theme·sheet 동작은 composition 확정으로 가장하지 않는다.
- offline·미전송·권한 철회는 한 문장 요약, 직접 복구 행동, 필요할 때 상세 설명 순서다.
- 권한이 끝난 자기 입력은 owner 본문에 자동 replay하지 않고 계정·자료 범위 복구함에서만 복사/내려받기 한다.

## platform 차이

- iOS는 safe-area와 interactive keyboard inset을, Android는 system back과 predictive back 후보를 각 구현 Phase에서 실제 SDK로 확인한다.
- Windows/Linux/macOS 제목·menu·shortcut 차이는 shell 장식이 아니라 native 계획의 실제 focus/IME/창 lifecycle gate에서 확정한다.
- 이 문서는 실제 native 동작이 검증됐다는 증거가 아니다.
