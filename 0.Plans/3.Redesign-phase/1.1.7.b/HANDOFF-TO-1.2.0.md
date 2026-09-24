# 1.1.7b → 1.2.0 실행 기준 인계

**1.1.7b P1~P5 개발 인수 완료. 1.2.0 구현 출발점은 기능 SHA `acd2bd99876740debf426c401fe7157713f8b854`이다.** P4 기능 SHA `ddc1d7c50a64f8e8467b7aee64627f2dfe13da7d`의 DB·차단 판정을 P5 전체 CI·같은 SHA 개발 공개 인수로 봉인했다. 리뷰·목업의 원래 기준 v1.1.7a는 출처로만 유지한다. 뒤따르는 문서 전용 commit은 제품 구현 기준 SHA로 바꾸지 않는다. 정식 b release 승인·운영 배포는 별도다.

## 채워야 할 인수 기록

| 항목 | 현재 값 | 완료 증거 |
|---|---|---|
| 통합 source SHA·branch·tree | 기능 `acd2bd99876740debf426c401fe7157713f8b854` / `phase/1.1.7b-p5-final-handoff` | CI source=image provenance=개발 checkout/BUILD_ID/public ready; 후속 문서 SHA와 구분 |
| 원본 WC-01~18·최소 의존·제외 | P1 `a04bbcb`·P2 `3915a71`·P3 `1626c75`, P4 `ddc1d7c` 재검증 | [18행 source map](SOURCE-MAP.md)과 [최종 추적](../../../docs/architecture/1.1.7b-FINAL-TRACEABILITY.md); native/Windows 제외 |
| 22개 원인·필수 P0/P1 | P4 적용 개발 경계 미해결 필수 0건; UI-04/05/07 P2 잔여 | [원인별 판정](BLOCKERS.md); 새 손실/인가 증거 시 재개 |
| runtime/phase/package | `1.1.7b` / 계획 `1.1.7.b` / private npm `1.1.7`, 공개 `dev/p5` | P5 공개 live/ready/1002·1004·1005 개발 후보 PASS, 정식 require-release 예상 거부 |
| CI·서비스별 image/digest/provenance | [P5 push 35997349571](https://github.com/parking-place/LyricsCloud/actions/runs/35997349571) verify/네 signed image SUCCESS; [PR 35997369606](https://github.com/parking-place/LyricsCloud/actions/runs/35997369606) verify SUCCESS | Unit/DB 509 PASS/8 skip·Chromium 432 PASS/54 skip·release matrix 10 PASS. web `65692104`, collaboration `39a93958`, worker `5ec1bbd5`, migrate `8c8b72fb` 전체 digest·서명은 [P5 기록](5phase.md) |
| 개발 대상/DB 유형·migration fingerprint | 개발 native 1150+1151→1152, 32 migration/웹 manifest 31 checksum, native 객체 2개 | 새 웹·populated a·native DB 일회용 행렬 PASS; P5 배포 전후 재확인 |
| 배포 source·public smoke·restart | P5 기능 SHA의 checkout/BUILD_ID/공개 live·ready 일치, 네 healthy | 공개 곡/가사/프롬프트 생성·원문·PC/mobile·타 계정 404·공유 회수 404·export/trash·SW, 서비스 재시작 뒤 곡 재조회 PASS. 합성 자료 0건 |
| rollback | a 및 native 포함 이전 image의 일회용 application-first 원문/사진/export PASS | 실제 PC 설치물·개발 live downgrade 미실행; destructive DB rollback 금지 |
| 물리 OS/IME/AT·외부 provider/backup | 물리 Windows/iOS/Android·OS IME·AT 사용자 보류/미실행; 외부 Google 장애·운영 backup/timer 미실행 | 자동화 대리 PASS와 구별, `OPS-100-001` 별도 |
| 정식 b release 승인/실행 | 미승인·미실행 | `main`·annotated tag·Release/latest·릴리스 서버 변경 없음 |

## 1.2.0이 이어받을 변경

- b의 입력/IME·metadata·guard·설정 ACK·목록 generation·copy·shared/recovery·SW build 수명을 디자인 기능 대응표에 추가한다. 기존 207개 목업 기능은 실제 b 동작과 다시 대조한다.
- b에서 보강한 동작을 코발트 컴포넌트로 옮기되 구 B1 JSX/CSS 전체를 새 디자인에 덮지 않는다. CodeMirror 인스턴스·Yjs 원문/undo/selection·저장/권한 계약을 보존한다.
- 1.2.0 P1-06은 b에서 최초 지원한 version/Phase 도구를 재사용하고 실제 1.2.0 metadata 전환·회귀를 담당한다. b 지원을 P5까지 미루거나 1.2.0에서 다시 처음 구현하지 않는다.
- 기존 1.2.1~1.2.8 작업 ID는 유지한다. b에서 해결한 범위는 증거 인수/코발트 회귀로 바꾸고, 새 저장 상태 계약·raw 태그 수렴 잔여·전체 UX·운영/구조 제안은 실제 미해결 부분만 진행한다.
- 1.1.8~1.1.14 native 계획은 계속 보류한다. b 웹 통합을 Windows P4 완료나 1.1.8 정식 릴리스로 표시하지 않는다.

## 진입 금지 조건

필수 미실행·원문 손실/거짓 저장/인가/복구 차단, CI/실제 개발 배포 SHA 불일치, WC 미판정, 예상 밖 DB 이력, 지원되지 않는 b 버전 도구가 있으면 1.2.0 P1은 미착수로 유지한다. 실제 b P5 완료 때만 실행 STATUS에 b 완료를 기록하고 next를 1.2.0으로 넘긴다. 이번 계획 작성에서는 current 1.1.7a를 유지하고 다음 계획만 b로 바꾼다.
