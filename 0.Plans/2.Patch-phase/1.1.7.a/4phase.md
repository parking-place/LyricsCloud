# 1.1.7.a P4 — 교차 계정·재로그인·이탈 회귀

상태: **완료**. [P3](3phase.md)의 실제 UI/API 후보 SHA와 P1 수용표가 선행한다. P3 PR #148 merge `b4e5200`에서 별도 P4 Phase 브랜치를 시작했으며 1.1.8 Windows/main은 포함하지 않는다. P4 최종 기능 SHA `7621e8e2a41abeb220155d3fc632f8d0e1da3319`, PR #149, Actions #35043634916 전체 verify·네 signed dev image PASS, 동일 SHA 개발 배포·공개 합성 smoke PASS다. 이 완료는 P5 최종 release gate나 실제 iOS/Android/Windows 실기기 검증을 대체하지 않는다.

수용 증거: 격리 PostgreSQL 사진/override 14 PASS, 새 권한·응답 유실·홈 guard의 Chromium PC/모바일 6 PASS, Chromium/Firefox/WebKit desktop과 Chromium/WebKit mobile **Linux 대리** 15 PASS. 전체 PC/mobile 436건은 393 PASS·조건부 43 skip·0 FAIL이고, 첫 저장 공간 부족 예상 실행은 중단/미완료로 구분한다. 공유 가사 경로에서 `active="home"`이 실제 홈 URL과 다른 결함을 고쳤다. 최종 Actions #35043634916은 unit 393 PASS/조건부 5 skip, owner E2E 393 PASS/조건부 43 skip, release browser matrix 10 PASS, 네 signed dev image PASS다. 최초 Actions #35043201011은 기존 revision 성능 측정 라운드 CV 83.327%가 75% 예산을 넘어 FAIL/image skipped였고 다른 절대 시간·오류 예산은 PASS였다. 같은 SHA·기준의 전체 재실행에서 성능 포함 모든 gate가 PASS했다. 실패 실행을 PASS로 재분류하거나 예산을 낮추지 않았다.

동일 SHA 개발 서버는 migration `1151_profile_customization.sql`, web/postgres/collaboration/worker health와 공개 HTTPS live/ready `1.1.7a/dev/p4`·SHA 일치, `/auth` 200·익명 사진 401을 PASS했다. 합성 A의 닉네임·사진 저장 후 재진입, B의 A 사진 비공개, 최신 Google 기본 이름만 갱신해 override 보존, 웹 서비스 재시작·새 세션의 override/사진 지속, PC/모바일 공유 가사 홈 mark/icon, 위장 사진 입력 거부와 기존 사진 유지, 명시적 이름/사진 기본값 복귀를 공개 브라우저에서 PASS했다. 첫 최종 probe의 사진 200은 클릭 직후 저장 완료를 기다리지 않은 ignored 검증 스크립트의 경합으로, 직후 DB `avatar_source=provider`·참조 없음 확인 뒤 완료 대기를 보정해 stage→재시작→final 전부 PASS했다. 합성 사용자·세션·identity·프로필·사진은 삭제 후 각각 0건. 실제 물리 기기·OS IME·AT는 새로 실행하지 않아 P5 지원 범위/위험 목록에 전달한다.

## 검증 시나리오

- [x] `LC-PLAN-117A-P4-01`: 계정 A 닉네임만 변경→사진 유지, 사진만 변경→닉네임 유지, 명시 제거→기본값 복귀, 두 탭 동시 저장→충돌/최신값 안내를 실제 PostgreSQL/API에서 확인한다. 새로고침·재로그인·Google 제공 이름/사진 변경·서버 재시작에도 override가 유지된다.
- [x] `LC-PLAN-117A-P4-02`: 계정 B로 전환해 A 사진/닉네임·업로드 ID·cache를 읽거나 덮어쓸 수 없는지 검사한다. 미인증·expired session·CSRF/동일 출처·다른 owner 파일 요청은 차단한다. 공개/선택 공유의 표시 이름과 사진 비공개 범위를 P1 정책대로 확인한다.
- [x] `LC-PLAN-117A-P4-03`: 위장 확장자/MIME, 손상 파일, oversized/oversized-pixel, 중단 업로드, 반복 재시도, 오래된 파일 URL, 탈퇴/완전 삭제를 검사한다. 오류 뒤 기존 사진과 export/backup/rollback 데이터가 남는지 확인한다.
- [x] `LC-PLAN-117A-P4-04`: 설정·곡 목록·대시보드·가사/라임/프롬프트 편집·공유에서 승인된 로고/아이콘을 누르면 홈 `/workspace`로 이동한다. dirty/저장 중/저장 실패/오프라인/IME 조합은 원문·selection·draft를 버리지 않으며, 취소/재시도 후 동선이 정상이다.
- [x] `LC-PLAN-117A-P4-05`: 데스크톱 Chrome/Edge/Firefox, 모바일 Chromium/WebKit 대리에서 두 테마·좁은 rail·키보드/터치/기본 접근성 상태를 확인한다. 대리 환경을 실제 iOS/Android/Windows 또는 AT 실기기 PASS로 적지 않는다. 영향받은 전체 회귀·production build와 기존 공유/가입/export/withdrawal 테스트를 실행한다.
- [x] `LC-PLAN-117A-P4-06`: 발견된 결함은 같은 입력으로 재현→최소 수정→재검증한다. 로그/fixture에 실제 사용자 이메일·사진·창작물을 넣지 않고, 실패/skip/미실행을 PASS로 바꾸지 않는다.

## 완료 기준

`AC-117A-01~05`마다 자동/DB/브라우저/실기기 증거의 종류·source SHA·PASS/FAIL/미실행을 분리한다. 소유권·OAuth override·원문 보존 결함이 남으면 P5나 출시를 열지 않는다. 필요한 실기기 조건과 환경 없는 이유는 [P5](5phase.md)에 전달한다.
