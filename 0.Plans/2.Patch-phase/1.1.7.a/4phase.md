# 1.1.7.a P4 — 교차 계정·재로그인·이탈 회귀

상태: **진행 중**. [P3](3phase.md)의 실제 UI/API 후보 SHA와 P1 수용표가 선행한다. P3 PR #148 merge `b4e5200`에서 별도 P4 Phase 브랜치를 시작했으며 1.1.8 Windows/main은 포함하지 않는다.

로컬 진행 증거: 실제 격리 PostgreSQL 사진/override 14 PASS, 새 권한·응답 유실·홈 guard의 Chromium PC/모바일 6 PASS, Chromium/Firefox/WebKit desktop과 Chromium/WebKit mobile 대리 15 PASS. 전체 PC/mobile 436건은 393 PASS·조건부 43 skip·0 FAIL이며 첫 저장 공간 부족 예상 실행은 중단/미완료로 구분한다. 공유 가사 경로에서 `active="home"`이 실제 홈 URL과 다른 결함을 고쳤다. 원격 CI·동일 SHA 개발 재시작/공개 인수와 실제 기기/OS 입력은 아직 완료하지 않았다.

## 검증 시나리오

- [ ] `LC-PLAN-117A-P4-01`: 계정 A 닉네임만 변경→사진 유지, 사진만 변경→닉네임 유지, 명시 제거→기본값 복귀, 두 탭 동시 저장→충돌/최신값 안내를 실제 PostgreSQL/API에서 확인한다. 새로고침·재로그인·Google 제공 이름/사진 변경·서버 재시작에도 override가 유지된다.
- [ ] `LC-PLAN-117A-P4-02`: 계정 B로 전환해 A 사진/닉네임·업로드 ID·cache를 읽거나 덮어쓸 수 없는지 검사한다. 미인증·expired session·CSRF/동일 출처·다른 owner 파일 요청은 차단한다. 공개/선택 공유의 표시 이름과 사진 비공개 범위를 P1 정책대로 확인한다.
- [ ] `LC-PLAN-117A-P4-03`: 위장 확장자/MIME, 손상 파일, oversized/oversized-pixel, 중단 업로드, 반복 재시도, 오래된 파일 URL, 탈퇴/완전 삭제를 검사한다. 오류 뒤 기존 사진과 export/backup/rollback 데이터가 남는지 확인한다.
- [ ] `LC-PLAN-117A-P4-04`: 설정·곡 목록·대시보드·가사/라임/프롬프트 편집·공유에서 승인된 로고/아이콘을 누르면 홈 `/workspace`로 이동한다. dirty/저장 중/저장 실패/오프라인/IME 조합은 원문·selection·draft를 버리지 않으며, 취소/재시도 후 동선이 정상이다.
- [ ] `LC-PLAN-117A-P4-05`: 데스크톱 Chrome/Edge/Firefox, 모바일 Chromium/WebKit 대리에서 두 테마·좁은 rail·키보드/터치/기본 접근성 상태를 확인한다. 대리 환경을 실제 iOS/Android/Windows 또는 AT 실기기 PASS로 적지 않는다. 영향받은 전체 회귀·production build와 기존 공유/가입/export/withdrawal 테스트를 실행한다.
- [ ] `LC-PLAN-117A-P4-06`: 발견된 결함은 같은 입력으로 재현→최소 수정→재검증한다. 로그/fixture에 실제 사용자 이메일·사진·창작물을 넣지 않고, 실패/skip/미실행을 PASS로 바꾸지 않는다.

## 완료 기준

`AC-117A-01~05`마다 자동/DB/브라우저/실기기 증거의 종류·source SHA·PASS/FAIL/미실행을 분리한다. 소유권·OAuth override·원문 보존 결함이 남으면 P5나 출시를 열지 않는다. 필요한 실기기 조건과 환경 없는 이유는 [P5](5phase.md)에 전달한다.
