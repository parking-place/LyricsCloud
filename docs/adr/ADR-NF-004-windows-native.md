# ADR-NF-004 — Windows native 기술·편집기·인증

- 상태: **Accepted for 1.1.8 read/copy foundation / 1.1.9 editor gate 유지**
- 작성일: 2026-09-09
- P1 재검토일: 2026-09-15
- 결정 Phase: 1.1.8 P1, 편집 인수 1.1.9
- 승인자/시각: **사용자 / 2026-09-15 09:11 KST**
- 승인 문구: **`1.1.8 Windows 권고안 승인`**
- 승인한 적용 범위: **WinUI 3/.NET native UI, 1.1.8 read/copy-only, WebView2 미포함, system browser + first-party loopback PKCE, 계정별 DPAPI cache. 1.1.9 native editor/Yjs는 별도 gate이며 실패 시 WebView2 대안을 다시 승인받는다.**
- 기준 source: `b288dcfd5d3d0a69868b5201c878df7a221e63f3` (`v1.1.7` 릴리스 기록이 병합된 main)

## 해결할 질문과 범위

Windows에 설치되는 첫 앱을 어떤 기술로 만들고, 기존 Google 로그인·owner/actor/capability·Yjs/CodeMirror·copy 계약을 어떻게 보존할 것인가?

1.1.8의 제품 범위는 **native 목록/읽기/복사**다. 가사·라임·프롬프트를 수정하거나 offline update를 만드는 기능, native editor 완성, Store 공개는 범위 밖이다. 편집·offline write는 1.1.9에서 별도 실제 IME/Yjs 증거와 승인을 거친다.

## 검토한 대안

| 대안 | Windows 경험 | 기존 계약 재사용 | 주요 위험 | P1 판정 |
|---|---|---|---|---|
| WinUI 3 + .NET native UI | Microsoft가 신규 Windows native 앱에 권장하며 WinUI 접근성/입력·MSIX 경로를 직접 사용 | REST JSON과 합성 golden fixture를 공유하고 copy 알고리즘을 C#에서 동등 구현 | C# Yjs port와 native 장문 editor의 IME/selection/undo는 아직 미증명 | **1.1.8 권고** |
| Avalonia + .NET | 여러 OS UI 재사용 가능 | C# domain adapter를 공유할 수 있음 | Windows만 필요한 첫 버전에서 교차 플랫폼 추상화 비용이 생기고 Yjs/IME 문제는 그대로 남음 | 보류 대안 |
| WinUI shell + WebView2 editor/content | 현행 CodeMirror/Yjs를 가장 직접 재사용 | JavaScript editor·copy 구현을 재사용 가능 | 완전 native 범위가 아니고 host bridge/origin allowlist·profile/cache 격리 공격면이 추가됨 | 1.1.8 기본안에서 제외; 1.1.9 별도 승인 대안 |
| PWA만 유지 | 이미 검증된 동작 | 현행 계약 그대로 | 사용자 요청인 설치형 native 개발안을 충족하지 않음 | rollback/서비스 연속성 대안 |

Microsoft는 신규 native Windows desktop 앱에 WinUI 3와 Windows App SDK를 권장한다. 2026-09-15 확인한 [Windows 개발 경로](https://learn.microsoft.com/en-us/windows/apps/get-started/)와 [Windows App SDK stable lifecycle](https://learn.microsoft.com/en-sg/windows/apps/windows-app-sdk/stable-channel)에 따라 P2 시작 시점의 지원 stable SDK와 .NET SDK를 exact version으로 잠근다. P1 문서는 변동 가능한 SDK 번호를 제품 계약으로 고정하지 않는다. Avalonia는 [공식 저장소](https://github.com/AvaloniaUI/Avalonia)와 [MIT license](https://github.com/AvaloniaUI/Avalonia/blob/main/licence.md)를 확인했지만, 1.1.8의 Windows 전용 범위에서 WinUI 우선 결정을 뒤집을 증거는 없었다.

## 권고 결정

사용자 승인에 따라 다음 조합을 선택한다.

1. `apps/windows/LyricsCloud.Windows`에 C#/.NET WinUI 3 packaged app을 만든다.
2. 1.1.8 제품 화면은 WinUI control로 구성하고 WebView2를 ship하지 않는다.
3. 읽기는 기존 LyricsCloud HTTPS API의 JSON 의미를 재사용한다. 인증 transport만 bearer session을 추가하며 별도 domain/schema를 발명하지 않는다.
4. copy는 C# adapter가 `lyricscloud.windows.contract.v1` fixture와 같은 결과를 내야 한다. TypeScript package를 binary에 억지로 넣거나 WebView를 copy 실행기로 사용하지 않는다.
5. 1.1.9의 편집기는 native editor + 검증된 Yjs-compatible port를 우선 spike한다. fixture decode, web↔Windows update 교환, Microsoft 한국어 IME·selection·undo·장문·Narrator가 하나라도 실패하면 구현을 중단한다. 그때만 제한된 WebView2 editor 대안을 범위 차이와 함께 다시 승인받는다.

이 선택은 Windows UI를 native로 유지하면서, 아직 검증하지 못한 editor/CRDT를 1.1.8 읽기 전용 앱 안에 숨겨 넣지 않는다. WebView2를 다시 검토할 때는 [Microsoft 보안 지침](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/security)에 따라 navigation/origin allowlist, host object 최소화, message schema 검증, 새 문서의 권한 분리를 먼저 증명한다.

## 인증 결정

native binary에는 Google client secret, 서버 session secret, DB 비밀을 넣지 않는다. 기존 release/development Google client secret은 계속 서버에만 둔다. Windows 앱은 다음 first-party broker 흐름을 사용한다.

1. 앱이 loopback IPv4 listener를 임의 포트와 일회용 경로로 열고 `state`, PKCE S256 challenge, exact callback을 서버의 native auth 시작 endpoint에 보낸다.
2. 앱은 서버가 돌려준 first-party HTTPS URL을 **시스템 기본 브라우저**로 연다. Google 로그인은 기존 서버 OIDC callback에서 끝나며 WebView2 안에서 열지 않는다.
3. 서버는 Google identity·allowlist/beta admission을 검증한 뒤에도 native session token을 URL에 넣지 않는다. 성공하면 60초 이하의 single-use authorization code만 exact loopback callback으로 보낸다.
4. 앱은 callback `state`를 constant-time 비교하고 code와 원래 PKCE verifier를 HTTPS back-channel로 교환한다. 성공한 교환에서만 opaque native session을 생성한다.
5. 취소, state/callback 불일치, 만료, replay, 계정 불허는 grant/session을 만들지 않고 transaction을 소비한다. listener는 한 번의 terminal result 또는 timeout 뒤 닫는다.

이는 native 앱에 외부 user-agent와 PKCE를 요구하는 [RFC 8252](https://www.rfc-editor.org/info/rfc8252/)에 맞고, Google도 [installed/desktop 앱 OAuth](https://developers.google.com/identity/protocols/oauth2)와 [desktop loopback 지원](https://developers.google.com/identity/protocols/oauth2/resources/loopback-migration)을 문서화한다. 다만 1.1.8은 Google Desktop client secret을 binary에 복제하는 직접 provider flow가 아니라 현재 서버 OIDC를 중개자로 사용한다.

native session token은 roaming 가능한 Credential Locker 대신 `DataProtectionProvider("LOCAL=user")`로 보호해 앱 local storage에 둔다. [Windows Data Protection](https://learn.microsoft.com/windows/uwp/security/data-protection)은 DPAPI 보호가 Windows 사용자 context에 묶임을 설명한다. 로그아웃·계정 전환·401/403·탈퇴 때 token과 해당 계정 cache를 함께 지우며 crash log, URI, clipboard, telemetry에 token/code/verifier를 넣지 않는다.

## 읽기·cache·권한 결정

- app cache namespace는 `SHA-256(origin + serverUserId)`로 나누고 title/body/memo/link metadata는 `LOCAL=user`로 암호화한다. 계정 ID나 창작물 원문을 파일명·로그에 넣지 않는다.
- owner 자료는 마지막 성공 응답의 entity version/updatedAt와 함께 보관할 수 있다. 다른 계정 token으로는 열지 않고 로그아웃/계정 전환 때 이전 namespace를 삭제한다.
- selected/shared 자료는 권한 회수 후 stale 표시를 막기 위해 **온라인 재검증 전에는 cache를 화면이나 clipboard에 내보내지 않는다**. offline일 때는 “권한을 다시 확인해야 합니다”를 표시한다.
- `401`은 전체 session/cache 폐기, `403/404`는 해당 shared entry와 presence 제거, permission/write epoch 변경은 이전 entry 폐기다. public-link guest 자료는 1.1.8 native account cache 범위 밖이며 시스템 브라우저로 연다.
- app resume, network reconnect, account change 때 인증과 보이는 자료의 권한을 다시 확인한다. 이미 화면에 있던 shared body도 회수 응답 뒤 즉시 비우고 copy를 disabled한다.
- API/DB의 owner/actor/capability/permission epoch 의미, RLS, 삭제 fence, server ACK 의미는 바꾸지 않는다. bearer adapter는 기존 `AuthService.resolveSession`과 같은 hashed opaque session을 소비한다.

## copy·Yjs·presence 호환 결정

canonical copy 구현은 `packages/editor/src/copy.ts`다. P2 C# 구현은 다음을 그대로 지킨다.

- CRLF/CR을 LF로 정규화한다.
- 전체 가사 copy에서 줄 전체가 exact `[Extend]` 또는 `[Extend: ...]`인 행만 제거한다. 부분 송폼 copy에서는 그대로 보존한다.
- 선택 송폼은 원문 위치 순서·tag·빈 줄을 보존하고 경계 LF 하나만 보완한다.
- 길이는 UTF-16 code unit이나 byte가 아니라 Unicode code point로 세며 3,000 초과에서만 경고한다.
- prompt sentence mode는 공백·쉼표·개행을 포함한 raw sentence를, tag mode는 현재 projection을 사용한다. rhyme는 LF 정규화 외 원문을 바꾸지 않는다.

`tests/native/windows/fixtures/1.1.8-read-copy-yjs-v1.json`은 copy 결과와 Yjs `body` v1 update를 고정한다. 현재 Node spike는 이 update를 다시 읽고 한국어 원문을 복구하지만, 이것은 C# port 호환이나 Windows IME 합격이 아니다. [Yjs update API](https://docs.yjs.dev/api/document-updates)는 update가 binary `Uint8Array`이며 순서 독립·멱등 적용됨을 정의한다. P2 Windows runner가 exact fixture를 해석하지 못하면 native Yjs를 구현했다고 주장하지 않는다.

1.1.8의 본문은 권한 검증된 REST projection으로 읽는다. 현재 collaboration service의 `snapshot/update/presence/awareness` 이름과 permission/write epoch를 새 protocol로 바꾸지 않는다. display-only presence를 연결할 경우 bearer 인증 뒤 기존 read-only room에서 JSON participant 상태만 표시하고 update를 생성하지 않는다. Windows client가 snapshot을 직접 해석해야 하는 기능은 위 Yjs fixture 통과 전에는 비활성화한다.

## 사전·폰트·접근성

- `ADR-NF-006`의 NAVER 세 언어 사전 provider no-go를 유지한다. Windows app이 scraping, 비공식 endpoint, 백과사전 대체를 추가하지 않으며 “native에서 미지원”을 표시한다. 승인된 provider 계약이 생긴 뒤에만 서버 adapter를 공통 소비한다.
- 기존 `NotoSansKR-Regular.69975a0a.otf`와 `NotoSansKR-OFL-1.1.6a73f954.txt`를 동일 asset/license inventory로 MSIX에 포함할 수 있다. 지원하지 않는 일본어/Han/기호는 Segoe UI, Malgun Gothic, Yu Gothic UI/Meiryo, system fallback을 사용하며 fallback이 원문·copy를 바꾸지 않는다.
- 기본 control의 keyboard/focus/high contrast/UI Automation을 유지한다. [Windows 접근성 지침](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-overview)에 따라 Narrator·keyboard·고대비를 실제 Windows에서 검사한다.

## packaging·지원·검증 gate

WinUI 3 기본 packaged MSIX를 사용한다. [Microsoft packaging 안내](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/packaging/)에 따라 P2/P3의 개발용 test-signed package와 P5의 배포 서명을 구분한다. Store 또는 신뢰된 인증서가 없는 build를 정식 release로 표시하지 않는다.

P2 진입 전 필요했던 승인은 2026-09-15 09:11 KST 사용자 응답으로 충족됐다.

- WinUI 3/.NET native UI, 1.1.8 read/copy-only, WebView2 미포함
- 시스템 브라우저 + first-party broker + loopback PKCE
- 계정별 DPAPI cache와 shared cache 온라인 재검증
- 1.1.9 editor는 별도 native Yjs/IME gate, 실패 시 WebView2 대안 재승인

P5 완료/릴리스 전 실제 증거:

- 지원 Windows 실제 OS에서 Microsoft 한국어 IME, clipboard, app suspend/resume/process kill
- keyboard, Narrator, high contrast, 100/200% DPI, 다중 monitor
- auth cancel/wrong state/wrong callback/replay, 계정 전환, 공유 회수, offline 재접속
- 같은 fixture의 web/Windows copy 동등성
- Windows runner의 build/test, 설치/제거/업데이트, 정식 배포용 서명과 provenance

현재 Linux host에는 .NET/Windows App SDK와 Windows OS가 없으므로 위 항목을 실행하거나 PASS로 기록하지 않았다.

## 영향받는 인터페이스와 담당

| 소유 경로 | P2 이후 책임 | P1 상태 |
|---|---|---|
| `apps/windows/LyricsCloud.Windows/**` | WinUI UI, broker client, DPAPI cache, clipboard | P2 foundation 후보; 실제 Windows build/launch 대기 |
| `packages/auth/src/**`, native auth API | single-use broker grant·PKCE·bearer session | P2 구현·Linux/HTTP 검증, Windows CI 대기 |
| `packages/domain/src/**` | 기존 JSON/error/copy 상수의 공유 가능한 계약 | 의미 변경 없음 |
| `tests/new-feature/1.1.8.contract.test.ts` | Node reference fixture 검증 | P1 spike |
| `tests/native/windows/**` | 공통 fixture와 이후 Windows runner | C# 16 assertions PASS; Windows runner 대기 |
| DB migration | native grant/session 저장이 필요하면 forward/rollback과 RLS | `1150` read-only session·role isolation·data-preserving rollback PASS |

## rollback과 중단 조건

native 배포 채널만 중단하고 웹·서버 JSON·DB·Yjs 원문·기존 session을 유지한다. auth 오류에서 session이 생기거나, cache가 다른 account/shared revoke 뒤 보이거나, copy fixture가 다르거나, native update가 web 원문을 훼손하면 즉시 중단한다. migration을 추가했다면 native route/feature flag를 끈 뒤 데이터 보존 forward fix를 우선하며 운영 volume을 삭제하거나 down-migrate하지 않는다.

## 관련 결정

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/DESIGN-NATIVE.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [1.1.7 플랫폼 인계](../architecture/1.1.7-PLATFORM-HANDOFF.md)

이 문서와 P1 fixture 생성은 앱 구현, SDK/유료 계정 설치, 서명 키 사용, Store 등록, main/tag/image/서버 배포 완료가 아니다. 위 승인은 1.1.8 P2~P5 구현 범위와 이미 승인된 버전별 릴리스 절차의 기술 입력이며, 남은 실제 Windows gate를 우회하지 않는다.
