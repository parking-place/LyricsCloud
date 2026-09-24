# 1.2.0 Phase 3 — 편집·자료·설정·공유와 복구

상태: **완료** (`complete`). [P1](1phase.md) 계약과 [P2](2phase.md) 공통 셸의 기능 SHA `f4c95883ca885a6769539d34a93df3ec6b29a1d6`/문서 SHA `f68d9a56c8be7413e0de96bd5705233ed080502a` 실제 인수 뒤 `RD-REQ-003/004/005`를 구현했다. P3 최종 기능 SHA는 `a315c07599be0aa3f4c9a58ab8757c9363e1e351`이다.

## 목표

코발트 Chroma Dock을 실제 작성·자료 연결·복사·공유·복구 흐름에 적용한다. 시각 변경과 기존 데이터/편집 인스턴스의 수명을 분리해 글쓰기 맥락을 유지한다.

## 작업

- [x] `LC-RD-120-P3-01` 가사 편집의 송폼/서브 송폼·본문·메모·제목·표시·집중·기록·공유·전체/부분/Suno 복사를 새 배치에 연결한다. CodeMirror/Yjs·IME·selection·undo·draft/outbox를 보존한다.
- [x] `LC-RD-120-P3-02` 자료 패널의 **다른 곡 / 다른 가사 / 라임 / 프롬프트** 4탭과 검색·연결/전체 범위·라임 선택/전체 삽입·복사·원본/새 창·접기를 구현한다. 탭/시트 전환이 편집 인스턴스·입력을 초기화하지 않도록 한다.
- [x] `LC-RD-120-P3-03` 곡 대시보드·새 항목 폼·라임/프롬프트 편집의 태그/문장 모드·정렬/중복·템플릿 뒤 추가·색상·연결 관리·Suno 링크·기록/복원 흐름을 보존한다. 원문 공백/개행과 복사 변환 계약을 분리해 검증한다.
- [x] `LC-RD-120-P3-04` 닉네임/사진·계정 정보·화면 기본값·문서별 표시·단축키·로그아웃/탈퇴와 인증/가입/공개 진입을 적용한다. 미리보기/저장/취소·dirty guard·오류 후 초안·Google 제공값/override의 독립성을 유지한다.
- [x] `LC-RD-120-P3-05` 공유 관리자·viewer·presence/cursor·권한 회수/만료·수정 기록·비교·휴지통/복구 화면을 구현한다. 실제 owner/writer/reader/guest 권한과 상태를 UI에 반영하고 로컬 보관을 서버 저장 완료로 표시하지 않는다.
- [x] `LC-RD-120-P3-06` 모바일 송폼/자료 시트·가상 키보드·safe area·큰 글꼴·키보드 focus/모달 종료·원문 복구를 검증한다. 두 테마의 정상/빈/오류/권한 없음 상태와 기존 저장/복사 회귀를 P4에 인계한다.

## 책임 경로

실제 `apps/web/src/components`의 가사/라임/프롬프트 편집·자료 패널·표시 설정·프로필/계정·공유/기록/복구 컴포넌트와 해당 스타일·E2E를 담당한다. 목업 `base/app.js`의 합성 사용자, localStorage 시연, textarea를 제품 저장·인증·editor로 옮기지 않는다.

## 인수와 중단 조건

[AC-RD-120-03~08](ACCEPTANCE.md)을 관련 실제 API·저장·권한 fixture와 함께 확인한다. 원문 유실·IME 중간값 확정·selection/undo 초기화·공유 권한 오류·거짓 저장 완료가 생기면 먼저 재현/수정한다. 시각 스냅샷 통과만으로 이 Phase를 닫지 않는다. 필수 CI와 같은 SHA 개발 공개 smoke, 원본 보존 rollback을 기록한 뒤 [P4](4phase.md)로 인계한다.

## 2026-09-25 기능 후보 로컬 검증

`chroma-workflows.css`로 기존 편집·자료 패널·작성 폼·설정·공유/공개 viewer·복구·인증 노드를 유지한 채 코발트 표면/반응형/모달 계층을 적용했다. CodeMirror/Yjs·draft/outbox·API/DB schema 및 권한 분기는 변경하지 않았다. `chroma-120-p3.spec.ts`는 합성 소유자/자료로 두 테마·320/390/768/1024/1440px의 편집 인스턴스/4자료 탭/본문 저장·주요 화면·새 항목/로그인을 확인한다. 공개 목업이 아니라 실제 Next 앱과 격리 DB에서 실행했다.

Node 24 production build·TypeScript, 기능 대응표 207 ID 및 현행 문서 검증, 전체 Vitest/DB 통합 **511 PASS/가입 전용 조건부 8 skip**. 최종 desktop/mobile Chromium 묶음 **84 PASS/조건부 6 skip**(P3 신규 6건, 기존 편집/자료·공유/권한/프로필/복구 사례 포함). 모바일 집중 전환 시 스크롤 66px 이동과 프롬프트 기록 모달이 헤더 아래로 들어가는 두 실패는 원인을 CSS 높이/stacking으로 확인해 수정하고 동일 입력과 최종 묶음으로 재검증했다. 과거 B1 전용 레일/프로필/홈 문구 단언은 Chroma의 실제 탐색 경로를 검사하도록 분기했으며 B1 경로는 유지한다. 필수 CI·signed dev image·같은 SHA 개발 공개 smoke는 완료 전 별도 갱신한다. 실제 물리 기기·OS IME·AT는 사용자 지시로 보류/미실행이며 PASS에 합산하지 않는다.

### 첫 공개 후보와 시간대 hydration 보정

첫 기능 SHA `1e3552a80c86f87552701fdeba85a66257166a8e`의 push Actions `36039946057`은 verify·네 signed dev image/provenance SUCCESS, PR #160 Actions `36039975752`는 첫 시도 WebSocket DB 통합 테스트의 15초 timeout 1건 후 같은 SHA 두 번째 시도 verify SUCCESS다. 개발 서버는 해당 SHA·`1.2.0/dev/p3`·Chroma·schema 1152·네 healthy와 공개 live/ready 일치를 확인했다. 기존 P2 범위 공개 4문맥/20화면 smoke는 PASS였지만, P3 합성 자료 공개 4문맥/20화면에서는 비어 있지 않은 휴지통 hydration의 React #418이 반복되어 **첫 SHA의 P3 인수는 실패**다.

같은 항목의 SSR 출력은 UTC `2026. 9. 24. 오후 7:07`, 서울 시간 브라우저 출력은 `2026. 9. 25. 오전 4:07`로 달랐다. `trash-screen.tsx`의 날짜 표기에 기존 최근/즐겨찾기 화면과 동일한 명시적 `Asia/Seoul` 시간대를 적용하고, UTC/서울 브라우저에서 비어 있지 않은 휴지통의 hydration 오류가 없는 회귀를 추가했다. 보정 기능 SHA의 CI·이미지·재배포·같은 입력 공개 smoke가 끝나기 전까지 P3는 `in_progress`다. 공개 시험의 합성 자료는 개별 삭제 및 계정 fixture 정리로 제거한다.

두 번째 후보 `e445631e9887d47df37f8b4f42c960145c6e091f`의 push/PR Actions `36046496335`/`36046502725`는 각각 기존 P6 백업 lock 경합 시험과 0.9.1 성능 반복/오류 예산에서 실패했다. 성공한 첫 후보의 CI로 대체하지 않으며 이 SHA를 개발 서버에 배포하지 않았다. 추가 UTC/서울 교차 시험에서는 비어 있지 않은 곡 대시보드의 같은 React #418이 재현되어 두 번째 후보 자체도 P3 인수 불가다. 후속 후보는 곡/가사/라임/프롬프트 목록·기록·자료·검색·템플릿·공유 만료일의 날짜 표시를 명시적 서울 시간으로 통일하고 휴지통과 곡 대시보드의 desktop/mobile × UTC/서울 hydration 회귀를 포함한다. 이 후속 후보의 CI·signed image·동일 SHA 공개 smoke 전에는 P3 완료를 선언하지 않는다.

## 2026-09-25 최종 원격·개발 공개 인수

최종 기능 SHA `a315c07599be0aa3f4c9a58ab8757c9363e1e351`가 원격 `phase/1.2.0-p3-editor-resources`와 일치한다. [push Actions 36047345436](https://github.com/parking-place/LyricsCloud/actions/runs/36047345436)은 전체 verify·네 개발 이미지의 서명과 provenance SUCCESS, [PR #160 Actions 36047351494](https://github.com/parking-place/LyricsCloud/actions/runs/36047351494)는 verify SUCCESS다. 이미지 digest는 web `42d722522d191a13cbc599969fb65c99bbf7d256684911f3a56dd1a58107f0d2`, collaboration `ae6d42673b01f05de1d8f5730e3346be555506434b69e17a1ca0ec17687bc915`, worker `d183f013c52523f2bb781c278a26e04721babfa92069ed2a13542da6ea25e337`, migrate `3b781e9201bb74d6212286d5158830626db4d5827ef989728a2a516fad9f3c35`다.

로컬 Node 24 production build/typecheck, 기능 대응표 207 ID, 교차 시간대 회귀 **desktop/mobile 4 PASS**, 편집·공유·권한·프로필·시간대 집중 **30 PASS/조건부 2 skip**을 최종 후보에서 확인했다. P3 초기 후보의 전체 Unit/DB **511 PASS/조건부 8 skip**과 브라우저 **84 PASS/조건부 6 skip**은 변경 전 선행 근거이고, 최종 tree의 전체 범위는 위 CI 성공으로 인수한다. 기존 B1 편집·권한·원문·저장 분기는 유지했다. 날짜 hydration은 빈 화면에서 보이지 않았던 결함이므로 UTC/서울과 실제 합성 자료를 포함해 재검사했다.

개발 배포 스크립트가 같은 SHA로 정상 종료했다. 서버 checkout/BUILD_ID/공개 HTTPS live·ready는 모두 `a315c07`, `1.2.0/dev/p3`, schema `1152_prompt_dictionary_cascade.sql`, 네 서비스 healthy다. 합성 계정의 기존 P2 화면 **4문맥/20 route** PASS, P3 서울·UTC 각각 PC/mobile × light/dark **4문맥/52 route·자료 4탭 16회**, 본문 실제 API 저장, 가로 넘침·pageerror·HTTP 5xx 모두 0이다. 합성 자료는 개별 soft delete 후 합성 계정 정리로 제거했다. 초기 실패 후보 2개와 첫 공개 hydration 실패는 최종 PASS에 합산하지 않는다. 실제 Windows/iOS/Android 기기·OS IME·접근성 보조기술 검증은 사용자 지시로 **미실행/후속 보류**이며 대리 브라우저 PASS와 구별한다. P4는 이 SHA의 기능·데이터 보존/접근성/성능을 통합 재검증한다. `main`·정식 tag/image·릴리스 서버 변경은 없다.
