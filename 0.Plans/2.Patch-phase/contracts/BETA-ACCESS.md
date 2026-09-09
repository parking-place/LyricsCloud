# 베타 가입·해시 허용 목록·관리 CLI 설계 계약

상태: **Accepted / P2~P4 구현·개발 인수 완료**. 사용자 요구인 6자리·일괄 발급·한 번 사용·미사용 refresh/ls·코드+메일+Google 동선은 필수다. 아래 계약은 [ADR-NF-001](../../../docs/adr/ADR-NF-001-beta-access.md), [PROD-NF-001](../../../docs/product/PROD-NF-001-beta-onboarding.md)의 승인 선택을 구체화하며 P9에서 통합 경쟁·복구를 다시 인수한다.

## A. 세 가지 서로 다른 목록

| 대상 | 책임 | 저장·권한 |
|---|---|---|
| `.test_users` | 기존 수동 승인 계정의 hash-only bootstrap/import | 환경별 HMAC 레코드, 비밀 key와 분리, Git/build context 제외 |
| 앱 admission grant | 가입 후 실제 LyricsCloud 접근 권한 | PostgreSQL transaction, verified issuer+sub에 결합, 상태 검사 |
| Google Auth Platform Test users/Audience | Google 측 프로젝트의 OAuth 설정 | 앱 allowlist와 별개, 실제 프로젝트·scope·branding 조건 확인 |

**권장안은 hash bootstrap 파일 + DB grant**다. 베타 가입마다 파일에 메일을 append하지 않고 DB grant가 앱의 신규 허용 사용자 등록을 담당한다. 물리 `.test_users` 파일만을 권한 원본으로 유지하면서 callback이 자동 수정하는 대안은 파일/DB 이중 쓰기·동시성·재시작 복구가 복잡해 권장하지 않는다. 전체 관리 SaaS 추가도 이 범위에는 과하다.

이 선택은 'hash 파일을 만들었으므로 모든 이메일이 DB에서도 익명화됐다'는 뜻이 아니다. 인증 identity/profile의 필요한 메일 보관과 보존 기간은 별도 개인정보 계약을 따른다.

부모가 현재 소스에서 확인한 OIDC scope는 `openid email profile`이다. [Google Testing 예외](https://support.google.com/cloud/answer/15549945?hl=en)에 따라 이 기본 신원 scope만 요청하면 Console Test users 등록은 필수가 아니다. 추가 scope 도입 시 예외를 재평가한다. 앱 등록 자동화가 Google Console Test users를 자동 편집한다는 뜻은 아니다. **Google의 실제 Audience, publishing status, identity-only scope 예외 적용, branding 상태를 개발/릴리스 환경에서 확인하고 Console에 사전 등록되지 않은 합성 신규 계정으로 검증한다.** 문서 조회만으로 모든 프로젝트에 동일한 test-user 제한/예외가 적용된다고 단정하지 않는다. Console 목록 자동 추가에 사용할 검증된 공식 관리 API를 확보하지 못했으므로 그 기능을 구현 가능하다고 약속하지 않는다. Google 로그인 설정이 새 계정을 막으면 운영 설정/승인으로 해결하고 앱 인가를 우회하지 않는다.

## B. `.test_users` 이행

권장 레코드 개념은 `formatVersion`, `kid`, `HMAC-SHA-256(environment + purpose + normalizationVersion + normalizedEmail)`이다. HMAC 비밀은 별도 secret 파일/주입 경로에 두고 레코드와 같은 Git/이미지에 넣지 않는다. SHA-256(email)만 사용하는 방식은 후보 메일 대입에 약하므로 선택하지 않는다. 이메일은 기존 정규화 의미를 유지하며 임의 Gmail 점 제거·plus 제거·전역 Unicode 변환으로 다른 주소를 합치지 않는다.

실행 순서: 기존 파일 권한·소유/중복/문법 검사 → 내용 미출력 dry-run(수량/결과만) → 새 파일 임시 쓰기 → digest·구조 검증 → 원자 rename → legacy 계정 실제 로그인 검사 → 평문 운영 파일 제거. 이행 실패 시 평문 파일과 새 파일 중 어느 것이 원본인지 명시하고 자동 allow-all은 금지한다. 평문 복사본은 운영 rollback 수단으로 계속 남기지 않는다. 필요한 일회성 백업은 암호화·접근 제한·삭제 시점이 있어야 한다.

파일 권한은 최소 소유자/그룹 읽기만 허용하며 read-only/nonroot 이미지 UID가 실제 읽을 수 있는지 검사한다. 잘못된 형식·키 누락·key ID 미일치는 fail-closed지만 기존 정상 세션/운영자 복구 절차도 명시한다. key 회전은 old/new kid의 제한적 검증 기간과 subject 바인딩으로 이행한다. 이전 hash를 새 key로 단순 재해시해 메일 hash라고 부르지 않는다. 미가입 legacy 주소는 보호된 원본 재입력/재발급 또는 검증된 로그인 때 이행한다.

기존 허용 계정은 새 코드를 요구하지 않는다. grant의 취소/계정 blocked/withdrawn이 bootstrap 재실행으로 다시 살아나면 안 된다. bootstrap 실행 이력과 취소 tombstone을 둔다.

## C. 코드 저장과 관리자 기능

6자 alphabet은 **A–Z, 0–9**이고 입력은 ASCII 소문자를 대문자로 정규화한다. 36^6 = 2,176,782,336개, 약 31비트 공간이다. CSPRNG와 unbiased 선택을 사용하며 Math.random·시간/ID 순번은 금지한다. 사용/폐기한 코드 digest도 중복 금지에 남겨 과거 코드가 새로 유효해지지 않게 한다. 메일 allowlist HMAC key와 코드 유일성 key의 수명을 분리한다. 코드 발급 시에는 모든 과거 code digest를 검사할 수 있도록 기존 index key를 관리자 전용 sealed keyring에 유지하거나 승인된 동등한 영구 중복 차단 방식을 마련한다. wrapping/암호화 key 회전이 과거 코드를 다시 발급 가능하게 해서는 안 된다.

코드는 로그인 세션이 아니라 **초대권**이다. 영구 사용자 ID와 public share token으로 재사용하지 않는다.

코드 검증용 HMAC과 `ls` 재표시용 암호화는 구분한다. 미사용 코드 원문은 인증 암호화(AEAD, nonce 유일성)로 보관하고 복호화는 관리자 전용 key/role만 허용한다. 웹 runtime은 digest 검증/원자 소비만 하고 복호화 key를 갖지 않는다. 사용·폐기·만료 시 recoverable ciphertext를 지우고 최소 digest/receipt만 남긴다. `ls`를 제공하면서 일방향 hash에서 원문을 복원할 수 있다고 설계하지 않는다.

| 명령 | 동작 | 실패·경계 |
|---|---|---|
| `LyricsCloud betacode -n 7` | 7개를 한 batch로 생성하고 commit 후 출력 | n=0/음수/소수/한도초과 거부, 충돌 제한 재시도, rollback 시 성공 출력 금지 |
| `LyricsCloud betacode ls` | 해당 환경의 현재 미사용·미만료·미폐기 코드와 필요한 만료 정보 | 관리자만 실제 코드 출력, 사용 코드/메일/secret 미출력 |
| `LyricsCloud betacode refresh` | 현재 미사용 코드를 모두 폐기하고 보관 ciphertext 제거 | 사용 기록/grant/사용자 자료 보존, 확인 프롬프트와 환경 표시 |

호스트 wrapper를 설치하여 사용자가 제시한 서버 shell에서 명령이 실제 실행되어야 한다. root를 요구하는 설계는 피하고 최소 권한 서비스 계정/관리 컨테이너에 위임한다. 출력은 관리자에게 줄 **비밀 산출물**이며 journal/CI/PR/채팅/관측에 자동 수집하지 않는다. 파이프/파일 출력은 명시 옵션·소유자 전용 권한을 적용한다. 출력 실패 후 이미 commit된 발급은 `ls`로 확인할 수 있어야 하고 자동으로 새 batch를 중복 생성하지 않는다.

`refresh`는 active pool에서 삭제하는 의미다. 과거 사용 불가 보장에 필요한 최소 hash tombstone은 남긴다. 숫자만 줄이는 UI가 아니라 DB의 epoch/lock을 이용해 callback과 직렬화한다. refresh가 먼저 commit되면 이전 intent의 소비가 실패하고, 소비가 먼저 commit되면 이미 가입한 grant는 refresh의 대상이 아니다.

## D. 가입 상태 전환

```text
Sign up(code + email)
  → 서버의 짧은 가입 intent 생성
  → Google 외부 인증(state/nonce/PKCE)
  → 검증된 callback(email 일치 + issuer/sub)
  → code 검사/소비 + admission grant + receipt 원자 commit
  → 세션/작업 공간
```

가입 intent는 10분 수명의 고엔트로피 일회성 값으로 권장한다. HttpOnly/Secure/SameSite cookie 또는 동등한 서버 transaction과 연결하고 검증용 code digest/epoch·입력 email digest·OAuth state·안전한 returnTo를 바인딩한다. 코드·메일을 query string, referrer, analytics, localStorage에 담지 않는다. 인증 전 단계는 형식 검사와 일반 안내만 수행해 코드 유효성/가입 여부의 쉬운 oracle이 되지 않게 한다.

Google callback에서 서명·issuer·audience·만료·state·nonce·PKCE·email_verified를 확인한 뒤 정규화 메일이 intent와 같은지 검증한다. identity의 장기 키는 이메일 문자열이 아니라 **issuer+sub**다. wrong account/cancel/expired intent/invalid token은 grant를 생성하거나 코드를 사용 완료로 만들지 않는다.

code lock/조건부 갱신, 계정 상태 확인, grant 생성, 소비 receipt를 하나의 DB transaction으로 묶는다. 같은 코드를 두 계정이 소비하면 한 명만 성공한다. callback receipt는 같은 intent+principal의 재확인에만 사용하고 이미 사용한 OAuth authorization code를 무작정 재교환하지 않는다. DB commit 뒤 쿠키 응답이 유실되면 다음 Google 로그인에서 기존 grant로 복구한다. 실패할 때마다 code ID를 바꾸거나 부분 grant를 남기지 않는다.

기존 허용 계정이 signup에 들어오면 기존 사용자 로그인으로 연결하며 신규 코드를 불필요하게 소비하지 않는다. 정지/탈퇴 계정은 코드가 있어도 기존 정책을 우회해 활성화되지 않는다.

## E. 6자리 공간에 맞는 남용 방어

6자라는 제약 자체가 충분한 보안을 보장하지 않는다. 무작위 추측의 명목 상한은 활성 코드 수 N과 허용 추측 B에 대해 대략 `min(1, B×N / 36^6)`이다. 인증된 공격 계정과 IP 회전·병렬 요청도 고려한다.

**P1 승인할 운영 초기값 제안:** 활성 코드 상한 100개, 기본 유효기간 24시간, Google 검증 principal별 실패 5회/24시간, 전체 실패 검증 budget 1,000회/24시간, preflight IP 제한과 짧은 burst 제한. 이 값은 제품의 확정 사실이 아니라 초기 위험 예산안이다. N=100/B=1000일 때 위 단순 모델은 약 0.0046%이고, 이는 전체 공격 성공률 보증이 아니다. 수량/TTL을 늘리려면 제한·위협 모델도 같이 재승인한다. 기본 n=1 및 상한 검증, 환경별 제한 설정과 남은 수량 표시를 제공한다.

실패 budget은 **DB/공유 저장소에 영속**해 process restart·여러 replica로 초기화되지 않는다. 제한 도달은 신규 가입만 제한하고 기존 정상 사용자의 로그인까지 막지 않도록 분리한다. 전역 budget 고갈로 가능한 가입 DoS를 운영 경보/관리자 해제·짧은 회복 절차로 다룬다. 임의 특정 코드를 영구 lock해 다른 사람의 초대를 태우지 않는다. 응답은 코드 존재·메일 가입 여부를 과도하게 구별하지 않으며 raw code/메일을 로그로 남기지 않는다.

## F. 구현 인터페이스 초안 (P1에서 최종 이름 확정)

다음 이름/경로는 기존 코드에 이미 있다는 의미가 아니라 구현 경계를 합의하기 위한 초안이다.

| 인터페이스 | 입력 | 결과/불변 조건 |
|---|---|---|
| 관리자 `issueBetaCodes(n, environment)` | 검증된 관리자 역할·양수 수량 | 한 batch commit 후 표시, 과거 code 재사용 없음 |
| 관리자 `listUnusedBetaCodes(environment)` | 관리자 역할·복호화 key | 유효 unused만 출력, 일반 web 접근 불가 |
| 관리자 `refreshUnusedBetaCodes(environment, expectedEpoch)` | 환경 확인·관리자 권한 | 새 epoch와 폐기 수량, 기존 grant 불변 |
| 제안 `POST /api/signup/beta-intent` | code+email, Origin/크기/남용 제한 | 일반 안내와 10분 intent cookie, 유효 code oracle 금지 |
| 기존 Google login/callback 확장 | intent/state/verified identity | `consumeBetaAndGrant`의 원자 결과 후 세션/안전한 returnTo |
| `consumeBetaAndGrant(intent, identity)` | verified issuer/sub/email·intent digest | code unused/current epoch/expiry를 잠그고 grant+receipt와 함께 commit |

후보 테이블은 `beta_codes`(id, environment, epoch, code_digest, digest_kid, ciphertext, issued_at, expires_at, status), `beta_signup_intents`(id_digest, email_digest, code_digest, epoch, oauth_state_digest, expires_at), `admission_grants`(principal, source, state, granted_at, revoked_at), `beta_redemptions`(intent/principal/code ID의 멱등 receipt)다. 실제 schema는 기존 auth transaction/identity/session과 합쳐 중복 기능을 만들지 않도록 설계한다. 코드 원문·메일을 transaction error/관측으로 반환하지 않는다.

권장 소비/폐기 모델은 `unused → consumed` 또는 `unused → revoked/expired`이며 consumed에서 unused로 돌아가지 않는다. signup intent는 code의 소유권을 미리 독점하지 않으며, 여러 intent가 있어도 최종 원자 소비의 승자는 하나다. expired/revoked의 ciphertext는 정리하고 최소 digest tombstone만 보관한다. 실제 hard-delete retention과 감사 보존 기간은 P1의 개인정보 결정에 기록한다.

관리 CLI의 정상 종료는 0, 입력 오류/환경 미확인/권한 실패/DB 실패는 비0으로 구분한다. 출력 성공과 DB commit을 혼동하지 않으며 정상 메시지는 code secret을 포함한 일반 로그가 아니라 승인된 관리자 출력 채널로 한정한다. 파일-only 동적 allowlist 대안이 선택되면 DB/file 원자성이 없는 구간과 복구 journal을 추가로 설계해야 하므로 기존 초안을 그대로 쓰지 않는다.

## G. 필수 실패 테스트와 승인

발급 충돌·동시 n개·출력 실패·프로세스 재시작 / 2인 한 코드·동일 callback 중복·다른 메일·Google 취소 / refresh↔callback·만료↔callback·키 회전 / DB commit↔쿠키 응답 유실 / 기존 사용자/정지/탈퇴 / code·hash·ciphertext·계정grant의 개발/릴리스 분리. 실제 PostgreSQL 동시성 테스트와 새 Google 계정 개발 HTTPS smoke가 필요하다.

관련 원칙: [Google OIDC](https://developers.google.com/identity/openid-connect/reference), [OWASP token·rate limit 지침](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [Google Sign in best practices](https://developers.google.com/identity/siwg/best-practices). 이 자료가 LyricsCloud의 구체 DB 설계나 위 초기값을 표준으로 정해 주는 것은 아니다.
