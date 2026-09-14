# UX P5 승인 디자인 manifest

## 승인

- 상태: Accepted for implementation handoff
- 선택: B-1, 통합 workspace + Flat-depth
- 사용자 근거: 2026-09-14 직전 B-1 확인 질문에 “1.1.14까지 달렷”이라고 답해 B-1 선택과 UX P3~P5, 계획된 1.1.5~1.1.14 실행을 승인했다.
- 조건: 기능 삭제 없음. 위치·위계·불투명 surface만 점진 전환하며 CodeMirror/Yjs·IME·selection/undo·초안·권한/복구·URL/API/DB 계약을 유지한다.
- P4 판정: mobile layout 세부 수정만 있었고 B-1의 구조·morphism 의미는 바뀌지 않아 재선택이 필요하지 않다.

## 고정 입력

| 입력 | commit/blob |
|---|---|
| 제품 기준 v1.1.4 source | 5f8a04512c005cb7c211630dc8bf43f42787b60f |
| UX P1 merge | 99dd5809a00a0498210b79685cb135bc9aa0ac19 |
| UX P2 B-1 선택 merge | 7e290c145833eb9cd7092b516f2f462b8b42a435 |
| UX P3 목업 merge | 3ea75152266c93f1cc881b39e8b1f82094a1de25 |
| UX P4 검토·수정 merge | f2b2b8f37c2be0c17bc599e5ed4a8b8f9cb12a19 |
| new_Mock-up tree | 482b6a4d6a04f7a9402a2bb004a34caf4fa6af1e |
| mockup.css blob | 05008cc6a1371be4b7fe9ba8921eb7261e91a3b7 |
| mockup.js blob | 13e175beced0837195f0952e550fa2c58802ab72 |
| P4 검토 blob | f9330d5e511ef694d03ecc3fbc52adff9adbba0c |

tree/blob은 Git object ID이며 외부 asset checksum이 아니다. 1.1.5 착수 때 최신 main과 이 입력을 다시 대조하고 P5 이후 디자인 변경은 새 승인 또는 명시적 결함 수정 기록을 요구한다.

## 선택안

- 구조: desktop primary rail 하나, mobile bottom navigation 하나, 곡 작업공간의 다음 행동 우선, editor 본문+자료 context.
- 스타일: light/dark semantic token과 불투명 canvas/panel/surface/surface-raised, control/compact/panel 세 radius, 명시적 focus.
- 상태: 정상/로딩/빈/오류, code 만료, offline, 미전송, IME, 권한 철회와 자기 입력 복구.
- 플랫폼 문맥: Windows/Linux/macOS, iOS/Android를 별도 query와 README로 구분한다. 이는 native 구현 완료를 뜻하지 않는다.
- 기능: 18화면, 목록+세 grid, 송폼 subtag/Extend, 문장형 prompt, Suno 수동 연결, 공유 read/write/presence/cursor, 폰트 preview, 사전 미연결 tooltip.

## 검토 증거

- P3: 231조합, horizontal overflow 0, serious/critical Axe 0.
- P4: 396페이지, horizontal overflow 0, Axe 144검사 0, keyboard/focus 72검사 0.
- reduced-motion+forced-colors fallback PASS, backdrop/filter/외부 요청 0.
- P4 수정: mobile editor label, 320px toolbar field, 320px share editor 6px overflow.
- 보호된 0.Plans/Mock-up diff 0. 앱/runtime VERSION/DB/개발·릴리스 서버 변경 없음.

## 미실행

실제 NVDA/VoiceOver/TalkBack, 실제 OS/물리 기기, OS IME, OS zoom, safe-area/keyboard, 저사양 GPU/배터리는 이 manifest의 PASS가 아니다. native SDK·서명·스토어는 각 플랫폼 계획의 조건부 gate다.

## 구현 소비

[1.1.5 인계](ux-p5-to-1.1.5-handoff.md), [전체 인덱스](../../0.Plans/2.Patch-phase/new_Mock-up/index.html), [상태 행렬](../../0.Plans/2.Patch-phase/new_Mock-up/screen-matrix.md), [토큰](../../0.Plans/2.Patch-phase/new_Mock-up/design-tokens.md), [제품 매핑](../../0.Plans/2.Patch-phase/new_Mock-up/component-mapping.md), [interaction 계약](../../0.Plans/2.Patch-phase/new_Mock-up/interaction-contract.md), [P4 검토](ux-p4-usability-accessibility-review.md)을 함께 소비한다.
