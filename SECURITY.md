# Security policy

## Supported version

보안 수정은 현재 정식 버전 `1.0.1`에 우선 제공한다. `1.0.2`는 Phase 5 후보 인수를 마쳤지만 정식 go/no-go 전까지 개발 버전이며, 개발 Phase branch나 이전 0.x 버전은 별도 장기 지원 대상으로 보지 않는다.

1.0.2 후보는 원문 유실·무음 저장 성공·인증 우회·교차 사용자 노출을 릴리스 차단 결함으로 취급한다. 의심 증거가 있으면 개발 배포도 중단하고 아래 비공개 보고 절차로 전달한다.

LyricsCloud는 공개 소스 여부와 관계없이 가사·라임·프롬프트를 비공개 창작물로 취급한다.

## 민감정보 취급

- 실제 창작물, 개인정보, 세션, OAuth token, 암호화 key를 저장소·fixture·로그·스크린샷에 넣지 않는다.
- `.env*`, PostgreSQL data, backup, 사용자 export 파일은 commit하지 않는다.
- 브라우저에는 공개가 허용된 설정만 전달하고 서버 secret은 bundle에 포함하지 않는다.
- 오류·성능 정보에는 익명 code와 집계만 남기고 제목·본문·태그·검색어·동적 ID를 제거한다.

## 보안 변경 기준

- 인증·세션·소유권 변경은 서로 다른 두 계정의 교차 접근 차단 시험이 필수다.
- DB 변경은 migration, rollback 또는 복구 절차, 삭제 자료 노출 여부 검증을 포함한다.
- CRDT 연결은 문서마다 인증·소유권을 다시 확인하며 문서 ID만 알아서는 접속할 수 없어야 한다.
- 내보내기·탈퇴·완전 삭제·backup restore는 서버 권한과 감사 가능한 결과를 확인한다.
- 의존성 취약점은 영향을 평가한 뒤 현재 Phase에서 수정하거나 release 차단 사항으로 기록한다.

## Private reporting

취약점, 인증 우회, 다른 사용자의 자료 노출 또는 secret 노출 의심은 공개 Issue에 쓰지 않는다. GitHub 저장소의 **Security → Advisories → Report a vulnerability**를 사용한다. 해당 기능을 사용할 수 없으면 repository owner에게 비공개 채널로 연락하되 민감한 증거를 채팅·Issue·commit에 붙이지 않는다.

다음 최소 정보만 먼저 보낸다.

- 영향 version과 전체 build SHA
- 영향을 받는 route 또는 기능 이름
- 개인 자료를 제거한 재현 순서와 기대/실제 결과
- 화면의 익명 error code·`requestId`

cookie, OAuth code/token, DB URL, 비밀번호, 실제 이메일, 창작물 본문, export·backup 파일은 보내지 않는다. 수신자는 영향을 확인한 뒤 회전·차단·수정·회귀 검사와 공개 시점을 비공개로 조율한다.
