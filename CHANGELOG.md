# Changelog

사용자에게 의미 있는 변경을 버전별로 기록합니다. 형식은 Keep a Changelog의 범주를 따르되, 버전과 완료 조건은 [`0.Plans/1. Dev-phase`](<./0.Plans/1. Dev-phase/README.md>)를 기준으로 합니다.

## [1.0.5] - 2026-09-10

### Added

- `[TAG:sub tag]`에서 첫 콜론 앞 주 이름으로 송폼을 탐색하고 suffix를 낮은 강조로 표시하되 원문 전체를 보존
- 가사 최종 LF 복사 payload의 Unicode code point 수와 3,000자 초과 비차단 안내를 자동·단축키·수동 복사 경로에 제공

### Fixed

- 모바일 복사 버튼의 문자 수가 접근 이름에 합쳐져 기존 복구 흐름에서 버튼을 찾지 못하던 회귀
- 같은 브라우저 저장소를 공유해 독립 탭 동기화를 잘못 검증하던 신규 composition 시험 경계

### Validation

- PostgreSQL 18 unit/integration 270건, Chromium PC/mobile 전체 284건, Chromium/Firefox/WebKit 신규 기능 행렬 11건 통과
- 동일 SHA 개발 서버 네 서비스 health, 공개 suffix·주 이름 탐색·3,001자 exact copy와 collaboration 재시작·원문 보존 통과
- GitHub Actions run `34487251707` 전체 verify와 네 개발 image 게시·서명 통과

Known limitations: 실제 Windows/iOS/Android 물리 기기는 이번 후보에서 새로 실행하지 않았고 기존 `OPS-100-001` 외부 backup 예외를 유지한다.

Phase 5 후보 CI와 같은 SHA 개발 인수를 통과했고 사용자가 정식 릴리스를 승인했다. 정식 main·image·릴리스 서버 결과는 annotated tag와 GitHub Release에 고정한다.

## [1.0.4 candidate] - 2026-09-10

### Added

- 문장형 프롬프트를 ASCII 마침표까지 포함하는 lossless 구간으로 표시하고 마지막 미완성 구간도 유지
- 목록·편집기·가사 자료 패널·수동 복사 대안에 최종 payload의 Unicode code point 수와 1,000자 초과 안내 제공

### Fixed

- 릴리스 브라우저 행렬에서 모바일 프로젝트명을 기본 이름 하나로만 판별하던 1.0.4 E2E 경계

### Validation

- PostgreSQL 18 unit/integration 263건, Chromium PC/mobile 전체 279건, Chromium/Firefox/WebKit 기능 행렬 10건 통과
- 동일 SHA 개발 서버 네 서비스 health와 collaboration 재시작·동일 문서 재연결·CRLF/emoji 원문 보존 통과

Known limitations: 실제 물리 기기는 이번 후보에서 새로 실행하지 않았고 기존 `OPS-100-001` 외부 backup 예외를 유지한다. 1.0.4는 정식 릴리스하지 않고 1.0.5의 선행 개발 기준으로만 사용한다.

## [1.0.3] - 2026-09-10

### Added

- 프롬프트를 기존 태그형 또는 구두점·연속 공백·줄바꿈을 보존하는 문장형으로 작성·복사하는 mode/raw 계약
- 원문과 결과를 먼저 보여 주는 명시 변환 확인, 변환 직후 undo와 revision v1/v2 비교·복원
- 문장형을 이해하지 못하는 collaboration client의 409 capability 차단과 최신 상태 hash 기반 오래된 변환 거부

### Fixed

- 문장형 revision v2를 기존 태그형 기록으로만 해석해 수정 기록 UI가 실패하던 호환 회귀
- 비활성 프롬프트 작업 버튼과 mode 설명의 dark-theme 대비가 opacity로 WCAG 기준 아래로 내려가던 표시

### Validation

- PostgreSQL unit/integration 261건과 migration `1000_prompt_modes.sql` fresh/repeat, typecheck·production build 통과
- Chromium desktop/mobile 전체 306건 중 274 PASS·조건부 31 skip, 새 기능 Chromium 8건·Firefox 4건·WebKit mobile 4건 통과
- 동일 SHA 개발 서버의 네 서비스 health, 공개 HTTPS, 실제 collaboration 재시작 전후 raw 조회·복제·재연결 통과
- GitHub Actions 전체 migration·unit/integration·production image·backup/restore·취약점/secret·브라우저 행렬과 네 개발 image 게시/서명 통과

Phase 5 최종 CI와 같은 SHA 개발 인수를 통과했고 사용자가 정식 릴리스를 승인했다. 정식 main·image·릴리스 서버 결과는 annotated tag와 GitHub Release에 고정한다. `OPS-100-001` 외부 backup 예외는 계속 유지한다.

## [1.0.2] - 2026-09-10

### Added

- 서버에서 가입이 완료된 직후 브라우저 응답이 유실돼도 같은 요청을 안전하게 회수하는 멱등 가입 검증
- 로컬 저장 실패 시 현재 입력을 정확히 복사할 수 있는 복구 동작과 기존 계정 로그인·가입 재시도·취소 안내
- build별 service worker cache 경계와 미전송 입력이 남은 화면의 이탈·업데이트 차단

### Fixed

- 로컬 저장소 쓰기 실패나 종료 직전 입력이 서버에 저장된 것처럼 보이던 상태 안내
- 가입 성공 응답 유실 뒤 재시도에서 계정·grant·초대 소비가 중복될 수 있는 경계
- 이전 PWA가 새 배포의 정적 자산과 섞이거나 확정되지 않은 입력을 둔 채 갱신될 수 있는 경계

### Validation

- PostgreSQL migration 2회, unit/integration 248건, beta 가입 4건과 관리자 CLI 통과
- Chromium desktop/mobile 전체 267건과 의도적 31건 제외, Chromium·Firefox·WebKit 5-project 10건 통과
- 네 production image의 DB·collaboration 재시작, durable pending projection, 중복 ACK, revision restore와 owner-only logout 통과

Phase 5 전체 CI, 네 개발 image 게시와 동일 SHA 개발 서버 인수를 통과했고 사용자가 정식 릴리스를 승인했다. 정식 main·image·릴리스 서버 결과는 annotated tag와 GitHub Release에 고정한다. 외부 암호화 backup·24시간 RPO·복원 훈련 미구축은 기존 Known limitations로 유지한다.

## [1.0.1] - 2026-09-10

### Added

- 검증된 Google identity와 1회성 초대 코드의 메일이 일치할 때만 코드 소비와 가입 권한 등록이 함께 완료되는 Private Beta 가입
- 승인된 LyricsCloud 로고의 light/dark, favicon, maskable PWA, monochrome 자산과 접근 가능한 브랜드 표시
- 개발 `v1.0.1-pN dev`·정식 `v1.0.1 Release`를 같은 runtime/health metadata에서 만드는 channel·phase 계약

### Fixed

- Windows Chrome·Edge 한글 IME 조합 직후 이탈 시 마지막 입력을 drain하고, 재진입 때 서버 저장본과 계정별 초안을 안전하게 복구
- light/dark 양쪽에서 `+ 새 가사`와 `연결 관리`에 공통 primary theme를 적용하고 좁은 화면의 제목·action·rail 겹침을 제거
- dev image가 숫자/Release alias를 이동하지 않고 승인된 tag release만 `Release`·`latest`·`Release-latest`를 같은 서비스 digest로 승격하도록 발행 계약 분리
- 릴리스 Phase 판정을 1.0.1 P1~P10, 추가 Phase, `2.Patch-phase`, 다자리 version/phase에 대응하면서 1.0.0 P5/P6 이력은 보존

### Validation

- 실제 PostgreSQL unit/integration 250건과 desktop/mobile 브라우저 회귀 263건, release browser matrix 10건 통과
- nonroot·read-only production image, 암호화 backup/restore, 0.9.0→1.0.1 upgrade/application rollback, secret·취약점·관측 검사 통과
- 과거 CI save 편차 실패를 동일 격리 환경에서 3회 재측정해 원래 성능 예산을 완화하지 않고 통과

이 항목은 P9 개발 후보에서 시작해 P10 전체 CI·동일 SHA 개발 인수를 거쳐 정식 `v1.0.1`로 발행됐다. 외부 암호화 backup·24시간 RPO·복원 훈련은 사용자 승인 예외로 여전히 미구축인 Known limitations다.

## [1.0.1 P3 candidate] - 2026-09-09

### Security

- 기존 평문 bootstrap 허용 목록을 환경·용도·정규화 버전·key ID에 결합된 HMAC-SHA-256 레코드로 전환
- HMAC keyring과 allowlist를 분리하고, 최초 이행 전에 AES-256-GCM rollback backup을 만든 뒤 원자 교체
- old/new key 회전 기간, 만료·환경 불일치·알 수 없는 key·중복 레코드의 fail-closed 검증과 nonroot runtime secret 권한 적용
- 기존 NFKC·공백 제거·소문자 정규화를 보존하고 Gmail 점·`+` 별칭은 합치지 않음

## [1.0.1 P2 candidate] - 2026-09-09

### Added

- 관리자 shell의 `LyricsCloud betacode -n`, `ls`, `refresh`와 Node 도구가 없는 서버용 격리 관리자 컨테이너
- 환경별 6자리 CSPRNG 코드, 과거 digest tombstone, 미사용 원문 AEAD, epoch 기반 refresh와 active 100·기본 24시간 계약
- 가입 intent·검증 principal admission grant·소비 receipt·재시작 영속 실패 budget을 분리한 `0900_beta_access.sql`
- 동시 발급·refresh 직렬화, 잘못된 수량의 batch rollback, 출력 실패 뒤 `ls` 복구, 사용 grant/receipt 보존과 관리자 키 권한 검증

P3 HMAC test-user 이행과 P4 가입 callback 전에는 신규 가입 경로를 열지 않는다.

## [1.0.0 P6 candidate] - 2026-09-09

### Fixed

- 라임·프롬프트의 여러 신규 탭이 서로의 로컬 초안을 덮어쓰거나 삭제하지 않도록 분리하고, 닫힌 탭의 초안 복구와 전체 미전송 초안 내보내기를 유지
- 생성 응답 유실 시 입력과 요청을 고정하여 같은 결과를 회수하고, 취소·화면 이탈 뒤 늦은 응답의 강제 이동을 차단
- 템플릿에서 시작한 프롬프트 재진입 시 수정한 토큰을 보존하고, 가사·템플릿 저장 중 입력 변경으로 생기는 유실 방지
- PWA 업데이트 전과 실제 새로고침 직전에 화면 입력·IME·IndexedDB 초안을 확인
- PostgreSQL 초기화 서버의 소켓을 최종 TCP 준비 상태로 오판하던 Compose·CI 기동 검사 수정
- PC의 production 웹 빌드에 명시적 loopback OAuth 설정을 제공하여 개발 모드의 CSP 경고와 요청 시 컴파일 지연을 제거

이 항목은 P6 후보의 변경 기록이며 기존 1.0.0 릴리스 재발행이나 Phase 전체 인수 완료를 의미하지 않는다.

## [1.0.0] - 2026-09-09

### Added

- 최종 사용자 안내, production-mode 셀프호스트 Compose, OAuth·secret 교체, 지원·보안 보고, 경보·사고 기록과 backup/restore/upgrade/rollback 운영 문서
- 승인 digest의 신규 빈 production 배포, 공개 health·OAuth 시작·합성 핵심 흐름·owner 격리·PWA·실패 주입·안정 구간 검증
- 1.0.0 버전 봉인, 서비스별 환경 schema, 17개 migration checksum·호환 범위, production dependency license inventory와 digest-only release manifest 생성 계약
- 네 production image의 독립 재빌드 비교, nonroot/read-only/health/signal/persistent 경계와 기존 keyless 서명·SLSA provenance·SBOM·취약점/secret scan 통합 gate
- 0.9.1 보안 하드닝: 60개 API·32개 DB 테이블의 owner 격리 행렬, 53개 상태 변경 Origin gate, 요청별 nonce CSP, 1 MiB API body 상한과 인증·검색·내보내기 token bucket 제한
- 고정 digest Distroless Node 24 Debian 13 nonroot runtime, read-only rootfs·tmpfs·내장 healthcheck와 CI의 pnpm audit·Gitleaks·Trivy·image layer canary gate
- 0.9.1 RC 기능 동결: Sketch 49절 71개 요구사항과 15개 화면·8개 목업 제안 source의 구현/검증 추적, P0/P1 0건 한도와 `OPS-0001` 변경·승인·태그 절차
- Chromium·Firefox·WebKit 데스크톱과 Chromium·WebKit 모바일의 15개 화면, 약 10,000줄 한글 가사, 회전·뒤로 가기·수동 복사를 묶은 0.9.0 출시 후보 행렬
- PC·좁은 PC·태블릿·모바일 15개 화면의 최종 시각 회귀 60장과 실제 iOS Safari·Android Chrome 인수표
- 15개 화면의 단일 주 제목·명명된 landmark, 접근 가능한 이름과 양 테마 WCAG 2.1 A/AA 중대 오류 0 기준
- 설명·다음 행동을 갖춘 공통 빈 화면·로딩·오류·오프라인·권한 없음·삭제 상태와 저장 상태 live 안내
- modal·sheet·menu의 공통 focus trap·Escape·호출 지점 복원, 200% 확대 reflow와 reduced motion 대응
- 저장 실패 재시도에서도 가사 본문과 CodeMirror cursor를 보존하는 PC·모바일 회귀 검사
- owner 전용 repeatable-read snapshot에서 50행씩 스트리밍하는 전체 ZIP 내보내기, UTF-8 자료별 TXT/Markdown과 관계 검증 가능한 `lyricscloud.export.v1` JSON
- 특수문자·Windows 예약 이름·동일 제목을 안전한 고유 파일명으로 바꾸고 취소·실패에도 임시 산출물을 남기지 않는 다운로드와 설정·탈퇴 전 진입점
- 곡·가사·라임 노트·프롬프트·owner 템플릿의 정확한 30일 휴지통, 남은 기간·원래 위치·영향 요약과 원자적 개별/다중 복원·이름 확인 완전 삭제
- 같은 삭제 묶음의 곡·가사 복원, 삭제된 부모 가사의 부모 동시 복원 또는 활성 곡 이동, owner 전용 hard-delete 권한 경계
- 최근 Google 재인증을 요구하는 회원 탈퇴, 즉시 전체 세션·자료 접근·로컬 개인 캐시 차단, 7일 명시적 철회와 멱등 worker purge·내용 없는 실행 기록
- Windows/Linux·macOS 표기를 함께 제공하는 8개 공통 단축키 레지스트리와 설정 화면·전역 dialog의 검색 가능한 키보드 도움말
- 새 가사·검색·전체 복사·집중 모드·자료 패널·이전/다음 가사 명령과 IME·입력 영역·브라우저 기본키 충돌 방지
- 편집기 단축키 실행 전 초안 flush, 커서·스크롤·초점 복원과 복사 실패 시 선택 가능한 수동 복사 대안
- 계정에 저장되는 system/light/dark 테마와 가사 작성 글꼴·크기·줄 간격·자간·집중 모드 기본값
- 계정 기본값보다 우선하는 가사별 표시 설정, 명시적 초기화와 새 화면 진입 시 다른 기기 변경 반영
- 초기 테마 깜박임을 막는 시스템 색상 감지, PC 설정 분할 화면·모바일 초점 관리 시트와 대비·저장 실패 안내
- 0.8.0 읽기 전용 기본·owner 전용 가사/프롬프트 템플릿, 사용자별 즐겨찾기·최근 사용과 유형·출처 필터
- PC 분할·360px 모바일 템플릿 목록/미리보기/CRUD·복제 화면과 빈 자료 또는 템플릿을 고르는 새 가사·프롬프트 흐름
- 유형·owner·부모 곡을 한 transaction에서 검사해 적용 시점 원문을 독립 새 자료로 복사하는 멱등 템플릿 적용
- 0.7.0 owner 전용 통합 검색 계약, 원문 보존 NFKC 검색 projection, `pg_trgm` GIN 인덱스, 문자 그대로 특수문자 처리와 관련 곡·점수·안정 cursor 결과 기반
- PC·모바일 통합 검색 화면, URL 자료 유형 필터, 취소·오래된 응답 차단, 안전한 텍스트 강조, 키보드 탐색과 가사 본문 위치 딥링크
- owner별 최근 검색어 8개 다시 실행·개별 삭제·전체 지우기와 삭제·권한 없음·잘못된 ID의 공통 비노출 안내
- 수정과 열람을 구분하는 owner별 통합 최근 작업, 유형·소속 곡·상태·메모 존재 카드와 PC·모바일 날짜별 화면
- 본문을 저장하지 않는 가사 cursor·송폼·scroll 위치의 지연 병합, 기기 크기·본문 변경에 안전한 송폼 우선 복원과 범위 clamp
- 곡·가사·라임 노트·프롬프트의 독립적인 즐겨찾기·핀, owner별 전역 핀 순서, 자료 유형·소속 곡·작업 상태·표시 범위 URL 필터와 접근 가능한 재정렬
- 검색→가사 편집→최근 위치 복귀와 saved filter의 새 기기 복원을 묶은 0.7.0 PC·모바일 통합 회귀, 대량 성능 기준 및 0.6.0 DB 업그레이드 검사
- 0.6.0 곡 hero, 실제 가사·프롬프트·라임 집계, 가사 버전 카드·작업 메모·연결 자료 preview와 영역별 실패 복구를 갖춘 PC·모바일 곡 대시보드
- 곡 중심 라임·프롬프트 유형 탭과 owner 제목·본문/토큰 검색, 연결 상태 필터, 다중 선택·멱등 연결, 이름 확인 해제와 원본 보존을 갖춘 PC modal·모바일 bottom sheet
- 가사 편집기의 다른 곡·다른 가사·라임·프롬프트 공통 자료 패널, owner 검색·연결 우선/전체 범위, 초안 보존 전환과 새 창 열기, PC 접기·너비 복원 및 모바일 스크롤 sheet
- 라임 전체·선택 표현의 CRDT 상대 cursor 삽입과 단일 undo, target 변경·삭제·권한·IME 실패 시 원문 보존 복사 대안
- PC 상단·모바일 FAB의 곡·가사·라임·프롬프트 전역 빠른 추가, 새 가사 부모 곡 선택과 계정별 IndexedDB 오프라인 멱등 빠른 아이디어
- 가사 편집 자료 패널에서 화면을 떠나지 않고 owner 검증된 라임·프롬프트 원문 전체를 복사하는 동작과 0.6.0 곡 제작 PC·모바일 통합 여정
- 0.5.0 프롬프트 쉼표 parser, 표시 보존 NFKC 중복 비교, 순서형 Yjs 토큰과 결정적 쉼표 평문 projection
- owner별 프롬프트 토큰 사용 횟수·최근 사용 자동완성 기반, 멱등 생성·복제·업데이트, 곡 연결과 soft delete 데이터 계약
- PC 2열·모바일 1열 프롬프트 목록, 제목·토큰·연결 곡 검색, 즐겨찾기·최근 사용 필터와 URL 상태
- 핵심 토큰 `+N` 미리보기, 항상 보이는 전체 복사·모바일 길게 누르기·수동 복사 대안과 멱등 복제
- PC·모바일 프롬프트 신규·복제·편집 화면, 계정별 IndexedDB 신규 초안과 제목·토큰 CRDT 자동 저장
- owner의 과거 사용 빈도·최근 사용 기반 자동완성, 키보드·touch 선택과 실패·0건에서도 유지되는 직접 입력
- 중복 토큰의 정규화 키·위치 안내, 개별 삭제·첫 표시/순서 보존 일괄 정리와 정리 전 수정 기록 복원
- 세션 만료 시 초안을 보존하는 재로그인 안내와 전송할 수 없는 초안의 비상 내려받기
- 명확한 손잡이의 mouse·touch drag, 방향키와 앞으로·뒤로 버튼, focus 복원·이동 안내를 갖춘 프롬프트 토큰 순서 변경
- 동시 이동·삭제에도 occurrence 중복 없이 수렴하는 프롬프트 순서와 중복 정리된 쉼표 미리보기·정확한 전체 복사·수동 복사 대안
- 복제 전 중요 수정 기록과 재시도 멱등 복제, 편집 화면 즐겨찾기·핀, owner 범위 곡 검색·연결·확인 후 해제
- 0.3.1 수정 기록: 변경된 본문의 5분·중요 작업 전 스냅샷, 180일/200개 보존과 독립 가사 버전 구분
- PC 나란히·모바일 전환/세로 본문 비교, 복원 직전 내용을 보존하는 복원과 같은 계정 기기 동기화
- 오래된 비교의 복원 차단, 실패 시 전체 복구, 응답 유실 후 중복 없는 재시도
- 0.3.0 가사 resource·현재본 API: 한 곡의 독립 가사 생성·복제·수정·삭제, 원문 보존과 오래된 저장 차단
- 실제 활성 가사 수 집계와 곡 삭제 시 같은 작업에 속한 활성 가사만 함께 숨기는 규칙
- CodeMirror 기반 순수 텍스트 가사 편집기, 한글 IME 안전 자동 저장, 저장 실패 재시도와 PC·모바일 장문 편집 화면
- 표준·사용자·반복 송폼 태그 강조와 PC 목차·모바일 시트 구간 탐색
- 현재 편집 중인 전체 가사·선택 송폼 복사, 권한 실패 수동 복사 대안과 PC·모바일 집중 모드
- 곡 대시보드의 실제 가사 카드·개수·빈 상태와 생성·전환·복제·삭제, editor 메타데이터, owner 범위 가사 검색을 잇는 0.3.0 전체 흐름
- 0.3.1 동일 owner Yjs 본문 계약, opaque 문서·업데이트 식별자, 역순·중복 수렴과 결정적 평문 projection 기준
- owner별 IndexedDB 가사 초안, BroadcastChannel 다중 탭 병합, 오프라인 복구와 실제 영속 수준 저장 상태
- 인증 WebSocket 가사 동기화, 멱등 update ACK, PostgreSQL snapshot·평문 투영·압축·재시작 복구와 내용 없는 운영 지표
- 0.4.0 라임 노트·owner별 태그·곡 연결 데이터 계약과 생성·복제 멱등성, 가사와 같은 CRDT·평문·수정 기록 경계
- 라임 편집기의 곡 검색·중복 없는 연결/해제, 태그 필터 이동, 전체/선택 복사와 클립보드 실패 수동 복사 대안
- 0.6.0 가사 삽입을 위한 라임 선택·가사 cursor Yjs 상대 위치, 순수 텍스트 snapshot과 대상 불가 사유 계약

- 제품 기획, 15개 PC·모바일 목업, 구현 기술 결정 기준선
- `0.0.0`부터 `1.0.0`까지의 버전·Phase 실행 계획
- 사람과 AI Agent를 위한 저장소 안내 및 협업 골격
- 승인된 ADR-0001~0009와 Node.js/pnpm workspace
- Docker Compose 기반 web·collaboration·worker·PostgreSQL·migration 개발환경
- 15개 route 중립 화면과 liveness/readiness endpoint
- 빈 작업 사본·빈 Docker volume, 장애 회복, 데이터 지속·초기화, 보안·PC·모바일 기준선 검증 보고서
- Google OIDC Authorization Code + PKCE 경계, 비공개 베타 허용 목록, PostgreSQL opaque 세션과 로그아웃 API
- 내부 사용자 ID 기반 profile 소유권, transaction-local 사용자 문맥과 강제 RLS
- PC·모바일 Google 로그인 화면, 인증 상태 안내, 정책 문서와 보호된 반응형 작업 공간 셸
- 로컬 OIDC 기반 로그인·세션·로그아웃 E2E, A/B 소유권 공격 검사와 PC·모바일 시각 회귀 기준
- 모바일 셸 로그아웃, 계정별 브라우저 캐시 정리와 공통 응답 보안 헤더
- 0.2.0 resource 생성용 서버 owner context 계약
- 공통 resource·곡 1:1 데이터 모델, 상태·색상·길이 계약, owner RLS와 soft delete 기반
- owner 범위 곡 생성·수정·조회·soft delete와 멱등 생성, 검색·상태·다섯 정렬·cursor API
- PC·모바일 곡 목록, 새 곡·곡 수정 공통 폼, 기본 곡 대시보드와 작업 메모·pin·favorite 흐름
- 가사·라임·프롬프트 미지원 집계를 정직한 0과 구분된 빈 상태로 표시하는 0.2.0 곡 수직 흐름

### Changed

- 홈랩 개발 서버의 공개 주소를 `devlyrics.parkingp.kr`로 변경
- 신규 릴리스 서버에 개발 환경과 분리된 Cloudflare Tunnel·DNS·HTTPS 경로 구성
- 개발·릴리스 서버에 Docker Engine·Compose·Buildx·Git 기본 운영 환경 구성
- 공개 개발 web을 Next.js production standalone image로 전환해 Cloudflare·브라우저의 이전 CSS cache와 최신 HTML이 섞이지 않도록 보정
- 로컬·개발·릴리스 Docker 작업 뒤 LyricsCloud의 미사용 객체와 초과 build cache를 정리하되 volume과 실행 중 자산은 보존하도록 표준화
- CI 검증을 통과한 web·collaboration·worker·migrate image를 각 Docker Hub repository에 version·SHA·Dev 다중 tag로 발행하고, 승인된 릴리스만 Release·latest를 추가하도록 자동화

### Known limitations

- production build의 Yjs duplicate import 경고는 기능·원문 불일치 없이 P2로 추적하며 1.0.1에서 단일 import 경로를 조사
- 단일 web replica 메모리 rate limiter 때문에 scale-out 전 공용 limiter 필요
- 실제 iOS/Android 인수는 PASS했지만 기기·OS·브라우저 상세 버전 미제공
- 공식 릴리스 서버의 외부 암호화 backup·24시간 RPO·복원 훈련은 사용자 승인으로 1.0.1+까지 유예

### Fixed

- `drizzle-orm` 식별자 escape SQL injection advisory를 수정 버전으로 올리고 profile PATCH의 누락된 공통 CSRF/Origin 검사를 보완
- 설정 화면의 테마 미리보기를 늦게 도착한 앱 셸 서버 설정 응답이 덮어쓸 수 있던 경쟁 조건 수정
- Next.js가 여러 CSS chunk를 생성할 때 개발 배포 검사가 첫 자산만 보고 정상 production 화면을 실패로 판정하던 문제 수정
- 검색 딥링크로 가사 일치 위치를 선택한 직후 협업 편집기의 편집 가능 전환이 포커스를 잃게 하던 초기화 순서 수정
- 모바일 자료 bottom sheet 위에서 clipboard 수동 복사 dialog가 뒤에 가려져 닫기·원문 선택을 누를 수 없던 stacking 오류 수정
- 연결 저장 실패와 동시에 지연 검색이 완료되면 선택 유지·재시도 안내가 사라지던 오류 상태 경쟁 조건 수정
- 오프라인 신규 프롬프트에서 최신 토큰 순서의 IndexedDB 쓰기가 시작되기 전 이전 쓰기의 `저장됨` 상태가 남거나, 완료되기 전에 `저장됨`으로 보이던 경쟁 조건 수정
- PostgreSQL 통계에 따라 임의 인덱스를 고르던 정렬 인덱스 계약 검증을 실제 정렬 인덱스 사용으로 안정화
- 라임 목록에서 느린 응답 중 pin·favorite·색상을 연속 변경하면 오래된 응답이 마지막 선택을 덮어쓰던 경쟁 조건 수정
- 로그아웃 전 다른 탭의 입력과 닫힌 문서의 전송 대기열을 확인해 초안이 먼저 지워지는 문제 수정
- 로그아웃 실패·중단 후 편집 복구, 동일 계정 전체 세션 폐기와 중간 계정 변경 시 잘못된 로그아웃 차단
- DB 재시작 시 끊어진 유휴 연결로 앱 프로세스가 종료되는 문제 수정
- 초기 동기화 중 읽기 전용 편집기의 송폼 목차 포커스 수정
- 서버가 세션을 폐기한 뒤 `Clear-Site-Data` 처리로 로그아웃 fetch가 끊기면 성공한 로그아웃을 실패로 오인하던 문제 수정
