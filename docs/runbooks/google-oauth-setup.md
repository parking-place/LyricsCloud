# Google OAuth 개발 설정

실제 자격 증명은 저장소나 채팅에 남기지 않고 로컬 `.env`에만 둔다. 로그인 허용 메일은 환경마다 별도의 `.test_users`에 둔다. 두 파일 모두 Git과 Docker 이미지에서 제외된다.

1. Google Cloud Console에서 프로젝트를 선택하고 OAuth 동의 화면을 구성한다. 테스트 상태라면 로그인할 Google 계정을 테스트 사용자로 등록한다.
2. OAuth client 유형을 `Web application`으로 만들고 개발용 승인 redirect URI를 `http://localhost:8080/api/auth/callback`으로 등록한다.
3. 저장소 루트에서 `.env.example`을 `.env`로, `.test_users.example`을 `.test_users`로 복사하고 모든 `CHANGE_ME`를 교체한다.
4. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에는 Web client 값을 넣는다.
5. `SESSION_SECRET`에는 최소 32바이트의 새 무작위 값을 넣는다. 예: `openssl rand -base64 48`의 출력.
6. `.test_users`에는 로그인 허용 계정을 한 줄에 하나씩 넣는다. 이 목록 밖의 검증된 Google 계정에는 세션이 발급되지 않는다.
7. `docker compose config --quiet`과 `docker compose up --build --wait`를 실행한 뒤 `http://localhost:8080/api/auth/login`에서 확인한다.

## 허용 메일 추가

LyricsCloud 개발 로그인에는 서로 독립적인 허용 목록이 두 개 있다. 같은 Google 계정을 두 곳에 모두 추가한다.

| 허용 목록 | 위치 | 역할 |
|---|---|---|
| Google 테스트 사용자 | Google Auth Platform의 `Audience` | Testing 상태의 OAuth 앱을 시험할 Google 계정 관리 |
| LyricsCloud 허용 메일 | 대상 서버의 저장소 루트 `.test_users` | Google 인증 후 LyricsCloud 서버가 세션을 발급할 계정 제한 |

Google 테스트 사용자 등록만으로 LyricsCloud 로그인이 허용되지는 않는다. 반대로 `.test_users`에만 추가하면 Google 프로젝트 상태나 조직 정책에 따라 OAuth 승인이 차단될 수 있다.

### 1. Google Auth Platform에 테스트 사용자 추가

1. [Google Cloud Console](https://console.cloud.google.com/)에서 OAuth client를 만든 개발 프로젝트를 선택한다. 다른 프로젝트를 선택하면 사용자 목록을 추가해도 현재 client에는 적용되지 않는다.
2. 왼쪽 메뉴 또는 상단 검색에서 `Google Auth Platform`을 연다.
3. `Audience`를 선택한다. 예전 Console에서는 `APIs & Services` → `OAuth consent screen` → `Test users`로 표시될 수 있다.
4. User type이 `External`, Publishing status가 `Testing`인지 확인한다.
5. `Test users` 영역에서 `Add users`를 누른다.
6. 실제 로그인 시험에 사용할 Google 계정의 이메일 주소를 입력한다. 여러 명이면 입력란에 각각 추가한다.
7. `Save`를 누른 뒤 Test users 목록에 해당 주소가 표시되는지 확인한다.

Google의 현재 정책에서 Testing 상태는 일반적으로 등록한 테스트 사용자를 대상으로 한다. 다만 LyricsCloud처럼 기본 신원 scope인 `openid`, `email`, `profile`만 요청하는 경우에는 테스트 사용자 목록 제한·경고·7일 승인 만료의 예외가 적용될 수 있다. 이 예외와 관계없이 비공개 베타 대상을 명확히 하기 위해 개발 계정을 Test users에 등록한다. Google Workspace 계정은 조직 관리자가 외부 앱을 차단하면 목록에 있어도 승인되지 않을 수 있다.

`Test users`가 보이지 않으면 다음을 확인한다.

- `Internal` 앱이면 같은 Google Workspace 조직 사용자만 허용되며 별도 Test users 목록이 없을 수 있다.
- `In production`으로 게시된 앱에는 Testing용 사용자 목록이 제공되지 않는다.
- 프로젝트를 여러 개 사용한다면 `.env`의 `GOOGLE_CLIENT_ID`가 속한 프로젝트를 선택했는지 확인한다.

### 2. LyricsCloud `.test_users`에 같은 메일 추가

저장소 루트의 `.test_users`를 열고 같은 주소를 한 줄에 하나씩 추가한다. 이 파일은 현재 서버 환경만을 위한 목록이다. 개발 서버 파일을 릴리스 서버로 복사하거나 두 환경의 사용자를 한 파일에 합치지 않는다.

```text
writer@example.com
```

여러 계정을 허용할 때는 줄을 나눈다. 빈 줄과 `#`으로 시작하는 주석은 무시된다.

```text
# 현재 환경의 베타 사용자
writer@example.com
reviewer@example.com
```

프로그램은 앞뒤 공백, 대소문자와 유니코드 표기 차이를 정규화하지만 Gmail 주소의 점이나 `+별칭`을 같은 계정으로 간주하지 않는다. Google이 반환할 실제 이메일 주소를 그대로 등록한다.

```text
# 권장: 로그인할 실제 주소를 정확히 기록
lyricscloud.tester@gmail.com

# 아래 주소는 위 주소와 별개 문자열로 판정될 수 있음
lyricscloudtester+dev@gmail.com
```

실제 이메일을 `.test_users.example`, 문서, Issue, commit 또는 채팅에 넣지 않는다. 파일이 Git과 Docker build context에서 제외되는지는 값 자체를 출력하지 않고 다음 명령으로 확인한다.

```bash
git check-ignore -v .test_users
grep -Fx '.test_users' .dockerignore
```

첫 명령에 `.gitignore` 규칙과 `.test_users`가 함께 표시되고 두 번째 명령이 `.test_users`를 반환하면 정상이다.

이전 방식의 `.env` `AUTH_ALLOWED_EMAILS` 값은 다음 스크립트로 실제 주소를 출력하지 않고 한 번만 이관할 수 있다.

```bash
node scripts/migrate-test-users.mjs
```

호스트에 Node.js가 없다면 개발 컨테이너에서 실행한다.

```bash
docker compose run --rm --no-deps --user "$(id -u):$(id -g)" web \
  node scripts/migrate-test-users.mjs
```

### 3. 변경한 허용 목록 적용

최초 설정에서는 Compose 구성을 검사하고 web 컨테이너를 만든다. Compose는 `.test_users`를 `/run/secrets/auth_allowed_emails`에 읽기 전용으로 마운트한다.

```bash
docker compose config --quiet
docker compose up -d --force-recreate web
```

전체 환경을 아직 시작하지 않았다면 다음 명령을 사용한다.

```bash
docker compose up --build --wait
```

한 번 마운트된 뒤에는 `.test_users`를 저장하면 다음 로그인 요청부터 애플리케이션 허용 목록에 자동 반영되므로 허용 메일 변경만으로 컨테이너를 다시 만들 필요가 없다. 파일을 삭제하거나 읽을 수 없게 만들거나 잘못된 메일을 넣으면 인증 설정은 안전하게 실패한다.

Google 공식 문서는 Test users 관리를 Console의 Audience 화면 절차로만 안내하고 공개 관리 API를 문서화하지 않는다. 따라서 이 목록은 자동 반영하지 않으며 [Audience](https://support.google.com/cloud/answer/15549945?hl=ko)에서 같은 계정을 직접 추가하거나 제거한다.

브라우저에서 기존 로그인 세션이 남아 있다면 먼저 로그아웃하거나 시크릿 창을 열고 다음 주소로 접속한다.

```text
http://localhost:8080/api/auth/login
```

정상적인 허용 계정은 Google callback 후 LyricsCloud 내부 세션을 받는다. Google 인증은 성공했지만 `.env` 목록에 없는 계정은 세션을 받지 않고 다음 오류로 종료된다.

```text
AUTH_NOT_ALLOWED
```

### 4. 허용 메일 제거

Google 개발 프로젝트에서도 더 이상 시험하지 않을 계정을 제거하려면 `Google Auth Platform` → `Audience` → `Test users`에서 해당 주소를 삭제하고 저장한다. LyricsCloud에서는 대상 서버의 `.test_users`에서 주소를 제거한다. 애플리케이션의 새 로그인에는 다음 요청부터 자동 반영된다.

현재 허용 목록 변경은 새 로그인 세션 발급에 적용된다. 이미 발급된 서버 세션을 즉시 모두 폐기하는 관리자 기능은 이 Phase 범위에 없으므로, 계정을 긴급 차단해야 할 때는 별도 세션 폐기 작업 없이 허용 목록만 수정했다고 끝내지 않는다.

## 문제 해결

- `AUTH_NOT_ALLOWED`: 로그인한 Google 이메일이 대상 서버의 `.test_users` 항목과 정확히 일치하는지 확인한다.
- Google `access_denied`: Audience 상태, Test users 등록, Google Workspace 조직 정책을 확인한다.
- 파일 변경이 반영되지 않음: 컨테이너 안의 `AUTH_ALLOWED_EMAILS_FILE`이 `/run/secrets/auth_allowed_emails`인지와 secret mount가 존재하는지만 확인하고 파일 내용은 출력하지 않는다. 최초 연결 전의 컨테이너라면 `docker compose up -d --force-recreate web`을 한 번 실행한다.
- 다른 프로젝트에 추가함: `.env`의 client ID와 Google Console의 OAuth client ID 끝부분을 비교하되 client secret은 출력하거나 공유하지 않는다.

운영에서는 `APP_ORIGIN`과 redirect URI를 동일한 HTTPS origin으로 바꾸고, Google issuer override를 사용하지 않는다. 자격 증명을 노출했다면 즉시 Google Cloud에서 client secret을 교체하고 session secret 변경 후 기존 세션을 폐기한다.

## 참고

- [Google Auth Platform 시작 및 메뉴 구성](https://support.google.com/cloud/answer/15544987?hl=ko)
- [Google Auth Platform Audience와 테스트 사용자 정책](https://support.google.com/cloud/answer/15549945?hl=ko)
- [Google OAuth 앱 검증과 테스트 사용자](https://support.google.com/cloud/answer/13461325?hl=ko)
