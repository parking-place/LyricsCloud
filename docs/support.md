# LyricsCloud 1.1.2 정식 지원 정책

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

1.0.3에서 태그형/문장형 mode·raw 분리와 명시 변환·복원·구버전 capability 차단을 도입했다. 가입·저장·PWA 복구 순서는 [1.0.2 복구 안내](./runbooks/1.0.2-user-recovery.md)에 있다.

1.0.4 후보는 문장형 프롬프트를 ASCII 마침표 포함 lossless 구간으로 표시하고, 모든 최종 복사 경로에서 Unicode code point 1,000자 초과를 안내하되 복사를 막지 않는다. 실제 PostgreSQL, Chromium desktop/mobile 전수와 Chromium/Firefox/WebKit 기능 행렬, 동일 SHA 개발 collaboration 재시작을 통과했다. P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.5 후보는 `[TAG:sub tag]`의 첫 콜론 앞 주 이름으로 탐색하고 suffix 원문을 보존하며 가사 최종 LF payload가 3,000 Unicode code point를 넘을 때만 안내한다. 실제 PostgreSQL, Chromium desktop/mobile 전수, Firefox/WebKit 표시·복사와 동일 SHA 개발 collaboration 재시작을 통과했다. 실제 물리 IME는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.6 후보는 exact-case Extend 정식 표식 줄만 Suno 전체 복사에서 제외하고 raw CRDT·revision·검색·ZIP export에는 그대로 보존한다. PC 우클릭·메뉴키/`Shift+F10`과 모바일 보이는 버튼이 같은 기본 송폼을 CRDT 상대 caret에 삽입한다. 실제 PostgreSQL, Chromium desktop/mobile 전수, Firefox/WebKit 기능 행렬과 동일 SHA 개발 revision/export·collaboration 재시작을 통과했다. 실제 물리 IME는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.7 후보는 곡·라임·프롬프트 목록의 리스트·소/중/대 그리드를 계정·자료 유형별로 저장한다. 보기 변경은 검색·필터·순서·scroll을 유지하고 독립 CAS가 다른 표시 설정을 보존한다. 실제 PostgreSQL 283건, Chromium 전체 340건, Chromium/Firefox/WebKit 신규 30건과 동일 SHA 개발 재시작 지속성을 통과했다. 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.8 후보는 곡 목록의 drag·버튼·키보드 이동을 계정별 사용자정렬로 저장한다. 필터 중 visible anchor, 두 탭 stale·재전송, 다른 owner 거부와 실패 원복을 포함해 실제 PostgreSQL 298건, Chromium 316건, Chromium/Firefox/WebKit 신규 30건과 동일 SHA 개발 서비스 재시작 지속성을 통과했다. 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.9 후보는 같은 사용자정렬을 라임 노트·프롬프트로 확장하고 모바일 long-press copy와 이동을 분리한다. 자료 유형별 독립 rank, prompt 토큰·원문 불변, 즐겨찾기 삭제·복원, 권한·stale·응답 유실을 포함해 실제 PostgreSQL 309건, Chromium 322건, Chromium/Firefox/WebKit 기능 15건과 동일 SHA 개발 서비스 재시작 지속성을 통과했다. 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.10 후보는 곡별 수동 Suno 모델명과 최대 20개 작업 링크를 저장한다. 링크는 공식 Suno HTTPS 곡/짧은 공유 주소만 허용하고 새 탭 opener를 차단하며, 다른 owner는 404로 숨긴다. 실제 PostgreSQL 7건, Chromium/Firefox/WebKit 5-project 기능 20건, Actions `34610699744` 전체 CI와 동일 SHA 개발 삭제복원·서비스 재시작 지속성을 통과했다. 자동 metadata·scraping은 없고 실제 물리 기기는 새로 실행하지 않았으며 P5 전체 CI 전에는 정식 지원 버전이나 릴리스 서버 배포로 보지 않는다.

1.0.12는 곡·라임·프롬프트 목록의 위치 계산을 결과 동등 O(n) 공통 경로로 바꾸고, 기존 작성·copy·정렬·Suno 수동 링크를 desktop/mobile 수직 흐름과 서비스 재시작으로 재검증해 정식 배포했다. main CI `34638724606`, tag CI `34641693226`, exact digest 운영 배포와 공개 재시작 지속성을 통과했다. 실제 물리 기기 검사는 이번 릴리스에서 새로 실행하지 않았다.

1.0.13의 NAVER 세 언어 사전 tooltip은 공식 뜻풀이 API와 표시·캐시·재배포 권리를 확인하지 못해 제공하지 않는다. 백과사전 검색·scraping·비공식 endpoint로 대체하지 않으며, 정식 계약 확보 전 `NF-REQ-043`은 미완료다.

1.0.14는 Noto Sans KR 2.004 Regular를 OFL 전문과 함께 same-origin으로 제공한다. Latin·한글 완성형/자모·Kana·포함된 Han/기호를 지원하며 누락 글리프·emoji는 system fallback을 사용한다. 설정과 가사별 선택, 세 편집기 원문/copy·slow/blocked/offline·200줄 저장/재진입은 자동·공개 환경에서 PASS했다. 실제 Windows 한글 IME·Android/iOS 키보드에서의 1.0.14 폰트 전환과 물리 저사양 기기는 미실행이다. 글자가 비면 `시스템 기본`으로 전환하고 [폰트 문제 해결](./third-party-fonts.md)을 따른다.

1.1.0 후보는 로그인한 계정 사이의 특정 가사 selected-read를 지원한다. public link·guest·쓰기 공유는 지원하지 않는다. 공유 화면이 연결되지 않으면 먼저 로그인 계정과 권한 회수·만료 여부를 확인하고, `다시 연결` 또는 새로고침으로 권한을 재검증한다. reader에게 메모·연결 자료·다른 가사·revision·owner 작업이 보이거나 수정/삭제가 성공하면 보안 사고로 취급해 배포를 중단한다. P4의 Linux 5-browser 자동화는 PASS했지만 실제 OS/물리 기기는 새로 실행하지 않았다.

1.1.1 후보는 로그인 없는 공개 링크 읽기를 지원한다. 주소 fragment는 첫 처리 뒤 제거되며 raw 링크는 다시 조회할 수 없다. 링크가 열리지 않으면 전체 주소가 복사됐는지, 만료·회수·교체됐는지 확인한다. 공개 화면에 workspace·메모·연결 자료·revision·export·presence가 보이거나 쓰기가 성공하거나, 회수 뒤 새 내용이 전달되면 보안 사고로 취급해 배포를 중단한다. P4의 Linux 5-browser·offline/reconnect·서비스 재시작 자동화는 PASS했지만 실제 OS/물리 기기는 새로 실행하지 않았다.

1.1.2는 활성 selected-read grant 안의 지정 사용자에게만 가사 본문 공동 편집을 허용한다. writer는 ACL·제목·상태·메모·연결 자료·revision·삭제·소유권을 바꿀 수 없다. 읽기 전용 강등은 읽기 연결을 유지하면서 새 쓰기와 cursor를 중단하고, 회수는 연결을 종료한다. 권한 epoch 경계에서 거부된 입력은 계정·actor·자료·grant·epoch별 복구함에 남으며 재허용 뒤 자동 적용되지 않는다. 복구 원문이 사라지거나 다른 사용자에게 보이거나, 강등·회수 뒤 새 쓰기가 ACK되거나, writer 권한이 관리 기능으로 확대되면 배포를 중단한다. 실제 PostgreSQL·Linux 5-browser·offline/reconnect·서비스 재시작 자동화와 exact digest 운영 공개 smoke는 PASS했지만 실제 OS/물리 기기는 새로 실행하지 않았다.

정식 main/tag `eb949b5`, main CI `34724875009` 재실행, tag CI `34726392136`, 네 exact digest 운영 배포를 완료했다. 공개 HTTPS에서 공동 편집·강등/회수·rejected 복구·private 격리와 서비스 재시작 지속성이 PASS했다. 기존 DB volume·secret·HMAC allowlist·beta code는 보존했으며 외부 backup은 `OPS-100-001` 승인 예외로 여전히 미구축이다.

미해결 P0/P1은 0건이다. 저장 수렴 실패, 다른 사용자의 자료 노출, 인증 우회, 핵심 모바일 불능, 복구 불가능 증거가 생기면 즉시 P0/P1으로 재분류하고 배포를 중단한다.

## 문제 보고

일반 사용 문제는 GitHub Issue에 버전, build SHA, 브라우저·OS, 재현 단계, 화면에 표시된 익명 error code와 `requestId`만 적는다. 실제 제목·가사·라임·프롬프트·검색어·이메일·cookie·OAuth code·token·DB URL·내보내기/backup 파일은 첨부하지 않는다.

보안 취약점과 교차 사용자 노출 의심은 공개 Issue를 만들지 말고 [보안 정책](../SECURITY.md)의 비공개 경로로 보고한다. 서비스 장애 대응은 [관측 경보 runbook](./runbooks/observability-alerts.md), 배포 복구는 [upgrade·rollback runbook](./runbooks/backup-restore-upgrade.md)을 따른다.
