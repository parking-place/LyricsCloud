# 읽기·쓰기 공유의 권한 집합과 데이터 보존

상태: **1.1.0 selected-read와 1.1.1 public-link read Accepted; 쓰기 확장 Proposed**. 지정 읽기는 1.1.0, 링크 읽기는 1.1.1, 지정 쓰기는 1.1.2, 링크 쓰기는 1.1.3에 배정한다. 1.0.1 Private Beta는 기존 owner-only를 유지한다. 미래 공유를 이유로 현재 RLS를 느슨하게 하지 않는다.

2026-09-12 사용자는 owner 유지·별도 actor·자료별 grant 권장안을 1.1.0 지정 사용자 읽기 범위에 승인했다. 승인된 공개 필드, 전용 API/화면, reader presence, 회수와 rollback은 [P1 인수 기록](../../../docs/runbooks/1.1.0-phase1-sharing-contract.md)에 고정했다. 공개 링크·쓰기·guest는 자동 승인되지 않는다.

2026-09-12 사용자는 1.1.1 공개 링크 읽기에 256비트 fragment capability·digest-only 저장, 가사 한 개와 명시 필드, 최대 30일 만료·회수/재발급 epoch, no-store/noindex/일반 OG, fixed POST/WS 인증을 승인했다. 쓰기·guest workspace·public presence identity는 포함하지 않는다. [1.1.1 P1 인수 기록](../../../docs/runbooks/1.1.1-phase1-public-link-read-contract.md)을 따른다.

## 권한 집합

R은 읽을 수 있는 주체 집합, W는 쓸 수 있는 주체 집합이다. owner는 항상 자기 자료를 관리한다. **W ⊆ R**을 서버의 모든 경로에서 검사한다. mode 순서만 비교하지 않는다.

| R / W | private(owner) | selected | public-link |
|---|---|---|---|
| private | 가능 | owner 외 주체가 있으면 불가 | 불가 |
| selected | 가능 | 실제 W 수신자가 모두 R에 속해야 가능 | 불가 |
| public-link | 가능 | 그 수신자가 해당 읽기 grant/capability로 접근 가능해야 함 | 같은 자료/읽기 capability 범위 안에서만 가능 |

selected R={owner,A}, W={owner,B}는 둘 다 selected여도 불가다. 읽기 일부+쓰기 전체도 불가다. selected는 내부 stable user ID로 관리하고 이메일/표시이름 검색 결과의 ID 열거를 막는다. 링크 공개는 인터넷 전체에 자동 게시하거나 검색엔진 색인을 허용한다는 뜻이 아니다.

public-link 쓰기는 사용자가 요청한 '링크를 가진 모두'라는 의미를 유지하는 후보다. **비로그인 guest 쓰기**에는 별도 owner 확인·남용 제한·철회 가능한 한정 capability·보안 승인이 필요하다. 인증 계정만 쓰게 하는 대안도 비교하되 그 대안을 사용자의 public-write 요청을 충족했다고 조용히 바꿔 쓰지 않는다.

## Beta 접근과 공유 접근

앱 가입 grant와 resource capability를 분리한다. 1.1.1 이후의 공개 링크 reader와 1.1.3에서 승인된 guest writer는 공유 대상만 보고/허용된 만큼 쓸 수 있다. 개인 workspace 가입·곡 생성·global search·account API·다른 자료 접근을 얻지 않는다. 이 guest 경로는 Private Beta 가입 정책 변경과 별도 ADR/제품 승인을 거친다.

## 범위와 ownership

공유 대상·필드·자식 자료는 명시한다. 곡을 공유했다고 연결 라임/프롬프트·모든 가사 버전·작업 메모·Suno 비공개 링크·revision·개인 설정을 자동 공유하지 않는다. 초기 정책은 최소 범위이며 추가 자료를 명시 선택하도록 한다. shared 검색/내보내기/복제는 각 경로에 별도 read 필터와 제품 계약이 필요하다.

owner_id는 실제 소유자를 유지한다. writer의 actor_id/guest identity는 별도로 기록한다. 클라이언트가 ownerId를 바꿔 전송해 RLS를 우회하는 형태를 만들지 않는다. 본문 write 권한이 ACL·소유권이전·hard delete·탈퇴 권한으로 확장되지 않는다. owner 외 revision restore/metadata 변경은 명시 허용 목록으로 정의한다.

## token·철회·캐시·WebSocket

공개 share token은 6자리 beta code와 다른 **최소 128비트, 권장 256비트 고엔트로피 capability**다. digest만 서버 조회에 사용하고 raw token은 로그/관측/referrer에 남기지 않는다. 만료/회수/회전 epoch와 접근수 제한을 둔다. 새 token 발급이 oldtoken을 남길지 폐기할지는 명시한다. 기본안은 교체 시 oldtoken 즉시 폐기다.

read API·SSR·WebSocket subscribe·각 write message·revision/export/search에서 동일한 판단을 적용한다. epoch 변경 후 기존 socket/캐시에서 새 내용을 읽거나 쓰지 못하게 한다. 공유 응답의 public cache 방지와 noindex·일반화된 OG metadata를 설계한다. token을 가진 guest가 아닌 사람에게 CDN/서비스워커 캐시로 내용을 제공하지 않는다.

이미 읽거나 복사한 내용은 기술적으로 회수 보장할 수 없다. 철회는 **앞으로의 접근/쓰기**를 막는 것으로 안내한다. 공개 취소 후 이미 수신자가 보유한 파일까지 삭제한다고 약속하지 않는다.

## 공동 편집·복구

현재 same-owner Yjs·transport·receipt·projection·revision을 기반으로 하지만 actor/owner·인가가 달라진다. 새 [ADR-NF-003](../../../docs/adr/ADR-NF-003-sharing.md) 승인 전 협업 프로토콜을 구현하지 않는다. 중복/역순 updates·동시 Korean IME·복원·삭제·서버 재시작의 결과를 실제 DB/브라우저에서 대조한다.

권한이 회수된 offline writer의 늦은 업데이트는 서버 원본에 적용하지 않는다. 그러나 그 사람이 직접 입력한 미전송 내용은 로컬 격리 초안으로 남기고 복사/다운로드 안내를 한다. 그 안내를 위해 회수 이후 서버 private 데이터를 다시 읽어오지 않는다. guest 초안은 capability/기기 세션 범위로 분리하고 만료·사용자 전환·정리 정책을 고지한다.

owner 복구 checkpoint·revision 비교를 제공하되 악성 writer의 대량 수정·자원 소모·guest identity spoofing·무제한 history 크기를 rate/size/concurrency 예산과 함께 다룬다. 비공개 기본값·owner-only 기본 경로·기존 계정 logout/탈퇴 정책을 회귀에 포함한다.

참고: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html). 집합 관계·guest 정책·판정 범위는 LyricsCloud의 설계 제안이며 승인 전 Accepted로 표시하지 않는다.

## 단계별 안전성

각 공유 패치는 해당 범위의 서버 인가·RLS·회수·캐시/WS·원문 복구가 모두 검증된 뒤 제공한다. 1.1.4가 있다는 이유로 앞선 패치의 회수/오프라인 보존을 미완료로 출시하지 않는다. UI/native에서도 같은 권한 계약을 재사용하며 플랫폼 이름 때문에 별도 minor를 올리지 않는다.


## 여러 사용자 동시 보기·편집과 presence/cursor

Google Docs처럼 **서로 다른 실제 사용자**가 같은 자료를 동시에 보고 편집한다. 기존 같은 owner의 여러 탭 동기화와 구별한다. 1.1.0~1.1.1은 읽기 참가자/현재 보는 사람, 1.1.2는 여러 writer와 현재 작업 위치/cursor·selection, 1.1.3은 승인된 공개 링크 주체, 1.1.4는 전체 인수를 맡는다. 폴링 결과만 갱신하고 실제 동시 편집을 제공하지 않는 것으로 요구를 대체하지 않는다.

presence는 문서의 영구 창작 내용이 아닌 일시 상태다. 참가자에게 허용된 표시이름/색상/상태만 보여 주고 내부 ID·메일을 표시하지 않는다. 클라이언트가 보낸 타인 ID를 신뢰하지 않으며 서버 검증 actor를 바인딩한다. cursor는 내용 변화에도 위치를 따라가는 현재 protocol 표현으로 변환하고 같은 계정 탭 중복·disconnect·idle/TTL·문서 전환의 제거 규칙을 정한다. 읽기만 가능한 사용자도 누가 보는지 알 수 있고 editor 활동은 현재 작업 범위 안에서만 노출한다.

HTTP 읽기·편집 update·초기 WS subscribe·reconnect·awareness/presence 송수신 모두 같은 read/write 경계를 적용한다. read 철회 또는 링크 무효화는 현재 구독과 presence 수신도 차단하고 이전 문서의 목록/cursor를 제거한다. write만 철회되고 read가 유지되면 보기와 읽기 presence는 유지하되 쓰기 update를 거부한다. 재연결은 현재 권한을 다시 검사하며 이전 epoch의 offline update가 재승인되지 않게 한다. 미전송 자기 원문은 로컬 복구로 보존한다.

| 사례 | 기대 결과 | 담당 |
|---|---|---|
| owner+A writer+B reader가 서로 다른 계정/기기로 접속 | 모두 현재 참가자를 보고 writer 두 명의 동시 한글 변경이 수렴, B의 쓰기는 거부 | 1.1.2 P2~P4 |
| A가 타인의 actor/문서 ID로 presence 전송 | 위조/다른 자료 subscription 거부, 기존 권한 없는 문서의 참가자 정보 미노출 | 1.1.0 P2, 1.1.2 P4 |
| 접속 중 read 철회, reconnect, 다른 문서로 전환 | 이후 본문/presence/cursor 수신 차단·이전 표시 제거·현재 권한 재검사 | 1.1.0~1.1.4 |
| read 유지·write 철회 뒤 offline update 제출 | 읽기는 유지, update 거부와 자기 초안 복구, 서버 원문 불변 | 1.1.2 P4 |
| 공개 링크 회수·게스트 다중 세션·반복 접속 | capability 범위와 TTL·남용 한도 적용, 타인 가장과 구독 누수 없음 | 1.1.3 P4, 1.1.4 P4 |

[PROD-NF-009](../../../docs/product/PROD-NF-009-collaboration-presence.md)의 표시·개인정보 결정과 ADR-NF-003의 protocol/인가 결정을 구현 전 연결한다.
