# Security documentation

인증, 세션, 초대 베타, 사용자 소유권, CRDT 연결 권한, 내보내기, 탈퇴, 로그 redaction의 위협과 검증을 기록합니다.

두 사용자 격리와 창작물 본문 비수집은 모든 기능의 공통 출시 조건입니다. 취약점은 `0.9.1`부터 [저장소 보안 정책](../../SECURITY.md)의 비공개 경로로 보고합니다.

1.0.3의 문장형 프롬프트도 기존 prompt owner RLS와 API 404 비노출 경계를 그대로 사용한다. 새 mode를 이해하지 못하는 collaboration client는 capability 확인에서 409로 차단해 문장 raw를 태그 projection으로 덮어쓰지 못하게 한다. mode와 두 표현의 구조 변환은 한 CRDT transaction으로 적용하고 오래된 preview는 현재 상태 hash가 달라지면 거부한다. 제목·태그·문장 원문·revision·CRDT payload는 로그나 관측에 수집하지 않는다.

1.0.4의 마침표 구간 표시와 1,000자 안내는 저장·권한·로그 경계를 바꾸지 않는 클라이언트 projection이다. 길이는 최종 payload의 Unicode code point 수만 계산하고 원문을 서버나 외부 서비스에 추가 전송하지 않는다. 목록·편집기·가사 자료 패널은 같은 owner-only API 결과를 사용하며 경고 때문에 저장·복사를 차단하지 않는다.
