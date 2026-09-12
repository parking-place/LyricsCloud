# 1.0.14 — 무료 웹폰트·다국어 글리프와 개인 흐름 인수

상태: **P1~P5·정식 릴리스 완료**. Noto Sans KR 2.004 Regular 자산·OFL·캐시, 선택 영속·세 편집기 적용, slow/blocked/offline·장문 입력·성능 회귀와 동일 SHA 개발 인수를 완료했다. main/annotated tag `d093ff2`, 정식 image, 릴리스 서버 exact digest 배포와 공개 재시작 인수까지 완료했다. 실제 Windows/Android/iOS의 1.0.14 폰트 전환은 미실행 위험으로 유지한다. 요구 `NF-REQ-044`를 [전체 추적표](../Requirements-Traceability.md)로 연결한다.

선행: [1.0.13](../1.0.13/README.md)의 인수와 해당 결정 gate. 코드 변경 없는 개발안/외부 gate 보류는 제품 출시로 세지 않는다.

## Phase 배분

- [P1 — 폰트 후보·권리·예산](1phase.md)
- [P2 — 자산·로딩·fallback](2phase.md)
- [P3 — 설정·미리보기·편집 적용](3phase.md)
- [P4 — 실제 입력·성능·개인 기능 통합](4phase.md)
- [P5 — 고지·개발 인수·공유 진입](5phase.md)

## 대표 수용과 범위

- `AC-1.0.14-01`: 후보별 라이선스/고지/글리프/용량 표와 도입·보류 이유가 있다.
- `AC-1.0.14-02`: 차단/느린 네트워크·오프라인에서 글자가 보이며 서브셋 외 글리프도 적절히 fallback한다.
- `AC-1.0.14-03`: 새로고침 뒤 선택이 유지되고 한글/영어/일어 표시와 복사 원문이 같다.
- `AC-1.0.14-04`: 예산·glyph·IME 수용이 있고 개인 흐름의 원문·copy·목록 정렬이 보존된다.
- `AC-1.0.14-05`: 개인 필수 요구와 외부 gate를 반영한 공유 go/no-go 기록이 있다.

[세부 계약](../contracts/DICTIONARY-FONTS.md) · [품질 게이트](../QUALITY-GATES.md) · [릴리스 정책](../RELEASE-POLICY.md). 다른 버전·미선택 추가 아이디어·승인 없는 운영 변경은 제외한다.
