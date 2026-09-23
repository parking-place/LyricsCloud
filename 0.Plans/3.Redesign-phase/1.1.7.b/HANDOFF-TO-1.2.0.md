# 1.1.7b → 1.2.0 실행 기준 인계

**현재는 계획이며 실제 인수 SHA는 없다.** 1.2.0은 b P1~P5의 필수 검증과 같은 SHA 개발 서버 공개 인수가 완료된 뒤 시작한다. 리뷰·목업의 원래 기준 v1.1.7a는 출처로 유지하고, 실제 제품 구현 기준은 완료된 b SHA로 바꾼다. 코드 합병·문서 작성·원격 C3의 CI 성공만으로 이 조건을 충족하지 않는다.

## 채워야 할 인수 기록

| 항목 | 현재 값 | 완료 증거 |
|---|---|---|
| 통합 source SHA·branch·tree | 미정/미착수 | b 최종 기능 commit. 후속 문서 전용 SHA와 구분 |
| 원본 WC-01~18·최소 의존·제외 | 계획 배정 | source → port → 시험 → 판정 전수 맵 |
| 22개 원인·필수 P0/P1 | 미검증 | 해소/조건 미해당 근거·미실행·후속 잔여 |
| runtime/phase/package | 제품 b/폴더 1.1.7.b/package 1.1.7 계획 | 실제 health/build와 a/invalid 회귀 |
| CI·서비스별 image/digest/provenance | 미실행 | 새 b 후보의 필수 job. skip은 별도 표시 |
| 개발 대상/DB 유형·migration fingerprint | 미확인 | 비밀을 제거한 이력 집합/checksum/세 환경 호환 행렬 |
| 배포 source·public smoke·restart | 미실행 | source 일치·사용자 관점의 기능 결과 |
| rollback | 환경별 계획 | 이전 source/image·DB/초안·PWA 보존 검증 |
| 물리 OS/IME/AT·외부 provider/backup | 미실행·기존 이력 참조 | 필수 항목 완료와 정당한 비필수 잔여를 구분 |
| 정식 b release 승인/실행 | 이번 요청 범위 아님 | 별도 정식 절차의 결정과 결과만 기록 |

## 1.2.0이 이어받을 변경

- b의 입력/IME·metadata·guard·설정 ACK·목록 generation·copy·shared/recovery·SW build 수명을 디자인 기능 대응표에 추가한다. 기존 207개 목업 기능은 실제 b 동작과 다시 대조한다.
- b에서 보강한 동작을 코발트 컴포넌트로 옮기되 구 B1 JSX/CSS 전체를 새 디자인에 덮지 않는다. CodeMirror 인스턴스·Yjs 원문/undo/selection·저장/권한 계약을 보존한다.
- 1.2.0 P1-06은 b에서 최초 지원한 version/Phase 도구를 재사용하고 실제 1.2.0 metadata 전환·회귀를 담당한다. b 지원을 P5까지 미루거나 1.2.0에서 다시 처음 구현하지 않는다.
- 기존 1.2.1~1.2.8 작업 ID는 유지한다. b에서 해결한 범위는 증거 인수/코발트 회귀로 바꾸고, 새 저장 상태 계약·raw 태그 수렴 잔여·전체 UX·운영/구조 제안은 실제 미해결 부분만 진행한다.
- 1.1.8~1.1.14 native 계획은 계속 보류한다. b 웹 통합을 Windows P4 완료나 1.1.8 정식 릴리스로 표시하지 않는다.

## 진입 금지 조건

필수 미실행·원문 손실/거짓 저장/인가/복구 차단, CI/실제 개발 배포 SHA 불일치, WC 미판정, 예상 밖 DB 이력, 지원되지 않는 b 버전 도구가 있으면 1.2.0 P1은 미착수로 유지한다. 실제 b P5 완료 때만 실행 STATUS에 b 완료를 기록하고 next를 1.2.0으로 넘긴다. 이번 계획 작성에서는 current 1.1.7a를 유지하고 다음 계획만 b로 바꾼다.
