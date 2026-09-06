# Collaboration service boundary

`DEC-06-C`에 따라 같은 계정의 여러 기기·탭에서 가사와 라임 노트 본문을 자동 병합하는 실시간 연결을 담당합니다.

다른 사용자 초대·공유는 1.0 범위가 아닙니다. 연결 시마다 인증과 문서 소유권·활성 resource subtype을 확인하고, CRDT 업데이트·PostgreSQL 평문 투영·수정 기록 스냅샷을 분리합니다. 0.4.0은 기존 가사 프로토콜을 `rhyme_note`에 확장하되 동일한 ACK·중복 제거·projection 재처리·revision 정책을 유지합니다.
