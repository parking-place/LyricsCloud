# 1.1.7.a P1 — 기준 화면·프로필/이동 계약

상태: **계획 초안**. 구현·현재 실행 Phase 전환 아님. [목표](README.md)·[버전 규칙](../VERSIONING.md)·[결정 권한](../Decision-Ownership.md)을 먼저 대조한다.

## 작업

- [ ] `LC-PLAN-117A-P1-01`: 현재 release/main source SHA와 설정·셸·로그인/가입·공유·프로필 API/DB 경로를 기록한다. desktop 우측 상단, 접힌 rail, 모바일 헤더의 실제 로고/아이콘 클릭 대상을 스크린샷·화면 이름으로 확정한다. 인증 화면의 장식 브랜드와 설정/로그아웃은 별도다.
- [ ] `LC-PLAN-117A-P1-02`: 닉네임의 빈 값·공백·유니코드/한글 IME·길이(기존 DB/API 상한 120)·화면 표시/접근성 계약을 정한다. Google 기본값, 사용자 override, 사용자 override 제거 후 Google 기본값 복귀의 의미를 구분한다. 이메일·OIDC identity·sharing ID는 불변으로 둔다.
- [ ] `LC-PLAN-117A-P1-03`: 사진의 **기기 파일 선택**을 필수로 하고, 허용 이미지 종류·바이트 크기·실제 파일 시그니처·디코딩/재인코딩·메타데이터 제거·기본값/제거·저장 위치/백업/탈퇴 삭제·제공 URL의 공개 범위를 결정한다. 기존 원격 `avatarUrl`은 migration/Google fallback 입력으로만 취급하고 임의 외부 URL 입력을 새 UI로 만들지 않는다. 스토리지와 이미지 처리 도구는 여기서 운영/보안 근거와 롤백을 확인한 뒤 선택한다.
- [ ] `LC-PLAN-117A-P1-04`: 닉네임 변경이 선택 공유/공개 링크의 owner 표시·기존 활동 attribution에 반영되는 시점과 privacy 안내를 정한다. 사진은 별도 승인 없이 공유 projection에 넣지 않는다.
- [ ] `LC-PLAN-117A-P1-05`: 홈 목표를 기존 `/workspace`로 고정하고, 로고 전체/mark만의 hit target·`aria-label`·focus/hover/current-home 상태를 정한다. 미저장 신규 자료·CodeMirror/Yjs dirty·IME 조합·offline/저장 오류 시 이탈 guard와 취소/재시도 결과를 기존 탐색 동선과 맞춘다.
- [ ] `LC-PLAN-117A-P1-06`: current `1.1.8 P4 review`와 계획된 1.1.9~1.1.14의 선행 관계를 대조한다. 사용자 승인한 정확한 제품 버전 `1.1.7a`만 one-off 예외로 허용할 검증·image/tag·서버 경로, 변경 파일 담당·API/DB 호환·롤백·실기기 gate를 기록한다. `main`에 미완료 Windows 코드가 있으므로 별도 release branch/tag의 추가 승인을 받기 전 출시하지 않는다.

## 수용·인계

`AC-117A-01~05`별 정상/실패/권한/복구 입력표, 확정 클릭 대상, 사진 저장·공개·삭제 결정, OAuth override 우선순위, 기준 `v1.1.7` source SHA, `1.1.7a` 단일 예외와 별도 릴리스 선행조건이 한 문서로 연결돼야 한다. 임시 URL-only UI나 OAuth 덮어쓰기 유지안을 승인된 설계로 간주하지 않는다. P1 설계 검토는 앱 테스트/배포 PASS가 아니며 [P2](2phase.md)는 확정 계약 뒤에만 시작한다.
