# PROD-NF-009 — 여러 사용자 동시 작업과 위치 표시

- 상태: **Accepted through 1.1.2 selected writer presence/cursor**
- 작성일: 2026-09-09
- 최초 결정/소비: 1.1.0 P1; 1.1.2 P1 확장
- 승인자/시각: 사용자, 2026-09-13. 1.1.0 reader presence에 이어 1.1.2의 서버 인증 writer 표시·relative cursor/selection·idle/재연결·강등 정리를 승인한다.

## 질문·대안·결정 gate

읽기 참가자와 writer의 현재 작업 위치/cursor·selection, 표시 이름/색상·idle/연결 상태를 정한다. 서버 actor를 신뢰하며 read/write 권한 철회·재구독·문서 전환 때 정보 제거와 자기 초안 보존을 수용한다.

1.1.0에서는 reader의 문서 참여 여부만 일시 presence로 전송한다. 이메일·내부 ID·타 문서 참가자·클라이언트가 주장한 identity는 노출하지 않으며, read 회수·disconnect·문서 전환 때 제거한다. reader의 cursor/selection이나 편집 활동처럼 보이는 정보는 전송하지 않는다.

1.1.2에서 owner와 selected writer는 서버가 결합한 안전한 표시 이름·connection-local participant ID·role·일시 색상과 Yjs relative anchor/head만 같은 문서 참가자에게 보낸다. frame에는 본문·선택 문자열·identity를 넣지 않고 크기·빈도·문서/권한을 매번 제한한다. 같은 사용자 중복 탭은 별도 participant로 표시하되 자기 caret를 remote caret로 중복 렌더링하지 않는다. disconnect·timeout·문서 전환·read 회수는 즉시 제거하고 write만 강등되면 연결을 read로 낮춰 보기/presence는 유지하면서 cursor 송신과 기존 selection을 제거한다. public-link reader에는 identity presence를 노출하지 않는다.

## 영향과 수용

[세부 계약](../../0.Plans/2.Patch-phase/contracts/SHARING.md)의 언어/OS/권한·실패 사례와 [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)을 소비한다. 기존 저장 형식·계정 소유자·원문·copy를 보존하고 실제 지원 여부와 합성 검증을 구분한다. 필요한 파일과 정확한 도구 버전은 착수 소스로 확인한다.

## 되돌림·미실행

신규 표시/제공 기능을 중단해도 기존 창작물을 보존한다. 기술 전환은 호환/rollback을 검증한 뒤 적용한다. SDK/외부 서비스·권리·실제 OS/기기·배포 승인이 없으면 해당 결과를 미완료로 남긴다. 새 문서가 기존 Accepted 결정을 자동 대체하지 않으며 원문 이력은 보존한다.

[결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 승인자·시각·선택·대안·근거·영향받는 Phase·보류 이유를 연결한다.
