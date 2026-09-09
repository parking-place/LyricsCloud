# 릴리스·main·Docker·개발/운영 인수 정책

상태: **1.0.1 이후 적용할 정책안**. 사용자가 명시한 main/release alias 제약은 고정이고, 아래 세부 절차는 1.0.1 P1에서 운영 담당자와 확정한다. 문서 작성은 배포 승인이 아니다.

## 1. 첫 Private Beta의 의미

기존 `v1.0.0`과 배포/인수 기록은 보존한다. 1.0.1은 **코드로 초대된 사용자만 받는 운영을 시작하는 첫 Private Beta**로 명명한다. Release라는 채널명이 누구나 가입할 수 있다는 뜻은 아니다. 기존 허용 계정과 정상 사용된 코드로 grant를 얻은 계정만 개인 workspace에 접근한다.

## 2. main에는 릴리스 시에만 병합

Phase PR의 base는 마지막 승인 작업 계열이며 현재 main을 최신 구현으로 가정하지 않는다. 현재 main이 과거 기획만 가진 상태라면 release PR에 포함되는 누적 변경 전체를 대조한다. 직접 main push·강제 push·과거 tag 이동은 금지한다. 브랜치 보호/권한 설정은 실제 권한 보유자가 수행하고 부재를 문서의 의도만으로 해결 처리하지 않는다.

## 3. 개발 검증과 운영 승인 분리

각 **구현** Phase는 로컬 수용 테스트→commit→전용 원격 branch/push 및 SHA 확인→필수 CI→허용된 개발 image→동일 SHA 개발 서버→`dev.example.test` 공개 smoke→증거 기록 순서다. P6 진행 중에는 공용 개발 채널을 바꾸지 않으며 기존 P6 후보 격리를 보존한다.

배정된 모든 Phase가 검증된 뒤 마지막 Phase(1.0.1은 P10)에서 **release candidate 인수 완료**를 기록한다. 그 이후 실제 release는 아래 별도 go/no-go로 진행한다. 이렇게 하면 '모든 Phase 완료 후 release'와 '후보 인수에서 아직 미배포'가 모순되지 않는다. UX 문서-only Phase는 문서 검사/검토/인계 증거로 완료하며 앱 배포를 요구하지 않는다.

## 4. 이미지 태그 계약

네 repository `parkingplace/lyricscloud-web`, `-collaboration`, `-worker`, `-migrate`마다 적용한다.

| 경로 | 허용 태그 | 금지 사항 |
|---|---|---|
| P6 후보 | full SHA, candidate 전용 태그 | 자동 publish와 공용 alias 이동 금지 |
| 1.0.1 이후 승인된 dev | full SHA, `dev-<version>-p<N>`, 필요 시 `Dev`·`Dev-latest` | 정식 숫자 태그·Release 계열·latest 이동 금지 |
| 승인된 정식 release | `<version>`, full SHA, **`Release`·`latest`·`Release-latest`** | 검증 전 이동·기존 숫자/버전 tag 재사용 금지 |

하나의 서비스에 달린 위 release 태그는 **그 서비스의 같은 digest**를 가리켜야 한다. 서로 다른 서비스의 digest가 같아야 한다는 뜻이 아니다. release 발행이 공용 Dev alias를 자동 이동시키는 기존 정책은 후속 정책으로 대체하고 테스트한다. 별도 공용 dev 승격이 필요하면 dev 인수 절차를 따른다. Docker Hub alias 갱신 자체는 여러 repo에 걸친 원자 transaction이 아니므로 manifest를 먼저 만들고 부분 실패를 감지해 승격/롤백 상태를 기록한다.

## 5. release 실행 순서

1. 모든 배정 Phase의 candidate C, 요구 추적, P0/P1 0건, 실제 Windows IME, 신규 Beta 가입, 보안·복원·문서 결과를 확인한다. 이전 CI 수치를 다른 SHA에 재사용하지 않는다.
2. **현재 요청에서** 사용자의 release/main/운영 배포 승인과 승인 범위를 기록한다. 이 계획 요청은 그 승인이 아니다.
3. 승인된 release PR을 main에 병합한다. 최종 main SHA M과 reviewed C의 tree 차이가 없는지 확인한다. merge resolution이 다르면 재검토한다.
4. M에서 필수 CI를 다시 실행하고 M의 immutable dev 후보를 개발 환경에서 확인한다. 실패하면 tag·moving alias·운영 배포를 중단한다.
5. M을 가리키는 annotated `v<version>` tag와 해당 M에서 만든 네 image의 digest·SBOM·provenance·signature·migration 집합을 release manifest에 고정한다.
6. 정확한 tag에서 승인된 수동 release workflow만 실행한다. immutable version/SHA를 먼저 확인하고 Release/latest/Release-latest 승격 결과를 각각 기록한다.
7. 현재 `app.example.test`의 실제 실행 SHA/digest·DB schema·설정·백업 상태를 읽어 manifest와 비교한다. 경로/secret/volume을 개발과 혼합하지 않는다.
8. 승인된 digest로 운영 upgrade를 수행하고 readiness·Google 로그인/가입·한글 저장·copy·search·restore/export·owner 격리 smoke를 합성 자료로 검증한다.
9. 실패하면 정해진 application-first rollback을 수행한다. DB rollback은 추가 쓰기와 호환성을 확인한 별도 승인 절차다. 볼륨 삭제나 tag 재사용은 하지 않는다.
10. 운영 smoke와 안정 구간·알려진 제한·지원/backup 연락·release notes를 기록하고 다음 버전 진입을 결정한다.

## 6. 승인 예외와 백업

기존 `OPS-100-001`은 실제 외부 암호화 backup·timer·복원 미구축 예외다. P6의 도구 수정으로 닫히지 않는다. Private Beta 공개 전 실제 구축/복원 증거를 우선 확보한다. 못 갖추면 **현재 위험을 밝힌 새 사용자 예외 승인** 없이는 release를 진행하지 않는다. 과거 유예가 신규 가입자의 자료 위험을 자동 승인하지 않는다. 데이터 유실·인증 우회 등 P0/P1은 단순 예외로 낮추지 않는다.

## 7. 종료 기록 최소 항목

version, phase, source SHA, final main SHA, CI run/attempt, 서비스별 digest와 alias, migration 집합, 실제 기기/OS/IME, Google 설정 확인 범위, backup/restore 상태, 승인자/시각, 개발·운영 smoke, 미완료/보류, rollback 결과. 실제 확인하지 않은 값은 '미실행/미확인'으로 기록한다.
