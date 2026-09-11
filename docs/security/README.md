# Security documentation

인증, 세션, 초대 베타, 사용자 소유권, CRDT 연결 권한, 내보내기, 탈퇴, 로그 redaction의 위협과 검증을 기록합니다.

두 사용자 격리와 창작물 본문 비수집은 모든 기능의 공통 출시 조건입니다. 취약점은 `0.9.1`부터 [저장소 보안 정책](../../SECURITY.md)의 비공개 경로로 보고합니다.

1.0.3의 문장형 프롬프트도 기존 prompt owner RLS와 API 404 비노출 경계를 그대로 사용한다. 새 mode를 이해하지 못하는 collaboration client는 capability 확인에서 409로 차단해 문장 raw를 태그 projection으로 덮어쓰지 못하게 한다. mode와 두 표현의 구조 변환은 한 CRDT transaction으로 적용하고 오래된 preview는 현재 상태 hash가 달라지면 거부한다. 제목·태그·문장 원문·revision·CRDT payload는 로그나 관측에 수집하지 않는다.

1.0.4의 마침표 구간 표시와 1,000자 안내는 저장·권한·로그 경계를 바꾸지 않는 클라이언트 projection이다. 길이는 최종 payload의 Unicode code point 수만 계산하고 원문을 서버나 외부 서비스에 추가 전송하지 않는다. 목록·편집기·가사 자료 패널은 같은 owner-only API 결과를 사용하며 경고 때문에 저장·복사를 차단하지 않는다.

1.0.5의 송폼 suffix 표시와 가사 3,000자 안내도 기존 owner-only lyric API·CRDT 원문·revision·검색·내보내기를 바꾸지 않는 클라이언트 projection이다. 첫 콜론은 탐색 이름 경계로만 사용하고 suffix를 삭제·정규화하지 않는다. 길이 안내는 최종 LF payload를 로컬에서 Unicode code point로 세며 본문을 로그·관측·외부 서비스에 추가 전송하지 않고 저장·복사를 차단하지 않는다.

1.0.6의 Extend 필터는 Suno 전체 복사 payload에서 exact-case 정식 표식 줄만 제외하는 로컬 projection이며 raw CRDT·revision·검색·내보내기·부분 복사를 바꾸지 않는다. 송폼 삽입은 이미 인증·소유권 검사를 통과한 문서의 CRDT 상대 위치와 한 transaction만 사용하고, 해석 실패·100,000자 초과·IME 조합 중에는 원문을 변경하지 않는다. 본문·caret·선택 내용은 로그나 외부 서비스에 추가 전송하지 않는다.

1.0.7의 목록 보기 설정은 owner와 자료 유형을 복합 경계로 둔 별도 설정이며 애플리케이션 소유권 검사와 PostgreSQL RLS를 함께 적용한다. 보기 저장 CAS는 같은 유형의 최신 값만 비교하고 글꼴 등 무관한 표시 설정이나 창작물 순서를 덮어쓰지 않는다. 비인증·다른 owner 요청은 기존 404 비노출 경계를 유지하고 제목·목록 내용·선택 모드는 관측 로그에 추가하지 않는다.

1.0.8의 곡 사용자정렬은 owner+song 범위의 sparse rank와 요청 idempotency를 사용한다. 서버는 이동할 곡과 visible anchor의 소유권을 모두 확인하고 forced RLS를 유지한다. 다른 owner ID, 오래된 CAS, 같은 요청 재전송은 어느 계정 순서도 중복 변경하지 않으며 제목·검색어·곡 ID 배열을 관측 로그에 추가하지 않는다.

1.0.9의 라임·프롬프트 사용자정렬은 같은 테이블을 사용하되 owner+resource type을 복합 경계로 유지한다. 고정 type API는 URL의 자료 유형만 소비하고 body가 유형을 바꾸지 못하며, 이동 대상과 anchor의 소유권·pin group을 함께 검사한다. 프롬프트 카드 rank는 `tokens`·`plainText`·copy payload를 변경하지 않고 라임 long-press와 drag는 별도 동작이다. 제목·본문·검색어·자료 ID 배열은 로그에 추가하지 않는다.

1.0.10의 Suno 작업공간은 세션 owner와 곡 parent를 서버에서 결정하고 forced RLS·aggregate CAS·request idempotency를 적용한다. URL은 HTTPS와 `suno.com`/`www.suno.com`의 song 또는 짧은 공유 path만 허용하고 userinfo·비표준 port·다른 host/path를 거부한다. 외부 fetch·scraping·삭제 요청은 없으며 모델·URL·수동 제목·메모·곡 ID 배열을 로그나 관측에 추가하지 않는다. 다른 owner와 삭제된 parent는 404로 숨기고 export도 같은 owner snapshot만 사용한다.
