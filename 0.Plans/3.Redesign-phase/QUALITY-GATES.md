# 1.2.x 후속 품질·인수 계약

이 문서는 [Agent.md](../../Agent.md)와 [기존 품질 게이트](../2.Patch-phase/QUALITY-GATES.md)를 좁혀 적용한다. 상위 완료 규칙을 생략하거나 새로운 구현·배포 승인을 만들지 않는다. 현재 작업은 문서 계획이며 아래 제품 검사는 아직 수행하지 않았다.

## 근거 수준과 현재 후보 인수

0922 리뷰는 `v1.1.7a/fc2463c`를 기준으로 한다. `F`는 실제 함수/스크립트와 합성 대역의 재현, `R`은 한정된 실제 production-browser 재현, `S`는 소스 경로 확인, `H`는 사용성/설계 가설이다. 실제 proxy·OS IME·Google 장기 세션·운영 부하 결과와 혼동하지 않는다. 당시 테스트 성공은 결함이 없다는 증거가 아니며 재현 스크립트 exit 0은 수정 PASS가 아니다.

비교 브랜치는 [고정 SHA 비교표](BRANCH-COMPARISON-118-P4.md)를 따른다. 그 브랜치의 코드/테스트/CI 기록은 **그 source SHA의 근거**다. 현재 1.2.x로 포팅한 SHA에 자동 승계하지 않는다. `미변경 / 부분 대응 / 해결 후보 / 채택 후 검증 완료 / 미확인`을 구별한다. 이 계획 작성 시 `채택 후 검증 완료`인 항목은 없다.

## 원문·저장·권한 불변식

- `saved ⇒ volatileFailure 없음 ∧ 미기록 입력 없음 ∧ durable outbox 없음 ∧ 필요한 서버 ACK 완료`. 화면에 보임·기기 보관·서버 저장·검색 반영은 서로 다른 사실이다.
- 화면의 editable과 실제 transaction 수용 준비가 일치해야 한다. cached offline 편집과 최초 빈 bootstrap을 구별한다.
- IME 중간값을 확정 전송하지 않고 local/remote 입력·undo·selection을 보존한다. projection만 정상이어도 raw/store가 거부하면 저장 실패다.
- owner/RLS·grant/permission/write epoch·guest session/link 수명·계정별 namespace를 유지한다. 회수된 private snapshot의 재전송과 과거 ACK의 새 쓰기 인정은 금지한다.
- 복사/내보내기는 정해진 payload의 원문/변환 의미와 일치해야 한다. UI 디자인 변경으로 창작물을 수정하지 않는다.

## 1.2.0 선행 차단 검수

| 항목 | 최초 우선순위·근거 | 1.2.0에서 필요한 판정 | 상세 후속 소유 |
|---|---|---|---|
| BE-01 | P1 / F | provider 일시 실패 후 회복 가능 여부·해결 후보의 실제 인수 | 1.2.3 |
| ES-01 | P1 / F | raw 태그 동시 이동과 서버 수용 실패 여부 | 1.2.2 |
| ES-03 | P1 / F, 제목 S | IME queued remote 원문 보존 | 1.2.2 |
| ES-05 | P1 / S | volatile 입력/PWA/이탈 누락 여부 | 1.2.1 |
| ES-06 | P1 / selected F, guest S | 실패 입력 보관과 거짓 saved 금지 | 1.2.1 |
| ES-07 | P1 / F | 초기 공유 입력과 준비 시점 | 1.2.1 |
| UI-02 | P1 / S | 템플릿 형식/대상 변경의 작성 내용 보존 | 1.2.2 |
| OPS-01 | P1 / 실제 shell KILL | 비정상 종료 후 잠금 회복·백업 공백의 운영 gate | 1.2.4 |
| OPS-02 | P1 조건부 / helper+설정 | 실제 신뢰 경계 확인, 적용되는 spoofing 위험의 해소 | 1.2.4 |
| UI-01 / UI-08 | P2 / 제한된 R+S | 프로필 이탈 손실·모바일 잘못된 클릭의 기능 보존 gate | 1.2.1 / 1.2.0 |

후속 배정은 출시 예외가 아니다. 재현 환경이 없거나 후보 수정이 아직 미검증이면 해결로 닫지 않는다. 1.2.0 P1에서 필요한 범위 변경과 담당을 기록한 뒤 최소 수정/선택 인수를 하고 P4/P5에서 증거로 닫는다. 기존 `OPS-100-001`은 별도의 역사적 위험 예외이며 잠금 수정만으로 해소되지 않는다. 새 릴리스의 적용 가능성은 [릴리스 정책](../2.Patch-phase/RELEASE-POLICY.md)대로 재평가하고 과거 예외를 자동 연장하지 않는다.

## 검증 계층·공통 UI 조건

| 계층 | 필요한 증거 | 대신할 수 없는 범위 |
|---|---|---|
| 계약/함수 실패 주입 | 같은 입력의 실패 전→수정 후, 실제 모듈 사용 여부 | 실제 HTTP·DB·브라우저 |
| 실제 PostgreSQL/WS/API | raw/projection/ACK·RLS·receipt 경쟁·재시작 | 공개 proxy·물리 입력 |
| production browser | 역할·정상/빈/오류/권한 없음/offline·모바일·focus | 실제 OS IME/가상 키보드/AT |
| 실제 기기/AT | 지원표의 OS/browser/input·동작·실제 읽기 | 사용자 연구·운영 부하 |
| 동일 SHA 개발 공개 인수 | 필수 CI·image provenance·migration/health·기능 smoke | 정식 릴리스 서버 배포 |

320/390/768/1440px·light/dark·200% 확대·forced colors·reduced motion/투명도 fallback을 영향 화면에 적용한다. 모바일 nav/FAB는 상단·중간·끝 scroll과 safe area/키보드에서 실제 hit target을 검사한다. 색만으로 상태를 전달하지 않고 오류·재시도는 열린 modal의 focus/읽기 범위에 둔다. CodeMirror 재생성·undo 손실·effect cleanup·입력 지연을 디자인 작업에서도 검사한다.

## 각 실제 Phase의 완료 순서

1. 현재 기준 SHA·담당·작업 ID·경로를 실행 STATUS에 등록하고 선행 Phase 인수를 확인한다.
2. 해당 Phase의 의미 있는 로컬 수용 검사를 수행한다. 변경 영향이 없는 동일 SHA 성공 검사는 재사용하고 실패를 삭제/완화하지 않는다.
3. [Future 검수](../2.Patch-phase/FUTURE-INTAKE.md)를 수행하고 작업/검증/상태 문서를 commit한 뒤 Phase 원격 브랜치에 push한다. main 직접 push는 하지 않는다.
4. 최종 통합에 필요한 필수 CI와 image/signature/provenance를 확인한다. 문서·중간 push의 `[skip ci]`, 취소·조건부 skip은 PASS가 아니다.
5. 그 정확한 SHA를 승인된 개발 환경에 배포하고 migration/health·공개 HTTPS live/ready·변경 기능 smoke를 통과시킨다.
6. source SHA·CI run/attempt·image digest·실제 배포 SHA·공개 인수·미실행·잔여를 기록한 뒤 해당 Phase만 완료로 표시한다.

마지막 Phase는 전체 증거를 봉인한다. 앞 Phase의 CI/개발 인수를 마지막 Phase까지 모두 미뤄도 된다는 뜻이 아니다. 필수 gate가 열려 있으면 `review/blocked`와 원인을 남기고 다음 Phase를 시작하지 않는다. 새 1.2.x 경로와 **1.2.2의 6 Phase**를 release metadata 도구가 소비할 수 있는지는 1.2.0 P1의 최소 지원 작업에서 확인한다.

## 연구·성능·관측

사용자 연구는 동의한 참여자와 합성 과제의 수동 관찰로 계획한다. 성공/도움 요청/오조작·기기/제외 조건과 baseline을 기록하며 참여자 수나 개선율을 만들지 않는다. 클릭·검색어·가사·창작 행동 수집을 자동 추가하지 않는다. 관측은 승인된 enum/count/duration이며 account/document ID를 고카디널리티 label로 넣지 않는다.

health pool, preview payload, keyset/index, 분산 rate limit은 측정 후 선택할 후보다. 현재 성능 장애나 보안 침해가 확인됐다고 쓰지 않는다. 원문/권한 회귀를 통과시키기 위해 성능 gate를 약화하지 않는다.

## 외부·역사 gate 유지

실제 OS/IME/AT·Google 장기 세션·장기 network partition·backlog/lock·암호화 backup restore/RTO/RPO·최신 dependency/image 감사는 미실행과 통과를 구분한다. 현행 지원 범위에서 필수인 항목은 해당 출시 전에 닫는다. 보류된 native SDK/서명/스토어, Suno metadata/NAVER 사전의 공식 제공·권리 gate는 이 계획에 자동 편입하지 않는다. 릴리스 서버 변경에는 현재 사용자 명시 지시와 runbook을 적용한다.
