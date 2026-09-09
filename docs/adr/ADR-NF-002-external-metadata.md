# ADR-NF-002 — Suno 링크 metadata 취득 경계

- 상태: **Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.11 P1
- 승인자/시각: **미승인 — 해당 Phase에서 사용자/지정 결정권자의 승인을 기록한다.**
- 범위 원본: 사용자의 1.0.1 필수 및 후속 1.x 계획 요청.

## 해결할 질문

제목/시간/썸네일을 어떤 허용된 소스로 얻고 SSRF·외부 장애를 어떻게 제한할 것인가?

## 검토한 대안

### 1. 사용자 수동 metadata

안전하고 외부 장애가 적지만 자동 취득 요구는 별도 승인이 있어야 대체할 수 있다.

### 2. 검증된 공식/허용 provider adapter

요구를 충족할 수 있으나 실제 제공 여부·이용 범위·호출 비용을 증명해야 한다.

### 3. 무제한 arbitrary URL scraping

내부망 접근·cookie 유출·계약 변경 위험 때문에 선택하지 않는다.

## 권장 선택과 이유

provider의 실제 제공 능력을 먼저 증명하고 두 번째 안을 제한적으로 사용한다. 불가하면 수동 대체를 미해결 요구와 함께 승인받는다.

## 영향받는 작업·화면·schema·운영

곡 link schema·metadata worker/API·HTTP/DNS/redirect/image 경계·사용자 안내·공유 필드 범위.

## 자동·수동 검증 기준

허용 실제 링크·403/429/삭제·timeout·사설 IPv4/IPv6·redirect/rebinding·크기·악성HTML·수동 값 경쟁을 시험한다.

## 되돌림 또는 대체 비용

외부 조회 flag만 끄고 저장한 URL/수동 metadata는 보존한다. provider 변경은 출처/갱신 이력으로 추적한다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/LIBRARY-SUNO.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.
