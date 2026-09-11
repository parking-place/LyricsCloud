# ADR-NF-007 — 웹폰트 자산·로딩·라이선스

- 상태: **Accepted for 1.0.14**
- 작성일: 2026-09-09
- 최초 결정/소비: 1.0.14 P1
- 승인자/시각: Codex, 2026-09-12 05:50 KST. 사용자가 승인한 1.0.14 전체 실행 범위 안에서 공식 자산·OFL·실측 예산을 근거로 확정했다.

## 질문·대안·결정 gate

| 후보 | 출처·권리 | 요청/용량 | 글리프·오프라인 | 결정 |
|---|---|---:|---|---|
| 현재 system sans stack | 사용자 OS 제공, 번들 없음 | 0 / 0B | OS별 차이, 항상 fallback 가능 | fallback 유지 |
| Noto Sans KR 2.004 Regular subset OTF | [공식 Noto CJK release](https://github.com/notofonts/noto-cjk/releases/tag/Sans2.004), [Korean subset 안내](https://github.com/notofonts/noto-cjk/blob/main/Sans/README.md?plain=1), [SIL OFL 1.1](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE) | 선택 시 1 / 4,644,748B | Latin·한글 완성형 U+AC00–D7A3·한글 자모 U+1100–11FF·Kana U+3041–30FF·선별 CJK Han, 자체 캐시 가능 | 채택 |
| 외부 Google Fonts CSS/CDN | 외부 제공 조건·요청 시 IP 전송 경계 추가 | 가변 | 온라인 의존·캐시 통제 약화 | 보류 |

공식 `17_NotoSansKR.zip` SHA-256은 `ac7eeb4e2b0d41de8ff31b2d6e1e2a41caf253fd5cefb380bfa1f40f1747b612`, 그 안의 `NotoSansKR-Regular.otf`는 4,644,748B·SHA-256 `69975a0ac8472717870aefeab0a4d52739308d90856b9955313b2ad5e0148d68`, `LICENSE`는 SHA-256 `6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2`다. font version은 2.004다.

1.0.14는 이 Regular 한 weight만 hash가 포함된 경로로 자체 제공한다. 변형·서브셋 재생성은 하지 않고 원본 OFL을 함께 번들한다. `font-display: swap`과 기존 system sans fallback을 사용하며, 사용자 설정에서 선택했을 때만 CSS가 font 요청을 유발하게 한다. cold 요청 예산은 1건·4.7MB 이하, warm/offline 추가 네트워크는 0건, 문서/제어 JS bundle 증가는 20KB gzip 이하로 승인한다.

## 영향과 수용

[세부 계약](../../0.Plans/2.Patch-phase/contracts/DICTIONARY-FONTS.md)의 언어/OS/권한·실패 사례와 [요구 추적](../../0.Plans/2.Patch-phase/Requirements-Traceability.md)을 소비한다. 일본어와 드문 Han은 Korean subset에 포함된 범위만 Noto로 표시하고 누락 glyph는 system sans로 fallback한다. 모든 문자의 지원을 주장하지 않는다. 기존 저장 형식·계정 소유자·원문·copy를 보존하고 실제 지원 여부와 합성 검증을 구분한다.

## 되돌림·미실행

신규 font option을 숨겨도 기존 `sans`/`serif`/`mono` 값과 창작물을 보존한다. asset 요청 실패·느린 로딩·offline에서는 system sans가 즉시 표시되며 저장을 차단하지 않는다. migration rollback은 신규 선택을 `sans`로 치환한 뒤 check constraint를 되돌린다. 실제 Windows/iOS/Android 기기 결과가 없으면 자동 브라우저 결과와 구분해 미실행으로 남긴다.

[결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 승인자·시각·선택·대안·근거·영향받는 Phase·보류 이유를 연결한다.
