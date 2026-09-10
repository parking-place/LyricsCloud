# 목록·개인 순서·Suno 작업 자료 계약

상태: **1.0.7 보기 계약 Accepted**, 순서·Suno 계약은 각 1.0.8/1.0.11 P1에서 구현 전 확정한다. 이미 구현된 핀/필터/자료 관계를 임의로 단순화하지 않는다.

## 목록 사용자정렬

소유자+자료유형마다 manual order를 저장한다. 드래그/키보드 이동이 서버에서 성공하면 정렬이 사용자정렬로 바뀐다. 보기 선택만으로 정렬을 바꾸지 않는다. 서버 실패 시 낙관적 UI를 되돌리고 원인/재시도 안내를 제공한다.

필터 안에서 순서 변경은 visible neighbor anchor를 사용한다. 예를 들어 전체 `A,B,C,D,E`, 필터 `A,C,E`에서 E를 C 앞에 두면 `A,B,E,C,D`처럼 이동한 대상만 새 위치에 삽입하고 나머지 상대 순서를 유지한다. 다른 정책을 택하면 구체 예시와 승인을 남긴다. 검색 query 때문에 숨긴 자료를 삭제/재순위하지 않는다. pagination에서 로드하지 않은 자료를 배열에서 빼서 저장하는 API는 금지한다.

기존 핀 정렬은 별개 축으로 유지한다. 기본안은 핀 그룹 우선→각 그룹의 기존 pin/manual 정책→안정 ID tie-break다. 그룹 간 drag가 핀을 암묵 변경하지 않게 하고 필요 시 '핀 해제 후 이동'을 명시한다. 사용자정렬과 global favorites pin-order의 scope 차이를 도움말에 적는다.

새 자료/복제는 해당 그룹 끝에 append, 삭제는 순위 tombstone 보존, 복원은 가능한 원래 위치 또는 충돌 시 가까운 anchor로 복구하는 안을 권장한다. CAS expected version·bounded rank rebalance·동시 이동 충돌·다른 owner anchor를 검사한다. rank 내부 표현은 fractional/정수 gap 등 대안을 측정하여 선택하고 사용자 의미와 분리한다.

## 네 가지 보기

리스트, small/medium/large grid를 모든 곡·라임·prompt 목록에 제공한다. 뷰 설정은 owner+유형 범위로 저장하고 기기간 복원한다. 공통 기본값과 viewport 유효 열 수는 분리한다. 작은 화면에서 큰 카드 선택은 1열로 안전하게 표시하고 강제 축소로 핵심 action을 숨기지 않는다. 정렬·filter·URL·scroll·cursor는 보기 전환 때 보존한다.

1.0.7의 저장 단위는 `owner_id + resource_type`이고 resource type은 `songs`, `rhymes`, `prompts`, mode는 `list`, `grid-small`, `grid-medium`, `grid-large`만 허용한다. 계정 화면 설정 `user_settings`와 별도 `library_view_settings` 행 및 독립 `row_version`을 사용한다. 조회 시 행이 없으면 `list`, `rowVersion: 0`, `updatedAt: null`을 반환하며 읽기만으로 행을 만들지 않는다. 쓰기는 현재 owner를 서버 인증 문맥에서만 사용하고 body의 owner는 받지 않는다. `expected rowVersion` 0은 최초 insert, 양수는 CAS update이며 충돌은 409와 최신값 재조회 경로를 제공한다.

API는 보기 mode만 변경한다. 검색어·필터·정렬·cursor·page·scroll, 자료 행과 pin/manual order는 요청/DB update 대상이 아니다. UI는 전환 즉시 같은 메모리 item 배열을 유지하고 저장 실패 시 이전 mode로 되돌린 뒤 재시도 가능한 문장을 알린다. 다른 탭의 같은 유형 충돌은 최신 서버 값을 다시 읽고 안내하며, 다른 유형이나 글꼴 설정의 동시 갱신은 서로 다른 행이라 충돌하거나 덮어쓰지 않는다. 구버전 client는 새 테이블을 알지 못해도 기존 목록/설정을 계속 사용한다.

그리드 열 수는 mode의 저장 의미가 아니라 CSS의 viewport 결과다. 320px·200% 확대에서는 모든 grid mode가 최소 1열이며 카드 본문과 보이는 action을 축소·겹침으로 숨기지 않는다. 긴 제목은 시각적 줄바꿈/말줄임 여부와 무관하게 링크의 접근 가능한 전체 이름을 유지한다. 네 mode 선택기는 native button, 현재값 `aria-pressed`, 그룹 label, 논리적 tab 순서를 제공한다.

## Suno 모델명

사용자 제시 label `v3`, `v3.5`, `v4`, `v4.5`, `v4.5+`, `v4.5-all`, `v5`, `v5.5`를 초기 선택 후보로 둔다. **현재 Suno 공식 지원 목록이라고 표기하지 않는다.** 미지정/사용자 직접 입력/과거 모델도 저장 가능하고 catalog 갱신이 기존 값을 지우지 않아야 한다. 버전 문자열 숫자 비교로 `4.5-all` 같은 label을 변형하지 않는다.

## 여러 작업 링크

곡별 link ID, owner, parentSong, URL, 순서, 표시 제목, 재생 시간(확인된 단위), thumbnail, metadata source/manual override, fetchedAt, 실패 상태를 관리한다. 모델과 links는 곡 복제·삭제/복원·export의 의미를 명확히 한다. 기본안은 복제 시 링크 참조 metadata를 독립 복사하고 나중에 한 쪽 수정이 다른 곡의 값을 바꾸지 않는다.

metadata는 **명시적 갱신 버튼**에서 승인된 provider 경계로 요청한다. 새로운 자동 조회 수단을 검증하기 전에는 공식 API·무제한 crawling이 있다고 전제하지 않는다. source가 주지 않는 정보는 unknown/수동 값으로 표시한다. '제목·시간·thumbnail 자동 표시' 요구의 실패를 수동 placeholder만으로 완료 처리하지 않는다. provider 제약으로 불가능하면 사용자에게 명시 대안 승인을 요청해야 한다.

## SSRF·개인정보·외부 의존

허용된 공식 HTTPS host/port만 사용한다. userinfo URL·IP literal·localhost·사설/loopback/link-local/multicast 주소 및 IPv6 변형을 거부하고 **매 redirect 대상과 실제 연결 주소**를 다시 검증한다. DNS rebinding/검사와 연결의 시간차를 고려한다. HTTP client가 임의 redirect를 자동 추적하도록 두지 않는다. response timeout, redirect 수, metadata/image byte 상한, MIME, decompress 크기, cache TTL을 P1에서 확정한다.

provider HTML/script를 사용자 HTML로 렌더하지 않는다. URL만 문자열 escape하는 것으로 XSS·SSRF가 모두 해결됐다고 보지 않는다. thumbnail도 arbitrary proxy가 되지 않게 동일 경계 또는 승인된 정적 placeholder를 사용한다. URL/cookie/Suno 로그인 토큰은 서버 로그·analysis에 기록하지 않는다. private/link-only Suno 주소가 카드 공개 공유에 자동 포함되지 않게 한다.

외부 링크는 `target=_blank`, `rel=noopener noreferrer`로 열고 오디오 autoplay/다운로드·Suno 인증대행을 추가하지 않는다. 링크 삭제/403/429·느린 응답은 LyricsCloud 원본 편집/저장을 막지 않는다. 갱신 응답이 늦으면 사용자의 새 수동 제목/시간을 덮지 않는다.

참고: [Suno 공유 안내](https://help.suno.com/en/articles/2565761), [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html). 링크 공개 안내는 metadata 수집 API/라이선스 승인을 뜻하지 않는다. [ADR-NF-002](../../../docs/adr/ADR-NF-002-external-metadata.md)에 실제 조사 결과를 기록한다.

## 패치별 소비

1.0.7은 개인 보기 설정, 1.0.8은 곡의 이동 명령, 1.0.9는 라임/프롬프트 이동이다. 1.0.10은 모델명과 수동 작업 링크, 1.0.11은 외부 metadata 조회다. 자동 조회가 실패해도 수동 링크는 사용할 수 있어야 하며, 자동 조회 요구를 수동 링크만으로 완료 처리하지 않는다.
