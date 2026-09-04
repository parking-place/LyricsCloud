# Applications

> 상태: `0.0.0`의 ADR 승인 전까지 변경 가능한 후보 구조입니다.

배포 가능한 프로세스의 경계입니다. `DEC-01-D`, `DEC-06-C`, `DEC-10-C`를 함께 만족하기 위한 최소 후보는 웹, 실시간 동기화, 예약 작업의 세 책임입니다. 실제 workspace와 패키지 manifest는 `0.0.0` ADR 승인 후 생성합니다.

- [`web`](./web/): 화면, HTTP 경계, Google 로그인·세션, 사용자 요청
- [`collaboration`](./collaboration/): 같은 사용자의 여러 기기·탭 CRDT 연결과 영속화
- [`worker`](./worker/): 30일 휴지통 정리, 7일 탈퇴 처리, revision 정리 등 재실행 가능한 예약 작업

책임이 한 프로세스로 합쳐지더라도 디렉터리 간 의존 방향과 보안 경계는 ADR에 기록합니다.
