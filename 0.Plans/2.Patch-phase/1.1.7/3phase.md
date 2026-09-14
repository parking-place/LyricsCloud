# 1.1.7 Phase 3 — PC·iOS·Android 상호작용

상태: **완료** (`complete`). P2 merge `8a3e76a645f31c5cafb41296da52b8226e0af645`를 기준으로 `NF-REQ-039`의 이번 Phase 범위만 수행했다.

## 선행조건과 담당 경계

[P2](2phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DESIGN-NATIVE.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.1.7-P3-01` 목록→편집→공유·Suno 새탭→복귀 과제를 각 플랫폼 viewport와 입력 방법으로 조정한다. — exact 목록 query를 편집기·대시보드 왕복에 유지하고 공유 focus 복귀·보호된 새 탭을 5 browser profile에서 통과했다.
- [x] `LC-NF-1.1.7-P3-02` 키보드·터치·스크린리더에서 drag/context menu 대안과 tooltip 동선이 동일 기능으로 이어지게 한다. — 기존 보이는 순서 이동·송폼 삽입 대안을 계약으로 고정하고 접힌 rail의 명시적 접근성 이름·40px target·focus tooltip을 추가했다.
- [x] `LC-NF-1.1.7-P3-03` new_Mock-up의 확정 시안과 달라진 동선·이유를 기록하고 큰 재설계는 사용자 판단 뒤 반영한다. — 정적 platform 장식은 제품에 넣지 않고 실제 web navigation/focus만 반영한 이유와 native 미실행 경계를 인수 문서에 기록했다.

## 수용 기준

`AC-1.1.7-03`: 플랫폼별 같은 과제가 완료되고 초안/선택/권한이 보존된다.

## 실행 증거

- P3 시작 source는 `1e6f9fb3431c3aefce9378880280b8cad4116f74`다. 실패 우선 계약은 rail 라벨/tooltip 구현 전 1 FAIL·기존 대안 4 PASS였고 구현 뒤 5 PASS다.
- Node 24.20.0에서 architecture boundary·전체 typecheck·Next production build와 Vitest 264 PASS를 확인했다. DB 환경이 없는 integration 115건은 이 실행에서 skip됐으며 숨기지 않는다.
- 격리 PostgreSQL에서 1.1.7 P2+P3 Chromium desktop/mobile 4 PASS, P3 Chromium/Firefox/WebKit desktop·Chromium/WebKit mobile 최종 5 PASS다.
- 같은 browser 흐름이 exact 목록 query, 공유 Escape focus 복귀, Suno `noopener noreferrer` 새 탭, mobile More focus 복귀, desktop rail 40px target·focus tooltip과 overflow 0을 확인한다.
- 후보 `740b1e3489cd5aee2669a55acf5901e7ac9205aa`의 push/PR Actions `34887398291`·`34887401584`가 최종 전체 PASS했다. push verify 첫 실행은 migration 검증 종료 뒤 DB pool cleanup의 일시적 `57P01`로 실패했고 같은 SHA의 failed job 재실행에서 통과했으며, PR run의 같은 migration 단계는 첫 실행부터 통과했다.
- 네 signed dev image의 SHA·`dev-1.1.7-p3`·`Dev`·`Dev-latest` tag가 서비스별 같은 digest다.
- 같은 SHA 개발 서버는 `1.1.7/dev/p3`, schema `1140_sharing_stability.sql`, B-1 root와 네 서비스를 healthy로 반환했다. 공개 1440/390px×light/dark에서 exact 목록→대시보드→가사→공유→Suno→목록 복귀, 공유/mobile More focus 복원, 보호된 새 탭, rail keyboard focus tooltip·40px target, 한글 원문·테마·overflow를 PASS했고 합성 fixture 잔여 0건을 확인했다.
- Chromium mobile은 Android browser 대리, WebKit mobile은 iOS browser 대리다. 실제 Android/iOS 앱·물리 기기·OS IME/AT/zoom·native back은 미실행이며 완료로 바꾸어 쓰지 않는다.
- 상세 매핑·검증·digest·rollback은 [P3 인수 문서](../../../docs/runbooks/1.1.7-phase3-platform-interactions.md)에 고정했다. 릴리스 서버는 P3에서 변경하지 않았다.

## 검증·완료·인계

- [x] 위 작업과 수용 기준에 실제 증거·환경·SHA를 연결하고 실패/미실행을 기록했다.
- [x] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [x] 설계/문서 단계는 검토와 결정 증거로, 구현 단계는 필수 CI·동일 SHA 개발 공개 smoke 및 플랫폼별 실제 앱 증거로 인수했다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 같은 변경은 이전 기록을 참조했다.
- [x] SDK/외부 제공·실제 OS/기기·서명/스토어·release gate의 상태를 숨기지 않았다.

[P4](4phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
