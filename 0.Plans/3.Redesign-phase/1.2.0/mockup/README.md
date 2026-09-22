# Chroma Dock · Cobalt Blue 선택 목업

**1.2.0 디자인 계획용 합성 목업**입니다. 사용자가 선택한 E · Chroma Dock의 **04 Cobalt Blue**만 옮겼습니다. 기본은 라이트이며 기존 테마 버튼과 설정에서 다크로 전환합니다. 제품 기능의 구현·배포 완료를 뜻하지 않습니다.

- [라이트 홈](index.html?theme=light#home)
- [다크 홈](index.html?theme=dark#home)
- [라이트 가사 편집기](index.html?theme=light#lyric/l1)
- [다크 가사 편집기](index.html?theme=dark#lyric/l1)
- [1.2.0 계획](../README.md)

`index.html`을 브라우저에서 직접 열면 됩니다. `file://`와 JavaScript만으로 동작하며 서버·로그인·외부 CDN·폰트·API가 필요하지 않습니다. 이 `mockup` 폴더를 통째로 복사해도 화면은 동작합니다. 상단의 계획 링크는 상위 `1.2.0/README.md`를 가리키므로 계획 문서까지 보려면 상위 폴더도 함께 옮깁니다.

## 선택한 디자인

| 역할 | 색상 |
|---|---|
| 주조색 | `#568DF0` |
| 보조색 | `#91CBB3` |
| 반사광 | `#EAAF88` |
| 라이트 바탕 / 본문 / 보조 글자 / 강조 | `#EFF4FC` / `#203751` / `#4B627B` / `#285CB0` |
| 다크 바탕 / 본문 / 보조 글자 / 강조 | `#142238` / `#EDF4FF` / `#ACC1DD` / `#99BDF9` |

밝기를 바꾸어도 색상 조합은 Cobalt Blue로 유지됩니다. 색상 10종 선택기와 다른 디자인 비교 갤러리는 포함하지 않습니다. `?theme=dark`는 다크, 생략 또는 잘못된 값은 라이트로 시작합니다. 기존 테마 버튼은 본문·선택 범위를 다시 만들지 않고 색상 토큰만 갱신합니다. 저장된 창작물과 화면 설정은 아래의 별도 합성 저장 공간을 사용하며 초기 화면 밝기는 URL 지정이 우선합니다.

## 유지한 화면과 시연 동작

원본 E의 앱 동작은 저장 키와 URL 초기 밝기 연결만 바꾸었습니다. 홈·곡·라임 노트·프롬프트·검색·최근·즐겨찾기·템플릿·휴지통·설정의 10개 목적지, 홈 작업 모듈, 편집기와 송폼 도구, 다른 곡·다른 가사·라임·프롬프트의 자료 4탭, 모달·공유·기록·설정·계정 도구와 모바일 더보기 경로를 유지합니다. 시연 도구의 기존 **207개 기능 설명**도 보존했습니다. 이는 207개 제품 기능의 실제 구현이나 전체 검증 통과를 뜻하지 않습니다.

다음 흐름을 조작할 수 있습니다.

1. 홈의 이어쓰기 → 가사 입력 → 자료 4탭 전환 → 라임 선택 삽입 → Suno용/원문 복사.
2. 라임 본문·태그·곡 연결, 태그형 프롬프트의 순서·중복 정리와 문장형 프롬프트의 원문·템플릿 추가·변환 undo.
3. 곡의 가사 버전·메모·Suno 링크 시연, 검색·최근·즐겨찾기·템플릿·휴지통.
4. 설정의 별도 프로필/화면 저장, 닉네임·사진 미리보기, 미저장 이탈 확인, 공유 역할·공개 범위와 복구 시연.
5. 모바일 곡·라임·프롬프트·검색·더보기, 빠른 추가·모달·키보드 대안.

## 합성 자료와 제품 구현의 경계

모든 곡·가사·라임·프롬프트·계정은 합성입니다. 저장 키는 **`lyricscloud-redesign-120-cobalt-v1`**이며 원본 E, 10색 컬렉션, 실제 제품 저장 공간과 구분됩니다. 초기화는 **시연 도구 → 합성 데이터 초기화**에서 이 목업의 자료만 되돌립니다. 실제 가사·이메일·사진을 입력할 필요가 없습니다.

서버 API·OAuth·DB·Yjs/CRDT·WebSocket·실제 공유 권한·PWA 설치·서버 ZIP·사진 서버 처리·실제 계정 탈퇴는 연결하지 않습니다. 본문 편집은 화면 검토용 textarea이며 제품의 CodeMirror 6·IME·동기화 계약을 대신하지 않습니다. 브라우저 보관을 서버 저장 완료라고 표시하지 않습니다.

## 파일과 출처

| 파일 | 역할 |
|---|---|
| [index.html](index.html) | 선택 목업의 단일 진입점, 상위 계획 링크 |
| [base/app.js](base/app.js) | E 원본 앱과 최소 저장 키/초기 밝기 어댑터 |
| [base/styles.css](base/styles.css), [base/feature-data.js](base/feature-data.js) | E의 기반 스타일과 207개 기능 설명, 원본 바이트 유지 |
| [palette.js](palette.js) | 기존 04 Cobalt 레코드 한 개 |
| [color-core.js](color-core.js), [color-layer.css](color-layer.css) | 원본 색상 토큰 계산·재질 덮어쓰기 계층 |
| [boot.js](boot.js), [theme-sync.js](theme-sync.js) | 최초 테마와 기존 테마 동작 연결 |
| [tokens.css](tokens.css) | 같은 계산으로 추출한 라이트/다크 토큰 참조본 |
| [source-manifest.json](source-manifest.json) | 기준 SHA·원본 파일 해시·복사본 무결성·어댑터 범위 |
| [vendor/NOTICE.md](vendor/NOTICE.md), [vendor/SOURCE.json](vendor/SOURCE.json) | GSAP 3.15.0 core/Draggable의 저작권·라이선스 링크와 배포 출처/해시 |
| [verify.mjs](verify.mjs), [verification.json](verification.json) | 이 경로에서의 자동 검증·새 캡처와 실행 결과 |

출처는 2026-09-22 작성한 E · Chroma Dock과 10색 컬렉션 중 04 선택안입니다. 당시 시안의 제품 비교 기준은 **v1.1.7a / `fc2463cdb47d9fd7d0042779f602c6ddb7d734cf`**입니다. 이 값은 계획의 런타임 버전이나 새 릴리스 SHA가 아닙니다. 사용자의 선택 목업 이전 지시에 따라 필요한 합성 파일만 공개 계획 경로로 복사했으며 비공개 원본은 보존했습니다. 출처 이름은 이력 식별자이고 실행 시 원본 폴더를 읽지 않습니다.

GSAP·Draggable은 기존 로컬 배포본을 사용하고 원본 저작권·라이선스 헤더를 유지합니다. 외부 문서 링크를 여는 동작과 목업 실행에 필요한 네트워크 요청은 별개입니다.

## 새 경로의 미리보기

모든 이미지는 위 `index.html`의 상단 **1.2.0 계획** 링크가 반영된 화면을 새로 촬영한 것입니다. 홈·편집기는 1440×1050, 모바일 홈은 390×844의 고정 뷰포트입니다. 이미지 밖의 내용은 실제 목업에서 스크롤해 확인합니다.

| 화면 | 라이트 | 다크 |
|---|---|---|
| 홈 | [라이트 홈](previews/cobalt-light-home.png) | [다크 홈](previews/cobalt-dark-home.png) |
| 편집기 | [라이트 편집기](previews/cobalt-light-editor.png) | [다크 편집기](previews/cobalt-dark-editor.png) |
| 모바일 홈 | [라이트 모바일](previews/cobalt-light-mobile.png) | [다크 모바일](previews/cobalt-dark-mobile.png) |

## 검증 실행

Node.js와 Playwright Chromium이 있는 환경에서 이 폴더의 경로를 지정합니다. 검증 스크립트는 자체 위치를 기준으로 HTML을 열고 결과·토큰 참조·여섯 PNG를 같은 폴더에 기록합니다.

```sh
node '0.Plans/3.Redesign-phase/1.2.0/mockup/verify.mjs'
```

작업 공간의 `playwright` 패키지 해석이 제공되지 않는 환경은 설치된 로컬 모듈의 절대 경로를 환경변수로 지정할 수 있습니다. 스크립트에 사용자별 경로를 고정하지 않습니다.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node '0.Plans/3.Redesign-phase/1.2.0/mockup/verify.mjs'
```

2026-09-22, Node **v24.20.0** / Chromium **151.0.7922.34**의 `file://` 실행에서 **22개 검사 PASS**했습니다. **320/390/768/1440px × 라이트/다크 × 12화면 = 96개 레이아웃**에 문서 가로 넘침이 없었고, **6개 PNG**를 새로 촬영했습니다. JavaScript 런타임 오류와 외부 HTTP 요청은 각각 **0건**입니다. 검사에는 10개 메뉴, 자료 4탭, 본문·선택 범위 보존, 프로필/화면 설정 분리, 라임·프롬프트·공유 역할·모바일·원본 앱 어댑터 해시를 포함합니다. 검증 결과는 [verification.json](verification.json)이 원본입니다. Chromium 화면 모사이며 실제 모바일 기기·OS IME·가상 키보드·스크린 리더 음성·모든 브라우저 엔진·반투명 표면 전체의 픽셀 대비·제품 서버 인수는 이 검사의 범위가 아닙니다. 첫 실행의 라임 삽입 검사는 앞선 선택 범위 보존 검사의 커서 상태를 이어받아 실패했습니다. 삽입 검사가 자기 커서를 명시하도록 검증 스크립트만 수정했으며 해당 실패를 통과로 바꾸어 기록하지 않습니다.
