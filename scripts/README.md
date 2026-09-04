# Scripts

개발·검증·운영에서 반복 실행할 수 있는 작은 명령을 둡니다. 스크립트는 명시적인 대상과 dry-run 또는 확인 가능한 출력을 제공해야 합니다.

운영 데이터 삭제, migration, 백업 정리처럼 파괴적인 동작은 기본 동작으로 두지 않으며 runbook과 별도 승인을 요구합니다.

현재 의존성 없이 실행할 수 있는 검사:

```powershell
powershell -NoProfile -File scripts/validate-plans.ps1
```

이 검사는 다음 계획 무결성을 확인합니다.

- 13개 버전과 각 버전의 정확히 `1phase.md`~`5phase.md`, 전체 65개 Phase 문서 존재 여부
- 각 Phase 제목의 버전·Phase 번호, 레벨 2 구역 수, 버전·Phase 형식에 맞는 작업 ID 6개 이상과 전체 작업 ID 중복 여부
- `Implementation-Stack.md`의 `DEC-01`~`DEC-13`별 정확히 하나의 선택과 `FINAL-APPROVAL`
- `STATUS.md`의 `current_version`·`current_phase` 형식과 해당 Phase 파일 존재 여부
- `docs/adr/README.md`와 `STATUS.md`에 기록된 ADR ID 집합의 일치 여부
- `Requirements-Traceability.md` 존재 여부와 상세 요구사항 표 첫 열의 `REQ-*` ID 중복 및 §49 기준 영역별 개수(계정 5, 곡 11, 가사 17, 라임 10, 프롬프트 14, 공통 14)
- 저장소 내 Markdown 로컬 링크 대상의 존재 여부

이 검사는 문서 문장의 의미, 요구사항과 구현의 실제 동작 일치, 외부 URL·Markdown 앵커 유효성까지 증명하지는 않습니다.
