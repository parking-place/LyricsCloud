# LyricsCloud new_Mock-up — B-1 통합 작업공간

UX P2에서 사용자가 선택한 **B-1(통합 작업공간 + Flat-depth)**을 기존 제품 계약 위에 구체화한 설계 세트다. 보호된 `0.Plans/Mock-up/**`는 수정하지 않으며, 이 폴더의 결과도 UX P5 구현 인수 전에는 제품 코드의 확정 기준이 아니다.

UX P5에서 [승인 design manifest](../../../docs/ux/ux-p5-approved-design-manifest.md)로 구현 인수를 확정했다. 제품 적용은 1.1.5 이후 각 Phase의 실제 회귀·동일 SHA 개발 인수와 별도 release gate를 따라야 한다.

## 검토 시작

- [전체 화면 인덱스](index.html)
- [화면·상태·플랫폼 행렬](screen-matrix.md)
- [디자인 토큰](design-tokens.md)
- [제품 컴포넌트 전환 매핑](component-mapping.md)
- [interaction·overlay 계약](interaction-contract.md)
- [P3/P4 검토 변경 기록](review-changelog.md)

각 화면 폴더에는 목적·정보·동선·상태·플랫폼·접근성을 적은 `README.md`와, query로 테마·플랫폼·상태를 바꾸는 `mockup.html`이 있다. 인덱스는 18개 화면의 PC/iOS/Android 및 대표 안전 상태로 바로 연결한다.

## 정적 목업과 동작 prototype의 경계

`mockup.html`은 검토 편의를 위한 **정적 동작 prototype**이다. 화면 이동과 theme/platform/state 선택은 작동하지만 서버 저장, OAuth, 초대 코드 소비, 권한 변경, collaboration 연결, 사전 조회, clipboard 쓰기는 수행하지 않는다. 표시되는 가사·메일·상태는 전부 합성 fixture다.

따라서 화면의 `서버에 저장됨`, presence, cursor, 공유 권한 표시는 상태 표현안이지 실제 backend 성공 증거가 아니다. 실제 구현은 현행 API·DB·Yjs·CodeMirror 계약과 1.1.5 이후 각 Phase의 회귀 테스트를 통과해야 한다.

## 유지하는 기능 범위

- 가입/코드 실패, 곡과 가사, 라임, 프롬프트, 검색, 최근, 즐겨찾기/핀, 휴지통, 템플릿, 설정과 계정
- 목록 및 소형·중형·대형 grid, 송폼 subtag/구조, Extend 계열 삽입, 문장형 prompt, Suno 수동 연결
- light/dark, Windows/Linux/macOS, iOS/Android, 320px 이상 반응형
- IME 조합 보류, 오프라인·미전송 원문 보존, 권한 철회·자기 입력 복구, 읽기/쓰기 공유와 presence/cursor
- 한글·영어·일본어 glyph/fallback 미리보기와 사전 제공자 미연결 고지

기능 삭제는 승인되지 않았다. 이번 선택은 중복 navigation과 긴 모바일 동선을 줄이도록 위치·위계·표면을 바꾸는 설계이며 기존 URL/API/DB/권한·복구 계약을 바꾸지 않는다.

## 아직 실제 인수가 아닌 항목

실제 Windows/macOS/Linux/iOS/Android OS, 실제 IME, NVDA/VoiceOver/TalkBack, 물리 touch target, GPU/배터리, native safe-area/keyboard는 P3 HTML만으로 PASS 처리하지 않는다. P4가 자동 검증과 실제 수행/미수행 경계를 기록하고, 의미가 크게 바뀌면 사용자에게 다시 확인한다.

[UX 계획](../design/UX/README.md), [디자인/native 계약](../contracts/DESIGN-NATIVE.md), [도구 계획](../TOOLS-AND-SKILLS.md)을 따른다.
