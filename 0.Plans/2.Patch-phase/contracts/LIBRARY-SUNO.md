# 목록·개인 순서·Suno 작업 자료 계약

상태: **1.0.7 보기·1.0.8 곡 순서·1.0.9 라임/프롬프트 순서·1.0.10 수동 Suno 작업 자료 계약 Accepted**, Suno 자동 metadata 계약은 1.0.11 P1에서 구현 전 확정한다. 이미 구현된 핀/필터/자료 관계를 임의로 단순화하지 않는다.

## 목록 사용자정렬

소유자+자료유형마다 manual order를 저장한다. 1.0.8은 내부 자료 유형 `song`, 1.0.9는 `rhyme_note`와 `prompt`를 소비하며 세 state/version/rank/request namespace는 독립이다. 드래그/키보드 이동이 서버에서 성공하면 URL과 화면 정렬이 `manual`로 바뀐다. 보기 선택만으로 정렬을 바꾸지 않는다. 서버 실패 시 낙관적 UI를 되돌리고 원인/재시도 안내를 제공한다. 프롬프트 카드 이동은 `prompt_tokens.ordinal`·occurrence·원문/복사 payload를 변경하지 않으며 라임 이동도 본문·태그·곡 연결을 수정하지 않는다.

필터 안에서 순서 변경은 visible neighbor anchor를 사용한다. 예를 들어 전체 `A,B,C,D,E`, 필터 `A,C,E`에서 E를 C 앞에 두면 client는 `afterId=A`, `beforeId=C`를 보내고 서버는 C의 전체 순서상 직전 위치에 E를 삽입해 `A,B,E,C,D`를 만든다. `beforeId`가 있으면 그 항목 바로 앞, 끝 이동처럼 `beforeId`가 없고 `afterId`만 있으면 그 항목 바로 뒤가 실제 삽입 경계다. 두 anchor가 모두 있으면 대상 제거 후 같은 핀 그룹에서 after가 before보다 앞서는지도 검증한다. 검색 query 때문에 숨긴 자료를 삭제/재순위하지 않는다. pagination에서 로드하지 않은 자료를 배열에서 빼서 저장하는 API는 금지한다.

기존 핀 정렬은 별개 축으로 유지한다. 비사용자 정렬에서는 기존 `is_pinned → pin_order → 선택 정렬 → id`를 유지하고, 사용자정렬에서는 `is_pinned → manual rank → id`를 사용한다. manual rank 변경은 `pin_order`를 쓰거나 지우지 않는다. 그룹 간 drag는 `PIN_GROUP_MISMATCH`로 거부하고 `핀을 먼저 설정/해제한 뒤 이동하세요.`를 안내한다. 핀 변경 자체는 새 핀 그룹 끝의 manual rank로 함께 옮겨 두 축의 데이터가 어긋나지 않게 한다. 사용자정렬과 global favorites pin-order의 scope 차이를 도움말에 적는다.

새 자료/복제는 해당 핀 그룹 끝에 append한다. soft delete는 순위 행을 tombstone처럼 보존하고 restore는 같은 rank를 재사용하며, hard purge만 FK cascade로 제거한다. 구버전/누락 행은 해당 그룹 끝에 보충한다. rank는 signed `bigint`와 `1,048,576` 간격을 사용하며 사이 정수 공간이 없을 때 현재 owner+type+핀 그룹만 안정 순서로 재분배한다. rank는 UI 의미가 아니며 response에 노출하지 않는다.

이동 명령은 `POST /api/songs/order/moves`, `POST /api/rhymes/order/moves`, `POST /api/prompts/order/moves`와 `{requestId,itemId,beforeId,afterId,expectedVersion}`만 사용한다. route가 자료 유형을 고정하며 body에서 owner/type/rank를 받지 않는다. 앞/뒤 anchor는 nullable UUID이고 둘 다 null인 요청, 대상과 같은 anchor, 같은 anchor 두 번, 전체 ID 배열과 알 수 없는 필드는 거부한다. 서버는 owner+type advisory lock과 order-state CAS 안에서 active 대상/anchor, 같은 핀 그룹, anchor 순서를 검증한다. 다른 owner ID는 존재 여부를 숨긴 404로 응답하고 어느 계정도 변경하지 않는다. 동일 request ID·동일 payload 재전송은 저장된 결과를 재생하며, 같은 ID의 다른 payload는 409다.

`sort=manual` 목록은 `orderVersion`을 돌려준다. manual cursor에는 query signature, 핀 그룹, rank, stable ID, order version을 결합하고, 이동으로 version이 바뀐 이전 cursor는 409 후 첫 페이지 재조회한다. 성공한 이동만 version을 1 증가시키고 이미 같은 경계인 새 요청은 순서를 바꾸거나 version을 올리지 않는다. 두 탭의 같은 expected version에서는 먼저 lock을 얻은 하나만 성공하고 나머지는 최신 version과 함께 409를 받아 재조회한다.

## 네 가지 보기

리스트, small/medium/large grid를 모든 곡·라임·prompt 목록에 제공한다. 뷰 설정은 owner+유형 범위로 저장하고 기기간 복원한다. 공통 기본값과 viewport 유효 열 수는 분리한다. 작은 화면에서 큰 카드 선택은 1열로 안전하게 표시하고 강제 축소로 핵심 action을 숨기지 않는다. 정렬·filter·URL·scroll·cursor는 보기 전환 때 보존한다.

1.0.7의 저장 단위는 `owner_id + resource_type`이고 resource type은 `songs`, `rhymes`, `prompts`, mode는 `list`, `grid-small`, `grid-medium`, `grid-large`만 허용한다. 계정 화면 설정 `user_settings`와 별도 `library_view_settings` 행 및 독립 `row_version`을 사용한다. 조회 시 행이 없으면 `list`, `rowVersion: 0`, `updatedAt: null`을 반환하며 읽기만으로 행을 만들지 않는다. 쓰기는 현재 owner를 서버 인증 문맥에서만 사용하고 body의 owner는 받지 않는다. `expected rowVersion` 0은 최초 insert, 양수는 CAS update이며 충돌은 409와 최신값 재조회 경로를 제공한다.

API는 보기 mode만 변경한다. 검색어·필터·정렬·cursor·page·scroll, 자료 행과 pin/manual order는 요청/DB update 대상이 아니다. UI는 전환 즉시 같은 메모리 item 배열을 유지하고 저장 실패 시 이전 mode로 되돌린 뒤 재시도 가능한 문장을 알린다. 다른 탭의 같은 유형 충돌은 최신 서버 값을 다시 읽고 안내하며, 다른 유형이나 글꼴 설정의 동시 갱신은 서로 다른 행이라 충돌하거나 덮어쓰지 않는다. 구버전 client는 새 테이블을 알지 못해도 기존 목록/설정을 계속 사용한다.

그리드 열 수는 mode의 저장 의미가 아니라 CSS의 viewport 결과다. 320px·200% 확대에서는 모든 grid mode가 최소 1열이며 카드 본문과 보이는 action을 축소·겹침으로 숨기지 않는다. 긴 제목은 시각적 줄바꿈/말줄임 여부와 무관하게 링크의 접근 가능한 전체 이름을 유지한다. 네 mode 선택기는 native button, 현재값 `aria-pressed`, 그룹 label, 논리적 tab 순서를 제공한다.

## Suno 모델명

사용자 제시 label `v3`, `v3.5`, `v4`, `v4.5`, `v4.5+`, `v4.5-all`, `v5`, `v5.5`를 초기 선택 후보로 둔다. **현재 Suno 공식 지원 목록이라고 표기하지 않는다.** 미지정/사용자 직접 입력/과거 모델도 저장 가능하고 catalog 갱신이 기존 값을 지우지 않아야 한다. 버전 문자열 숫자 비교로 `4.5-all` 같은 label을 변형하지 않는다.

1.0.10 `modelLabel`은 nullable이며 NFC 정규화와 양끝 공백 제거 뒤 최대 64 Unicode code point다. C0/C1 제어문자와 NUL은 거부하고 내부 공백·대소문자·기호는 보존한다. 빈 입력은 미지정 `null`이다. 모델명은 LyricsCloud 작업 metadata이며 Suno의 생성 모델·계정 설정을 바꾸거나 API를 호출하지 않는다.

## 여러 작업 링크

곡별 link ID, owner, parentSong, URL, 순서, 표시 제목, 재생 시간(확인된 단위), thumbnail, metadata source/manual override, fetchedAt, 실패 상태를 관리한다. 모델과 links는 곡 복제·삭제/복원·export의 의미를 명확히 한다. 기본안은 복제 시 링크 참조 metadata를 독립 복사하고 나중에 한 쪽 수정이 다른 곡의 값을 바꾸지 않는다.

1.0.10은 곡당 최대 20개의 UUID link와 URL·수동 제목(최대 200 code point)·수동 메모(최대 1,000 code point)·연속 순서·행 version만 저장한다. 같은 곡의 동일 정규화 URL은 중복 저장하지 않는다. URL은 implicit 443의 `https://suno.com`/`https://www.suno.com`과 `/song/<UUID>` 또는 `/s/<6~128 ASCII token>` path만 허용한다. userinfo·명시 port·fragment·다른 protocol/host/path는 거부하며 query는 link-only 공유를 위해 1,024자 한도로 보존한다. 1.0.10 서버는 URL에 outbound 요청을 하지 않는다.

aggregate 조회는 `GET /api/songs/:songId/suno-workspace`, mutation은 `POST /api/songs/:songId/suno-workspace/commands`다. mutation은 `requestId`, `expectedVersion`, 고정 command와 command별 필드만 받으며 owner/song/ordinal/provider field를 body에서 받지 않는다. `set_model`, `create_link`, `update_link`, `remove_link`, `reorder_links`를 owner+active parent lock과 aggregate CAS 안에서 수행한다. 같은 request/payload는 결과를 replay하고 request ID의 다른 payload는 409다. 의미 있는 변경만 version을 1 올린다. foreign/deleted parent나 link는 존재를 숨긴 404다. 상세 body와 실패 입력은 [1.0.10 P1 인수](../../../docs/runbooks/1.0.10-phase1-suno-manual-contract.md)를 따른다.

`song_suno_workspaces`, `song_suno_links`, `song_suno_command_requests`는 additive `1003_song_suno_workspaces.sql`과 강제 RLS로 추가한다. soft delete는 행을 보존하고 active API만 숨기며 restore 뒤 같은 값·순서를 다시 제공한다. 링크 제거는 LyricsCloud 내부 행만 제거한다. hard purge/계정 삭제만 cascade한다. JSON과 사용자용 TXT/Markdown export에 수동 model/link를 포함하되 로그·telemetry에는 URL·제목·메모를 넣지 않는다. 현재 곡 복제 기능은 범위 밖이며 향후 도입 시 새 aggregate로 독립 복사한다.

metadata는 **명시적 갱신 버튼**에서 승인된 provider 경계로 요청한다. 새로운 자동 조회 수단을 검증하기 전에는 공식 API·무제한 crawling이 있다고 전제하지 않는다. source가 주지 않는 정보는 unknown/수동 값으로 표시한다. '제목·시간·thumbnail 자동 표시' 요구의 실패를 수동 placeholder만으로 완료 처리하지 않는다. provider 제약으로 불가능하면 사용자에게 명시 대안 승인을 요청해야 한다.

자동 metadata의 제목·시간·thumbnail·source/fetchedAt/failure는 1.0.11의 별도 파생 필드다. 어떤 성공/실패 응답도 1.0.10의 수동 제목·메모·URL·model을 덮어쓰거나 곡 저장을 막지 않는다.

## SSRF·개인정보·외부 의존

허용된 공식 HTTPS host/port만 사용한다. userinfo URL·IP literal·localhost·사설/loopback/link-local/multicast 주소 및 IPv6 변형을 거부하고 **매 redirect 대상과 실제 연결 주소**를 다시 검증한다. DNS rebinding/검사와 연결의 시간차를 고려한다. HTTP client가 임의 redirect를 자동 추적하도록 두지 않는다. response timeout, redirect 수, metadata/image byte 상한, MIME, decompress 크기, cache TTL을 P1에서 확정한다.

provider HTML/script를 사용자 HTML로 렌더하지 않는다. URL만 문자열 escape하는 것으로 XSS·SSRF가 모두 해결됐다고 보지 않는다. thumbnail도 arbitrary proxy가 되지 않게 동일 경계 또는 승인된 정적 placeholder를 사용한다. URL/cookie/Suno 로그인 토큰은 서버 로그·analysis에 기록하지 않는다. private/link-only Suno 주소가 카드 공개 공유에 자동 포함되지 않게 한다.

외부 링크는 `target=_blank`, `rel=noopener noreferrer`로 열고 오디오 autoplay/다운로드·Suno 인증대행을 추가하지 않는다. 링크 삭제/403/429·느린 응답은 LyricsCloud 원본 편집/저장을 막지 않는다. 갱신 응답이 늦으면 사용자의 새 수동 제목/시간을 덮지 않는다.

참고: [Suno 공유 안내](https://help.suno.com/en/articles/2565761), [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). 링크 공개 안내는 metadata 수집 API/라이선스 승인을 뜻하지 않는다. [ADR-NF-002](../../../docs/adr/ADR-NF-002-external-metadata.md)에 실제 조사 결과를 기록한다.

## 패치별 소비

1.0.7은 개인 보기 설정, 1.0.8은 곡의 이동 명령, 1.0.9는 라임/프롬프트 이동이다. 1.0.10은 모델명과 수동 작업 링크, 1.0.11은 외부 metadata 조회다. 자동 조회가 실패해도 수동 링크는 사용할 수 있어야 하며, 자동 조회 요구를 수동 링크만으로 완료 처리하지 않는다.
