# 1.2.0 Phase 2 — 코발트 토큰·공통 셸·탐색과 목록

상태: **진행 중** (`in_progress`). P1 문서 인수 `400416577490ee8e6a3bc64d6ce6688f0e9ce9b5`에서 `phase/1.2.0-p2-chroma-shell-lists`를 분기했다. [P1](1phase.md) 기능·계약 SHA `84761ae1ca25f1b5e5dd808e772d1a062066cd57`를 인수해 `RD-REQ-001/002/005`를 구현한다.

## 목표

선정한 [코발트 목업](mockup/index.html)의 표면과 탐색을 실제 웹/PWA 공통 컴포넌트로 옮긴다. PC와 모바일, light/dark를 같은 Phase에서 제공하며 기존 route·기능·정렬·데이터 의미를 보존한다.

## 작업

- [x] `LC-RD-120-P2-01` light/dark 토큰과 button/input/tab/chip/card/dialog 기반 스타일을 공통 계층으로 구현한다. 위험/경고/저장/권한 상태와 사진·사용자 지정 색상의 독립성을 유지한다.
- [x] `LC-RD-120-P2-02` 브랜드·위치·프로필·도움말·빠른 추가·PC 도크·모바일 더보기로 10개 목적지에 접근하게 한다. 키보드/터치·focus/active·안전한 홈/뒤로 이동을 실제 guard와 연결한다.
- [x] `LC-RD-120-P2-03` 홈의 이어쓰기·아이디어·연결 자료·곡 모듈을 실제 데이터와 연결한다. 로딩·빈 상태·실패 시 합성 수치나 거짓 저장 상태를 표시하지 않는다.
- [x] `LC-RD-120-P2-04` 곡·라임·프롬프트 목록의 검색·필터·정렬·보기·사용자 순서·즐겨찾기·상태·새 항목 생성 진입을 보존한다. 검색·최근·즐겨찾기·템플릿·휴지통 진입도 기존 위치/결과 복귀 계약과 연결한다.
- [x] `LC-RD-120-P2-05` 장식 blur/gradient/SVG·도크 움직임을 읽기·입력 layer와 분리하고 동작 감소·투명도 감소·forced-colors·미지원 fallback을 구현한다. listener/animation cleanup과 입력 지연 예산을 확인한다.
- [x] `LC-RD-120-P2-06` 320/390/768/1024/1440px, 두 테마, 긴 제목/큰 글꼴/빈 목록, 키보드·뒤로·새 탭 복귀를 검증하고 P3에 컴포넌트·토큰·상태 사용 계약을 인계한다.

## 책임 경로와 비범위

공통 셸·홈·목록/검색 컴포넌트와 기존 스타일 계층, 관련 E2E/시각 기준을 담당한다. 기존 domain 정렬·조회·인가 API 의미와 DB schema를 디자인 때문에 변경하지 않는다. 편집 내부·자료 패널·프로필 초안 등의 실제 변경은 P3 책임이다. 임시로 기능 없는 버튼을 활성 상태로 배포하지 않는다.

## 검증·완료·되돌림

[AC-RD-120-01/02/09](ACCEPTANCE.md), 관련 기존 목록/탐색 회귀와 production build를 확인한다. 토큰 전환만으로 글자가 가려지거나 모바일 목적지가 사라지면 완료하지 않는다. 기존 UI로 복귀하는 P1 계약과 설정 호환을 확인하고 원격 CI·동일 SHA 개발 인수·Future 검수 결과를 기록한다. 테마 설정이나 창작물 삭제를 rollback 수단으로 사용하지 않는다.

다음 단계: [P3](3phase.md).

## 2026-09-25 로컬 구현·검증 후보

`LC_UI_VARIANT=chroma`를 명시한 경우만 새 토큰·공통 셸/PC 도크·모바일 6칸 도크/더보기·실데이터 홈을 사용한다. 기본은 기존 `b1`, 허용된 `classic`도 그대로 두었다. 홈은 owner-scoped 곡/최근 작업/즐겨찾기 조회로 구성하며 실패를 빈 상태나 합성 숫자로 바꾸지 않는다. 새 DB migration/API/저장 키/편집 인스턴스/이벤트 listener/GSAP 의존성은 없다. 장식은 입력과 분리된 CSS·`aria-hidden` 표면이고 motion/transparency/forced-colors/backdrop-filter fallback을 둔다. 리스트의 기존 검색·필터·정렬·순서·상태·복귀 로직은 재사용하며 코발트 스타일만 변형했다.

격리 tmpfs PostgreSQL `lyricscloud_test`와 Node 24.20.0/production Chromium에서 전체 Unit/DB **511 PASS/8 조건부 skip**, 기존 B1 owner 브라우저 **432 PASS/62 조건부 skip**, Chroma 데스크톱/모바일 집중 **12 PASS**, Chroma 장문 10,000줄 편집·복사 기존 10초 인수 예산 **2 PASS**다. Chroma 집중 검사는 두 테마의 본문·액션·경계·초점 대비, axe serious/critical 0, 320/390/768/1024/1440px와 320px 큰 글꼴·긴 합성 한글/이모지 제목의 가로 넘침 없음, 홈/빠른 추가/10개 목적지/목록 검색·빈 상태·실제 소유자 자료·복귀 URL을 확인한다. Production build/typecheck, config 18건, 홈 오류/빈 상태 2건, 1.2.0 환경/manifest validator, synthetic canary 대상 `.next` secret scan도 PASS다. 첫 secret scan 두 호출은 필수 canary/대상 누락으로 실행 조건 오류였고 올바른 입력의 최종 결과만 PASS다.

기존 `responsive-shell.spec.ts`의 **구 B1 상단바 높이 74px 고정 단언**을 Chroma에 그대로 적용한 선택 실행은 Chroma 설계 높이 84px 때문에 1 FAIL/1 PASS/6 조건부 skip이었다. 기존 B1 전체 검사는 그대로 PASS이고, Chroma는 새 반응형·도크 검사로 검증한다. 이 구 디자인 수치를 임의 완화하거나 그 실행을 PASS로 바꾸지 않는다. 동일 환경의 B1 대비 새 시각 효과 성능 중앙값/p95·50ms 긴 프레임 비교는 P4 `RD-PERF`에 남는다. 첫 P2 구현 전 기준을 실측하지 못한 절차 이탈을 숨기지 않으며, 새 JS 애니메이션/listener가 없는 정적 기본값과 장문 기존 절대 예산 PASS까지만 P2 근거로 삼는다. 실제 Windows/iOS/Android 기기·OS IME·AT는 사용자 지시로 후속 미실행이다. 필수 CI·네 signed image·동일 SHA 개발 공개 인수 전까지 Phase 완료가 아니다.
