# LyricsCloud 1.0.9 정식·1.0.10 후보 지원 정책

## 지원 환경

| 대상 | 최소 지원 |
|---|---|
| Chrome / Edge desktop | Chromium 계열 111+, Windows 11 또는 지원 중인 macOS |
| Firefox desktop | Firefox 111+, Windows 11 또는 지원 중인 macOS |
| Safari desktop | Safari 16.4+, 지원 중인 macOS |
| iPhone / iPad | iOS/iPadOS 16.4+ Safari, 브라우저 탭 또는 홈 화면 설치본 |
| Android | Android 12+ Chrome 111+, 브라우저 탭 또는 설치본 |

자동 Chromium·Firefox·WebKit 검사는 엔진 회귀 기준이며 실제 Safari 자체를 대신하지 않는다. 실제 iOS/Android 설치·한글 IME·offline·update·logout은 사용자 인수에서 PASS했지만 기종·OS·브라우저 세부 버전은 제공되지 않았다.

## 알려진 제한

| ID | 등급 | 현재 경계 | 후속 |
|---|---|---|---|
| `RC-091-001` | 해소 | 1.0.1 P9에서 Yjs 13.6.32 직접 소비를 단일화했고 production build 경고가 사라짐 | 장문·동기화·offline·restore 회귀를 계속 유지 |
| `RC-100-001` | P2 운영 제한 | 인증·검색·export rate limiter는 단일 web replica 메모리 경계 | scale-out 전에 공용 limiter 도입 |
| `RC-091-002` | P3 증거 품질 | 실제 iOS/Android 결과는 PASS지만 상세 기기 정보가 없음 | 다음 실제 기기 인수 때 버전 기록 |
| `OPS-100-001` | 운영 위험 | 공식 릴리스 서버의 외부 암호화 backup·24시간 RPO·복원 훈련은 사용자의 현재 승인 예외로 미구축이며 호스트 손실 복구 지점을 보장하지 않음 | 후속 운영 작업에서 구축·훈련; 그 전 각 릴리스 기록에 위험 재기재 |

1.0.1 P4 실제 Google 신규 가입, P5 Windows Chrome·Edge 한글 IME 저장·재진입, P6 light/dark 핵심 action, P7 로고·runtime metadata 인수는 완료됐다. 자동 브라우저와 사용자 실기기 결과는 서로 구분해 보존한다.

1.0.3은 태그형/문장형 mode·raw 분리와 명시 변환·복원·구버전 capability 차단을 포함한 현재 정식 버전이다. 가입·저장·PWA 복구 순서는 [1.0.2 복구 안내](./runbooks/1.0.2-user-recovery.md)에 있다.

1.0.4 후보는 문장형 프롬프트를 ASCII 마침표 포함 lossless 구간으로 표시하고, 모든 최종 복사 경로에서 Unicode code point 1,000자 초과를 안내하되 복사를 막지 않는다. 실제 PostgreSQL, Chromium desktop/mobile 전수와 Chromium/Firefox/WebKit 기능 행렬, 동일 SHA 개발 collaboration 재시작을 통과했다. P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.5 후보는 `[TAG:sub tag]`의 첫 콜론 앞 주 이름으로 탐색하고 suffix 원문을 보존하며 가사 최종 LF payload가 3,000 Unicode code point를 넘을 때만 안내한다. 실제 PostgreSQL, Chromium desktop/mobile 전수, Firefox/WebKit 표시·복사와 동일 SHA 개발 collaboration 재시작을 통과했다. 실제 물리 IME는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.6 후보는 exact-case Extend 정식 표식 줄만 Suno 전체 복사에서 제외하고 raw CRDT·revision·검색·ZIP export에는 그대로 보존한다. PC 우클릭·메뉴키/`Shift+F10`과 모바일 보이는 버튼이 같은 기본 송폼을 CRDT 상대 caret에 삽입한다. 실제 PostgreSQL, Chromium desktop/mobile 전수, Firefox/WebKit 기능 행렬과 동일 SHA 개발 revision/export·collaboration 재시작을 통과했다. 실제 물리 IME는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.7 후보는 곡·라임·프롬프트 목록의 리스트·소/중/대 그리드를 계정·자료 유형별로 저장한다. 보기 변경은 검색·필터·순서·scroll을 유지하고 독립 CAS가 다른 표시 설정을 보존한다. 실제 PostgreSQL 283건, Chromium 전체 340건, Chromium/Firefox/WebKit 신규 30건과 동일 SHA 개발 재시작 지속성을 통과했다. 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.8 후보는 곡 목록의 drag·버튼·키보드 이동을 계정별 사용자정렬로 저장한다. 필터 중 visible anchor, 두 탭 stale·재전송, 다른 owner 거부와 실패 원복을 포함해 실제 PostgreSQL 298건, Chromium 316건, Chromium/Firefox/WebKit 신규 30건과 동일 SHA 개발 서비스 재시작 지속성을 통과했다. 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.9 후보는 같은 사용자정렬을 라임 노트·프롬프트로 확장하고 모바일 long-press copy와 이동을 분리한다. 자료 유형별 독립 rank, prompt 토큰·원문 불변, 즐겨찾기 삭제·복원, 권한·stale·응답 유실을 포함해 실제 PostgreSQL 309건, Chromium 322건, Chromium/Firefox/WebKit 기능 15건과 동일 SHA 개발 서비스 재시작 지속성을 통과했다. 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.10 후보는 곡별 수동 Suno 모델명과 최대 20개 작업 링크를 저장한다. 링크는 공식 Suno HTTPS 곡/짧은 공유 주소만 허용하고 새 탭 opener를 차단하며, 다른 owner는 404로 숨긴다. 실제 PostgreSQL 7건, Chromium/Firefox/WebKit 5-project 기능 20건, Actions `34610699744` 전체 CI와 동일 SHA 개발 삭제복원·서비스 재시작 지속성을 통과했다. 자동 metadata·scraping은 없고 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

미해결 P0/P1은 0건이다. 저장 수렴 실패, 다른 사용자의 자료 노출, 인증 우회, 핵심 모바일 불능, 복구 불가능 증거가 생기면 즉시 P0/P1으로 재분류하고 배포를 중단한다.

## 문제 보고

일반 사용 문제는 GitHub Issue에 버전, build SHA, 브라우저·OS, 재현 단계, 화면에 표시된 익명 error code와 `requestId`만 적는다. 실제 제목·가사·라임·프롬프트·검색어·이메일·cookie·OAuth code·token·DB URL·내보내기/backup 파일은 첨부하지 않는다.

보안 취약점과 교차 사용자 노출 의심은 공개 Issue를 만들지 말고 [보안 정책](../SECURITY.md)의 비공개 경로로 보고한다. 서비스 장애 대응은 [관측 경보 runbook](./runbooks/observability-alerts.md), 배포 복구는 [upgrade·rollback runbook](./runbooks/backup-restore-upgrade.md)을 따른다.
