# B-1 목업 검토 변경 기록

| 단계 | 발견 | 수정 | 기능/원문 영향 |
|---|---|---|---|
| P3 첫 접근성 순회 | textarea/select의 label 연결, 공유 cursor 대비, loading role 40건 | for/id, 더 어두운 cursor 배경, role=status 적용 | 없음 |
| P4 육안 검토 | 320~390px editor의 4개 고정 도구명이 줄바꿈될 수 있음 | mobile gap/padding/font를 줄이고 white-space: nowrap 적용 | 행동 4개와 순서 유지 |
| P4 target 측정 | 320px 라임 검색과 새 노트가 한 줄에서 검색 입력을 압축 | mobile toolbar의 field를 한 행 전체로 배치 | 검색/생성 기능 유지 |
| P4 320px 회귀 | 공유 read/write editor dock이 6px 가로 overflow | dock gap/padding을 줄여 네 행동의 한 줄·24px target을 함께 유지 | 기능/순서/label 유지 |
| P4 overlay 검토 | 정적 prototype에는 focus trap·복귀·keyboard sheet 동작이 없음 | [interaction 계약](interaction-contract.md)으로 구현 수용 기준 고정 | 없는 backend/동작을 완료로 표시하지 않음 |

## 의도한 동선 변화

- desktop의 중복 rail/tab을 primary rail 하나로, mobile은 bottom navigation 하나로 정리한다.
- 곡 작업공간 첫 영역에 현재 단계와 가장 가까운 가사 이어쓰기/새 가사를 둔다.
- editor 고정 도구를 9개에서 구조·라임·프롬프트·더보기 4개로 줄이되 나머지 기능은 더보기/context 안에 유지한다.
- 공유 화면은 현재 권한과 회수/복구 결과를 먼저 보이고 상세 권한 설명을 다음 위계에 둔다.

## 승인하지 않은 변화

기능·route·API·DB·권한·사전 provider·폰트 자산·원문 형식 삭제/교체는 없다. prototype의 합성 저장/presence/cursor 표시는 backend 구현이나 실제 검증을 뜻하지 않는다. P4 수정은 B-1의 구조·morphism 의미를 바꾸지 않으므로 P2 선택 재확인 사유가 아니다.
