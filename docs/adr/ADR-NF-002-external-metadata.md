# ADR-NF-002 — Suno 링크 metadata 취득 경계

- 상태: **Deferred / 1.0.11 P1 no-go**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.11 P1
- 승인자/시각: 사용자 범위 승인 아래 Codex가 공식 제공 조건을 판정, 2026-09-12. 자동 metadata 구현은 승인하지 않고 공식 계약 확보 전 보류한다.
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

## 2026-09-12 제공 조건 판정

- Suno의 공개 Platform 안내는 인증 뒤 음악 생성 REST API를 제공한다고 설명하지만, 기존 `suno.com/song/...` 또는 `suno.com/s/...` 링크에서 제목·재생시간·썸네일을 읽는 공개 metadata 계약·스코프·요금·재배포 권한은 확인할 수 없었다.
- 현행 [Suno 이용약관](https://suno.com/terms)은 의도적으로 제공되지 않은 수단으로 정보에 접근하는 행위와 scraping/data-mining을 금지한다.
- 따라서 대안 2의 필수 증거가 없고 대안 3은 계약상·보안상 금지된다. 1.0.11은 `AC-1.0.11-04` no-go로 판정하며 `AC-1.0.11-01`과 `NF-REQ-032`를 미완료로 유지한다.
- 1.0.10의 수동 URL·제목·메모·새 탭 열기는 그대로 유지한다. outbound provider, queue, cache, schema, worker, UI, secret, 운영 설정은 추가하지 않는다.
- 재개 조건은 Suno가 기존 링크 metadata용 공식 API 문서, 인증 scope, 이용/표시·thumbnail 재배포 조건, rate limit·비용을 공개하거나 LyricsCloud가 서면 허가를 확보하는 것이다.

## 영향받는 작업·화면·schema·운영

곡 link schema·metadata worker/API·HTTP/DNS/redirect/image 경계·사용자 안내·공유 필드 범위.

## 자동·수동 검증 기준

허용 실제 링크·403/429/삭제·timeout·사설 IPv4/IPv6·redirect/rebinding·크기·악성HTML·수동 값 경쟁을 시험한다.

## 되돌림 또는 대체 비용

외부 조회 flag만 끄고 저장한 URL/수동 metadata는 보존한다. provider 변경은 출처/갱신 이력으로 추적한다.

이번 no-go는 제품 코드와 데이터를 변경하지 않았으므로 되돌릴 runtime 변경이 없다.

## 범위 밖과 관련 결정

이 문서 생성은 구현/배포 또는 과거 결정의 자동 폐기 승인이 아니다. 원문/기존 사용자·이력·major1 정책을 보존한다. 기존 ADR/PROD/OPS의 해당 범위만 새 Accepted 기록으로 대체한다.

- [세부 계약](../../0.Plans/2.Patch-phase/contracts/LIBRARY-SUNO.md)
- [결정 권한과 소비 시점](../../0.Plans/2.Patch-phase/Decision-Ownership.md)
- [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)
- [버전 정책](../../0.Plans/2.Patch-phase/VERSIONING.md)

## 승인 기록 규칙

승인 시 선택 대안·승인자·시각·정확한 적용 범위·미해결 위험·추가 테스트를 기록한다. 계획 승인과 코드/운영 배포 승인은 별개다. 대체 시 새 ID와 사유를 연결하고 기존 Accepted 원문을 덮어쓰지 않는다.
