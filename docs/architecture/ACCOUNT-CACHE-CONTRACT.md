# 계정별 클라이언트 캐시 계약

브라우저의 캐시·로컬 초안·최근 위치는 인증된 내부 사용자 UUID별 namespace로 분리한다. Google 이메일, provider subject와 화면 입력의 owner ID를 namespace 키로 사용하지 않는다.

## Namespace

```text
lc:<internal-user-id>:<resource-kind>:<resource-id>
```

- 인증 전 임시 자료는 `lc:anonymous:` 아래에 두되 인증 사용자 자료와 자동 병합하지 않는다.
- 한 계정에서 다른 계정으로 전환할 때 이전 계정의 메모리 상태와 구독을 먼저 종료하고 새 namespace를 연다.
- 저장소 adapter는 활성 내부 사용자 ID 없이는 사용자 자료 namespace를 열지 않는다.

## 인증 상태 이벤트

| 이벤트 | 필수 처리 |
|---|---|
| 로그인 성공 | 서버가 검증한 내부 사용자 ID로 namespace를 선택한다. |
| 세션 갱신 | 동일 ID이면 namespace를 유지한다. |
| 세션 만료 | 메모리의 개인 자료와 구독을 폐기하고 로그인 화면으로 전환한다. |
| 로그아웃 | 해당 계정 namespace의 로컬 캐시·초안·서비스워커 응답을 제거하고 서버 세션을 폐기한다. |
| 계정 전환 | 이전 namespace를 닫고 제거한 뒤 새 ID의 namespace를 별도로 연다. |

로그아웃 API는 서버 세션 폐기, session cookie 삭제와 `Clear-Site-Data: "cache", "storage"`를 반환한다. 이후 PWA 구현은 미전송 초안이 있으면 제거 전에 사용자에게 결과를 문장으로 알리되, 다른 계정으로 초안을 이동하지 않는다.

0.1.0 셸은 로그아웃 성공 시 [`clearAccountCache`](../../apps/web/src/lib/account-cache.ts)로 현재 `lc:<internal-user-id>:` local/session storage를 명시적으로 제거한다. HTTP 응답의 `Clear-Site-Data`는 Cache API·향후 저장소를 포함하는 브라우저 측 2차 경계다.

## 비노출 원칙

미인증 요청은 `AUTH_REQUIRED`, 만료 세션은 `AUTH_SESSION_EXPIRED`, 현재 사용자가 소유하지 않은 ID는 존재 여부와 관계없이 `NOT_FOUND`로 응답한다. 접근 거부 로그에는 이메일, provider subject, 표시 이름, 창작물 제목·본문을 넣지 않고 오류 코드와 request ID만 사용한다.
